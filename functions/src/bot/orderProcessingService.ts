import * as admin from 'firebase-admin';
import { Producto, ItemVenta, Venta } from '../types';
import { obtenerProductoPorNumero, buscarProductoPorNombre } from './menuGenerationService';
import { enviarAutoRespuesta, TEMPLATES_AUTO_RESPUESTA } from './whatsappBotService';

const db = admin.firestore();

/**
 * Parsea comando de orden desde mensaje de texto
 * Ej: "1", "1 2 3", "1x2" (cantidad), "búsqueda: arroz"
 */
export function parsearComandoOrden(
  mensaje: string
): { tipo: 'item' | 'cantidad' | 'busqueda' | 'confirmacion'; items: number[]; busqueda?: string } {
  const comandoLimpio = mensaje.trim().toLowerCase();

  // Búsqueda: "búsqueda: arroz"
  if (comandoLimpio.includes('búsqueda:') || comandoLimpio.includes('buscar')) {
    const termino = comandoLimpio.replace(/búsqueda:|buscar/g, '').trim();
    return { tipo: 'busqueda', items: [], busqueda: termino };
  }

  // Confirmación: "confirmar", "ok", "listo", "sí"
  if (['confirmar', 'ok', 'listo', 'sí', 'si', 'yes'].includes(comandoLimpio)) {
    return { tipo: 'confirmacion', items: [] };
  }

  // Cantidad: "1x2" o "1 x 2"
  const regexCantidad = /(\d+)\s*x\s*(\d+)/gi;
  const cantidadMatch = comandoLimpio.match(regexCantidad);

  if (cantidadMatch) {
    const items = cantidadMatch.map((match) => {
      const parts = match.split('x').map((p) => parseInt(p.trim()));
      return parts[0];
    });
    return { tipo: 'cantidad', items };
  }

  // Items simples: "1 2 3" o "1, 2, 3"
  const items = comandoLimpio
    .split(/[\s,]+/)
    .map((s) => parseInt(s))
    .filter((n) => !isNaN(n));

  return { tipo: 'item', items };
}

/**
 * Crea o actualiza una orden de usuario
 */
