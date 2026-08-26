import { whatsappWebhook } from './webhooks/whatsappWebhook';
import { procesarMensajesBot, limpiarOrdenesExpiradas, reintenrarMensajesEnError } from './bot/messageProcessorScheduler';
import { crearPedidoPublico } from './orders/createPublicOrder';
import { crearUsuarioPersonal } from './staff/createStaffUser';
import { enviarMensajeWhatsAppManual } from './bot/sendWhatsAppMessage';
/**
 * Phase 7: WhatsApp webhook & real-time updates
 * - whatsappWebhook: Manejo de webhooks de WhatsApp (delivery status)
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
 *
 */
export { crearPedidoPublico, crearUsuarioPersonal, enviarMensajeWhatsAppManual, whatsappWebhook, procesarMensajesBot, limpiarOrdenesExpiradas, reintenrarMensajesEnError };
