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
export declare function handleWhatsAppMessage(message: WhatsAppMessage): WhatsAppResponse | null;
/**
 * Verificar webhook de Meta (POST /webhook)
 * Meta envía verification_token que debe coincidir
 */
export declare function verifyWebhookToken(mode: string, token: string, expectedToken: string): boolean;
export {};
