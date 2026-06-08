"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeOptimizationService = exports.RouteOptimizationService = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
/**
 * Servicio de Optimización de Rutas
 * - Algoritmo TSP para múltiples entregas
 * - Cálculo de ruta óptima
 * - Integración con Google Maps
 * - Estimación de tiempo total
 */
class RouteOptimizationService {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Optimizar ruta para un domiciliario con múltiples entregas
     */
    async optimizarRuta(domiciliarioId, coordenadaInicio) {
        // Obtener entregas pendientes del domiciliario
        const entregasSnapshot = await this.db
            .collection('ordenes_pendientes')
            .where('domiciliarioAsignado', '==', domiciliarioId)
            .where('estado', '==', 'en_camino')
            .get();
        if (entregasSnapshot.empty) {
            return {
                domiciliarioId,
                entregas: [],
                distanciaTotal: 0,
                tiempoTotal: 0,
                eficiencia: 1.0,
                ahorroTiempo: 0,
            };
        }
        // Obtener coordenadas de cada entrega
        const entregas = [];
        for (const doc of entregasSnapshot.docs) {
            const data = doc.data();
            entregas.push({
                orden: entregas.length + 1,
                ventaId: doc.id,
                clienteId: data.clienteId,
                direccion: data.direccionEntrega || 'Sin especificar',
                coordenadas: data.coordenadas || { lat: 0, lng: 0 },
                tiempoEstimado: this.calcularTiempoDistancia(coordenadaInicio, data.coordenadas),
            });
        }
        // Aplicar algoritmo de optimización (nearest neighbor simplificado)
        const rutaOptimizada = this.aplicarNearestNeighbor(coordenadaInicio, entregas);
        // Calcular métricas
        const distanciaTotal = this.calcularDistanciaTotal(coordenadaInicio, rutaOptimizada);
        const tiempoTotal = rutaOptimizada.reduce((sum, e) => sum + e.tiempoEstimado, 0);
        // Calcular ruta no optimizada (orden actual)
        const distanciaNoOptimizada = this.calcularDistanciaTotal(coordenadaInicio, entregas);
        const tiempoNoOptimizado = entregas.reduce((sum, e) => sum + e.tiempoEstimado, 0);
        const ahorroTiempo = tiempoNoOptimizado - tiempoTotal;
        const eficiencia = distanciaNoOptimizada > 0 ? distanciaTotal / distanciaNoOptimizada : 1.0;
        return {
            domiciliarioId,
            entregas: rutaOptimizada,
            distanciaTotal,
            tiempoTotal,
            eficiencia,
            ahorroTiempo,
        };
    }
    /**
     * Aplicar algoritmo Nearest Neighbor para TSP
     */
    aplicarNearestNeighbor(inicio, entregas) {
        if (entregas.length === 0)
            return [];
        const visitadas = new Set();
        const rutaOptimizada = [];
        let ubicacionActual = inicio;
        let orden = 1;
        while (visitadas.size < entregas.length) {
            let proximaEntrega = null;
            let distanciaMinima = Infinity;
            for (const entrega of entregas) {
                if (!visitadas.has(entrega.ventaId)) {
                    const distancia = this.calcularDistancia(ubicacionActual, entrega.coordenadas);
                    if (distancia < distanciaMinima) {
                        distanciaMinima = distancia;
                        proximaEntrega = entrega;
                    }
                }
            }
            if (proximaEntrega) {
                visitadas.add(proximaEntrega.ventaId);
                proximaEntrega.orden = orden++;
                proximaEntrega.tiempoEstimado = this.calcularTiempoDistancia(ubicacionActual, proximaEntrega.coordenadas);
                rutaOptimizada.push(proximaEntrega);
                ubicacionActual = proximaEntrega.coordenadas;
            }
        }
        return rutaOptimizada;
    }
    /**
     * Calcular distancia entre dos puntos (Haversine)
     */
    calcularDistancia(coord1, coord2) {
        const R = 6371; // Radio de la Tierra en km
        const dLat = this.toRad(coord2.lat - coord1.lat);
        const dLng = this.toRad(coord2.lng - coord1.lng);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(coord1.lat)) *
                Math.cos(this.toRad(coord2.lat)) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distancia en km
    }
    /**
     * Convertir grados a radianes
     */
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Calcular tiempo de viaje (distancia * 2 min/km + 2 min por parada)
     */
    calcularTiempoDistancia(coord1, coord2) {
        const distancia = this.calcularDistancia(coord1, coord2);
        const tiempoViaje = Math.ceil(distancia * 2); // 2 min por km
        const tiempoParada = 2; // 2 min por parada
        return tiempoViaje + tiempoParada;
    }
    /**
     * Calcular distancia total de una ruta
     */
    calcularDistanciaTotal(inicio, entregas) {
        let distanciaTotal = 0;
        let ubicacionActual = inicio;
        for (const entrega of entregas) {
            distanciaTotal += this.calcularDistancia(ubicacionActual, entrega.coordenadas);
            ubicacionActual = entrega.coordenadas;
        }
        // Retorno al inicio
        distanciaTotal += this.calcularDistancia(ubicacionActual, inicio);
        return Math.round(distanciaTotal * 100) / 100;
    }
    /**
     * Obtener rutas óptimas para todos los domiciliarios activos
     */
    async optimizarRutasGlobales(coordenadaAlmacen) {
        const domiciliariosSnapshot = await this.db
            .collection('domicilios')
            .where('estado', '==', 'activo')
            .get();
        const rutasOptimizadas = [];
        for (const doc of domiciliariosSnapshot.docs) {
            const data = doc.data();
            const ubicacion = data.ubicacionActual || coordenadaAlmacen;
            const ruta = await this.optimizarRuta(doc.id, ubicacion);
            if (ruta.entregas.length > 0) {
                rutasOptimizadas.push(ruta);
            }
        }
        return rutasOptimizadas.sort((a, b) => a.tiempoTotal - b.tiempoTotal);
    }
    /**
     * Guardar ruta optimizada en Firestore
     */
    async guardarRutaOptimizada(ruta) {
        const docRef = await this.db.collection('rutas_optimizadas').add({
            ...ruta,
            createdAt: firestore_1.Timestamp.now(),
            completada: false,
        });
        return docRef.id;
    }
    /**
     * Obtener estadísticas de eficiencia de rutas
     */
    async obtenerEstadisticasRutas(dias = 30) {
        const rutasSnapshot = await this.db
            .collection('rutas_optimizadas')
            .where('createdAt', '>=', firestore_1.Timestamp.fromDate(new Date(Date.now() - dias * 24 * 60 * 60 * 1000)))
            .get();
        if (rutasSnapshot.empty) {
            return {
                eficienciaPromedio: 0,
                ahorroTiempoPromedio: 0,
                rutasOptimizadas: 0,
                distanciaPromedio: 0,
            };
        }
        let eficienciaTotal = 0;
        let ahorroTotal = 0;
        let distanciaTotal = 0;
        rutasSnapshot.docs.forEach(doc => {
            const data = doc.data();
            eficienciaTotal += data.eficiencia;
            ahorroTotal += data.ahorroTiempo;
            distanciaTotal += data.distanciaTotal;
        });
        return {
            eficienciaPromedio: Math.round((eficienciaTotal / rutasSnapshot.size) * 100) / 100,
            ahorroTiempoPromedio: Math.round(ahorroTotal / rutasSnapshot.size),
            rutasOptimizadas: rutasSnapshot.size,
            distanciaPromedio: Math.round((distanciaTotal / rutasSnapshot.size) * 100) / 100,
        };
    }
    /**
     * Calcular número óptimo de domiciliarios necesarios
     */
    async calcularDomiciliarioOptimos(ordenesPendientes) {
        const tiempoPromedioPorEntrega = 15; // minutos
        const horasTrabajo = 10; // horas por turno
        const minutosPorTurno = horasTrabajo * 60;
        const entregasMaxPorTurno = Math.floor(minutosPorTurno / tiempoPromedioPorEntrega);
        return Math.ceil(ordenesPendientes / entregasMaxPorTurno);
    }
}
exports.RouteOptimizationService = RouteOptimizationService;
exports.routeOptimizationService = new RouteOptimizationService();
