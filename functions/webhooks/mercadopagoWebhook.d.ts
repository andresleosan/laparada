import * as functions from 'firebase-functions/v2/https';
/**
 * Maneja webhooks de MercadoPago
 * Actualiza el estado de transacciones basado en eventos de MercadoPago
 */
export declare const mercadopagoWebhook: functions.HttpsFunction;
