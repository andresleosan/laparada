import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MensajeWhatsApp } from '../types';

/**
 * Estados de entrega de WhatsApp
 */
export type EstadoEntrega = 'enviado' | 'entregado' | 'leido' | 'fallido';

/**
 * Actualiza el estado de entrega de un mensaje
 */
export async function actualizarEstadoEntrega(
  mensajeId: string,
  estado: EstadoEntrega,
  timestamp?: Date
): Promise<void> {
  try {
    const docRef = doc(db, 'mensajes_whatsapp', mensajeId);
    const updateData: any = {
      estado,
      actualizadoEn: Timestamp.now(),
    };

    if (estado === 'entregado') {
      updateData.entregadoEn = Timestamp.fromDate(timestamp || new Date());
    } else if (estado === 'leido') {
      updateData.leidoEn = Timestamp.fromDate(timestamp || new Date());
    } else if (estado === 'fallido') {
      updateData.falloEn = Timestamp.fromDate(timestamp || new Date());
    }

    await updateDoc(docRef, updateData);
    console.log(`Message ${mensajeId} status updated to: ${estado}`);
  } catch (error) {
    console.error('Error updating message delivery status:', error);
    throw error;
  }
}

/**
 * Obtiene mensajes por estado
 */
export async function getMensajesPorEstado(estado: EstadoEntrega): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(
      mensajesRef,
      where('estado', '==', estado),
      orderBy('creadoEn', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as MensajeWhatsApp));
  } catch (error) {
    console.error('Error fetching messages by status:', error);
    return [];
  }
}

/**
 * Obtiene mensajes pendientes de entrega (enviados pero no entregados)
 */
export async function getMensajesPendientes(): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(
      mensajesRef,
      where('estado', '==', 'enviado'),
      orderBy('creadoEn', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as MensajeWhatsApp));
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    return [];
  }
}

/**
 * Registra un evento de entrega
 */
export async function registrarEventoEntrega(
  mensajeId: string,
  tipo: 'enviado' | 'entregado' | 'leido' | 'fallido',
  metadata?: any
): Promise<void> {
  try {
    const eventosRef = collection(db, 'mensajes_whatsapp', mensajeId, 'eventos_entrega');
    await addDoc(eventosRef, {
      tipo,
      timestamp: Timestamp.now(),
      metadata: metadata || {},
    });

    // Actualizar estado del mensaje
    await actualizarEstadoEntrega(mensajeId, tipo);

    console.log(`Delivery event registered: ${mensajeId} - ${tipo}`);
  } catch (error) {
    console.error('Error registering delivery event:', error);
    throw error;
  }
}

/**
 * Obtiene métricas de entrega para un período
 */
export async function getMetricasEntrega(
  fechaInicio?: Date,
  fechaFin?: Date
): Promise<{
  totalMensajes: number;
  entregados: number;
  leidos: number;
  fallidos: number;
  tasaEntrega: number;
  tasaLectura: number;
  tiempoPromEntrega?: number;
}> {
  try {
    let mensajes = await getMensajesTodos(fechaInicio, fechaFin);

    const totalMensajes = mensajes.length;
    const entregados = mensajes.filter((m) => m.estado === 'entregado' || m.estado === 'leido')
      .length;
    const leidos = mensajes.filter((m) => m.estado === 'leido').length;
    const fallidos = mensajes.filter((m) => m.estado === 'fallido').length;

    const tasaEntrega = totalMensajes > 0 ? (entregados / totalMensajes) * 100 : 0;
    const tasaLectura = totalMensajes > 0 ? (leidos / totalMensajes) * 100 : 0;

    // Calcular tiempo promedio de entrega
    const tiemposEntrega = mensajes
      .filter((m) => m.entregadoEn && m.creadoEn)
      .map((m) => {
        const createdDate =
          typeof m.creadoEn === 'object' && 'toDate' in m.creadoEn
            ? (m.creadoEn as any).toDate()
            : new Date(m.creadoEn as any);

        const deliveredDate =
          typeof m.entregadoEn === 'object' && 'toDate' in m.entregadoEn
            ? (m.entregadoEn as any).toDate()
            : new Date(m.entregadoEn as any);

        return (deliveredDate.getTime() - createdDate.getTime()) / 1000; // segundos
      });

    const tiempoPromEntrega =
      tiemposEntrega.length > 0
        ? tiemposEntrega.reduce((a, b) => a + b, 0) / tiemposEntrega.length
        : undefined;

    return {
      totalMensajes,
      entregados,
      leidos,
      fallidos,
      tasaEntrega: parseFloat(tasaEntrega.toFixed(2)),
      tasaLectura: parseFloat(tasaLectura.toFixed(2)),
      tiempoPromEntrega: tiempoPromEntrega ? parseFloat(tiempoPromEntrega.toFixed(2)) : undefined,
    };
  } catch (error) {
    console.error('Error fetching delivery metrics:', error);
    return {
      totalMensajes: 0,
      entregados: 0,
      leidos: 0,
      fallidos: 0,
      tasaEntrega: 0,
      tasaLectura: 0,
    };
  }
}

/**
 * Obtiene todos los mensajes con filtro de fecha opcional
 */
async function getMensajesTodos(
  fechaInicio?: Date,
  fechaFin?: Date
): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(mensajesRef, orderBy('creadoEn', 'desc'));
    const snapshot = await getDocs(q);
    let mensajes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as MensajeWhatsApp));

    if (fechaInicio && fechaFin) {
      mensajes = mensajes.filter((m) => {
        const fecha =
          typeof m.creadoEn === 'object' && 'toDate' in m.creadoEn
            ? (m.creadoEn as any).toDate()
            : new Date(m.creadoEn as any);
        return fecha >= fechaInicio && fecha <= fechaFin;
      });
    }

    return mensajes;
  } catch (error) {
    console.error('Error fetching all messages:', error);
    return [];
  }
}

/**
 * Reintenta envíos fallidos
 */
export async function reintenrarEnviosFallidos(): Promise<{ reintenrados: number; exitosos: number }> {
  try {
    const mensajesFallidos = await getMensajesPorEstado('fallido');
    let reintenrados = 0;
    let exitosos = 0;

    for (const mensaje of mensajesFallidos) {
      // Aquí iría la lógica para reintentar con la API real de WhatsApp
      // Por ahora, solo registramos el intento
      reintenrados++;

      // Marcar como pendiente de reintento
      await updateDoc(doc(db, 'mensajes_whatsapp', mensaje.id!), {
        estado: 'enviado',
        intentosFallidos: (mensaje.intentosFallidos || 0) + 1,
        actualizadoEn: Timestamp.now(),
      });
    }

    console.log(`Retry attempted for ${reintenrados} failed messages`);
    return { reintenrados, exitosos };
  } catch (error) {
    console.error('Error retrying failed sends:', error);
    return { reintenrados: 0, exitosos: 0 };
  }
}
