"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.reintenrarMensajesEnError = exports.limpiarOrdenesExpiradas = exports.procesarMensajesBot = void 0;
const functions = __importStar(require("firebase-functions/v2/scheduler"));
const admin = __importStar(require("firebase-admin"));
const whatsappBotService_1 = require("./whatsappBotService");
const orderProcessingService_1 = require("./orderProcessingService");
const menuGenerationService_1 = require("./menuGenerationService");
const db = admin.firestore();
/**
 * Scheduled Cloud Function que procesa mensajes en queue
 * Se ejecuta cada 2 minutos
 */
exports.procesarMensajesBot = functions.onSchedule('every 2 minutes', async (context) => {
    try {
        console.log('Starting message processing job...');
        // Actualizar cache de menú si es necesario
        await (0, menuGenerationService_1.actualizarCacheMenu)();
        // Obtener mensajes pendientes
        const mensajesPendientes = await (0, whatsappBotService_1.obtenerMensajesPendientes)(20);
        console.log(`Processing ${mensajesPendientes.length} messages...`);
        for (const mensaje of mensajesPendientes) {
            try {
                await procesarUnMensaje(mensaje);
            }
            catch (error) {
                console.error(`Error processing message ${mensaje.id}:`, error);
                // Reintentar después
                await (0, whatsappBotService_1.reintenrarMensajeEnQueue)(mensaje.id, `Error: ${error}`);
            }
        }
        console.log('Message processing job completed');
    }
    catch (error) {
        console.error('Error in message processing job:', error);
    }
});
/**
 * Procesa un mensaje individual
 */
async function procesarUnMensaje(mensaje) {
    const { numeroOrigen, contenido, id: queueId } = mensaje;
    // Determinar intención del usuario
    const contenidoLower = contenido.toLowerCase();
    // SALUDO O INICIO
    if (['hola', 'hi', 'hey', 'ola', 'buenos'].some((s) => contenidoLower.includes(s)) &&
        contenidoLower.length < 20) {
        await (0, whatsappBotService_1.enviarAutoRespuesta)(numeroOrigen, 'BIENVENIDA');
        await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'saludo_enviado');
        return;
    }
    // MENÚ
    if (contenidoLower.includes('menú') ||
        contenidoLower.includes('menu') ||
        contenidoLower === '1') {
        const menuCache = await (0, menuGenerationService_1.obtenerMenuDelCache)();
        if (menuCache) {
            await (0, whatsappBotService_1.enviarAutoRespuesta)(numeroOrigen, 'BIENVENIDA');
            // Aquí se puede enviar el menú en un mensaje separado
        }
        await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'menu_solicitado');
        return;
    }
    // RASTREAR ORDEN
    if (contenidoLower.includes('rastrear') ||
        contenidoLower.includes('dónde') ||
        contenidoLower.includes('donde')) {
        // TODO: Implementar rastreo de órdenes
        await (0, whatsappBotService_1.enviarAutoRespuesta)(numeroOrigen, 'ORDEN_EN_CAMINO', {
            domiciliario: 'Juan Pérez',
            telefono: '3012345678',
            tiempoRestante: '15 minutos',
        });
        await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'rastreo_solicitado');
        return;
    }
    // SOPORTE
    if (contenidoLower.includes('soporte') ||
        contenidoLower.includes('ayuda') ||
        contenidoLower.includes('problema')) {
        await (0, whatsappBotService_1.enviarAutoRespuesta)(numeroOrigen, 'SOPORTE');
        // TODO: Crear ticket de soporte
        await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'soporte_contactado');
        return;
    }
    // VER ORDEN ACTUAL
    if (contenidoLower.includes('mi orden') ||
        contenidoLower.includes('resumen') ||
        contenidoLower === 'ver') {
        const orden = await (0, orderProcessingService_1.obtenerOrdenPendiente)(numeroOrigen);
        if (!orden) {
            await (0, whatsappBotService_1.enviarAutoRespuesta)(numeroOrigen, 'ERROR_COMANDO');
            await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'sin_orden');
            return;
        }
        const ordenFull = orden;
        if (!ordenFull.items) {
            await (0, whatsappBotService_1.enviarAutoRespuesta)(numeroOrigen, 'ERROR_COMANDO');
            await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'sin_orden');
            return;
        }
        const { resumen } = await (0, orderProcessingService_1.generarResumenOrden)(ordenFull.items);
        // Enviar resumen
        await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, 'resumen_enviado');
        return;
    }
    // PROCESAR COMO ORDEN
    const { accion, respuesta } = await (0, orderProcessingService_1.procesarMensajePorBot)(numeroOrigen, contenido);
    // Enviar respuesta
    // await enviarMensajeWhatsApp({
    //   numeroDestino: numeroOrigen,
    //   tipo: 'text',
    //   contenido: respuesta,
    // });
    await (0, whatsappBotService_1.marcarMensajeProcesado)(queueId, accion);
    console.log(`Message processed: ${numeroOrigen} - Acción: ${accion}`);
}
/**
 * Limpia órdenes expiradas
 * Se ejecuta cada hora
 */
exports.limpiarOrdenesExpiradas = functions.onSchedule('every 1 hours', async (context) => {
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
                await (0, whatsappBotService_1.enviarAutoRespuesta)(orden.numeroCliente, 'ERROR_COMANDO'
                // TODO: Mensaje personalizado de expiración
                );
            }
            catch (error) {
                console.error(`Error notifying customer ${orden.numeroCliente}:`, error);
            }
        }
        console.log('Cleanup completed');
    }
    catch (error) {
        console.error('Error in cleanup job:', error);
    }
});
/**
 * Reintenta mensajes en error
 * Se ejecuta cada 5 minutos
 */
exports.reintenrarMensajesEnError = functions.onSchedule('every 5 minutes', async (context) => {
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
    }
    catch (error) {
        console.error('Error in retry job:', error);
    }
});
