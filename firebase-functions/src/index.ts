// firebase-functions/src/index.ts
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
  admin.initializeApp();
}

import { whatsappWebhook } from './webhooks/whatsappWebhook';
import { procesarMensajesBot, limpiarOrdenesExpiradas, reintenrarMensajesEnError } from './bot/messageProcessorScheduler';
import { crearPedidoPublico } from './orders/createPublicOrder';
import { crearUsuarioPersonal } from './staff/createStaffUser';
import { enviarMensajeWhatsAppManual } from './bot/sendWhatsAppMessage';
import { removerFondoProducto } from './image/removeProductBackground';
import {
  enviarResumenDiarioNegocios,
  enviarResumenDiarioManual,
  obtenerResumenDiario,
} from './notifications/dailySummaryFunctions';
import {
  notificarSuscripcionEmail,
  verificarAlertasSuscripciones,
} from './notifications/subscriptionNotifications';

/**
 * Phase 7: WhatsApp webhook & real-time updates
 * - whatsappWebhook: Manejo de webhooks de WhatsApp (delivery status)
 *
 * Phase 8: WhatsApp Bot & Automation
 * - procesarMensajesBot: Procesa mensajes en queue (cada 2 minutos)
 * - limpiarOrdenesExpiradas: Limpia órdenes expiradas (cada hora)
 * - reintenrarMensajesEnError: Reintenta mensajes fallidos (cada 5 minutos)
 *
 * Notificaciones y Correos Transaccionales (Resend):
 * - enviarResumenDiarioNegocios: Resumen ejecutivo diario de ventas (11:00 PM Colombia)
 * - enviarResumenDiarioManual: Callable para envío bajo demanda desde Dashboard/Reportes
 * - obtenerResumenDiario: Callable para previsualización reactiva de ventas y productividad
 * - notificarSuscripcionEmail: Notificación inmediata de alta/renovación SaaS
 * - verificarAlertasSuscripciones: Alerta preventiva de vencimiento y cuota de Sarin IA (9:00 AM Colombia)
 *
 * Bot Services (imported but not directly exported):
 * - whatsappBotService: Envío de mensajes y gestión de queue
 * - menuGenerationService: Generación dinámica de menú desde BD
 * - orderProcessingService: Procesamiento de órdenes desde mensajes
 *
 */

export { 
  crearPedidoPublico,
  crearUsuarioPersonal,
  enviarMensajeWhatsAppManual,
  removerFondoProducto,
  whatsappWebhook, 
  procesarMensajesBot,
  limpiarOrdenesExpiradas,
  reintenrarMensajesEnError,
  enviarResumenDiarioNegocios,
  enviarResumenDiarioManual,
  obtenerResumenDiario,
  notificarSuscripcionEmail,
  verificarAlertasSuscripciones
};
