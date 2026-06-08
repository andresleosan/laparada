import axios, { AxiosError } from 'axios';
import * as admin from 'firebase-admin';

const db = admin.firestore();

const WHATSAPP_API_VERSION = 'v18.0';
const WHATSAPP_BUSINESS_PHONE_ID = process.env.WHATSAPP_BUSINESS_PHONE_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN; // Reutilizar si está disponible
const WHATSAPP_API_BASE = `https://graph.instagram.com/${WHATSAPP_API_VERSION}/${WHATSAPP_BUSINESS_PHONE_ID}`;

/**
 * Tipos de mensajes WhatsApp
 */
export type TipoMensaje = 'text' | 'image' | 'document' | 'button' | 'template';

export interface MensajeWhatsAppEnvio {
  numeroDestino: string; // Formato: +57XXXXXXXXXX
  tipo: TipoMensaje;
  contenido: string;
  mediaUrl?: string;
  plantilla?: string; // Para templates pre-registrados
  botones?: Array<{
    id: string;
    titulo: string;
  }>;
}

/**
 * Envía un mensaje por WhatsApp Business API
 */
export async function enviarMensajeWhatsApp(mensaje: MensajeWhatsAppEnvio): Promise<string> {
  try {
    if (!WHATSAPP_BUSINESS_PHONE_ID || !WHATSAPP_ACCESS_TOKEN) {
      throw new Error('WhatsApp credentials not configured');
    }

    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: mensaje.numeroDestino.replace(/\D/g, ''), // Solo números
    };

    if (mensaje.tipo === 'text') {
      payload.type = 'text';
      payload.text = {
        preview_url: true,
        body: mensaje.contenido,
      };
    } else if (mensaje.tipo === 'image') {
      payload.type = 'image';
      payload.image = {
        link: mensaje.mediaUrl,
      };
    } else if (mensaje.tipo === 'document') {
      payload.type = 'document';
      payload.document = {
        link: mensaje.mediaUrl,
        caption: mensaje.contenido,
      };
    } else if (mensaje.tipo === 'template') {
      payload.type = 'template';
      payload.template = {
        name: mensaje.plantilla,
        language: {
          code: 'es',
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: mensaje.contenido,
              },
            ],
          },
        ],
      };
    }

    const response = await axios.post(`${WHATSAPP_API_BASE}/messages`, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const messageId = response.data.messages[0].id;
    console.log(`Message sent: ${messageId}`);

    return messageId;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('Error sending WhatsApp message:', axiosError.response?.data || error);
    throw error;
  }
}

/**
 * Plantillas de auto-respuesta predefinidas
 */
export const TEMPLATES_AUTO_RESPUESTA = {
  BIENVENIDA: `¡Hola! 👋 Bienvenido a La Parada. 

Aquí puedes:
1️⃣ Ver nuestro menú
2️⃣ Hacer un pedido
3️⃣ Rastrear tu entrega
4️⃣ Hablar con soporte

¿Qué deseas hacer?`,

  MENU_DISPONIBLE: `📋 NUESTRO MENÚ:

{items}

Para pedir, responde el número del producto o escriba "menú completo" para más detalles.`,

  CONFIRMAR_ORDEN: `✅ Tu orden ha sido confirmada!

Productos: {productos}
Total: {total}
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

  PAGO_PENDIENTE: `💳 Pago Pendiente

Tu orden {orderId} está lista pero requiere confirmación de pago.

Monto: {monto}

Opciones de pago:
1️⃣ Transferencia
2️⃣ Daviplata
3️⃣ PayPal

Responde el número de tu opción.`,

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

/**
 * Envía respuesta automática basada en template
 */
export async function enviarAutoRespuesta(
  numeroDestino: string,
  plantilla: keyof typeof TEMPLATES_AUTO_RESPUESTA,
  variables?: Record<string, string>
): Promise<string> {
  let contenido = TEMPLATES_AUTO_RESPUESTA[plantilla];

  // Reemplazar variables
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      contenido = contenido.replace(`{${key}}`, value);
    });
  }

  return enviarMensajeWhatsApp({
    numeroDestino,
    tipo: 'text',
    contenido,
  });
}

/**
 * Registra mensaje en Firestore con queue para procesamiento
 */
export async function registrarMensajeEnQueue(
  numeroOrigen: string,
  contenido: string,
  tipo: 'entrada' | 'salida'
): Promise<string> {
  try {
    const mensajeRef = db.collection('mensajes_whatsapp').doc();
    const ahora = admin.firestore.FieldValue.serverTimestamp();

    await mensajeRef.set({
      telefono: numeroOrigen,
      contenido,
      tipo,
      estado: 'recibido',
      creadoEn: ahora,
      actualizadoEn: ahora,
      procesado: false,
      intentosProcesamiento: 0,
    });

    // Agregar a queue de procesamiento
    const queueRef = db.collection('bot_queue').doc();
    await queueRef.set({
      mensajeId: mensajeRef.id,
      numeroOrigen,
      contenido,
      estado: 'pendiente',
      creadoEn: ahora,
      proximoReintento: ahora,
      intentos: 0,
    });

    console.log(`Message queued: ${mensajeRef.id}`);
    return mensajeRef.id;
  } catch (error) {
    console.error('Error registering message in queue:', error);
    throw error;
  }
}

/**
 * Obtiene mensajes pendientes de procesar
 */
export async function obtenerMensajesPendientes(limite: number = 10) {
  try {
    const snapshot = await db
      .collection('bot_queue')
      .where('estado', '==', 'pendiente')
      .orderBy('creadoEn', 'asc')
      .limit(limite)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    return [];
  }
}

/**
 * Marca mensaje como procesado
 */
export async function marcarMensajeProcesado(
  queueId: string,
  accionRealizada: string
): Promise<void> {
  try {
    await db.collection('bot_queue').doc(queueId).update({
      estado: 'procesado',
      accionRealizada,
      procesadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });
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
    const now = new Date();
    const proximoReintento = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutos

    await db.collection('bot_queue').doc(queueId).update({
      estado: 'error',
      razonError,
      intentos: admin.firestore.FieldValue.increment(1),
      proximoReintento: admin.firestore.Timestamp.fromDate(proximoReintento),
      ultimoError: admin.firestore.FieldValue.serverTimestamp(),
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
    const totalRef = db.collection('bot_queue');

    const recibidosSnapshot = await totalRef.where('estado', '==', 'pendiente').get();
    const procesadosSnapshot = await totalRef.where('estado', '==', 'procesado').get();
    const erroresSnapshot = await totalRef.where('estado', '==', 'error').get();

    const ordenes = await db
      .collection('ventas')
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
