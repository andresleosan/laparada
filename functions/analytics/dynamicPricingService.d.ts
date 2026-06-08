interface PrecioProducto {
    productId: string;
    nombreProducto: string;
    precioBase: number;
    precioActual: number;
    multiplicador: number;
    razon: string;
    valido: boolean;
}
interface EstrategiaPrecios {
    hora: number;
    demanda: 'baja' | 'media' | 'alta';
    multiplicador: number;
    descripcion: string;
    esperado: {
        ingresos: number;
        volumenes: number;
    };
}
/**
 * Servicio de Precios Dinámicos
 * - Ajuste de precios según demanda/hora
 * - Descuentos por volumen
 * - Surge pricing
 * - Dashboard de precios en tiempo real
 */
export declare class DynamicPricingService {
    private db;
    /**
     * Calcular precio dinámico para un producto
     */
    calcularPrecioProducto(productId: string, precioBase: number): Promise<PrecioProducto>;
    /**
     * Aplicar precios dinámicos a todos los productos
     */
    aplicarPreciosDinamicos(): Promise<PrecioProducto[]>;
    /**
     * Calcular multiplicador de precio
     */
    private calcularMultiplicador;
    /**
     * Obtener demanda actual
     */
    private obtenerDemandaActual;
    /**
     * Calcular descuento por volumen
     */
    calcularDescuentoVolumen(cantidadProductos: number, montoTotal: number): Promise<{
        descuentoPorcentaje: number;
        montoDescuento: number;
        montoFinal: number;
    }>;
    /**
     * Aplicar cupón de descuento
     */
    aplicarCupon(codigoCupon: string, montoTotal: number): Promise<{
        valido: boolean;
        descuentoPorcentaje?: number;
        montoDescuento?: number;
        montoFinal?: number;
        razon?: string;
    }>;
    /**
     * Obtener estrategia de precios por hora
     */
    obtenerEstrategiaPrecios(): Promise<EstrategiaPrecios[]>;
    /**
     * Guardar precios en caché con TTL de 1 hora
     */
    private guardarPreciosCaché;
    /**
     * Obtener precios del caché
     */
    obtenerPreciosCaché(): Promise<{
        [key: string]: PrecioProducto;
    } | null>;
    /**
     * Obtener estadísticas de impacto de precios dinámicos
     */
    obtenerImpactoPrecios(dias?: number): Promise<{
        ingresoAdicional: number;
        volumenVentas: number;
        porcentajeIncremento: number;
    }>;
    /**
     * Obtener nombre del producto
     */
    private obtenerNombreProducto;
}
export declare const dynamicPricingService: DynamicPricingService;
export {};
