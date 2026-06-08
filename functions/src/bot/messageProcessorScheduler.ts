import * as functions from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import {
  obtenerMensajesPendientes,
  marcarMensajeProcesado,
  reintenrarMensajeEnQueue,
  enviarAutoRespuesta,
  TEMPLATES_AUTO_RESPUESTA,
} from './whatsappBotService';
import { procesarMensajePorBot, generarResumenOrden, obtenerOrdenPendiente } from './orderProcessingService';
import { obtenerMenuDelCache, actualizarCacheMenu } from './menuGenerationService';

const db = admin.firestore();

/**
 * Scheduled Cloud Function que procesa mensajes en queue
 * Se ejecuta cada 2 minutos
 */
export const procesarMensajesBot = functions.onSchedule('every 2 minutes', async (context) => {
  try {
    console.log('Starting message processing job...');

    // Actualizar cache de menú si es necesario
    await actualizarCacheMenu();

    // Obtener mensajes pendientes
    const mensajesPendientes = await obtenerMensajesPendientes(20);

    console.log(`Processing ${mensajesPendientes.length} messages...`);

    for (const mensaje of mensajesPendientes) {
      try {
        await procesarUnMensaje(mensaje);
      } catch (error) {
        console.error(`Error processing message ${mensaje.id}:`, error);
        // Reintentar después
        await reintenrarMensajeEnQueue(mensaje.id, `Error: ${error}`);
      }
    }

    console.log('Message processing job completed');
  } catch (error) {
    console.error('Error in message processing job:', error);
  }
});

/**
 * Procesa un mensaje individual
 */
async function procesarUnMensaje(mensaje: any): Promise<void> {
  const { numeroOrigen, contenido, id: queueId } = mensaje;

  // Determinar intención del usuario
  const contenidoLower = contenido.toLowerCase();

  // SALUDO O INICIO
  if (
    ['hola', 'hi', 'hey', 'ola', 'buenos'].some((s) => contenidoLower.includes(s)) &&
    contenidoLower.length < 20
  ) {
    await enviarAutoRespuesta(numeroOrigen, 'BIENVENIDA');
    await marcarMensajeProcesado(queueId, 'saludo_enviado');
    return;
  }

  // MENÚ
  if (
    contenidoLower.includes('menú') ||
    contenidoLower.includes('menu') ||
    contenidoLower === '1'
  ) {
    const menuCache = await obtenerMenuDelCache();

    if (menuCache) {
      await enviarAutoRespuesta(numeroOrigen, 'BIENVENIDA');
      // Aquí se puede enviar el menú en un mensaje separado
    }
    await marcarMensajeProcesado(queueId, 'menu_solicitado');
    return;
  }

  // RASTREAR ORDEN
  if (
    contenidoLower.includes('rastrear') ||
    contenidoLower.includes('dónde') ||
    contenidoLower.includes('donde')
  ) {
    // TODO: Implementar rastreo de órdenes
    await enviarAutoRespuesta(numeroOrigen, 'ORDEN_EN_CAMINO', {
      domiciliario: 'Juan Pérez',
      telefono: '3012345678',
      tiempoRestante: '15 minutos',
    });
    await marcarMensajeProcesado(queueId, 'rastreo_solicitado');
    return;
  }

  // SOPORTE
  if (
    contenidoLower.includes('soporte') ||
    contenidoLower.includes('ayuda') ||
    contenidoLower.includes('problema')
  ) {
    await enviarAutoRespuesta(numeroOrigen, 'SOPORTE');
    // TODO: Crear ticket de soporte
    await marcarMensajeProcesado(queueId, 'soporte_contactado');
    return;
  }

  // VER ORDEN ACTUAL
  if (
    contenidoLower.includes('mi orden') ||
    contenidoLower.includes('resumen') ||
    contenidoLower === 'ver'
  ) {
    const orden = await obtenerOrdenPendiente(numeroOrigen);

    if (!orden) {
      await enviarAutoRespuesta(numeroOrigen, 'ERROR_COMANDO');
      await marcarMensajeProcesado(queueId, 'sin_orden');
      return;
    }

    const ordenFull = orden as any;
    if (!ordenFull.items) {
      await enviarAutoRespuesta(numeroOrigen, 'ERROR_COMANDO');
      await marcarMensajeProcesado(queueId, 'sin_orden');
      return;
    }

    const { resumen } = await generarResumenOrden(ordenFull.items);
    // Enviar resumen
    await marcarMensajeProcesado(queueId, 'resumen_enviado');
    return;
  }

  // PROCESAR COMO ORDEN
  const { accion, respuesta } = await procesarMensajePorBot(numeroOrigen, contenido);

  // Enviar respuesta
  // await enviarMensajeWhatsApp({
  //   numeroDestino: numeroOrigen,
  //   tipo: 'text',
  //   contenido: respuesta,
  // });

  await marcarMensajeProcesado(queueId, accion);

  console.log(`Message processed: ${numeroOrigen} - Acción: ${accion}`);
}

/**
 * Limpia órdenes expiradas
 * Se ejecuta cada hora
 */
export const limpiarOrdenesExpiradas = functions.onSchedule('every 1 hours', async (context) => {
  try {
    console.log('Starting cleanup of expired orders...');

    const ahora = admin.firestore.Timestamp.now();

    const ordenesExpiradas = await db
      .collection('ordenes_pendientes')
      .where('estado', '==', 'pendiente')
      .where('expiraEn', '<', ahora)
      .get();

    console.log(`Found ${ordenesExpiradas.size} expired orders`);

    for (const doc of ordenesExpiradas.docs) {
      await db.collection('ordenes_pendientes').doc(doc.id).update({
        estado: 'expirada',
      });

      // Notificar al cliente
      const orden = doc.data();
      try {
        await enviarAutoRespuesta(
          orden.numeroCliente,
          'ERROR_COMANDO'
          // TODO: Mensaje personalizado de expiración
        );
      } catch (error) {
        console.error(`Error notifying customer ${orden.numeroCliente}:`, error);
      }
    }

    console.log('Cleanup completed');
  } catch (error) {
    console.error('Error in cleanup job:', error);
  }
});

/**
 * Reintenta mensajes en error
 * Se ejecuta cada 5 minutos
 */
export const reintenrarMensajesEnError = functions.onSchedule('every 5 minutes', async (context) => {
  try {
    console.log('Starting retry of failed messages...');

    const proximoReintento = admin.firestore.Timestamp.now();

    const mensajesEnError = await db
      .collection('bot_queue')
      .where('estado', '==', 'error')
      .where('proximoReintento', '<=', proximoReintento)
      .where('intentos', '<', 3)
      .get();

    console.log(`Retrying ${mensajesEnError.size} failed messages`);

    for (const doc of mensajesEnError.docs) {
      const mensaje = doc.data();

      // Cambiar estado a pendiente para reprocesar
      await db.collection('bot_queue').doc(doc.id).update({
        estado: 'pendiente',
      });
    }

    console.log('Retry started');
  } catch (error) {
    console.error('Error in retry job:', error);
  }
});