export async function crearOrdenPendiente(
  numeroCliente: string,
  items: Array<{ productoId: string; cantidad: number }>
): Promise<string> {
  try {
    // Buscar si existe orden pendiente del usuario
    const ordenesExistentes = await db
      .collection('ordenes_pendientes')
      .where('numeroCliente', '==', numeroCliente)
      .where('estado', '==', 'pendiente')
      .limit(1)
      .get();

    let ordenId: string;

    if (!ordenesExistentes.empty) {
      // Actualizar orden existente
      ordenId = ordenesExistentes.docs[0].id;
      const ordenActual = ordenesExistentes.docs[0].data();

      // Agregar items nuevos
      const itemsActualizados = [...(ordenActual.items || [])];
      for (const item of items) {
        const indiceExistente = itemsActualizados.findIndex(
          (i) => i.productoId === item.productoId
        );

        if (indiceExistente >= 0) {
          itemsActualizados[indiceExistente].cantidad += item.cantidad;
        } else {
          itemsActualizados.push(item);
        }
      }

      await db.collection('ordenes_pendientes').doc(ordenId).update({
        items: itemsActualizados,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Crear nueva orden
      const ordenRef = db.collection('ordenes_pendientes').doc();
      ordenId = ordenRef.id;

      await ordenRef.set({
        numeroCliente,
        items,
        estado: 'pendiente',
        creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        expiraEn: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 30 * 60 * 1000) // Válida 30 minutos
        ),
      });
    }

    return ordenId;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Obtiene orden pendiente del usuario
 */
export async function obtenerOrdenPendiente(numeroCliente: string) {
  try {
    const ordenesSnapshot = await db
      .collection('ordenes_pendientes')
      .where('numeroCliente', '==', numeroCliente)
      .where('estado', '==', 'pendiente')
      .limit(1)
      .get();

    if (ordenesSnapshot.empty) {
      return null;
    }

    const ordenDoc = ordenesSnapshot.docs[0];
    return {
      id: ordenDoc.id,
      ...ordenDoc.data(),
    };
  } catch (error) {
    console.error('Error getting pending order:', error);
    return null;
  }
}

/**
 * Genera resumen de orden para mostrar al usuario
 */
export async function generarResumenOrden(items: any[]): Promise<{ resumen: string; total: number }> {
  try {
    let total = 0;
    let resumen = '🛒 RESUMEN DE TU ORDEN:\n\n';

    for (let i = 0; i < items.length; i++) {
      const producto = await obtenerProductoPorNumero(items[i].productoId);

      if (!producto) {
        continue;
      }

      const subtotal = (producto.precio || 0) * (items[i].cantidad || 1);
      total += subtotal;

      resumen += `${i + 1}. ${producto.nombre}\n`;
      resumen += `   Cantidad: ${items[i].cantidad}x\n`;
      resumen += `   Subtotal: $${subtotal.toLocaleString('es-CO')}\n\n`;
    }

    resumen += `━━━━━━━━━━━━━━━━\n`;
    resumen += `💰 TOTAL: $${total.toLocaleString('es-CO')}\n\n`;
    resumen += `¿Deseas confirmar? Responde "confirmar"`;

    return { resumen, total };
  } catch (error) {
    console.error('Error generating order summary:', error);
    return { resumen: 'Error al generar resumen', total: 0 };
  }
}

/**
 * Convierte orden pendiente a venta registrada
 */
export async function confirmarOrden(ordenPendienteId: string, numeroCliente: string): Promise<string> {
  try {
    const ordenDoc = await db.collection('ordenes_pendientes').doc(ordenPendienteId).get();

    if (!ordenDoc.exists) {
      throw new Error('Orden no encontrada');
    }

    const orden = ordenDoc.data() as any;
    if (!orden || !orden.items) {
      throw new Error('Orden sin items');
    }

    // Obtener detalles de productos y calcular totales
    const itemsVenta: ItemVenta[] = [];
    let totalOrden = 0;

    for (const item of orden.items) {
      const producto = await obtenerProductoPorNumero(item.productoId);

      if (producto) {
        const subtotal = (producto.precio || 0) * item.cantidad;
        totalOrden += subtotal;

        itemsVenta.push({
          id: item.productoId,
          nombre: producto.nombre,
          precio: producto.precio || 0,
          cantidad: item.cantidad,
          subtotal,
          categoria: producto.categoria,
        });
      }
    }

    // Crear venta en Firestore
    const ventaRef = db.collection('ventas').doc();
    const ventaId = ventaRef.id;

    const venta: Omit<Venta, 'id'> = {
      numeroCliente,
      items: itemsVenta,
      total: totalOrden,
      fecha: admin.firestore.FieldValue.serverTimestamp() as any,
      origen: 'whatsapp',
      metodoPago: 'pendiente', // Se confirmará después
      estado: 'confirmada',
      jornada: obtenerJornadaActual(),
      domicilio: true, // WhatsApp es principalmente para domicilios
    };

    await ventaRef.set(venta);

    // Marcar orden como confirmada
    await db.collection('ordenes_pendientes').doc(ordenPendienteId).update({
      estado: 'confirmada',
      ventaId,
      confirmadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Order confirmed: ${ventaId}`);

    // Enviar confirmación
    await enviarAutoRespuesta(numeroCliente, 'CONFIRMAR_ORDEN', {
      productos: itemsVenta.map((i) => `${i.nombre} x${i.cantidad}`).join(', '),
      total: `$${totalOrden.toLocaleString('es-CO')}`,
      tiempo: '30 minutos',
    });

    return ventaId;
  } catch (error) {
    console.error('Error confirming order:', error);
    throw error;
  }
}

/**
 * Procesa mensaje recibido para generar acción
 */
export async function procesarMensajePorBot(
  numeroCliente: string,
  contenidoMensaje: string
): Promise<{ accion: string; respuesta: string }> {
  try {
    const comando = parsearComandoOrden(contenidoMensaje);

    // BÚSQUEDA
    if (comando.tipo === 'busqueda' && comando.busqueda) {
      const resultados = await buscarProductoPorNombre(comando.busqueda);

      if (resultados.length === 0) {
        return {
          accion: 'busqueda_no_encontrada',
          respuesta: `❌ No encontré productos con "${comando.busqueda}"`,
        };
      }

      let respuesta = `🔍 Resultados para "${comando.busqueda}":\n\n`;
      resultados.forEach((producto, index) => {
        const precio = (producto.precio || 0).toLocaleString('es-CO', {
          style: 'currency',
          currency: 'COP',
          minimumFractionDigits: 0,
        });
        respuesta += `${index + 1}. ${producto.nombre} - ${precio}\n`;
      });

      return {
        accion: 'busqueda',
        respuesta,
      };
    }

    // CONFIRMACIÓN DE ORDEN
    if (comando.tipo === 'confirmacion') {
      const orden = await obtenerOrdenPendiente(numeroCliente);

      if (!orden) {
        return {
          accion: 'sin_orden',
          respuesta: 'No tienes una orden pendiente para confirmar.',
        };
      }

      const ventaId = await confirmarOrden(orden.id, numeroCliente);

      return {
        accion: 'orden_confirmada',
        respuesta: `✅ Orden confirmada! ID: ${ventaId}`,
      };
    }

    // AGREGAR ITEMS A ORDEN
    if (comando.tipo === 'item' && comando.items.length > 0) {
      const itemsConCantidad = comando.items.map((id) => ({
        productoId: id.toString(),
        cantidad: 1,
      }));

      const ordenId = await crearOrdenPendiente(numeroCliente, itemsConCantidad);
      const orden = await obtenerOrdenPendiente(numeroCliente);

      const ordenFull = orden as any;
      if (!ordenFull || !ordenFull.items) {
        throw new Error('Failed to create order items');
      }

      const { resumen } = await generarResumenOrden(ordenFull.items);

      return {
        accion: 'items_agregados',
        respuesta: resumen,
      };
    }

    // MENÚ O COMANDO NO RECONOCIDO
    return {
      accion: 'comando_desconocido',
      respuesta: TEMPLATES_AUTO_RESPUESTA.ERROR_COMANDO,
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      accion: 'error',
      respuesta: '⚠️ Error procesando tu mensaje. Intenta de nuevo.',
    };
  }
}

/**
 * Obtiene jornada actual para registrar la venta
 */
function obtenerJornadaActual(): string {
  const ahora = new Date();
  const hora = ahora.getHours();

  if (hora < 12) return 'mañana';
  if (hora < 17) return 'tarde';
  return 'noche';
}

/**
 * Estadísticas de órdenes por WhatsApp
 */
export async function obtenerEstadisticasOrdenes(): Promise<{
  ordenesPendientes: number;
  ordenesConfirmadas: number;
  ventasTotales: number;
  montoPromedio: number;
  ultimaOrden?: string;
}> {
  try {
    const pendientes = await db
      .collection('ordenes_pendientes')
      .where('estado', '==', 'pendiente')
      .get();

    const confirmadas = await db
      .collection('ordenes_pendientes')
      .where('estado', '==', 'confirmada')
      .get();

    const ventasWA = await db.collection('ventas').where('origen', '==', 'whatsapp').get();

    const montos = ventasWA.docs.map((doc) => doc.data().total || 0);
    const montoPromedio = montos.length > 0 ? montos.reduce((a, b) => a + b) / montos.length : 0;

    const ultimaVenta = ventasWA.docs.length > 0 ? ventasWA.docs[0].id : undefined;

    return {
      ordenesPendientes: pendientes.size,
      ordenesConfirmadas: confirmadas.size,
      ventasTotales: ventasWA.size,
      montoPromedio,
      ultimaOrden: ultimaVenta,
    };
  } catch (error) {
    console.error('Error getting order statistics:', error);
    return {
      ordenesPendientes: 0,
      ordenesConfirmadas: 0,
      ventasTotales: 0,
      montoPromedio: 0,
    };
  }
}
