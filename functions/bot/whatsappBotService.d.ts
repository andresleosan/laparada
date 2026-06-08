/**
 * Tipos de mensajes WhatsApp
 */
export type TipoMensaje = 'text' | 'image' | 'document' | 'button' | 'template';
export interface MensajeWhatsAppEnvio {
    numeroDestino: string;
    tipo: TipoMensaje;
    contenido: string;
    mediaUrl?: string;
    plantilla?: string;
    botones?: Array<{
        id: string;
        titulo: string;
    }>;
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
    PAGO_PENDIENTE: string;
    SOPORTE: string;
    ERROR_COMANDO: string;
};
/**
 * Envía respuesta automática basada en template
 */
export declare function enviarAutoRespuesta(numeroDestino: string, plantilla: keyof typeof TEMPLATES_AUTO_RESPUESTA, variables?: Record<string, string>): Promise<string>;
/**
 * Registra mensaje en Firestore con queue para procesamiento
 */
export declare function registrarMensajeEnQueue(numeroOrigen: string, contenido: string, tipo: 'entrada' | 'salida'): Promise<string>;
/**
 * Obtiene mensajes pendientes de procesar
 */
export declare function obtenerMensajesPendientes(limite?: number): Promise<{
    id: string;
}[]>;
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
