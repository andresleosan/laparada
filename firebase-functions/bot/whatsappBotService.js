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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEMPLATES_AUTO_RESPUESTA = void 0;
exports.enviarMensajeWhatsApp = enviarMensajeWhatsApp;
exports.renderAutoRespuesta = renderAutoRespuesta;
exports.obtenerMensajesPendientes = obtenerMensajesPendientes;
exports.reclamarMensajeQueue = reclamarMensajeQueue;
exports.enviarRespuestaQueue = enviarRespuestaQueue;
exports.guardarResultadoQueue = guardarResultadoQueue;
exports.enviarMensajeBotPersistido = enviarMensajeBotPersistido;
exports.marcarMensajeProcesado = marcarMensajeProcesado;
exports.reintenrarMensajeEnQueue = reintenrarMensajeEnQueue;
exports.obtenerEstadisticasBot = obtenerEstadisticasBot;
const axios_1 = __importDefault(require("axios"));
const admin = __importStar(require("firebase-admin"));
const integrationParams_1 = require("../config/integrationParams");
const manualMessage_1 = require("./manualMessage");
const getDb = () => admin.firestore();
function getConfiguredTenantId() {
    return (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappNegocioId.value(), 'WHATSAPP_NEGOCIO_ID');
}
async function assertQueueTenant(queueId, negocioId) {
    const snapshot = await getDb().collection('bot_queue').doc(queueId).get();
    if (!snapshot.exists || snapshot.data()?.negocioId !== negocioId) {
        throw new Error('Queue message does not belong to the configured tenant');
    }
}
/**
 * Envía un mensaje por WhatsApp Business API
 */
async function enviarMensajeWhatsApp(mensaje) {
    try {
        const phoneNumberId = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappPhoneNumberId.value(), 'WHATSAPP_PHONE_NUMBER_ID');
        const accessToken = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappAccessToken.value(), 'WHATSAPP_ACCESS_TOKEN');
        const apiVersion = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappApiVersion.value(), 'WHATSAPP_API_VERSION');
        if (!/^\d+$/.test(phoneNumberId) || !/^v\d+\.\d+$/.test(apiVersion)) {
            throw new Error('WhatsApp API configuration is invalid');
        }
        const apiBase = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
        const destination = mensaje.numeroDestino.replace(/\D/g, '');
        if (!/^\d{6,20}$/.test(destination)) {
            throw new Error('WhatsApp destination number is invalid');
        }
        if (!mensaje.contenido || mensaje.contenido.length > 4096) {
            throw new Error('WhatsApp message content is invalid');
        }
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: destination,
        };
        payload.type = 'text';
        payload.text = {
            preview_url: false,
            body: mensaje.contenido,
        };
        const response = await axios_1.default.post(`${apiBase}/messages`, payload, {
            timeout: 10000,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });
        const messageId = response.data?.messages?.[0]?.id;
        if (typeof messageId !== 'string' || !messageId) {
            throw new Error('WhatsApp API returned an invalid response');
        }
        console.log(`Message sent: ${messageId}`);
        return messageId;
    }
    catch (error) {
        const axiosError = error;
        console.error('Error sending WhatsApp message', {
            status: axiosError.response?.status,
            code: axiosError.code,
            message: axiosError.message,
        });
        throw error;
    }
}
/**
 * Plantillas de auto-respuesta predefinidas
 */
