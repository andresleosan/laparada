import { useState, useEffect } from 'react';
import { TransaccionPago, EstadoPago, EstadisticasPagos } from '../types';
import {
  crearTransaccionPago,
  actualizarTransaccionPago,
  getTodasTransacciones,
  getTransaccionesPorEstado,
  getTransaccionesHoy,
  calcularEstadisticasPagos,
} from '../services/pagosService';

export interface UsePagosResult {
  transacciones: TransaccionPago[];
  estadisticas: EstadisticasPagos;
  loading: boolean;
  error: string | null;
  crear: (data: Omit<TransaccionPago, 'id'>) => Promise<string>;
  actualizar: (id: string, estado: EstadoPago, ref?: string, error?: string) => Promise<void>;
  obtenerPorEstado: (estado: EstadoPago) => Promise<void>;
  obtenerHoy: () => Promise<void>;
  calcular: (inicio?: Date, fin?: Date) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook para gestionar transacciones de pago
 */
export function usePagos(): UsePagosResult {
  const [transacciones, setTransacciones] = useState<TransaccionPago[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPagos>({
    totalTransacciones: 0,
    totalMonto: 0,
    transaccionesCompletadas: 0,
    transaccionesFallidas: 0,
    porcentajeExito: 0,
    montoPromedio: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        const datos = await getTodasTransacciones();
        setTransacciones(datos);

        const stats = await calcularEstadisticasPagos();
        setEstadisticas(stats);

        setError(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error cargando pagos: ${errMsg}`);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const crear = async (data: Omit<TransaccionPago, 'id'>): Promise<string> => {
    try {
      const id = await crearTransaccionPago(data);
      const datos = await getTodasTransacciones();
      setTransacciones(datos);
      return id;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error creando transacción: ${errMsg}`);
      throw err;
    }
  };

  const actualizar = async (
    id: string,
    estado: EstadoPago,
    ref?: string,
    errorMsg?: string
  ): Promise<void> => {
    try {
      await actualizarTransaccionPago(id, estado, ref, errorMsg);
      const datos = await getTodasTransacciones();
      setTransacciones(datos);
      const stats = await calcularEstadisticasPagos();
      setEstadisticas(stats);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error actualizando transacción: ${errMsg}`);
      throw err;
    }
  };

  const obtenerPorEstado = async (estado: EstadoPago): Promise<void> => {
    try {
      setLoading(true);
      const datos = await getTransaccionesPorEstado(estado);
      setTransacciones(datos);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error obteniendo transacciones: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const obtenerHoy = async (): Promise<void> => {
    try {
      setLoading(true);
      const datos = await getTransaccionesHoy();
      setTransacciones(datos);
      const stats = await calcularEstadisticasPagos();
      setEstadisticas(stats);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error obteniendo transacciones de hoy: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const calcular = async (inicio?: Date, fin?: Date): Promise<void> => {
    try {
      const stats = await calcularEstadisticasPagos(inicio, fin);
      setEstadisticas(stats);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error calculando estadísticas: ${errMsg}`);
    }
  };

  const refresh = async (): Promise<void> => {
    setLoading(true);
    try {
      const datos = await getTodasTransacciones();
      setTransacciones(datos);
      const stats = await calcularEstadisticasPagos();
      setEstadisticas(stats);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error refrescando: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    transacciones,
    estadisticas,
    loading,
    error,
    crear,
    actualizar,
    obtenerPorEstado,
    obtenerHoy,
    calcular,
    refresh,
  };
}
