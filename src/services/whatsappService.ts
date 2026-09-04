import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  updateDoc,
  doc,
  orderBy,
  Timestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { appCheckConfigured, db, functions } from './firebase';
import { MensajeWhatsApp } from '../types';
import { requireTenantId } from '@/security/tenantScope';

/**
 * Estructura base para mensaje WhatsApp
 */
interface MensajeEnvio {
  telefono: string;
  contenido: string;
  idempotencyKey?: string;
}

/**
 * Envía un mensaje mediante la única callable autorizada del backend.
 */
export async function enviarMensajeWhatsApp(
  negocioId: string,
  mensaje: MensajeEnvio
): Promise<string> {
  if (!functions || !appCheckConfigured) {
    throw new Error('El envío seguro de WhatsApp no está configurado');
  }
  const callable = httpsCallable<
    { negocioId: string; telefono: string; contenido: string; idempotencyKey: string },
    { mensajeId: string; referenciaWhatsapp: string; reused: boolean }
  >(functions, 'enviarMensajeWhatsAppManual');
  const result = await callable({
    negocioId: requireTenantId(negocioId),
    telefono: mensaje.telefono,
    contenido: mensaje.contenido,
    idempotencyKey: mensaje.idempotencyKey || crypto.randomUUID(),
  });
  return result.data.mensajeId;
}

/**
 * Obtener historial de mensajes con un cliente
 */
export async function obtenerHistorialMensajes(
  negocioId: string,
  telefono: string,
  limiteResultados: number = 50
): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(
      mensajesRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('telefono', '==', telefono),
      orderBy('creadoEn', 'desc'),
      limit(limiteResultados)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    } as MensajeWhatsApp));
  } catch (error) {
    console.error('Error fetching historial mensajes:', error);
    throw error;
  }
}

/**
 * Listener en tiempo real para mensajes nuevos
 */
export function onNuevosMensajes(
  negocioId: string,
  callback: (mensaje: MensajeWhatsApp) => void,
  onError?: (error: Error) => void
): () => void {
  const mensajesRef = collection(db, 'mensajes_whatsapp');
  const q = query(
    mensajesRef,
    where('negocioId', '==', requireTenantId(negocioId)),
    orderBy('creadoEn', 'desc'),
    limit(200)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const mensaje = {
            id: change.doc.id,
            ...change.doc.data(),
          } as MensajeWhatsApp;
          callback(mensaje);
        }
      });
    },
    (error) => {
      console.error('Error listening to WhatsApp messages:', error);
      onError?.(error);
    }
  );
}

/**
 * Marcar mensaje como leído
 */
export async function marcarMensajeLeido(mensajeId: string, negocioId: string): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const docRef = doc(db, 'mensajes_whatsapp', mensajeId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
      throw new Error('El mensaje no pertenece al negocio activo');
    }
    await updateDoc(docRef, {
      estado: 'leido',
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error marcando mensaje como leído:', error);
    throw error;
  }
}

/**
 * Obtiene el historial reciente del tenant para construir la bandeja y sus conversaciones.
 */
export async function obtenerMensajesRecientes(
  negocioId: string,
  limiteResultados: number = 200
): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(
      mensajesRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      orderBy('creadoEn', 'desc'),
      limit(Math.min(Math.max(limiteResultados, 1), 500))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((document) => ({
      ...document.data(),
      id: document.id,
    } as MensajeWhatsApp));
  } catch (error) {
    console.error('Error fetching recent WhatsApp messages:', error);
    throw error;
  }
}
