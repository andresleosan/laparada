import * as admin from 'firebase-admin';
import { Venta } from '../types';

const db = admin.firestore();

/**
 * Envía actualizaciones de estado de entrega al cliente por WhatsApp
 */
export async function notificarEstadoEntrega(domicilioId: string, nuevoEstado: string): Promise<void> {
  try {
    // Obtener domicilio
    const domicilioDoc = await db.collection('domicilios').doc(domicilioId).get();

    if (!domicilioDoc.exists) {
      throw new Error('Domicilio no encontrado');
    }

    const domicilio = domicilioDoc.data() as any;
    if (!domicilio) {
      throw new Error('Domicilio vacío');
    }
    const numeroCliente = domicilio.numeroCliente || domicilio.telefonoCliente;

    if (!numeroCliente) {
      console.warn(`No phone number for delivery ${domicilioId}`);
      return;
    }

    let mensaje = '';
    let titulo = '';

    switch (nuevoEstado) {
      case 'confirmado':
        titulo = '✅ Pedido Confirmado';
        mensaje = `Tu pedido ha sido confirmado y será preparado.`;
        break;

      case 'en_preparacion':
        titulo = '👨‍🍳 En Preparación';
        mensaje = `Tu pedido está siendo preparado. Será enviado pronto.`;
        break;

      case 'listo':
        titulo = '📦 Pedido Listo';
        mensaje = `Tu pedido está listo. El domiciliario está en camino.`;
        break;

      case 'en_camino':
        titulo = '🚗 En Camino';
        mensaje = `¡Tu pedido está en camino! Será entregado en 15-20 minutos.`;

        if (domicilio && domicilio.domiciliarioId) {
          const domiciliarioDoc = await db.collection('usuarios').doc(domicilio.domiciliarioId).get();
          if (domiciliarioDoc.exists) {
            const domiciliario = domiciliarioDoc.data() as any;
            if (domiciliario) {
              mensaje += `\n\n👤 Domiciliario: ${domiciliario.nombre || 'N/A'}`;
              if (domiciliario.telefono) {
                mensaje += `\n📱 Teléfono: ${domiciliario.telefono}`;
              }
            }
          }
        }

        break;

      case 'entregado':
        titulo = '✅ Entregado';
        mensaje = `¡Tu pedido ha sido entregado! Gracias por tu compra.`;
        break;

      case 'cancelado':
        titulo = '❌ Pedido Cancelado';
        mensaje = `Tu pedido ha sido cancelado.`;
        break;

      default:
        return;
    }

    const contenidoCompleto = `${titulo}\n\n${mensaje}`;

    // Registrar envío en Firestore
    await registrarNotificacionEntrega(domicilioId, nuevoEstado, contenidoCompleto);

    console.log(`Delivery notification sent: ${domicilioId} - ${nuevoEstado}`);
  } catch (error) {
    console.error('Error notifying delivery status:', error);
    throw error;
  }
}

/**
 * Registra notificación de entrega
 */
