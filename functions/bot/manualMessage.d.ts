import { type Firestore } from 'firebase-admin/firestore';
export interface ManualWhatsAppMessageInput {
    negocioId: string;
    telefono: string;
    contenido: string;
    idempotencyKey: string;
}
export interface WhatsAppActor {
    uid: string;
    email: string;
}
export interface PersistedWhatsAppMessageInput {
    outboundId: string;
    negocioId: string;
    telefono: string;
    contenido: string;
    origen: 'manual' | 'bot';
    mensajeEntradaId?: string;
    queueId?: string;
}
export interface SentWhatsAppMessage {
    mensajeId: string;
    referenciaWhatsapp: string;
    reused: boolean;
}
export type WhatsAppMessageErrorCode = 'invalid-argument' | 'permission-denied' | 'failed-precondition' | 'unavailable';
export declare class WhatsAppMessageError extends Error {
    readonly code: WhatsAppMessageErrorCode;
    constructor(code: WhatsAppMessageErrorCode, message: string);
}
type ProviderSender = (message: {
    numeroDestino: string;
    tipo: 'text';
    contenido: string;
}) => Promise<string>;
export declare function assertOfflineOnlyContent(content: string): void;
export declare function parseManualWhatsAppMessageInput(value: unknown): ManualWhatsAppMessageInput;
export declare function sendPersistedWhatsAppMessage(db: Firestore, input: PersistedWhatsAppMessageInput, sendProvider: ProviderSender): Promise<SentWhatsAppMessage>;
export declare function sendManualWhatsAppMessage(db: Firestore, input: ManualWhatsAppMessageInput, actor: WhatsAppActor, sendProvider: ProviderSender): Promise<SentWhatsAppMessage>;
export {};
