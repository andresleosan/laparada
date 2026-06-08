import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

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
  eficiencia: number; // 0-1
  ahorroTiempo: number;
}

/**
 * Servicio de Optimización de Rutas
 * - Algoritmo TSP para múltiples entregas
 * - Cálculo de ruta óptima
 * - Integración con Google Maps
 * - Estimación de tiempo total
 */
export class RouteOptimizationService {
  private db = admin.firestore();

  /**
   * Optimizar ruta para un domiciliario con múltiples entregas
   */
  async optimizarRuta(
    domiciliarioId: string,
    coordenadaInicio: Coordinate
  ): Promise<RutaOptimizada> {
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
    const entregas: EntregaOptimizada[] = [];

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
  private aplicarNearestNeighbor(
    inicio: Coordinate,
    entregas: EntregaOptimizada[]
  ): EntregaOptimizada[] {
    if (entregas.length === 0) return [];

    const visitadas = new Set<string>();
    const rutaOptimizada: EntregaOptimizada[] = [];
    let ubicacionActual = inicio;
    let orden = 1;

    while (visitadas.size < entregas.length) {
      let proximaEntrega: EntregaOptimizada | null = null;
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
        proximaEntrega.tiempoEstimado = this.calcularTiempoDistancia(
          ubicacionActual,
          proximaEntrega.coordenadas
        );
        rutaOptimizada.push(proximaEntrega);
        ubicacionActual = proximaEntrega.coordenadas;
      }
    }

    return rutaOptimizada;
  }

  /**
   * Calcular distancia entre dos puntos (Haversine)
   */
  private calcularDistancia(coord1: Coordinate, coord2: Coordinate): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLng = this.toRad(coord2.lng - coord1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
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
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calcular tiempo de viaje (distancia * 2 min/km + 2 min por parada)
   */
  private calcularTiempoDistancia(coord1: Coordinate, coord2: Coordinate): number {
    const distancia = this.calcularDistancia(coord1, coord2);
    const tiempoViaje = Math.ceil(distancia * 2); // 2 min por km
    const tiempoParada = 2; // 2 min por parada
    return tiempoViaje + tiempoParada;
  }

  /**
   * Calcular distancia total de una ruta
   */
  private calcularDistanciaTotal(inicio: Coordinate, entregas: EntregaOptimizada[]): number {
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
  async optimizarRutasGlobales(
    coordenadaAlmacen: Coordinate
  ): Promise<RutaOptimizada[]> {
    const domiciliariosSnapshot = await this.db
      .collection('domicilios')
      .where('estado', '==', 'activo')
      .get();

    const rutasOptimizadas: RutaOptimizada[] = [];

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
  async guardarRutaOptimizada(ruta: RutaOptimizada): Promise<string> {
    const docRef = await this.db.collection('rutas_optimizadas').add({
      ...ruta,
      createdAt: Timestamp.now(),
      completada: false,
    });

    return docRef.id;
  }

  /**
   * Obtener estadísticas de eficiencia de rutas
   */
  async obtenerEstadisticasRutas(dias: number = 30): Promise<{
    eficienciaPromedio: number;
    ahorroTiempoPromedio: number;
    rutasOptimizadas: number;
    distanciaPromedio: number;
  }> {
    const rutasSnapshot = await this.db
      .collection('rutas_optimizadas')
      .where('createdAt', '>=', Timestamp.fromDate(new Date(Date.now() - dias * 24 * 60 * 60 * 1000)))
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
  async calcularDomiciliarioOptimos(ordenesPendientes: number): Promise<number> {
    const tiempoPromedioPorEntrega = 15; // minutos
    const horasTrabajo = 10; // horas por turno
    const minutosPorTurno = horasTrabajo * 60;
    const entregasMaxPorTurno = Math.floor(minutosPorTurno / tiempoPromedioPorEntrega);

    return Math.ceil(ordenesPendientes / entregasMaxPorTurno);
  }
}

export const routeOptimizationService = new RouteOptimizationService();