async function registrarNotificacionEntrega(
  domicilioId: string,
  estado: string,
  mensaje: string
): Promise<void> {
  try {
    await db.collection('domicilios').doc(domicilioId).collection('notificaciones').add({
      tipo: 'estado_entrega',
      estado,
      mensaje,
      enviado: true,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error registering delivery notification:', error);
  }
}

/**
 * Genera actualizaciones automáticas de progreso
 * Se ejecuta cada 10 minutos para domicilios en camino
 */
export async function actualizarProgresoEntrega(): Promise<void> {
  try {
    // Obtener domicilios en camino que no han recibido actualización en 10 minutos
    const hace10Minutos = new Date(Date.now() - 10 * 60 * 1000);

    const domiciliosEnCamino = await db
      .collection('domicilios')
      .where('estado', '==', 'en_camino')
      .where('ultimaActualizacion', '<', admin.firestore.Timestamp.fromDate(hace10Minutos))
      .get();

    console.log(`Updating ${domiciliosEnCamino.size} deliveries...`);

    for (const doc of domiciliosEnCamino.docs) {
      const domicilio = doc.data();

      // Calcular tiempo transcurrido
      const salida =
        domicilio.horaEnCamino instanceof admin.firestore.Timestamp
          ? domicilio.horaEnCamino.toDate()
          : new Date(domicilio.horaEnCamino);

      const tiempoTranscurrido = (Date.now() - salida.getTime()) / 60000; // minutos

      // Si ha pasado mucho tiempo, notificar
      if (tiempoTranscurrido > 30) {
        await notificarEstadoEntrega(doc.id, 'en_camino_retrasado');
      } else if (tiempoTranscurrido > 15) {
        // Actualizar timestamp
        await db.collection('domicilios').doc(doc.id).update({
          ultimaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error('Error updating delivery progress:', error);
  }
}

/**
 * Obtiene estadísticas de entregas del día
 */
export async function obtenerEstadisticasEntregas(fecha?: Date) {
  try {
    const filtroFecha = fecha || new Date();
    filtroFecha.setHours(0, 0, 0, 0);

    const proximoDia = new Date(filtroFecha);
    proximoDia.setDate(proximoDia.getDate() + 1);

    const domiciliosDelDia = await db
      .collection('domicilios')
      .where('creadoEn', '>=', admin.firestore.Timestamp.fromDate(filtroFecha))
      .where('creadoEn', '<', admin.firestore.Timestamp.fromDate(proximoDia))
      .get();

    let totales = {
      confirmados: 0,
      enPreparacion: 0,
      enCamino: 0,
      entregados: 0,
      cancelados: 0,
      montoEntregado: 0,
      montoEnTransito: 0,
      tiempoPromedioEntrega: 0,
    };

    const tiemposEntrega: number[] = [];

    for (const doc of domiciliosDelDia.docs) {
      const domicilio = doc.data();

      switch (domicilio.estado) {
        case 'confirmado':
          totales.confirmados++;
          break;
        case 'en_preparacion':
          totales.enPreparacion++;
          break;
        case 'en_camino':
          totales.enCamino++;
          totales.montoEnTransito += domicilio.monto || 0;
          break;
        case 'entregado':
          totales.entregados++;
          totales.montoEntregado += domicilio.monto || 0;

          // Calcular tiempo de entrega
          if (domicilio.creadoEn && domicilio.entregadoEn) {
            const inicio =
              domicilio.creadoEn instanceof admin.firestore.Timestamp
                ? domicilio.creadoEn.toDate()
                : new Date(domicilio.creadoEn);

            const fin =
              domicilio.entregadoEn instanceof admin.firestore.Timestamp
                ? domicilio.entregadoEn.toDate()
                : new Date(domicilio.entregadoEn);

            tiemposEntrega.push((fin.getTime() - inicio.getTime()) / 60000); // minutos
          }
          break;
        case 'cancelado':
          totales.cancelados++;
          break;
      }
    }

    if (tiemposEntrega.length > 0) {
      totales.tiempoPromedioEntrega =
        Math.round(
          (tiemposEntrega.reduce((a, b) => a + b, 0) / tiemposEntrega.length) * 100
        ) / 100;
    }

    return totales;
  } catch (error) {
    console.error('Error fetching delivery statistics:', error);
    return null;
  }
}

/**
 * Reporte de entregas para el día
 */
export async function generarReporteEntregasDelDia(): Promise<string> {
  try {
    const stats = await obtenerEstadisticasEntregas();

    if (!stats) {
      return 'Error generando reporte';
    }

    const reporte = `
📊 REPORTE DE ENTREGAS DEL DÍA

✅ Entregados: ${stats.entregados}
🚗 En Camino: ${stats.enCamino}
👨‍🍳 En Preparación: ${stats.enPreparacion}
📋 Confirmados: ${stats.confirmados}
❌ Cancelados: ${stats.cancelados}

💰 Monto Entregado: $${stats.montoEntregado.toLocaleString('es-CO')}
🚚 Monto en Tránsito: $${stats.montoEnTransito.toLocaleString('es-CO')}

⏱️ Tiempo Promedio: ${stats.tiempoPromedioEntrega} minutos
    `;

    return reporte;
  } catch (error) {
    console.error('Error generating report:', error);
    return 'Error generando reporte';
  }
}
