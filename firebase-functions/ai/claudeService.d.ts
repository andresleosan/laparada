/**
 * Respuesta de análisis de sentimiento
 */
export interface SentimentAnalysis {
    score: number;
    sentiment: 'negativo' | 'neutral' | 'positivo';
    confidence: number;
    keywords: string[];
    explanation: string;
    recommendedAction?: string;
}
/**
 * Análisis de intención del usuario
 */
export interface IntentAnalysis {
    intent: 'saludo' | 'menu' | 'pedir' | 'rastrear' | 'queja' | 'elogio' | 'otro';
    confidence: number;
    extractedEntities: {
        productos?: string[];
        cantidad?: number;
        negocioId?: string;
    };
    suggestedResponse?: string;
}
/**
 * Recomendación de producto personalizada
 */
export interface ProductRecommendation {
    productId: string;
    productName: string;
    reason: string;
    probability: number;
}
/**
 * Analiza el sentimiento de un mensaje usando Claude API
 * @param mensaje - Texto del cliente
 * @param historial - Mensajes previos (contexto)
 * @returns Análisis de sentimiento
 */
export declare function analizarSentimiento(mensaje: string, historial?: Array<{
    rol: 'usuario' | 'asistente';
    contenido: string;
}>): Promise<SentimentAnalysis>;
/**
 * Analiza la intención del usuario en el mensaje
 * @param mensaje - Texto del usuario
 * @returns Análisis de intención
 */
export declare function analizarIntencion(mensaje: string): Promise<IntentAnalysis>;
/**
 * Genera recomendaciones de productos personalizadas
 * @param historialCliente - Compras previas del cliente
 * @param preferencias - Preferencias conocidas del cliente
 * @returns Array de recomendaciones
 */
export declare function generarRecomendaciones(historialCliente: Array<{
    nombre: string;
    categoria: string;
}>, preferencias?: string): Promise<ProductRecommendation[]>;
/**
 * Genera una respuesta contextual del bot usando Claude
 * @param mensaje - Mensaje del cliente
 * @param contexto - Contexto de la conversación
 * @returns Respuesta generada
 */
export declare function generarRespuestaContextual(mensaje: string, contexto?: {
    nombreCliente?: string;
    ultimaOrden?: string;
    totalGastado?: number;
    tiempoPromedio?: number;
}): Promise<string>;
