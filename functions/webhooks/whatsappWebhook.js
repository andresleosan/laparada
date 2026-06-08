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
exports.whatsappWebhook = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
/**
 * Webhook para WhatsApp Business API
 * Procesa eventos de estado de entrega (sent, delivered, read, failed)
 * Formato esperado según Meta/WhatsApp Business API
 */
exports.whatsappWebhook = functions.onRequest(async (req, res) => {
    // GET para verificación inicial del webhook
    if (req.method === 'GET') {
        handleWebhookVerification(req, res);
        return;
    }
    // POST para procesar eventos
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { entry } = req.body;
        if (!Array.isArray(entry)) {
            res.status(400).json({ error: 'Invalid payload format' });
            return;
        }
        for (const entryItem of entry) {
            if (entryItem.changes) {
                for (const change of entryItem.changes) {
                    const { value } = change;
                    // Procesar status updates (delivery status)
                    if (value.statuses) {
                        await processStatusUpdates(value.statuses);
                    }
                    // Procesar mensajes incoming
                    if (value.messages) {
                        await processIncomingMessages(value.messages);
                    }
                }
            }
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error processing WhatsApp webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
/**
 * Maneja la verificación del webhook (GET request)
 */
function handleWebhookVerification(req, res) {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN || 'test_token';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === verifyToken) {
        console.log('Webhook verified');
        res.status(200).send(challenge);
    }
    else {
        res.status(403).json({ error: 'Forbidden' });
    }
}
/**
 * Procesa actualizaciones de estado de entrega
 */
async function processStatusUpdates(statuses) {
    for (const status of statuses) {
        const { id: messageId, status: deliveryStatus, timestamp } = status;
        if (!messageId)
            continue;
        try {
            // Mapear estado de WhatsApp al nuestro
            const mappedStatus = mapWhatsappStatus(deliveryStatus);
            // Buscar el mensaje en nuestra BD por referencia de WhatsApp
            const messagesRef = db.collection('mensajes_whatsapp');
            const query = messagesRef.where('referenciaWhatsapp', '==', messageId);
            const snapshot = await query.get();
            if (snapshot.empty) {
                console.warn(`No message found with WhatsApp reference: ${messageId}`);
                continue;
            }
            const docId = snapshot.docs[0].id;
            // Actualizar estado del mensaje
            await messagesRef.doc(docId).update({
                estado: mappedStatus,
                actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
                ...(mappedStatus === 'entregado' && {
                    entregadoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
                }),
                ...(mappedStatus === 'leido' && {
                    leidoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
                }),
            });
            // Registrar evento de entrega en subcollection
            await messagesRef.doc(docId).collection('eventos_entrega').add({
                tipo: mappedStatus,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                referenciaWhatsapp: messageId,
                metadatos: {
                    timestampOriginal: timestamp,
                },
            });
            console.log(`Message ${docId} status updated to: ${mappedStatus}`);
        }
        catch (error) {
            console.error('Error processing status update:', error);
        }
    }
}
/**
 * Procesa mensajes entrantes
 */
async function processIncomingMessages(messages) {
    for (const message of messages) {
        const { from, id: messageId, timestamp, type, text } = message;
        if (!from || !messageId)
            continue;
        try {
            const messagesRef = db.collection('mensajes_whatsapp');
            // Crear registro del mensaje entrante
            await messagesRef.add({
                tipo: 'entrante',
                desde: from,
                contenido: text?.body || '',
                tipoContenido: type,
                referenciaWhatsapp: messageId,
                estado: 'entregado',
                creadoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
                actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
                entregadoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
                leidoEn: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`Incoming message stored from ${from}`);
        }
        catch (error) {
            console.error('Error processing incoming message:', error);
        }
    }
}
/**
 * Mapea estados de WhatsApp a estados internos
 */
function mapWhatsappStatus(whatsappStatus) {
    switch (whatsappStatus) {
        case 'sent':
            return 'enviado';
        case 'delivered':
            return 'entregado';
        case 'read':
            return 'leido';
        case 'failed':
            return 'fallido';
        default:
            return 'enviado';
    }
}
