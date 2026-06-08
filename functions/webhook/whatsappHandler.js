"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWhatsAppMessage = handleWhatsAppMessage;
exports.verifyWebhookToken = verifyWebhookToken;
/**
 * Conversación simplificada MOCK (Fase 3)
 * En producción, guardar estado en Firestore/Redis
 */
const userSessions = new Map();
function handleWhatsAppMessage(message) {
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
function verifyWebhookToken(mode, token, expectedToken) {
    // TODO: Cargar expectedToken de process.env.WHATSAPP_WEBHOOK_TOKEN
    if (mode === 'subscribe' && token === expectedToken) {
        console.log('✅ Webhook verificado');
        return true;
    }
    console.warn('❌ Webhook verification failed');
    return false;
}
