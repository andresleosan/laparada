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
exports.enviarAutoRespuesta = enviarAutoRespuesta;
exports.registrarMensajeEnQueue = registrarMensajeEnQueue;
exports.obtenerMensajesPendientes = obtenerMensajesPendientes;
exports.marcarMensajeProcesado = marcarMensajeProcesado;
exports.reintenrarMensajeEnQueue = reintenrarMensajeEnQueue;
exports.obtenerEstadisticasBot = obtenerEstadisticasBot;
const axios_1 = __importDefault(require("axios"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const WHATSAPP_API_VERSION = 'v18.0';
const WHATSAPP_BUSINESS_PHONE_ID = process.env.WHATSAPP_BUSINESS_PHONE_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN; // Reutilizar si está disponible
const WHATSAPP_API_BASE = `https://graph.instagram.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_PHONE_ID}`;
/**
 * Envía un mensaje por WhatsApp Business API
 */
async function enviarMensajeWhatsApp(mensaje) {
    try {
        if (!WHATSAPP_BUSINESS_PHONE_ID || !WHATSAPP_ACCESS_TOKEN) {
            throw new Error('WhatsApp credentials not configured');
        }
        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: mensaje.numeroDestino.replace(/\D/g, ''), // Solo números
        };
        if (mensaje.tipo === 'text') {
            payload.type = 'text';
            payload.text = {
                preview_url: true,
                body: mensaje.contenido,
            };
        }
        else if (mensaje.tipo === 'image') {
            payload.type = 'image';
            payload.image = {
                link: mensaje.mediaUrl,
            };
        }
        else if (mensaje.tipo === 'document') {
            payload.type = 'document';
            payload.document = {
                link: mensaje.mediaUrl,
                caption: mensaje.contenido,
            };
        }
        else if (mensaje.tipo === 'template') {
            payload.type = 'template';
            payload.template = {
                name: mensaje.plantilla,
                language: {
                    code: 'es',
                },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: mensaje.contenido,
                            },
                        ],
                    },
                ],
            };
        }
        const response = await axios_1.default.post(`${WHATSAPP_API_BASE}/messages`, payload, {
            headers: {
                Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
        const messageId = response.data.messages[0].id;
        console.log(`Message sent: ${messageId}`);
        return messageId;
    }
    catch (error) {
        const axiosError = error;
        console.error('Error sending WhatsApp message:', axiosError.response?.data || error);
        throw error;
    }
}
/**
 * Plantillas de auto-respuesta predefinidas
 */
exports.TEMPLATES_AUTO_RESPUESTA = {
    BIENVENIDA: `¡Hola! 👋 Bienvenido a La Parada. 

Aquí puedes:
1️⃣ Ver nuestro menú
2️⃣ Hacer un pedido
3️⃣ Rastrear tu entrega
4️⃣ Hablar con soporte

¿Qué deseas hacer?`,
    MENU_DISPONIBLE: `📋 NUESTRO MENÚ:

{items}

Para pedir, responde el número del producto o escriba "menú completo" para más detalles.`,
    CONFIRMAR_ORDEN: `✅ Tu orden ha sido confirmada!

Productos: {productos}
Total: {total}
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
    PAGO_PENDIENTE: `💳 Pago Pendiente

Tu orden {orderId} está lista pero requiere confirmación de pago.

Monto: {monto}

Opciones de pago:
1️⃣ Transferencia
2️⃣ Daviplata
3️⃣ PayPal

Responde el número de tu opción.`,
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
/**
 * Envía respuesta automática basada en template
 */
async function enviarAutoRespuesta(numeroDestino, plantilla, variables) {
    let contenido = exports.TEMPLATES_AUTO_RESPUESTA[plantilla];
    // Reemplazar variables
    if (variables) {
        Object.entries(variables).forEach(([key, value]) => {
            contenido = contenido.replace(`{${key}}`, value);
        });
    }
    return enviarMensajeWhatsApp({
        numeroDestino,
        tipo: 'text',
        contenido,
    });
}
/**
 * Registra mensaje en Firestore con queue para procesamiento
 */
async function registrarMensajeEnQueue(numeroOrigen, contenido, tipo) {
    try {
        const mensajeRef = db.collection('mensajes_whatsapp').doc();
        const ahora = admin.firestore.FieldValue.serverTimestamp();
        await mensajeRef.set({
            telefono: numeroOrigen,
            contenido,
            tipo,
            estado: 'recibido',
            creadoEn: ahora,
            actualizadoEn: ahora,
            procesado: false,
            intentosProcesamiento: 0,
        });
        // Agregar a queue de procesamiento
        const queueRef = db.collection('bot_queue').doc();
        await queueRef.set({
            mensajeId: mensajeRef.id,
            numeroOrigen,
            contenido,
            estado: 'pendiente',
            creadoEn: ahora,
            proximoReintento: ahora,
            intentos: 0,
        });
        console.log(`Message queued: ${mensajeRef.id}`);
        return mensajeRef.id;
    }
    catch (error) {
        console.error('Error registering message in queue:', error);
        throw error;
    }
}
/**
 * Obtiene mensajes pendientes de procesar
 */
async function obtenerMensajesPendientes(limite = 10) {
    try {
        const snapshot = await db
            .collection('bot_queue')
            .where('estado', '==', 'pendiente')
            .orderBy('creadoEn', 'asc')
            .limit(limite)
            .get();
        return snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }
    catch (error) {
        console.error('Error fetching pending messages:', error);
        return [];
    }
}
/**
 * Marca mensaje como procesado
 */
async function marcarMensajeProcesado(queueId, accionRealizada) {
    try {
        await db.collection('bot_queue').doc(queueId).update({
            estado: 'procesado',
            accionRealizada,
            procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
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
        const now = new Date();
        const proximoReintento = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos
        await db.collection('bot_queue').doc(queueId).update({
            estado: 'error',
            razonError,
            intentos: admin.firestore.FieldValue.increment(1),
            proximoReintento: admin.firestore.Timestamp.fromDate(proximoReintento),
            ultimoError: admin.firestore.FieldValue.serverTimestamp(),
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
        const totalRef = db.collection('bot_queue');
        const recibidosSnapshot = await totalRef.where('estado', '==', 'pendiente').get();
        const procesadosSnapshot = await totalRef.where('estado', '==', 'procesado').get();
        const erroresSnapshot = await totalRef.where('estado', '==', 'error').get();
        const ordenes = await db
            .collection('ventas')
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
