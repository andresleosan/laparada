import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Webhook para WhatsApp Business API
 * Procesa eventos de estado de entrega (sent, delivered, read, failed)
 * Formato esperado según Meta/WhatsApp Business API
 */
export const whatsappWebhook = functions.onRequest(async (req, res) => {
  // GET para verificación inicial del webhook
  if (req.method === 'GET') {
    handleWebhookVerification(req, res);
    return;
  }

  // POST para procesar eventos
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { entry } = req.body;

    if (!Array.isArray(entry)) {
      res.status(400).json({ error: 'Invalid payload format' });
      return;
    }

    for (const entryItem of entry) {
      if (entryItem.changes) {
        for (const change of entryItem.changes) {
          const { value } = change;

          // Procesar status updates (delivery status)
          if (value.statuses) {
            await processStatusUpdates(value.statuses);
          }

          // Procesar mensajes incoming
          if (value.messages) {
            await processIncomingMessages(value.messages);
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Maneja la verificación del webhook (GET request)
 */
function handleWebhookVerification(req: any, res: any) {
  const verifyToken = process.env.WHATSAPP_WEBHOOK_TOKEN || 'test_token';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}

/**
 * Procesa actualizaciones de estado de entrega
 */
async function processStatusUpdates(statuses: any[]): Promise<void> {
  for (const status of statuses) {
    const { id: messageId, status: deliveryStatus, timestamp } = status;

    if (!messageId) continue;

    try {
      // Mapear estado de WhatsApp al nuestro
      const mappedStatus = mapWhatsappStatus(deliveryStatus);

      // Buscar el mensaje en nuestra BD por referencia de WhatsApp
      const messagesRef = db.collection('mensajes_whatsapp');
      const query = messagesRef.where('referenciaWhatsapp', '==', messageId);
      const snapshot = await query.get();

      if (snapshot.empty) {
        console.warn(`No message found with WhatsApp reference: ${messageId}`);
        continue;
      }

      const docId = snapshot.docs[0].id;

      // Actualizar estado del mensaje
      await messagesRef.doc(docId).update({
        estado: mappedStatus,
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        ...(mappedStatus === 'entregado' && {
          entregadoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
        }),
        ...(mappedStatus === 'leido' && {
          leidoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
        }),
      });

      // Registrar evento de entrega en subcollection
      await messagesRef.doc(docId).collection('eventos_entrega').add({
        tipo: mappedStatus,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        referenciaWhatsapp: messageId,
        metadatos: {
          timestampOriginal: timestamp,
        },
      });

      console.log(`Message ${docId} status updated to: ${mappedStatus}`);
    } catch (error) {
      console.error('Error processing status update:', error);
    }
  }
}

/**
 * Procesa mensajes entrantes
 */
async function processIncomingMessages(messages: any[]): Promise<void> {
  for (const message of messages) {
    const { from, id: messageId, timestamp, type, text } = message;

    if (!from || !messageId) continue;

    try {
      const messagesRef = db.collection('mensajes_whatsapp');

      // Crear registro del mensaje entrante
      await messagesRef.add({
        tipo: 'entrante',
        desde: from,
        contenido: text?.body || '',
        tipoContenido: type,
        referenciaWhatsapp: messageId,
        estado: 'entregado',
        creadoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        entregadoEn: admin.firestore.Timestamp.fromDate(new Date(timestamp * 1000)),
        leidoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Incoming message stored from ${from}`);
    } catch (error) {
      console.error('Error processing incoming message:', error);
    }
  }
}

/**
 * Mapea estados de WhatsApp a estados internos
 */
function mapWhatsappStatus(whatsappStatus: string): string {
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
      return 'enviado';
  }
}
