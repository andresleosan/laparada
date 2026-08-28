import { createHash } from 'crypto';
import { FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { SUPER_ADMIN_EMAIL } from '../config/auth';

export interface ManualWhatsAppMessageInput {
  negocioId: string;
  telefono: string;
  contenido: string;
  idempotencyKey: string;
}

export interface WhatsAppActor {
  uid: string;
  email: string;
}

export interface PersistedWhatsAppMessageInput {
  outboundId: string;
  negocioId: string;
  telefono: string;
  contenido: string;
  origen: 'manual' | 'bot';
  mensajeEntradaId?: string;
  queueId?: string;
}

export interface SentWhatsAppMessage {
  mensajeId: string;
  referenciaWhatsapp: string;
  reused: boolean;
}

export type WhatsAppMessageErrorCode =
  | 'invalid-argument'
  | 'permission-denied'
  | 'failed-precondition'
  | 'unavailable';

export class WhatsAppMessageError extends Error {
  constructor(
    public readonly code: WhatsAppMessageErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'WhatsAppMessageError';
  }
}

type ProviderSender = (message: {
  numeroDestino: string;
  tipo: 'text';
  contenido: string;
}) => Promise<string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new WhatsAppMessageError('invalid-argument', `${field} es obligatorio`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new WhatsAppMessageError('invalid-argument', `${field} no tiene una longitud válida`);
  }
  return normalized;
}

export function assertOfflineOnlyContent(content: string): void {
  const normalized = content.toLowerCase();
  const urls = normalized.match(/https?:\/\/[^\s]+/g) || [];
  if (
    normalized.includes('pago en línea')
    || normalized.includes('pago online')
    || urls.some((url) => /(?:checkout|payment|pagar|cobro|pay(?:[./?_-]|$))/.test(url))
  ) {
    throw new WhatsAppMessageError(
      'invalid-argument',
      'El mensaje no puede incluir plataformas de pago en línea'
    );
  }
}

export function parseManualWhatsAppMessageInput(value: unknown): ManualWhatsAppMessageInput {
  if (!isRecord(value)) {
    throw new WhatsAppMessageError('invalid-argument', 'La solicitud no es válida');
  }

  const allowedKeys = ['contenido', 'idempotencyKey', 'negocioId', 'telefono'];
  const receivedKeys = Object.keys(value).sort();
  if (
    receivedKeys.length !== allowedKeys.length
    || receivedKeys.some((key, index) => key !== allowedKeys[index])
  ) {
    throw new WhatsAppMessageError('invalid-argument', 'La solicitud contiene campos no permitidos');
  }

  const negocioId = normalizeText(value.negocioId, 'El negocio', 64);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(negocioId)) {
    throw new WhatsAppMessageError('invalid-argument', 'El negocio no es válido');
  }

  const telefono = normalizeText(value.telefono, 'El teléfono', 32).replace(/\D/g, '');
  if (!/^\d{6,20}$/.test(telefono)) {
    throw new WhatsAppMessageError('invalid-argument', 'El teléfono no es válido');
  }

  const contenido = normalizeText(value.contenido, 'El mensaje', 4096);
  assertOfflineOnlyContent(contenido);

  const idempotencyKey = normalizeText(value.idempotencyKey, 'La clave de idempotencia', 128);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) {
    throw new WhatsAppMessageError('invalid-argument', 'La clave de idempotencia no es válida');
  }

  return { negocioId, telefono, contenido, idempotencyKey };
}

async function assertActorCanSend(
  db: Firestore,
  actor: WhatsAppActor,
  negocioId: string
): Promise<void> {
  const normalizedEmail = actor.email.trim().toLowerCase();
  if (normalizedEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
    const profileSnapshot = await db.collection('usuarios_negocio').doc(actor.uid).get();
    const profile = profileSnapshot.data();
    if (
      !profileSnapshot.exists
      || profile?.uid !== actor.uid
      || typeof profile?.email !== 'string'
      || profile.email.trim().toLowerCase() !== normalizedEmail
      || profile?.activo !== true
      || !['admin', 'cajero'].includes(profile?.rol)
      || profile?.negocioId !== negocioId
    ) {
      throw new WhatsAppMessageError('permission-denied', 'No tienes permiso para enviar mensajes');
    }
  }

  const businessSnapshot = await db.collection('negocios').doc(negocioId).get();
  if (
    negocioId !== 'laparada'
    && (!businessSnapshot.exists || businessSnapshot.data()?.estado !== 'activo')
  ) {
    throw new WhatsAppMessageError('failed-precondition', 'El negocio no está activo');
  }
}

