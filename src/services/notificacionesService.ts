import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  NotificacionOperativa,
  CrearNotificacionInput,
} from '@/types/notificacion';

export const COLECCION_NOTIFICACIONES_OPERATIVAS = 'notificaciones_operativas';

/**
 * Registra una nueva notificación operativa con aislamiento por `negocioId`.
 */
export async function crearNotificacion(
  negocioId: string,
  input: CrearNotificacionInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const titulo = (input.titulo || '').trim();
  if (!titulo) {
    throw new Error('El título de la notificación es obligatorio');
  }

  const payload: Omit<NotificacionOperativa, 'id'> = {
    negocioId: tenantId,
    modulo: input.modulo || 'sistema',
    tipo: input.tipo || 'alerta_general',
    titulo,
    mensaje: (input.mensaje || '').trim(),
    urgencia: input.urgencia || 'media',
    leida: input.leida ?? false,
    fecha: input.fecha || new Date().toISOString(),
    ...(input.enlace ? { enlace: input.enlace } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
    origen: input.origen || 'automatico',
    ...(input.creadaPor ? { creadaPor: input.creadaPor.trim() } : {}),
  };

  const docRef = await addDoc(
    collection(db, COLECCION_NOTIFICACIONES_OPERATIVAS),
    payload
  );
  return docRef.id;
}

/**
 * Emite una alerta en segundo plano sin interrumpir el flujo del usuario.
 */
export function crearAlertaSilenciosa(
  negocioId: string,
  input: CrearNotificacionInput
): void {
  crearNotificacion(negocioId, input).catch((err) => {
    console.warn('Error emitiendo alerta operativa silenciosa:', err);
  });
}

/**
 * Marca una notificación como leída.
 */
export async function marcarNotificacionLeida(
  negocioId: string,
  notificacionId: string,
  usuarioUid?: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!notificacionId) throw new Error('ID de notificación requerido');

  const docRef = doc(db, COLECCION_NOTIFICACIONES_OPERATIVAS, notificacionId);
  await updateDoc(docRef, {
    negocioId: tenantId,
    leida: true,
    leidaEn: new Date().toISOString(),
    leidaPor: (usuarioUid || 'usuario').trim(),
  });
}

/**
 * Marca múltiples notificaciones como leídas en lote.
 */
export async function marcarTodasNotificacionesLeidas(
  negocioId: string,
  notificacionIds: string[],
  usuarioUid?: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!notificacionIds || notificacionIds.length === 0) return;

  const ahoraIso = new Date().toISOString();
  const lector = (usuarioUid || 'usuario').trim();
  const batch = writeBatch(db);

  // Firestore admite hasta 500 operaciones por batch
  const lotes = notificacionIds.slice(0, 450);
  for (const id of lotes) {
    const docRef = doc(db, COLECCION_NOTIFICACIONES_OPERATIVAS, id);
    batch.update(docRef, {
      negocioId: tenantId,
      leida: true,
      leidaEn: ahoraIso,
      leidaPor: lector,
    });
  }

  await batch.commit();
}

/**
 * Elimina una notificación operativa del sistema.
 */
export async function eliminarNotificacion(
  negocioId: string,
  notificacionId: string
): Promise<void> {
  requireTenantId(negocioId);
  if (!notificacionId) throw new Error('ID de notificación requerido');

  const docRef = doc(db, COLECCION_NOTIFICACIONES_OPERATIVAS, notificacionId);
  await deleteDoc(docRef);
}

/**
 * Consulta la lista histórica reciente de notificaciones operativas.
 */
export async function getNotificacionesRecientes(
  negocioId: string,
  maxLimite = 100
): Promise<NotificacionOperativa[]> {
  const tenantId = requireTenantId(negocioId);

  const q = query(
    collection(db, COLECCION_NOTIFICACIONES_OPERATIVAS),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<NotificacionOperativa, 'id'>),
  }));
}

/**
 * Suscripción en tiempo real a las notificaciones operativas del negocio activo.
 */
export function onNotificacionesChange(
  negocioId: string,
  callback: (notificaciones: NotificacionOperativa[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 100
): () => void {
  const tenantId = requireTenantId(negocioId);

  const q = query(
    collection(db, COLECCION_NOTIFICACIONES_OPERATIVAS),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxLimite)
  );

  return onSnapshot(
    q,
    (snap) => {
      const lista = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<NotificacionOperativa, 'id'>),
      }));
      callback(lista);
    },
    (err) => {
      console.warn('Error en listener de notificaciones_operativas:', err);
      if (onError) onError(err);
    }
  );
}
