import axios, { AxiosError } from 'axios';
import * as admin from 'firebase-admin';
import {
  requireConfiguredValue,
  whatsappAccessToken,
  whatsappApiVersion,
  whatsappNegocioId,
  whatsappPhoneNumberId,
} from '../config/integrationParams';
import { sendPersistedWhatsAppMessage } from './manualMessage';

const getDb = () => admin.firestore();

function getConfiguredTenantId(): string {
  return requireConfiguredValue(whatsappNegocioId.value(), 'WHATSAPP_NEGOCIO_ID');
}

async function assertQueueTenant(queueId: string, negocioId: string): Promise<void> {
  const snapshot = await getDb().collection('bot_queue').doc(queueId).get();
  if (!snapshot.exists || snapshot.data()?.negocioId !== negocioId) {
    throw new Error('Queue message does not belong to the configured tenant');
  }
}

export interface BotQueueMessage {
  id: string;
  negocioId: string;
  mensajeId: string;
  numeroOrigen: string;
  contenido: string;
  tipoContenido: string;
  estado: 'pendiente' | 'procesando' | 'error' | 'procesado' | 'descartado';
  intentos: number;
  accionPendiente?: string;
  respuestaPendiente?: string;
}

/**
 * Tipos de mensajes WhatsApp
 */
export type TipoMensaje = 'text';

export interface MensajeWhatsAppEnvio {
  numeroDestino: string; // Formato: +57XXXXXXXXXX
  tipo: TipoMensaje;
  contenido: string;
}

/**
 * Envía un mensaje por WhatsApp Business API
 */
export async function enviarMensajeWhatsApp(mensaje: MensajeWhatsAppEnvio): Promise<string> {
  try {
    const phoneNumberId = requireConfiguredValue(
      whatsappPhoneNumberId.value(),
      'WHATSAPP_PHONE_NUMBER_ID'
    );
    const accessToken = requireConfiguredValue(
      whatsappAccessToken.value(),
      'WHATSAPP_ACCESS_TOKEN'
    );
    const apiVersion = requireConfiguredValue(
      whatsappApiVersion.value(),
      'WHATSAPP_API_VERSION'
    );
    if (!/^\d+$/.test(phoneNumberId) || !/^v\d+\.\d+$/.test(apiVersion)) {
      throw new Error('WhatsApp API configuration is invalid');
    }
    const apiBase = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;

    const destination = mensaje.numeroDestino.replace(/\D/g, '');
    if (!/^\d{6,20}$/.test(destination)) {
      throw new Error('WhatsApp destination number is invalid');
    }
    if (!mensaje.contenido || mensaje.contenido.length > 4096) {
      throw new Error('WhatsApp message content is invalid');
    }

    const payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: destination,
    };

    payload.type = 'text';
    payload.text = {
      preview_url: false,
      body: mensaje.contenido,
    };

    const response = await axios.post(`${apiBase}/messages`, payload, {
      timeout: 10_000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const messageId = response.data?.messages?.[0]?.id;
    if (typeof messageId !== 'string' || !messageId) {
      throw new Error('WhatsApp API returned an invalid response');
    }
    console.log(`Message sent: ${messageId}`);

    return messageId;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error sending WhatsApp message', {
      status: axiosError.response?.status,
      code: axiosError.code,
      message: axiosError.message,
    });
    throw error;
  }
}

/**
 * Plantillas de auto-respuesta predefinidas
 */
