// functions/src/webhook/whatsappHandler.ts
/**
 * Manejador del webhook de WhatsApp Business Cloud API
 * Modo MOCK: simula respuestas sin hacer llamadas reales hasta activación
 *
 * TODO: Activar llamadas reales a Graph API cuando VITE_WHATSAPP_ACCESS_TOKEN esté disponible
 */

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: {
    body: string;
  };
}

export function handleWhatsAppMessage(message: WhatsAppMessage): string {
  // TODO: Validar firma HMAC del payload (seguridad Meta)
  // TODO: Leer configuracion/bot_config de Firestore
  // TODO: Gestionar estado conversacional del usuario
  // TODO: Implementar flujo: saludo → menú → pedido → confirmación

  // Por ahora, respuesta de prueba
  return `Echo: ${message.text?.body || 'Sin mensaje'}`;
}
