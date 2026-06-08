import * as functions from 'firebase-functions/v2/https';
/**
 * Maneja webhooks de Stripe
 * Actualiza el estado de transacciones basado en eventos de Stripe
 */
export declare const stripeWebhook: functions.HttpsFunction;
