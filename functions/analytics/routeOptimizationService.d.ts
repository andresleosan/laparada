interface Coordinate {
    lat: number;
    lng: number;
}
interface EntregaOptimizada {
    orden: number;
    ventaId: string;
    clienteId: string;
    direccion: string;
    coordenadas: Coordinate;
    tiempoEstimado: number;
}
interface RutaOptimizada {
    domiciliarioId: string;
    entregas: EntregaOptimizada[];
    distanciaTotal: number;
    tiempoTotal: number;
    eficiencia: number;
    ahorroTiempo: number;
}
/**
 * Servicio de Optimización de Rutas
 * - Algoritmo TSP para múltiples entregas
 * - Cálculo de ruta óptima
 * - Integración con Google Maps
 * - Estimación de tiempo total
 */
export declare class RouteOptimizationService {
    private db;
    /**
     * Optimizar ruta para un domiciliario con múltiples entregas
     */
    optimizarRuta(domiciliarioId: string, coordenadaInicio: Coordinate): Promise<RutaOptimizada>;
    /**
     * Aplicar algoritmo Nearest Neighbor para TSP
     */
    private aplicarNearestNeighbor;
    /**
     * Calcular distancia entre dos puntos (Haversine)
     */
    private calcularDistancia;
    /**
     * Convertir grados a radianes
     */
    private toRad;
    /**
     * Calcular tiempo de viaje (distancia * 2 min/km + 2 min por parada)
     */
    private calcularTiempoDistancia;
    /**
     * Calcular distancia total de una ruta
     */
    private calcularDistanciaTotal;
    /**
     * Obtener rutas óptimas para todos los domiciliarios activos
     */
    optimizarRutasGlobales(coordenadaAlmacen: Coordinate): Promise<RutaOptimizada[]>;
    /**
     * Guardar ruta optimizada en Firestore
     */
    guardarRutaOptimizada(ruta: RutaOptimizada): Promise<string>;
    /**
     * Obtener estadísticas de eficiencia de rutas
     */
    obtenerEstadisticasRutas(dias?: number): Promise<{
        eficienciaPromedio: number;
        ahorroTiempoPromedio: number;
        rutasOptimizadas: number;
        distanciaPromedio: number;
    }>;
    /**
     * Calcular número óptimo de domiciliarios necesarios
     */
    calcularDomiciliarioOptimos(ordenesPendientes: number): Promise<number>;
}
export declare const routeOptimizationService: RouteOptimizationService;
export {};
