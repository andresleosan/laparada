/**
 * Predicción de tiempo de entrega
 */
export interface DeliveryTimePrediction {
    estimatedMinutes: number;
    confidence: number;
    factors: {
        distancia: number;
        trafico: 'bajo' | 'medio' | 'alto';
        horario: string;
        domiciliarioDisponible: boolean;
        preparacion: number;
    };
    historico: {
        promedioCliente: number;
        promedioDomiciliario: number;
        promediaHora: number;
    };
}
/**
 * Predice el tiempo de entrega
 * @param distancia - Distancia en km
 * @param clienteId - ID del cliente (opcional, para personalización)
 * @param domiciliarioId - ID del domiciliario asignado (opcional)
 * @param tiempoPreparacion - Tiempo de preparación en minutos
 * @returns Predicción de tiempo
 */
export declare function predecirTiempoEntrega(distancia: number, clienteId?: string, domiciliarioId?: string, tiempoPreparacion?: number): Promise<DeliveryTimePrediction>;
/**
 * Actualiza la predicción en tiempo real (tracking)
 */
export declare function actualizarPrediccionRealtime(ventaId: string, tiempoTranscurrido: number): Promise<void>;
