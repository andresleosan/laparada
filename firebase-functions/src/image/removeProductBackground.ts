import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { removeBgApiKey } from '../config/imageParams';
import { SUPER_ADMIN_EMAIL } from '../config/auth';
import { getDb } from '../firebase-admin';

const MAX_INPUT_BYTES = 6 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_INPUT_BYTES / 3) * 4;
const MAX_OUTPUT_BYTES = 6 * 1024 * 1024;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface RemoveProductBackgroundInput {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface RemoveProductBackgroundOutput {
  imageBase64: string;
  mimeType: 'image/png';
}

export class ImageProcessingError extends Error {
  constructor(
    public readonly code: 'invalid-argument' | 'permission-denied' | 'resource-exhausted' | 'unavailable' | 'failed-precondition',
    message: string
  ) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAllowedMimeType(value: unknown): value is RemoveProductBackgroundInput['mimeType'] {
  return typeof value === 'string' && ALLOWED_MIME_TYPES.has(value);
}

export function parseRemoveProductBackgroundInput(value: unknown): RemoveProductBackgroundInput {
  if (!isRecord(value)) {
    throw new ImageProcessingError('invalid-argument', 'La solicitud de imagen no es válida');
  }

  const allowedKeys = ['imageBase64', 'mimeType'];
  const receivedKeys = Object.keys(value).sort();
  if (
    receivedKeys.length !== allowedKeys.length
    || receivedKeys.some((key, index) => key !== allowedKeys[index])
  ) {
    throw new ImageProcessingError('invalid-argument', 'La solicitud contiene campos no permitidos');
  }

  if (
    typeof value.imageBase64 !== 'string'
    || value.imageBase64.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(value.imageBase64)
  ) {
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

function rateLimitDocumentId(uid: string, bucket: number): string {
  return createHash('sha256').update(`${uid}\u0000${bucket}`).digest('hex');
}

async function consumeRateLimit(uid: string): Promise<void> {
  const bucket = Math.floor(Date.now() / RATE_LIMIT_WINDOW_MS);
  const db = getDb();
  const ref = db.collection('_limites_procesamiento_imagenes').doc(
    rateLimitDocumentId(uid, bucket)
  );

  try {
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const currentCount = snapshot.exists ? Math.max(0, Number(snapshot.data()?.count) || 0) : 0;
      if (currentCount >= RATE_LIMIT_MAX) {
        throw new ImageProcessingError(
          'resource-exhausted',
          'Alcanzaste el límite temporal de ediciones de fotos. Intenta de nuevo más tarde.'
        );
      }

      transaction.set(ref, {
        count: currentCount + 1,
        expiraEn: Timestamp.fromMillis((bucket + 1) * RATE_LIMIT_WINDOW_MS),
      }, { merge: true });
    });
  } catch (error) {
    if (error instanceof ImageProcessingError) throw error;
    throw new ImageProcessingError('unavailable', 'No se pudo validar el límite de uso');
  }
}

async function assertActorCanProcess(uid: string, email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return;

  const profileSnapshot = await getDb().collection('usuarios_negocio').doc(uid).get();
  const profile = profileSnapshot.data();
  if (
    !profileSnapshot.exists
    || profile?.uid !== uid
    || typeof profile?.email !== 'string'
    || profile.email.trim().toLowerCase() !== normalizedEmail
    || profile.activo !== true
    || !['admin', 'cajero'].includes(profile.rol)
    || typeof profile.negocioId !== 'string'
    || !/^[A-Za-z0-9_-]{1,128}$/.test(profile.negocioId)
  ) {
    throw new ImageProcessingError(
      'permission-denied',
      'Tu perfil no tiene permiso para editar fotos de productos'
    );
  }
}

function isTransientStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

async function callRemoveBg(input: RemoveProductBackgroundInput, apiKey: string): Promise<Buffer> {
  const imageBytes = Buffer.from(input.imageBase64, 'base64');
  let response: Response | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append(
        'image_file',
        new Blob([imageBytes], { type: input.mimeType }),
        `producto.${input.mimeType.split('/')[1]}`
      );
      formData.append('size', 'auto');
      formData.append('format', 'png');

      response = await fetch(REMOVE_BG_URL, {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey },
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok) {
        const output = Buffer.from(await response.arrayBuffer());
        if (output.length < 1 || output.length > MAX_OUTPUT_BYTES) {
          throw new ImageProcessingError('unavailable', 'El proveedor devolvió una imagen no válida');
        }
        return output;
      }

      if (!isTransientStatus(response.status) || attempt === 1) break;
    } catch (error) {
      if (error instanceof ImageProcessingError) throw error;
      if (attempt === 1) break;
    }

    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  const status = response?.status;
  if (status === 429) {
    throw new ImageProcessingError('resource-exhausted', 'El proveedor alcanzó su límite temporal. Intenta de nuevo más tarde.');
  }
  if (status && status >= 400 && status < 500) {
    throw new ImageProcessingError('failed-precondition', 'El proveedor no pudo procesar esta imagen. Prueba con otra foto.');
  }
  throw new ImageProcessingError('unavailable', 'El servicio de edición no está disponible. Conservamos tu foto original.');
}

export const removerFondoProducto = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 3,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    secrets: [removeBgApiKey],
  },
  async (request): Promise<RemoveProductBackgroundOutput> => {
    if (!request.auth?.uid || typeof request.auth.token.email !== 'string') {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }
    if (request.app?.alreadyConsumed) {
      throw new HttpsError('failed-precondition', 'La verificación de la solicitud ya fue usada');
    }

    try {
      const input = parseRemoveProductBackgroundInput(request.data);
      await assertActorCanProcess(request.auth.uid, request.auth.token.email);

      const apiKey = removeBgApiKey.value().trim();
      if (!apiKey) {
        throw new ImageProcessingError('failed-precondition', 'La edición de fotos no está configurada todavía');
      }

      await consumeRateLimit(request.auth.uid);
      const output = await callRemoveBg(input, apiKey);
      return { imageBase64: output.toString('base64'), mimeType: 'image/png' };
    } catch (error) {
      if (error instanceof ImageProcessingError) {
        throw new HttpsError(error.code, error.message);
      }
      console.error('Error interno al procesar foto de producto', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw new HttpsError('internal', 'No fue posible editar la foto');
    }
  }
);
