import * as functions from 'firebase-functions/v2/https';
/**
 * Webhook para WhatsApp Business API
 * Procesa eventos de estado de entrega (sent, delivered, read, failed)
 * Formato esperado según Meta/WhatsApp Business API
 */
export declare const whatsappWebhook: functions.HttpsFunction;
