"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removerFondoProducto = exports.ImageProcessingError = void 0;
exports.parseRemoveProductBackgroundInput = parseRemoveProductBackgroundInput;
exports.mapRemoveBgFailure = mapRemoveBgFailure;
const crypto_1 = require("crypto");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const imageParams_1 = require("../config/imageParams");
const auth_1 = require("../config/auth");
const firebase_admin_1 = require("../firebase-admin");
const MAX_INPUT_BYTES = 6 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_INPUT_BYTES / 3) * 4;
const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
class ImageProcessingError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'ImageProcessingError';
    }
}
exports.ImageProcessingError = ImageProcessingError;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isAllowedMimeType(value) {
    return typeof value === 'string' && ALLOWED_MIME_TYPES.has(value);
}
function parseRemoveProductBackgroundInput(value) {
    if (!isRecord(value)) {
        throw new ImageProcessingError('invalid-argument', 'La solicitud de imagen no es válida');
    }
    const allowedKeys = ['imageBase64', 'mimeType'];
    const receivedKeys = Object.keys(value).sort();
    if (receivedKeys.length !== allowedKeys.length
        || receivedKeys.some((key, index) => key !== allowedKeys[index])) {
        throw new ImageProcessingError('invalid-argument', 'La solicitud contiene campos no permitidos');
    }
    if (typeof value.imageBase64 !== 'string'
        || value.imageBase64.length % 4 !== 0
        || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.imageBase64)) {
        throw new ImageProcessingError('invalid-argument', 'La imagen codificada no es válida');
    }
    if (value.imageBase64.length > MAX_BASE64_LENGTH) {
        throw new ImageProcessingError('invalid-argument', 'La imagen supera el tamaño permitido');
    }
    if (!isAllowedMimeType(value.mimeType)) {
        throw new ImageProcessingError('invalid-argument', 'El formato de imagen no está permitido');
    }
    const decodedBytes = Math.floor(value.imageBase64.length * 3 / 4)
        - (value.imageBase64.endsWith('==') ? 2 : value.imageBase64.endsWith('=') ? 1 : 0);
    if (decodedBytes < 1 || decodedBytes > MAX_INPUT_BYTES) {
        throw new ImageProcessingError('invalid-argument', 'La imagen no tiene un tamaño válido');
    }
    return {
        imageBase64: value.imageBase64,
        mimeType: value.mimeType,
    };
}
function rateLimitDocumentId(uid, bucket) {
    return (0, crypto_1.createHash)('sha256').update(`${uid}\u0000${bucket}`).digest('hex');
}
async function consumeRateLimit(uid) {
    const bucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
    const db = (0, firebase_admin_1.getDb)();
    const ref = db.collection('_limites_procesamiento_imagenes').doc(rateLimitDocumentId(uid, bucket));
    try {
        await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(ref);
            const currentCount = snapshot.exists ? Math.max(0, Number(snapshot.data()?.count) || 0) : 0;
            if (currentCount >= RATE_LIMIT_MAX) {
                throw new ImageProcessingError('resource-exhausted', 'Alcanzaste el límite temporal de ediciones de fotos. Intenta de nuevo más tarde.');
            }
            transaction.set(ref, {
                count: currentCount + 1,
                expiraEn: firestore_1.Timestamp.fromMillis((bucket + 1) * RATE_LIMIT_WINDOW_MS),
            }, { merge: true });
        });
    }
    catch (error) {
        if (error instanceof ImageProcessingError)
            throw error;
        throw new ImageProcessingError('unavailable', 'No se pudo validar el límite de uso');
    }
}
async function assertActorCanProcess(uid, email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === auth_1.SUPER_ADMIN_EMAIL.toLowerCase())
        return;
    const profileSnapshot = await (0, firebase_admin_1.getDb)().collection('usuarios_negocio').doc(uid).get();
    const profile = profileSnapshot.data();
    if (!profileSnapshot.exists
        || profile?.uid !== uid
        || typeof profile?.email !== 'string'
        || profile.email.trim().toLowerCase() !== normalizedEmail
        || profile.activo !== true
        || !['admin', 'cajero'].includes(profile.rol)
        || typeof profile.negocioId !== 'string'
        || !/^[A-Za-z0-9_-]{1,128}$/.test(profile.negocioId)) {
        throw new ImageProcessingError('permission-denied', 'Tu perfil no tiene permiso para editar fotos de productos');
    }
}
function isTransientStatus(status) {
    return status === 502 || status === 503 || status === 504;
}
function sanitizeProviderField(value) {
    if (typeof value !== 'string')
        return undefined;
    const sanitized = value.replace(/[\r\n\t]/g, ' ').trim().slice(0, 160);
    return sanitized || undefined;
}
async function readRemoveBgErrorMetadata(response) {
    try {
        const payload = await response.json();
        if (!isRecord(payload) || !Array.isArray(payload.errors) || !isRecord(payload.errors[0])) {
            return {};
        }
        return {
            code: sanitizeProviderField(payload.errors[0].code),
            title: sanitizeProviderField(payload.errors[0].title),
        };
    }
    catch {
        return {};
    }
}
function mapRemoveBgFailure(status) {
    if (status === 401 || status === 403) {
        return new ImageProcessingError('failed-precondition', 'La clave de remove.bg no es válida. Actualiza la configuración del servicio.');
    }
    if (status === 402) {
        return new ImageProcessingError('resource-exhausted', 'La cuenta de remove.bg no tiene créditos disponibles.');
    }
    if (status === 429) {
        return new ImageProcessingError('resource-exhausted', 'El proveedor alcanzó su límite temporal. Intenta de nuevo más tarde.');
    }
    if (status && status >= 400 && status < 500) {
        return new ImageProcessingError('failed-precondition', 'El proveedor no pudo procesar esta imagen. Prueba con otra foto.');
    }
    return new ImageProcessingError('unavailable', 'El servicio de edición no está disponible. Conservamos tu foto original.');
}
async function callRemoveBg(input, apiKey) {
    const imageBytes = Buffer.from(input.imageBase64, 'base64');
    let response;
    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const formData = new FormData();
            formData.append('image_file', new Blob([imageBytes], { type: input.mimeType }), `producto.${input.mimeType.split('/')[1]}`);
            formData.append('size', 'auto');
            formData.append('format', 'png');
            response = await fetch(REMOVE_BG_URL, {
                method: 'POST',
                headers: { 'X-Api-Key': apiKey },
                body: formData,
                signal: AbortSignal.timeout(30000),
            });
            if (response.ok) {
                const output = Buffer.from(await response.arrayBuffer());
                if (output.length < 1 || output.length > MAX_OUTPUT_BYTES) {
                    throw new ImageProcessingError('unavailable', 'El proveedor devolvió una imagen no válida');
                }
                return output;
            }
            if (!isTransientStatus(response.status) || attempt === 1)
                break;
        }
        catch (error) {
            if (error instanceof ImageProcessingError)
                throw error;
            if (attempt === 1)
                break;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (response) {
        const metadata = await readRemoveBgErrorMetadata(response);
        console.warn('remove.bg rechazó la edición de foto', {
            status: response.status,
            providerCode: metadata.code,
            providerTitle: metadata.title,
        });
    }
    throw mapRemoveBgFailure(response?.status);
}
exports.removerFondoProducto = (0, https_1.onCall)({
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 3,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    secrets: [imageParams_1.removeBgApiKey],
}, async (request) => {
    if (!request.auth?.uid || typeof request.auth.token.email !== 'string') {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    }
    if (request.app?.alreadyConsumed) {
        throw new https_1.HttpsError('failed-precondition', 'La verificación de la solicitud ya fue usada');
    }
    try {
        const input = parseRemoveProductBackgroundInput(request.data);
        await assertActorCanProcess(request.auth.uid, request.auth.token.email);
        const apiKey = imageParams_1.removeBgApiKey.value().trim();
        if (!apiKey) {
            throw new ImageProcessingError('failed-precondition', 'La edición de fotos no está configurada todavía');
        }
        await consumeRateLimit(request.auth.uid);
        const output = await callRemoveBg(input, apiKey);
        return { imageBase64: output.toString('base64'), mimeType: 'image/png' };
    }
    catch (error) {
        if (error instanceof ImageProcessingError) {
            throw new https_1.HttpsError(error.code, error.message);
        }
        console.error('Error interno al procesar foto de producto', {
            error: error instanceof Error ? error.message : 'unknown',
        });
        throw new https_1.HttpsError('internal', 'No fue posible editar la foto');
    }
});
