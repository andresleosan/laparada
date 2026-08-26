import type { Firestore } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v2/https';
/**
 * Webhook de WhatsApp Business API.
 * La autenticidad se valida antes de interpretar el payload o escribir en Firestore.
 */
export declare const whatsappWebhook: functions.HttpsFunction;
export declare function processWebhookPayload(db: Firestore, payload: unknown, expectedPhoneNumberId: string, negocioId: string): Promise<number>;
