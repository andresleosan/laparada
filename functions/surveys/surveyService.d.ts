import * as functions from 'firebase-functions/v2/scheduler';
/**
 * Tipos de encuesta
 */
export type SurveyType = 'nps' | 'satisfaccion' | 'producto' | 'entrega' | 'general';
/**
 * Respuesta de encuesta
 */
export interface SurveyResponse {
    id: string;
    clienteId: string;
    ventaId?: string;
    tipo: SurveyType;
    calificacion: number;
    comentario?: string;
    categorizacion?: 'positivo' | 'neutral' | 'negativo';
    creadoEn: Date;
}
/**
 * Encuesta enviada
 */
export interface Survey {
    id: string;
    clienteId: string;
    ventaId?: string;
    tipo: SurveyType;
    enlace?: string;
    codigo?: string;
    respondido: boolean;
    respondidoEn?: Date;
    enviador?: 'whatsapp' | 'email' | 'sms';
    enviadoEn: Date;
    expiradoEn: Date;
}
/**
 * Crea una encuesta NPS (Net Promoter Score)
 */
export declare function crearEncuestaNPS(clienteId: string, ventaId?: string): Survey;
/**
 * Crea encuesta de satisfacción de entrega
 */
export declare function crearEncuestaEntrega(clienteId: string, ventaId: string): Survey;
/**
 * Envía encuesta por WhatsApp
 */
export declare function enviarEncuestaWhatsApp(survey: Survey, numeroCliente: string, nombreCliente?: string): Promise<void>;
/**
 * Registra respuesta de encuesta
 */
export declare function registrarRespuestaEncuesta(surveyId: string, calificacion: number, comentario?: string): Promise<SurveyResponse>;
/**
 * Calcula NPS (Net Promoter Score)
 */
export declare function calcularNPS(dias?: number): Promise<{
    nps: number;
    promotores: number;
    pasivos: number;
    detractores: number;
    total: number;
}>;
/**
 * Obtiene análisis de satisfacción
 */
export declare function obtenerAnalisisSatisfaccion(dias?: number): Promise<{
    promedio: number;
    positivos: number;
    neutros: number;
    negativos: number;
    tendencia: 'mejorando' | 'estable' | 'empeorando';
}>;
/**
 * Función programada para enviar encuestas automáticas
 */
export declare const enviarEncuestasAutomaticas: functions.ScheduleFunction;
