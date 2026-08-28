import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { whatsappAccessToken } from '../config/integrationParams';
import { enviarMensajeWhatsApp } from './whatsappBotService';
import {
  parseManualWhatsAppMessageInput,
  sendManualWhatsAppMessage,
  WhatsAppMessageError,
} from './manualMessage';

export const enviarMensajeWhatsAppManual = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 5,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
    secrets: [whatsappAccessToken],
  },
  async (request) => {
    if (!request.auth?.uid || typeof request.auth.token.email !== 'string') {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }
    if (request.app?.alreadyConsumed) {
      throw new HttpsError('failed-precondition', 'La verificación de la solicitud ya fue usada');
    }

    try {
      const input = parseManualWhatsAppMessageInput(request.data);
      return await sendManualWhatsAppMessage(
        admin.firestore(),
        input,
        { uid: request.auth.uid, email: request.auth.token.email },
        enviarMensajeWhatsApp
      );
    } catch (error) {
      if (error instanceof WhatsAppMessageError) {
        throw new HttpsError(error.code, error.message);
      }
      console.error('Error interno enviando WhatsApp manual', {
        code: typeof error === 'object' && error && 'code' in error
          ? String((error as { code: unknown }).code).slice(0, 80)
          : 'unknown',
      });
      throw new HttpsError('internal', 'No fue posible enviar el mensaje');
    }
  }
);