exports.TEMPLATES_AUTO_RESPUESTA = {
    BIENVENIDA: `¡Hola! 👋 Bienvenido.

Aquí puedes:
1️⃣ Ver nuestro menú
2️⃣ Hacer un pedido
3️⃣ Rastrear tu entrega
4️⃣ Hablar con soporte

¿Qué deseas hacer?`,
    MENU_DISPONIBLE: `📋 NUESTRO MENÚ:

{items}

Para pedir, responde el número del producto o escriba "menú completo" para más detalles.`,
    CONFIRMAR_ORDEN: `✅ ¡Tu pedido fue confirmado!

Productos: {productos}
Total: {total}
Pago offline: {metodoPago}
Tiempo estimado: {tiempo}

¿Deseas rastrear tu entrega? Responde "rastrear"`,
    ORDEN_EN_CAMINO: `🚗 ¡Tu orden está en camino!

📍 Domiciliario: {domiciliario}
📱 Teléfono: {telefono}
⏱️ Llega en: {tiempoRestante}

Comparte ubicación si lo necesitas 📍`,
    ORDEN_ENTREGADA: `✅ ¡Tu orden ha sido entregada!

Gracias por tu compra. 
¿Deseas ordenar algo más? Responde "menú"`,
    SOPORTE: `👨‍💼 Conectando con soporte...

Un agente responderá en breve. 
Por favor describe tu problema.`,
    ERROR_COMANDO: `😕 No entiendo ese comando.

Opciones disponibles:
📋 menú
🛒 pedir
📍 rastrear
💬 soporte

¿En qué puedo ayudarte?`,
};
function renderAutoRespuesta(plantilla, variables) {
    let contenido = exports.TEMPLATES_AUTO_RESPUESTA[plantilla];
    // Reemplazar variables
    if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
            contenido = contenido.replace(`{${key}}`, value);
        });
    }
    return contenido;
}
/**
 * Obtiene mensajes pendientes de procesar
 */
async function obtenerMensajesPendientes(limite = 10) {
    const negocioId = getConfiguredTenantId();
    const snapshot = await getDb()
        .collection('bot_queue')
        .where('negocioId', '==', negocioId)
        .where('estado', '==', 'pendiente')
        .orderBy('creadoEn', 'asc')
        .limit(Math.min(Math.max(limite, 1), 50))
        .get();
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}
async function reclamarMensajeQueue(queueId) {
    const negocioId = getConfiguredTenantId();
    const queueRef = getDb().collection('bot_queue').doc(queueId);
    return getDb().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(queueRef);
        const data = snapshot.data();
        if (!snapshot.exists || data?.negocioId !== negocioId || data?.estado !== 'pendiente') {
            return null;
        }
        transaction.update(queueRef, {
            estado: 'procesando',
            procesandoEn: admin.firestore.FieldValue.serverTimestamp(),
            leaseHasta: admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 60 * 1000),
        });
        return { id: snapshot.id, ...data, estado: 'procesando' };
    });
}
async function enviarRespuestaQueue(mensaje, contenido) {
    const negocioId = getConfiguredTenantId();
    if (mensaje.negocioId !== negocioId) {
        throw new Error('Queue message does not belong to the configured tenant');
    }
    const result = await (0, manualMessage_1.sendPersistedWhatsAppMessage)(getDb(), {
        outboundId: `bot_${mensaje.id}`,
        negocioId,
        telefono: mensaje.numeroOrigen,
        contenido,
        origen: 'bot',
        mensajeEntradaId: mensaje.mensajeId,
        queueId: mensaje.id,
    }, enviarMensajeWhatsApp);
    return result.mensajeId;
}
async function guardarResultadoQueue(queueId, accion, respuesta) {
    const negocioId = getConfiguredTenantId();
    await assertQueueTenant(queueId, negocioId);
    if (!accion || accion.length > 100 || !respuesta || respuesta.length > 4096) {
        throw new Error('Bot result is invalid');
    }
    await getDb().collection('bot_queue').doc(queueId).update({
        accionPendiente: accion,
        respuestaPendiente: respuesta,
        logicaProcesadaEn: admin.firestore.FieldValue.serverTimestamp(),
    });
}
async function enviarMensajeBotPersistido(input) {
    const negocioId = getConfiguredTenantId();
    const result = await (0, manualMessage_1.sendPersistedWhatsAppMessage)(getDb(), {
        outboundId: input.outboundId,
        negocioId,
        telefono: input.telefono,
        contenido: input.contenido,
        origen: 'bot',
    }, enviarMensajeWhatsApp);
    return result.mensajeId;
}
/**
 * Marca mensaje como procesado
 */