export const TEMPLATES_AUTO_RESPUESTA = {
  BIENVENIDA: `¡Hola! 👋 Bienvenido.

Aquí puedes:
1️⃣ Ver nuestro menú
2️⃣ Hacer un pedido
3️⃣ Rastrear tu entrega
4️⃣ Hablar con soporte

¿Qué deseas hacer?`,

  MENU_DISPONIBLE: `📋 NUESTRO MENÚ:

{items}

Para pedir, responde el número del producto o escriba "menú completo" para más detalles.`,

  CONFIRMAR_ORDEN: `✅ ¡Tu pedido fue confirmado!

Productos: {productos}
Total: {total}
Pago offline: {metodoPago}
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

export function renderAutoRespuesta(
  plantilla: keyof typeof TEMPLATES_AUTO_RESPUESTA,
  variables?: Record<string, string>
): string {
  let contenido = TEMPLATES_AUTO_RESPUESTA[plantilla];

  // Reemplazar variables
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      contenido = contenido.replace(`{${key}}`, value);
    });
  }

  return contenido;
}

/**
 * Obtiene mensajes pendientes de procesar
 */
export async function obtenerMensajesPendientes(limite: number = 10): Promise<BotQueueMessage[]> {
  const negocioId = getConfiguredTenantId();
  const snapshot = await getDb()
    .collection('bot_queue')
    .where('negocioId', '==', negocioId)
    .where('estado', '==', 'pendiente')
    .orderBy('creadoEn', 'asc')
    .limit(Math.min(Math.max(limite, 1), 50))
    .get();

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  } as BotQueueMessage));
}

export async function reclamarMensajeQueue(queueId: string): Promise<BotQueueMessage | null> {
  const negocioId = getConfiguredTenantId();
  const queueRef = getDb().collection('bot_queue').doc(queueId);
  return getDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(queueRef);
    const data = snapshot.data();
    if (!snapshot.exists || data?.negocioId !== negocioId || data?.estado !== 'pendiente') {
      return null;
    }
    transaction.update(queueRef, {
      estado: 'procesando',
      procesandoEn: admin.firestore.FieldValue.serverTimestamp(),
      leaseHasta: admin.firestore.Timestamp.fromMillis(Date.now() + 3 * 60 * 1000),
    });
    return { id: snapshot.id, ...data, estado: 'procesando' } as BotQueueMessage;
  });
}

export async function enviarRespuestaQueue(
  mensaje: BotQueueMessage,
  contenido: string
): Promise<string> {
  const negocioId = getConfiguredTenantId();
  if (mensaje.negocioId !== negocioId) {
    throw new Error('Queue message does not belong to the configured tenant');
  }
  const result = await sendPersistedWhatsAppMessage(
    getDb(),
    {
      outboundId: `bot_${mensaje.id}`,
      negocioId,
      telefono: mensaje.numeroOrigen,
      contenido,
      origen: 'bot',
      mensajeEntradaId: mensaje.mensajeId,
      queueId: mensaje.id,
    },
    enviarMensajeWhatsApp
  );
  return result.mensajeId;
}

export async function guardarResultadoQueue(
  queueId: string,
  accion: string,
  respuesta: string
): Promise<void> {
  const negocioId = getConfiguredTenantId();
  await assertQueueTenant(queueId, negocioId);
  if (!accion || accion.length > 100 || !respuesta || respuesta.length > 4096) {
    throw new Error('Bot result is invalid');
  }
  await getDb().collection('bot_queue').doc(queueId).update({
    accionPendiente: accion,
    respuestaPendiente: respuesta,
    logicaProcesadaEn: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export async function enviarMensajeBotPersistido(input: {
  outboundId: string;
  telefono: string;
  contenido: string;
}): Promise<string> {
  const negocioId = getConfiguredTenantId();
  const result = await sendPersistedWhatsAppMessage(
    getDb(),
    {
      outboundId: input.outboundId,
      negocioId,
      telefono: input.telefono,
      contenido: input.contenido,
      origen: 'bot',
    },
    enviarMensajeWhatsApp
  );
  return result.mensajeId;
}

/**
 * Marca mensaje como procesado
 */
export async function marcarMensajeProcesado(
  queueId: string,
  accionRealizada: string
): Promise<void> {
  try {
    const negocioId = getConfiguredTenantId();
    await assertQueueTenant(queueId, negocioId);
    const queueRef = getDb().collection('bot_queue').doc(queueId);
    const queueSnapshot = await queueRef.get();
    const batch = getDb().batch();
    batch.update(queueRef, {
      estado: 'procesado',
      accionRealizada,
      procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
      leaseHasta: admin.firestore.FieldValue.delete(),
    });
    const mensajeId = queueSnapshot.data()?.mensajeId;
    if (typeof mensajeId === 'string' && mensajeId) {
      batch.update(getDb().collection('mensajes_whatsapp').doc(mensajeId), {
        procesado: true,
        procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    console.error('Error marking message as processed:', error);
    throw error;
  }
}

/**
 * Reintentar mensaje fallido
 */
export async function reintenrarMensajeEnQueue(queueId: string, razonError: string): Promise<void> {
  try {
    const negocioId = getConfiguredTenantId();
    const queueRef = getDb().collection('bot_queue').doc(queueId);
    await getDb().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(queueRef);
      const data = snapshot.data();
      if (!snapshot.exists || data?.negocioId !== negocioId) {
        throw new Error('Queue message does not belong to the configured tenant');
      }
      const intentos = Math.max(0, Number(data?.intentos) || 0) + 1;
      const delayMs = Math.min(15, 2 ** intentos) * 60 * 1000;
      transaction.update(queueRef, {
        estado: intentos >= 3 ? 'descartado' : 'error',
        razonError: razonError.slice(0, 300),
        intentos,
        proximoReintento: admin.firestore.Timestamp.fromMillis(Date.now() + delayMs),
        ultimoError: admin.firestore.FieldValue.serverTimestamp(),
        leaseHasta: admin.firestore.FieldValue.delete(),
      });
    });
  } catch (error) {
    console.error('Error retrying message:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas del bot
 */
export async function obtenerEstadisticasBot(): Promise<{
  mensajesRecibidos: number;
  mensajesProcesados: number;
  mensajesEnError: number;
  ordenesProcesadas: number;
  tasaExito: number;
}> {
  try {
    const negocioId = getConfiguredTenantId();
    const totalRef = getDb().collection('bot_queue');

    const recibidosSnapshot = await totalRef
      .where('negocioId', '==', negocioId)
      .where('estado', '==', 'pendiente')
      .get();
    const procesadosSnapshot = await totalRef
      .where('negocioId', '==', negocioId)
      .where('estado', '==', 'procesado')
      .get();
    const erroresSnapshot = await totalRef
      .where('negocioId', '==', negocioId)
      .where('estado', '==', 'error')
      .get();

    const ordenes = await getDb()
      .collection('ventas')
      .where('negocioId', '==', negocioId)
      .where('origen', '==', 'whatsapp')
      .get();

    const total = recibidosSnapshot.size + procesadosSnapshot.size + erroresSnapshot.size;
    const tasaExito =
      total > 0
        ? ((procesadosSnapshot.size / (procesadosSnapshot.size + erroresSnapshot.size)) * 100).toFixed(
            2
          )
        : '100';

    return {
      mensajesRecibidos: total,
      mensajesProcesados: procesadosSnapshot.size,
      mensajesEnError: erroresSnapshot.size,
      ordenesProcesadas: ordenes.size,
      tasaExito: parseFloat(tasaExito),
    };
  } catch (error) {
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
