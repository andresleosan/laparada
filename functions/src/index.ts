// functions/src/index.ts
import { stripeWebhook } from './webhooks/stripeWebhook';
import { mercadopagoWebhook } from './webhooks/mercadopagoWebhook';
import { whatsappWebhook } from './webhooks/whatsappWebhook';
import { retryFailedPayments } from './utils/retryPaymentHandler';
import { procesarMensajesBot, limpiarOrdenesExpiradas, reintenrarMensajesEnError } from './bot/messageProcessorScheduler';

/**
 * Phase 7: Production Ready Webhooks & Real-time Updates
 * - stripeWebhook: Manejo de webhooks de Stripe
 * - mercadopagoWebhook: Manejo de webhooks de MercadoPago
 * - whatsappWebhook: Manejo de webhooks de WhatsApp (delivery status)
 * - retryFailedPayments: Reintenta transacciones fallidas (cada 10 minutos)
 *
 * Phase 8: WhatsApp Bot & Automation
 * - procesarMensajesBot: Procesa mensajes en queue (cada 2 minutos)
 * - limpiarOrdenesExpiradas: Limpia órdenes expiradas (cada hora)
 * - reintenrarMensajesEnError: Reintenta mensajes fallidos (cada 5 minutos)
 *
 * Bot Services (imported but not directly exported):
 * - whatsappBotService: Envío de mensajes y gestión de queue
 * - menuGenerationService: Generación dinámica de menú desde BD
 * - orderProcessingService: Procesamiento de órdenes desde mensajes
 * - deliveryTrackingService: Seguimiento automático de entregas
 */

export { 
  stripeWebhook, 
  mercadopagoWebhook, 
  whatsappWebhook, 
  retryFailedPayments,
  procesarMensajesBot,
  limpiarOrdenesExpiradas,
  reintenrarMensajesEnError
};
