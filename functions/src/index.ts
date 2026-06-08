// functions/src/index.ts
import { stripeWebhook } from './webhooks/stripeWebhook';
import { mercadopagoWebhook } from './webhooks/mercadopagoWebhook';
import { whatsappWebhook } from './webhooks/whatsappWebhook';
import { retryFailedPayments } from './utils/retryPaymentHandler';

/**
 * Phase 7: Production Ready Webhooks & Real-time Updates
 * - stripeWebhook: Manejo de webhooks de Stripe
 * - mercadopagoWebhook: Manejo de webhooks de MercadoPago
 * - whatsappWebhook: Manejo de webhooks de WhatsApp (delivery status)
 * - retryFailedPayments: Reintenta transacciones fallidas (cada 10 minutos)
 *
 * TODO: Implementar en fases posteriores
 * - createDomicilio: Crear pedido desde bot
 * - updateDomicilioStatus: Actualizar estado de domicilio
 * - generateMenuFromDB: Generar menú dinámico
 */

export { stripeWebhook, mercadopagoWebhook, whatsappWebhook, retryFailedPayments };
