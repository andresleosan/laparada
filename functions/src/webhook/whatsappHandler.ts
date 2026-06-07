// functions/src/webhook/whatsappHandler.ts
/**
 * Manejador del webhook de WhatsApp Business Cloud API
 * Fase 3: Modo MOCK - simula flujo de bot
 * Flujo: saludo → menú → categoría → productos → confirmación → domicilio
 *
 * TODO (Fase 4+): Activar llamadas reales a Graph API cuando VITE_WHATSAPP_ACCESS_TOKEN esté disponible
 * TODO (Fase 4+): Implementar state machine para conversaciones persistentes
 * TODO (Fase 4+): Integración real con datos de Firestore
 */

interface WhatsAppMessage {
  from: string;
  type: string;
  text?: {
    body: string;
  };
  interactive?: {
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
    };
  };
}

export interface WhatsAppResponse {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'interactive';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button' | 'list';
    body: {
      text: string;
    };
    action: {
      buttons?: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }>;
      button?: string;
    };
  };
}

/**
 * Conversación simplificada MOCK (Fase 3)
 * En producción, guardar estado en Firestore/Redis
 */
const userSessions: Map<string, { step: string; data: any }> = new Map();

export function handleWhatsAppMessage(message: WhatsAppMessage): WhatsAppResponse | null {
  const userId = message.from;
  let session = userSessions.get(userId) || { step: 'start', data: {} };

  // TODO: Validar firma HMAC del payload (seguridad Meta)
  // const signature = req.headers['x-hub-signature-256'];
  // validateWebhookSignature(signature, body, whatsappToken);

  const userMessage = message.text?.body?.toLowerCase() || '';
  const interactiveId = message.interactive?.button_reply?.id || 
                        message.interactive?.list_reply?.id || '';

  // Simular flujo conversacional
  if (session.step === 'start' || userMessage === 'hola' || userMessage === '1') {
    // Enviar menú principal
    session.step = 'menu';
    userSessions.set(userId, session);

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: userId,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '👋 Bienvenido a La Parada!\n\n¿Qué deseas hacer?',
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'btn_order',
                title: '🍔 Hacer Pedido',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'btn_status',
                title: '📍 Ver Estado',
              },
            },
            {
              type: 'reply',
              reply: {
                id: 'btn_help',
                title: '❓ Ayuda',
              },
            },
          ],
        },
      },
    };
  }

  if (interactiveId === 'btn_order') {
    // Mostrar categorías
    session.step = 'category';
    userSessions.set(userId, session);

    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: userId,
      type: 'text',
      text: {
        body: '📦 Selecciona una categoría:\n\n1️⃣ Combos\n2️⃣ Hamburguesas\n3️⃣ Perros\n4️⃣ Bebidas',
      },
    };
  }

  if (interactiveId === 'btn_help') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: userId,
      type: 'text',
      text: {
        body: '❓ Ayuda - La Parada\n\n📱 Llámanos: +57 1 234-5678\n💬 Escribe "hola" para reiniciar',
      },
    };
  }

  if (interactiveId === 'btn_status') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: userId,
      type: 'text',
      text: {
        body: '📍 Tu pedido está en preparación\n\nEstado: 🟡 En Preparación\nTiempo estimado: 15 minutos',
      },
    };
  }

  // Default echo (MOCK)
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: userId,
    type: 'text',
    text: {
      body: `Recibido: ${userMessage || 'mensaje sin texto'}`,
    },
  };
}

/**
 * Verificar webhook de Meta (POST /webhook)
 * Meta envía verification_token que debe coincidir
 */
export function verifyWebhookToken(
  mode: string,
  token: string,
  expectedToken: string
): boolean {
  // TODO: Cargar expectedToken de process.env.WHATSAPP_WEBHOOK_TOKEN
  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Webhook verificado');
    return true;
  }
  console.warn('❌ Webhook verification failed');
  return false;
}