function deterministicOutboundId(negocioId: string, idempotencyKey: string): string {
  return `manual_${createHash('sha256')
    .update(`${negocioId}\u0000${idempotencyKey}`)
    .digest('hex')
    .slice(0, 48)}`;
}

async function consumeManualRateLimit(
  db: Firestore,
  actor: WhatsAppActor,
  negocioId: string
): Promise<void> {
  const windowMs = 5 * 60 * 1000;
  const nowMs = Date.now();
  const bucket = Math.floor(nowMs / windowMs);
  const rateId = createHash('sha256')
    .update(`${negocioId}\u0000${actor.uid}\u0000${bucket}`)
    .digest('hex');
  const rateRef = db.collection('_limites_whatsapp_manual').doc(rateId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const count = snapshot.exists ? Math.max(0, Number(snapshot.data()?.count) || 0) : 0;
    if (count >= 30) {
      throw new WhatsAppMessageError(
        'failed-precondition',
        'Alcanzaste el límite temporal de mensajes manuales'
      );
    }
    transaction.set(rateRef, {
      negocioId,
      actorUid: actor.uid,
      count: count + 1,
      expiraEn: Timestamp.fromMillis((bucket + 2) * windowMs),
      actualizadoEn: FieldValue.serverTimestamp(),
    });
  });
}

export async function sendPersistedWhatsAppMessage(
  db: Firestore,
  input: PersistedWhatsAppMessageInput,
  sendProvider: ProviderSender
): Promise<SentWhatsAppMessage> {
  const messageRef = db.collection('mensajes_whatsapp').doc(input.outboundId);
  const existingResult = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (snapshot.exists && typeof snapshot.data()?.referenciaWhatsapp === 'string') {
      return {
        mensajeId: messageRef.id,
        referenciaWhatsapp: snapshot.data()?.referenciaWhatsapp as string,
        reused: true,
      };
    }
    if (snapshot.exists && snapshot.data()?.estado === 'procesando') {
      const updatedAt = snapshot.data()?.actualizadoEn;
      const updatedAtMs = typeof updatedAt?.toMillis === 'function' ? updatedAt.toMillis() : Date.now();
      if (Date.now() - updatedAtMs < 3 * 60 * 1000) {
        throw new WhatsAppMessageError('failed-precondition', 'El mensaje ya se está procesando');
      }
    }

    transaction.set(messageRef, {
      negocioId: input.negocioId,
      telefono: input.telefono,
      tipo: 'salida',
      contenido: input.contenido,
      tipoContenido: 'text',
      estado: 'procesando',
      origenEnvio: input.origen,
      ...(input.mensajeEntradaId && { mensajeEntradaId: input.mensajeEntradaId }),
      ...(input.queueId && { queueId: input.queueId }),
      ...(!snapshot.exists && { creadoEn: FieldValue.serverTimestamp() }),
      actualizadoEn: FieldValue.serverTimestamp(),
      intentosEnvio: FieldValue.increment(1),
    }, { merge: true });
    return null;
  });

  if (existingResult) return existingResult;

  try {
    const referenciaWhatsapp = await sendProvider({
      numeroDestino: input.telefono,
      tipo: 'text',
      contenido: input.contenido,
    });
    if (!referenciaWhatsapp) {
      throw new Error('WhatsApp provider returned an empty message reference');
    }
    await messageRef.update({
      referenciaWhatsapp,
      estado: 'enviado',
      enviadoEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
      ultimoError: FieldValue.delete(),
    });
    return { mensajeId: messageRef.id, referenciaWhatsapp, reused: false };
  } catch (error) {
    await messageRef.update({
      estado: 'fallido',
      falloEn: FieldValue.serverTimestamp(),
      actualizadoEn: FieldValue.serverTimestamp(),
      ultimoError: 'provider_unavailable',
    });
    throw new WhatsAppMessageError('unavailable', 'WhatsApp no pudo enviar el mensaje');
  }
}

export async function sendManualWhatsAppMessage(
  db: Firestore,
  input: ManualWhatsAppMessageInput,
  actor: WhatsAppActor,
  sendProvider: ProviderSender
): Promise<SentWhatsAppMessage> {
  await assertActorCanSend(db, actor, input.negocioId);
  const outboundId = deterministicOutboundId(input.negocioId, input.idempotencyKey);
  const existing = await db.collection('mensajes_whatsapp').doc(outboundId).get();
  if (!(existing.exists && typeof existing.data()?.referenciaWhatsapp === 'string')) {
    await consumeManualRateLimit(db, actor, input.negocioId);
  }
  return sendPersistedWhatsAppMessage(
    db,
    {
      outboundId,
      negocioId: input.negocioId,
      telefono: input.telefono,
      contenido: input.contenido,
      origen: 'manual',
    },
    sendProvider
  );
}
