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
exports.processWebhookPayload = processWebhookPayload;
const crypto_1 = require("crypto");
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2/https"));
const integrationParams_1 = require("../config/integrationParams");
const webhookSignatures_1 = require("../security/webhookSignatures");
const MAX_ENTRIES = 25;
const MAX_CHANGES_PER_ENTRY = 25;
const MAX_EVENTS_PER_CHANGE = 100;
const MAX_TOTAL_EVENTS = 100;
const MAX_WEBHOOK_BODY_BYTES = 1000000;
class PayloadValidationError extends Error {
}
const getDb = () => admin.firestore();
function asRecord(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new PayloadValidationError(`${field} must be an object`);
    }
    return value;
}
function asBoundedArray(value, field, maxItems) {
    if (!Array.isArray(value) || value.length > maxItems) {
        throw new PayloadValidationError(`${field} must be an array with at most ${maxItems} items`);
    }
    return value;
}
function asNonEmptyString(value, field, maxLength = 256) {
    if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
        throw new PayloadValidationError(`${field} must be a non-empty string`);
    }
    return value.trim();
}
function parseWhatsappTimestamp(value) {
    const raw = asNonEmptyString(String(value ?? ''), 'timestamp', 20);
    if (!/^\d{10,11}$/.test(raw)) {
        throw new PayloadValidationError('timestamp has an invalid format');
    }
    const seconds = Number(raw);
    if (!Number.isSafeInteger(seconds) || seconds <= 0) {
        throw new PayloadValidationError('timestamp is out of range');
    }
    return admin.firestore.Timestamp.fromMillis(seconds * 1000);
}
function deterministicId(...parts) {
    return (0, crypto_1.createHash)('sha256').update(parts.join('\u0000')).digest('hex');
}
function getSingleHeader(value) {
    return typeof value === 'string' ? value : '';
}
/**
 * Webhook de WhatsApp Business API.
 * La autenticidad se valida antes de interpretar el payload o escribir en Firestore.
 */
