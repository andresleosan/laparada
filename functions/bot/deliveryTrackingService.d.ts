/**
 * Envía actualizaciones de estado de entrega al cliente por WhatsApp
 */
export declare function notificarEstadoEntrega(domicilioId: string, nuevoEstado: string): Promise<void>;
/**
 * Genera actualizaciones automáticas de progreso
 * Se ejecuta cada 10 minutos para domicilios en camino
 */
export declare function actualizarProgresoEntrega(): Promise<void>;
/**
 * Obtiene estadísticas de entregas del día
 */
export declare function obtenerEstadisticasEntregas(fecha?: Date): Promise<{
    confirmados: number;
    enPreparacion: number;
    enCamino: number;
    entregados: number;
    cancelados: number;
    montoEntregado: number;
    montoEnTransito: number;
    tiempoPromedioEntrega: number;
} | null>;
/**
 * Reporte de entregas para el día
 */
export declare function generarReporteEntregasDelDia(): Promise<string>;
