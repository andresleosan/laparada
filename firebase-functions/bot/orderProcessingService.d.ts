type CatalogoTipo = 'producto' | 'combo';
interface OrdenPendienteItem {
    productoId: string;
    catalogoTipo: CatalogoTipo;
    nombreSnapshot: string;
    precioSnapshot: number;
    cantidad: number;
    categoria?: string;
}
export interface BotOperationContext {
    queueId: string;
    mensajeCierre?: string;
}
export interface BotProcessingResult {
    accion: string;
    respuesta: string;
}
interface OrdenPendiente {
    id: string;
    negocioId: string;
    numeroCliente: string;
    items: OrdenPendienteItem[];
    estado: 'pendiente' | 'confirmada' | 'expirada';
    paso?: 'seleccionando' | 'esperando_metodo_pago' | 'esperando_direccion' | 'completada';
    metodoPago?: 'efectivo' | 'transferencia';
    domicilioId?: string;
    codigoPublico?: string;
    total?: number;
}
/**
 * Parsea comando de orden desde mensaje de texto
 * Ej: "1", "1 2 3", "1x2" (cantidad), "búsqueda: arroz"
 */
export declare function parsearComandoOrden(mensaje: string): {
    tipo: 'item' | 'busqueda' | 'confirmacion' | 'metodo_pago' | 'direccion' | 'desconocido';
    items: number[];
    cantidades?: number[];
    busqueda?: string;
    metodoPago?: 'efectivo' | 'transferencia';
    direccion?: string;
    barrio?: string;
};
/**
 * Crea o actualiza una orden de usuario
 */
export declare function crearOrdenPendiente(numeroCliente: string, items: OrdenPendienteItem[], contenidoMensaje: string, operationContext?: BotOperationContext): Promise<{
    ordenId: string;
    result: BotProcessingResult;
}>;
/**
 * Obtiene orden pendiente del usuario
 */
export declare function obtenerOrdenPendiente(numeroCliente: string): Promise<OrdenPendiente | null>;
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
export declare function confirmarOrden(ordenPendienteId: string, numeroCliente: string, direccion: string, barrio: string, contenidoMensaje: string, operationContext?: BotOperationContext): Promise<BotProcessingResult>;
/**
 * Procesa mensaje recibido para generar acción
 */
export declare function procesarMensajePorBot(numeroCliente: string, contenidoMensaje: string, operationContext?: BotOperationContext): Promise<BotProcessingResult>;
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
export {};
