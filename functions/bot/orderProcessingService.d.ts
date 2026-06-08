/**
 * Parsea comando de orden desde mensaje de texto
 * Ej: "1", "1 2 3", "1x2" (cantidad), "búsqueda: arroz"
 */
export declare function parsearComandoOrden(mensaje: string): {
    tipo: 'item' | 'cantidad' | 'busqueda' | 'confirmacion';
    items: number[];
    busqueda?: string;
};
/**
 * Crea o actualiza una orden de usuario
 */
export declare function crearOrdenPendiente(numeroCliente: string, items: Array<{
    productoId: string;
    cantidad: number;
}>): Promise<string>;
/**
 * Obtiene orden pendiente del usuario
 */
export declare function obtenerOrdenPendiente(numeroCliente: string): Promise<{
    id: string;
} | null>;
/**
 * Genera resumen de orden para mostrar al usuario
 */
export declare function generarResumenOrden(items: any[]): Promise<{
    resumen: string;
    total: number;
}>;
/**
 * Convierte orden pendiente a venta registrada
 */
export declare function confirmarOrden(ordenPendienteId: string, numeroCliente: string): Promise<string>;
/**
 * Procesa mensaje recibido para generar acción
 */
export declare function procesarMensajePorBot(numeroCliente: string, contenidoMensaje: string): Promise<{
    accion: string;
    respuesta: string;
}>;
/**
 * Estadísticas de órdenes por WhatsApp
 */
export declare function obtenerEstadisticasOrdenes(): Promise<{
    ordenesPendientes: number;
    ordenesConfirmadas: number;
    ventasTotales: number;
    montoPromedio: number;
    ultimaOrden?: string;
}>;
