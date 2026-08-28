export interface BotQueueMessage {
    id: string;
    negocioId: string;
    mensajeId: string;
    numeroOrigen: string;
    contenido: string;
    tipoContenido: string;
    estado: 'pendiente' | 'procesando' | 'error' | 'procesado' | 'descartado';
    intentos: number;
    accionPendiente?: string;
    respuestaPendiente?: string;
}
/**
 * Tipos de mensajes WhatsApp
 */
export type TipoMensaje = 'text';
export interface MensajeWhatsAppEnvio {
    numeroDestino: string;
    tipo: TipoMensaje;
    contenido: string;
}
/**
 * Envía un mensaje por WhatsApp Business API
 */
export declare function enviarMensajeWhatsApp(mensaje: MensajeWhatsAppEnvio): Promise<string>;
/**
 * Plantillas de auto-respuesta predefinidas
 */
export declare const TEMPLATES_AUTO_RESPUESTA: {
    BIENVENIDA: string;
    MENU_DISPONIBLE: string;
    CONFIRMAR_ORDEN: string;
    ORDEN_EN_CAMINO: string;
    ORDEN_ENTREGADA: string;
    SOPORTE: string;
    ERROR_COMANDO: string;
};
export declare function renderAutoRespuesta(plantilla: keyof typeof TEMPLATES_AUTO_RESPUESTA, variables?: Record<string, string>): string;
/**
 * Obtiene mensajes pendientes de procesar
 */
export declare function obtenerMensajesPendientes(limite?: number): Promise<BotQueueMessage[]>;
export declare function reclamarMensajeQueue(queueId: string): Promise<BotQueueMessage | null>;
export declare function enviarRespuestaQueue(mensaje: BotQueueMessage, contenido: string): Promise<string>;
export declare function guardarResultadoQueue(queueId: string, accion: string, respuesta: string): Promise<void>;
export declare function enviarMensajeBotPersistido(input: {
    outboundId: string;
    telefono: string;
    contenido: string;
}): Promise<string>;
/**
 * Marca mensaje como procesado
 */
export declare function marcarMensajeProcesado(queueId: string, accionRealizada: string): Promise<void>;
/**
 * Reintentar mensaje fallido
 */
export declare function reintenrarMensajeEnQueue(queueId: string, razonError: string): Promise<void>;
/**
 * Obtiene estadísticas del bot
 */
export declare function obtenerEstadisticasBot(): Promise<{
    mensajesRecibidos: number;
    mensajesProcesados: number;
    mensajesEnError: number;
    ordenesProcesadas: number;
    tasaExito: number;
}>;
