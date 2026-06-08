interface DemandForecast {
    hour: number;
    dia: string;
    demandaPronosticada: number;
    confianza: number;
    factores: {
        historial: number;
        tendencia: number;
        estacionalidad: number;
        eventos: string[];
    };
    recomendaciones: string[];
}
interface DemandData {
    ventasPorHora: Map<number, number>;
    ventasPorDia: Map<string, number>;
    promedioHora: number;
    promedioDia: number;
    desviacionEstándar: number;
}
/**
 * Servicio de Pronóstico de Demanda
 * - Análisis de series temporales (últimos 90 días)
 * - Pronóstico por hora, día y semana
 * - Recomendaciones de producción automática
 */
export declare class DemandForecastingService {
    private db;
    /**
     * Obtener datos históricos de ventas (últimos 90 días)
     */
    obtenerDatosHistoricos(dias?: number): Promise<DemandData>;
    /**
     * Pronosticar demanda para la próxima hora
     */
    pronosticarProximaHora(): Promise<DemandForecast>;
    /**
     * Pronosticar demanda para todos los días de la próxima semana
     */
    pronosticarSemana(): Promise<DemandForecast[]>;
    /**
     * Guardar pronóstico en Firestore para tracking
     */
    guardarPronostico(pronostico: DemandForecast): Promise<string>;
    /**
     * Obtener precisión del modelo (comparar pronóstico vs real)
     */
    calcularPrecision(dias?: number): Promise<number>;
    /**
     * Generar recomendación de producción para el próximo turno
     */
    generarRecomendacionProduccion(): Promise<{
        produccionRecomendada: number;
        combosRecomendados: number;
        personalRequerido: number;
        costoPredispuesto: number;
    }>;
    /**
     * Calcular factor de estacionalidad por hora
     */
    private calcularFactorEstacionalidad;
    /**
     * Verificar si es hora pico
     */
    private esHoraPico;
    /**
     * Obtener análisis de tendencia (últimos 7 días)
     */
    obtenerTendencia(): Promise<{
        dia: string;
        demanda: number;
        tendencia: 'mejorando' | 'estable' | 'empeorando';
    }[]>;
}
export declare const demandForecastingService: DemandForecastingService;
export {};
