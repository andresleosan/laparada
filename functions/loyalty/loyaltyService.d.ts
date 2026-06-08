/**
 * Tier de cliente (Bronze, Silver, Gold, Platinum)
 */
export type ClientTier = 'bronce' | 'plata' | 'oro' | 'platino';
/**
 * Información del programa de lealtad
 */
export interface LoyaltyProfile {
    clienteId: string;
    puntos: number;
    tier: ClientTier;
    totalGastado: number;
    ordenes: number;
    puntosTotalesGanados: number;
    puntosCanjeados: number;
    ultimaCompra?: Date;
    creadoEn: Date;
    actualizadoEn: Date;
}
/**
 * Redención de puntos
 */
export interface PointRedemption {
    id: string;
    clienteId: string;
    puntos: number;
    descuento: number;
    codigo: string;
    valido: boolean;
    utilizadoEn?: Date;
    expiradoEn: Date;
}
/**
 * Obtiene o crea un perfil de lealtad
 */
export declare function obtenerPerfil(clienteId: string): Promise<LoyaltyProfile>;
/**
 * Añade puntos por compra
 */
export declare function anadirPuntosCompra(clienteId: string, montoCompra: number): Promise<number>;
/**
 * Genera código de canje de puntos
 */
export declare function generarCodigosCanje(clienteId: string, cantidadPuntos: number): Promise<PointRedemption>;
/**
 * Valida y utiliza un código de descuento
 */
export declare function validarCodigoDescuento(codigo: string): Promise<{
    valido: boolean;
    descuento?: number;
}>;
/**
 * Aplica descuento automático según tier del cliente
 */
export declare function aplicarDescuentoTier(clienteId: string, montoOriginal: number): Promise<number>;
/**
 * Obtiene beneficios del cliente según su tier
 */
export declare function obtenerBeneficios(tier: ClientTier): string[];
/**
 * Calcula puntos faltantes para siguiente tier
 */
export declare function puntosFaltantesProximoTier(clienteId: string): Promise<{
    gastoActual: number;
    gastoProximo: number;
    faltaGastar: number;
    tierActual: ClientTier;
    tierProximo: ClientTier;
}>;