exports.whatsappWebhook = functions.onRequest({
    secrets: [integrationParams_1.whatsappAppSecret, integrationParams_1.whatsappWebhookVerifyToken],
    timeoutSeconds: 30,
    maxInstances: 10,
}, async (req, res) => {
    if (req.method === 'GET') {
        handleWebhookVerification(req, res);
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    if (!Buffer.isBuffer(req.rawBody) || req.rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
        res.status(413).json({ error: 'Payload too large' });
        return;
    }
    let appSecret;
    try {
        appSecret = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappAppSecret.value(), 'WHATSAPP_APP_SECRET');
    }
    catch (error) {
        console.error('WhatsApp webhook is not configured:', error);
        res.status(503).json({ error: 'Webhook not configured' });
        return;
    }
    const signature = getSingleHeader(req.headers['x-hub-signature-256']);
    if (!(0, webhookSignatures_1.verifyMetaSignature)({ signatureHeader: signature, rawBody: req.rawBody, appSecret })) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
    }
    let expectedPhoneNumberId;
    let negocioId;
    try {
        expectedPhoneNumberId = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappPhoneNumberId.value(), 'WHATSAPP_PHONE_NUMBER_ID');
        negocioId = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappNegocioId.value(), 'WHATSAPP_NEGOCIO_ID');
        if (!/^\d+$/.test(expectedPhoneNumberId) || !/^[A-Za-z0-9_-]{1,64}$/.test(negocioId)) {
            throw new Error('WhatsApp tenant configuration is invalid');
        }
    }
    catch (error) {
        console.error('WhatsApp webhook tenant configuration is incomplete:', error);
        res.status(503).json({ error: 'Webhook not configured' });
        return;
    }
    try {
        const processedEvents = await processWebhookPayload(getDb(), req.body, expectedPhoneNumberId, negocioId);
        res.status(200).json({ received: true, processedEvents });
    }
    catch (error) {
        if (error instanceof PayloadValidationError) {
            console.warn('Rejected invalid WhatsApp payload:', error.message);
            res.status(400).json({ error: 'Invalid payload format' });
            return;
        }
        console.error('Error processing WhatsApp webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
function handleWebhookVerification(req, res) {
    let verifyToken;
    try {
        verifyToken = (0, integrationParams_1.requireConfiguredValue)(integrationParams_1.whatsappWebhookVerifyToken.value(), 'WHATSAPP_WEBHOOK_VERIFY_TOKEN');
    }
    catch (error) {
        console.error('WhatsApp verification token is not configured:', error);
        res.status(503).json({ error: 'Webhook not configured' });
        return;
    }
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' &&
        typeof token === 'string' &&
        token === verifyToken &&
        typeof challenge === 'string') {
        res.status(200).send(challenge);
        return;
    }
    res.status(403).json({ error: 'Forbidden' });
}
async function processWebhookPayload(db, payload, expectedPhoneNumberId, negocioId) {
    const body = asRecord(payload, 'body');
    if (body.object !== 'whatsapp_business_account') {
        throw new PayloadValidationError('body.object is invalid');
    }
    const entries = asBoundedArray(body.entry, 'entry', MAX_ENTRIES);
    const parsedStatuses = [];
    const parsedMessages = [];
    let receivedEvents = 0;
    for (const rawEntry of entries) {
        const entry = asRecord(rawEntry, 'entry item');
        const changes = asBoundedArray(entry.changes, 'entry.changes', MAX_CHANGES_PER_ENTRY);
        for (const rawChange of changes) {
            const change = asRecord(rawChange, 'change');
            if (change.field !== 'messages')
                continue;
            const value = asRecord(change.value, 'change.value');
            const metadata = asRecord(value.metadata, 'change.value.metadata');
            if (metadata.phone_number_id !== expectedPhoneNumberId) {
                throw new PayloadValidationError('phone_number_id does not match configured number');
            }
            if (value.statuses !== undefined) {
                const statuses = asBoundedArray(value.statuses, 'change.value.statuses', MAX_EVENTS_PER_CHANGE);
                receivedEvents += statuses.length;
                parsedStatuses.push(...parseStatusEvents(statuses));
            }
            if (value.messages !== undefined) {
                const messages = asBoundedArray(value.messages, 'change.value.messages', MAX_EVENTS_PER_CHANGE);
                receivedEvents += messages.length;
                parsedMessages.push(...parseIncomingMessages(messages));
            }
            if (receivedEvents > MAX_TOTAL_EVENTS) {
                throw new PayloadValidationError(`payload must contain at most ${MAX_TOTAL_EVENTS} events`);
            }
        }
    }
    await processStatusUpdates(db, parsedStatuses, negocioId);
    await processIncomingMessages(db, parsedMessages, negocioId);
    return receivedEvents;
}
function parseStatusEvents(statuses) {
    const parsed = [];
    for (const rawStatus of statuses) {
        const status = asRecord(rawStatus, 'status');
        const messageId = asNonEmptyString(status.id, 'status.id');
        const mappedStatus = mapWhatsappStatus(asNonEmptyString(status.status, 'status.status', 32));
        const eventTimestamp = parseWhatsappTimestamp(status.timestamp);
        if (mappedStatus)
            parsed.push({ messageId, mappedStatus, eventTimestamp });
    }
    return parsed;
}
function parseIncomingMessages(messages) {
    return messages.map((rawMessage) => {
        const message = asRecord(rawMessage, 'message');
        const from = asNonEmptyString(message.from, 'message.from', 32);
        if (!/^\d{6,20}$/.test(from)) {
            throw new PayloadValidationError('message.from has an invalid format');
        }
        const messageId = asNonEmptyString(message.id, 'message.id');
        const type = asNonEmptyString(message.type, 'message.type', 32);
        const createdAt = parseWhatsappTimestamp(message.timestamp);
        const text = message.text === undefined ? undefined : asRecord(message.text, 'message.text');
        const content = text?.body === undefined ? '' : asNonEmptyString(text.body, 'message.text.body', 4096);
        return { from, messageId, type, createdAt, content };
    });
}
async function processStatusUpdates(db, statuses, negocioId) {
    const messagesRef = db.collection('mensajes_whatsapp');
    for (const { messageId, mappedStatus, eventTimestamp } of statuses) {
        const snapshot = await messagesRef
            .where('referenciaWhatsapp', '==', messageId)
            .where('negocioId', '==', negocioId)
            .limit(1)
            .get();
        if (snapshot.empty) {
            console.warn(`No WhatsApp message found for reference ${messageId}`);
            continue;
        }
        const messageRef = snapshot.docs[0].ref;
        const eventRef = messageRef
            .collection('eventos_entrega')
            .doc(deterministicId(messageId, mappedStatus, eventTimestamp.toMillis().toString()));
        await db.runTransaction(async (transaction) => {
            const [messageSnapshot, eventSnapshot] = await Promise.all([
                transaction.get(messageRef),
                transaction.get(eventRef),
            ]);
            if (!messageSnapshot.exists || eventSnapshot.exists)
                return;
            const currentStatus = messageSnapshot.get('estado');
            const update = {
                actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (shouldAdvanceStatus(currentStatus, mappedStatus)) {
                update.estado = mappedStatus;
                if (mappedStatus === 'entregado')
                    update.entregadoEn = eventTimestamp;
                if (mappedStatus === 'leido')
                    update.leidoEn = eventTimestamp;
                if (mappedStatus === 'fallido')
                    update.falloEn = eventTimestamp;
            }
            transaction.update(messageRef, update);
            transaction.create(eventRef, {
                tipo: mappedStatus,
                ocurridoEn: eventTimestamp,
                procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
                referenciaWhatsapp: messageId,
                negocioId,
            });
        });
    }
}
async function processIncomingMessages(db, messages, negocioId) {
    const messagesRef = db.collection('mensajes_whatsapp');
    for (const { from, messageId, type, createdAt, content } of messages) {
        const messageRef = messagesRef.doc(`wa_${deterministicId(messageId).slice(0, 48)}`);
        const queueRef = db.collection('bot_queue').doc(`wa_${deterministicId(messageId).slice(0, 48)}`);
        await db.runTransaction(async (transaction) => {
            const [existingMessage, existingQueue] = await Promise.all([
                transaction.get(messageRef),
                transaction.get(queueRef),
            ]);
            if (!existingMessage.exists) {
                transaction.create(messageRef, {
                    tipo: 'entrada',
                    telefono: from,
                    contenido: content,
                    tipoContenido: type,
                    referenciaWhatsapp: messageId,
                    estado: 'entregado',
                    creadoEn: createdAt,
                    actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
                    entregadoEn: createdAt,
                    procesado: false,
                    negocioId,
                });
            }
            if (!existingQueue.exists) {
                transaction.create(queueRef, {
                    mensajeId: messageRef.id,
                    referenciaWhatsapp: messageId,
                    numeroOrigen: from,
                    contenido: content,
                    tipoContenido: type,
                    estado: 'pendiente',
                    intentos: 0,
                    creadoEn: createdAt,
                    proximoReintento: createdAt,
                    negocioId,
                });
            }
        });
    }
}
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
            return null;
    }
}
function shouldAdvanceStatus(currentStatus, nextStatus) {
    if (nextStatus === 'fallido')
        return currentStatus !== 'leido';
    const rank = {
        recibido: 0,
        enviado: 1,
        entregado: 2,
        leido: 3,
        fallido: -1,
    };
    const currentRank = typeof currentStatus === 'string' ? (rank[currentStatus] ?? -1) : -1;
    return (rank[nextStatus] ?? -1) >= currentRank;
}