async function marcarMensajeProcesado(queueId, accionRealizada) {
    try {
        const negocioId = getConfiguredTenantId();
        await assertQueueTenant(queueId, negocioId);
        const queueRef = getDb().collection('bot_queue').doc(queueId);
        const queueSnapshot = await queueRef.get();
        const batch = getDb().batch();
        batch.update(queueRef, {
            estado: 'procesado',
            accionRealizada,
            procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
            leaseHasta: admin.firestore.FieldValue.delete(),
        });
        const mensajeId = queueSnapshot.data()?.mensajeId;
        if (typeof mensajeId === 'string' && mensajeId) {
            batch.update(getDb().collection('mensajes_whatsapp').doc(mensajeId), {
                procesado: true,
                procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
                actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        await batch.commit();
    }
    catch (error) {
        console.error('Error marking message as processed:', error);
        throw error;
    }
}
/**
 * Reintentar mensaje fallido
 */
async function reintenrarMensajeEnQueue(queueId, razonError) {
    try {
        const negocioId = getConfiguredTenantId();
        const queueRef = getDb().collection('bot_queue').doc(queueId);
        await getDb().runTransaction(async (transaction) => {
            const snapshot = await transaction.get(queueRef);
            const data = snapshot.data();
            if (!snapshot.exists || data?.negocioId !== negocioId) {
                throw new Error('Queue message does not belong to the configured tenant');
            }
            const intentos = Math.max(0, Number(data?.intentos) || 0) + 1;
            const delayMs = Math.min(15, 2 ** intentos) * 60 * 1000;
            transaction.update(queueRef, {
                estado: intentos >= 3 ? 'descartado' : 'error',
                razonError: razonError.slice(0, 300),
                intentos,
                proximoReintento: admin.firestore.Timestamp.fromMillis(Date.now() + delayMs),
                ultimoError: admin.firestore.FieldValue.serverTimestamp(),
                leaseHasta: admin.firestore.FieldValue.delete(),
            });
        });
    }
    catch (error) {
        console.error('Error retrying message:', error);
        throw error;
    }
}
/**
 * Obtiene estadísticas del bot
 */
async function obtenerEstadisticasBot() {
    try {
        const negocioId = getConfiguredTenantId();
        const totalRef = getDb().collection('bot_queue');
        const recibidosSnapshot = await totalRef
            .where('negocioId', '==', negocioId)
            .where('estado', '==', 'pendiente')
            .get();
        const procesadosSnapshot = await totalRef
            .where('negocioId', '==', negocioId)
            .where('estado', '==', 'procesado')
            .get();
        const erroresSnapshot = await totalRef
            .where('negocioId', '==', negocioId)
            .where('estado', '==', 'error')
            .get();
        const ordenes = await getDb()
            .collection('ventas')
            .where('negocioId', '==', negocioId)
            .where('origen', '==', 'whatsapp')
            .get();
        const total = recibidosSnapshot.size + procesadosSnapshot.size + erroresSnapshot.size;
        const tasaExito = total > 0
            ? ((procesadosSnapshot.size / (procesadosSnapshot.size + erroresSnapshot.size)) * 100).toFixed(2)
            : '100';
        return {
            mensajesRecibidos: total,
            mensajesProcesados: procesadosSnapshot.size,
            mensajesEnError: erroresSnapshot.size,
            ordenesProcesadas: ordenes.size,
            tasaExito: parseFloat(tasaExito),
        };
    }
    catch (error) {
        console.error('Error fetching bot statistics:', error);
        return {
            mensajesRecibidos: 0,
            mensajesProcesados: 0,
            mensajesEnError: 0,
            ordenesProcesadas: 0,
            tasaExito: 0,
        };
    }
}
