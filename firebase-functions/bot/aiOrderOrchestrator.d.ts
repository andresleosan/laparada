import * as admin from 'firebase-admin';
import { AgentToolExecutionOutcome, AgentToolExecutorContext, completeDeepSeekChat, DeepSeekClientOptions } from '../ai/deepseekEngine';
import { BotOperationContext, BotProcessingResult } from './orderProcessingService';
/**
 * Registra una pausa del bot cuando un operador humano interviene manualmente
 * o cuando el cliente solicita atención personalizada.
 */
export declare function pauseConversationForOperator(db: admin.firestore.Firestore, negocioId: string, telefono: string, motivo: 'operador_manual' | 'solicitud_cliente' | 'smb_echo'): Promise<void>;
/**
 * Reactiva el bot para una conversación específica.
 */
export declare function resumeConversationBot(db: admin.firestore.Firestore, negocioId: string, telefono: string): Promise<void>;
/**
 * Verifica si la conversación está actualmente en modo humano (handoff activo).
 */
export declare function isConversationPausedByOperator(db: admin.firestore.Firestore, negocioId: string, telefono: string): Promise<boolean>;
export interface CatalogItemSummary {
    id: string;
    tipo: 'producto' | 'combo';
    nombre: string;
    precio: number;
    categoria?: string;
    descripcion?: string;
}
export declare function cargarCatalogoVerificado(db: admin.firestore.Firestore, negocioId: string, busqueda?: string): Promise<CatalogItemSummary[]>;
/**
 * Ejecutor de las 4 herramientas del agente DeepSeek contra Firestore.
 */
export declare function executeLaParadaOrderTool(toolName: string, args: Record<string, unknown>, context: AgentToolExecutorContext, db?: admin.firestore.Firestore): Promise<AgentToolExecutionOutcome>;
/**
 * Procesa un mensaje en lenguaje natural usando la arquitectura Sarin Bot (DeepSeek + Tool Calling).
 */
export declare function procesarMensajeConDeepSeek(numeroCliente: string, contenidoMensaje: string, negocioId: string, operationContext?: BotOperationContext, options?: {
    mensajeBienvenida?: string;
    mensajeCierre?: string;
    completeChatFn?: typeof completeDeepSeekChat;
    clientOptions?: DeepSeekClientOptions;
    db?: admin.firestore.Firestore;
}): Promise<BotProcessingResult>;
