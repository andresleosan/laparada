import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { MensajeWhatsApp, ItemVenta, Venta, Domicilio } from '../types';

/**
 * Estructura base para mensaje WhatsApp
 */
interface MensajeEnvio {
  telefono: string;
  contenido: string;
  mediaUrl?: string;
}

/**
 * Enviar mensaje por WhatsApp (simulado - en producción sería via Twilio/WhatsApp API)
 */
export async function enviarMensajeWhatsApp(mensaje: MensajeEnvio): Promise<string> {
  try {
    // En producción, aquí iría la llamada a Twilio o WhatsApp Business API
    // Por ahora, guardamos el mensaje en Firestore
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const docRef = await addDoc(mensajesRef, {
      telefono: mensaje.telefono,
      tipo: 'salida',
      contenido: mensaje.contenido,
      mediaUrl: mensaje.mediaUrl,
      estado: 'enviado',
      creadoEn: Timestamp.now(),
    } as MensajeWhatsApp);

    console.log(`📱 Mensaje enviado a ${mensaje.telefono}:`, mensaje.contenido);
    return docRef.id;
  } catch (error) {
    console.error('Error enviando mensaje WhatsApp:', error);
    throw error;
  }
}

/**
 * Enviar confirmación de orden
 */
export async function enviarConfirmacionOrden(
  telefono: string,
  numeroOrden: string,
  total: number,
  enlacePago?: string
): Promise<string> {
  const contenido = `✅ *Orden Confirmada* #${numeroOrden}

*Total:* $${(total / 1000).toFixed(0)}k COP

${enlacePago ? `*Pagar:* ${enlacePago}` : '*Estado:* Pendiente confirmación'}

Gracias por tu orden 🙏`;

  return enviarMensajeWhatsApp({
    telefono,
    contenido,
  });
}

/**
 * Enviar estado de entrega
 */
export async function enviarEstadoEntrega(
  telefono: string,
  domicilioId: string,
  estado: string
): Promise<string> {
  const emojis: Record<string, string> = {
    pendiente: '⏳',
    en_preparacion: '👨‍🍳',
    en_camino: '🚗',
    entregado: '✅',
  };

  const contenido = `${emojis[estado]} *Estado de tu domicilio #${domicilioId.slice(0, 8)}*

Estado: ${estado === 'en_camino' ? 'En camino 🚗' : estado === 'entregado' ? 'Entregado ✅' : 'En preparación 👨‍🍳'}

¡Gracias por tu compra! 🎉`;

  return enviarMensajeWhatsApp({
    telefono,
    contenido,
  });
}

/**
 * Enviar menú de opciones
 */
export async function enviarMenuOpciones(
  telefono: string,
  jornada: string,
  opciones: Array<{ numero: string; nombre: string }>
): Promise<string> {
  const opcionesTexto = opciones.map((o) => `*${o.numero}* - ${o.nombre}`).join('\n');

  const contenido = `🍴 *Menú de hoy (${jornada})*

${opcionesTexto}

Escribe el número de la opción que deseas`;

  return enviarMensajeWhatsApp({
    telefono,
    contenido,
  });
}

/**
 * Guardar mensaje recibido de WhatsApp
 */
export async function guardarMensajeRecibido(
  telefono: string,
  contenido: string,
  referenciaMensajeWA?: string
): Promise<string> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const docRef = await addDoc(mensajesRef, {
      telefono,
      tipo: 'entrada',
      contenido,
      estado: 'entregado',
      referenciaMensajeWA: referenciaMensajeWA,
      creadoEn: Timestamp.now(),
    } as MensajeWhatsApp);

    return docRef.id;
  } catch (error) {
    console.error('Error guardando mensaje recibido:', error);
    throw error;
  }
}

/**
 * Obtener historial de mensajes con un cliente
 */
export async function obtenerHistorialMensajes(telefono: string, limite: number = 50): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(
      mensajesRef,
      where('telefono', '==', telefono),
      orderBy('creadoEn', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limite).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as MensajeWhatsApp));
  } catch (error) {
    console.error('Error fetching historial mensajes:', error);
    return [];
  }
}

/**
 * Listener en tiempo real para mensajes nuevos
 */
export function onNuevosMensajes(callback: (mensaje: MensajeWhatsApp) => void): () => void {
  const mensajesRef = collection(db, 'mensajes_whatsapp');
  const q = query(mensajesRef, where('tipo', '==', 'entrada'), orderBy('creadoEn', 'desc'));

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const mensaje = {
          id: change.doc.id,
          ...change.doc.data(),
        } as MensajeWhatsApp;
        callback(mensaje);
      }
    });
  });
}

/**
 * Obtener todos los mensajes sin leer
 */
export async function obtenerMensajesSinLeer(): Promise<MensajeWhatsApp[]> {
  try {
    const mensajesRef = collection(db, 'mensajes_whatsapp');
    const q = query(
      mensajesRef,
      where('tipo', '==', 'entrada'),
      where('estado', '==', 'entregado'),
      orderBy('creadoEn', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as MensajeWhatsApp));
  } catch (error) {
    console.error('Error fetching mensajes sin leer:', error);
    return [];
  }
}

/**
 * Marcar mensaje como leído
 */
export async function marcarMensajeLeido(mensajeId: string): Promise<void> {
  try {
    const docRef = doc(db, 'mensajes_whatsapp', mensajeId);
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
 * Enviar enlace de pago con Stripe
 */
export async function enviarEnlacePago(
  telefono: string,
  monto: number,
  urlCheckout: string,
  numeroVenta: string
): Promise<string> {
  const contenido = `💳 *Confirma tu pago*

Total: $${(monto / 1000).toFixed(0)}k COP

*Pagar aquí:* ${urlCheckout}

Referencia: #${numeroVenta}

Presiona el enlace para completar el pago seguro ✅`;

  return enviarMensajeWhatsApp({
    telefono,
    contenido,
  });
}

/**
 * Enviar notificación de pago completado
 */
export async function enviarNotificacionPagoCompletado(
  telefono: string,
  numeroVenta: string,
  total: number
): Promise<string> {
  const contenido = `✅ *Pago Confirmado*

Tu pago de $${(total / 1000).toFixed(0)}k COP ha sido procesado exitosamente.

Referencia: #${numeroVenta}

Tu orden está siendo preparada 👨‍🍳`;

  return enviarMensajeWhatsApp({
    telefono,
    contenido,
  });
}
