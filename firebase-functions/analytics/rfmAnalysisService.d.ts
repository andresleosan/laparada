interface RFMScore {
    clienteId: string;
    nombreCliente: string;
    recency: number;
    frequency: number;
    monetary: number;
    r_score: number;
    f_score: number;
    m_score: number;
    rfm_score: number;
    segmento: string;
    estado: string;
}
interface ClienteSegmentado {
    segmento: 'VIP' | 'Leal' | 'Promisorio' | 'Regular' | 'Riesgo' | 'Inactivo';
    descripcion: string;
    cantidad: number;
    montoPromedio: number;
    comprasPromedio: number;
    acciones: string[];
}
/**
 * Servicio de Análisis RFM y Segmentación
 * - RFM (Recency, Frequency, Monetary)
 * - Segmentación de clientes automática
 * - Identificación de clientes en riesgo
 * - Dashboard de cohortes
 */
export declare class RFMAnalysisService {
    private db;
    /**
     * Calcular score RFM para un cliente
     */
    calcularRFMCliente(clienteId: string): Promise<RFMScore>;
    /**
     * Calcular RFM para todos los clientes
     */
    calcularRFMGlobal(): Promise<RFMScore[]>;
    /**
     * Determinar segmento basado en RFM
     */
    private determinarSegmento;
    /**
     * Calcular score de Recency (0-5)
     */
    private calcularScoreRecency;
    /**
     * Calcular score de Frequency (0-5)
     */
    private calcularScoreFrequency;
    /**
     * Calcular score de Monetary (0-5)
     */
    private calcularScoreMonetary;
    /**
     * Obtener segmentación de clientes
     */
    obtenerSegmentacion(): Promise<ClienteSegmentado[]>;
    /**
     * Obtener clientes en riesgo de deserción
     */
    obtenerClientesEnRiesgo(): Promise<RFMScore[]>;
    /**
     * Obtener clientes VIP
     */
    obtenerClientesVIP(): Promise<RFMScore[]>;
    /**
     * Obtener nuevos clientes (primer comprador)
     */
    obtenerNuevosClientes(): Promise<RFMScore[]>;
    /**
     * Guardar análisis RFM global
     */
    private guardarRFMGlobal;
    /**
     * Descripción de segmento
     */
    private obtenerDescripcionSegmento;
    /**
     * Acciones recomendadas por segmento
     */
    private obtenerAccionesSegmento;
    /**
     * Obtener nombre del cliente
     */
    private obtenerNombreCliente;
    /**
     * Obtener análisis de cohortes (clientes por mes de primera compra)
     */
    obtenerAnalisisCohortes(): Promise<{
        mes: string;
        clientesNuevos: number;
        retension: number;
        ingresoTotal: number;
    }[]>;
}
export declare const rfmAnalysisService: RFMAnalysisService;
export {};
