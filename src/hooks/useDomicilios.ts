import { useState, useEffect } from 'react';
import { Domicilio, EstadoDomicilio } from '../types';
import {
  getDomiciliosActivos,
  getDomiciliosEntregados,
  onDomiciliosActivosChange,
  updateDomicilioEstado,
  crearVentaDesdedomicilio,
} from '../services/domiciliosService';

export interface UseDomiciliosResult {
  activos: Domicilio[];
  entregados: Domicilio[];
  loading: boolean;
  error: string | null;
  updateEstado: (id: string, nuevoEstado: EstadoDomicilio) => Promise<void>;
  marcarEntregado: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useDomicilios(jornada: 'mañana' | 'noche' | 'ambas'): UseDomiciliosResult {
  const [activos, setActivos] = useState<Domicilio[]>([]);
  const [entregados, setEntregados] = useState<Domicilio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Suscribirse a domicilios activos con listener
    const unsubscribeActivos = onDomiciliosActivosChange(jornada, (datos) => {
      setActivos(datos);
      setLoading(false);
    });

    // Cargar historial de entregados (fetch inicial, sin listener)
    const cargarEntregados = async () => {
      try {
        const datos = await getDomiciliosEntregados(jornada);
        setEntregados(datos);
      } catch (err) {
        console.error('Error loading entregados:', err);
        setError('Error cargando historial');
      }
    };

    cargarEntregados();

    // Cleanup: desuscribirse del listener
    return () => {
      unsubscribeActivos();
    };
  }, [jornada]);

  const updateEstado = async (id: string, nuevoEstado: EstadoDomicilio) => {
    try {
      await updateDomicilioEstado(id, nuevoEstado);
      // El listener se actualizará automáticamente
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error actualizando estado: ${errMsg}`);
      throw err;
    }
  };

  const marcarEntregado = async (id: string) => {
    try {
      // Encontrar el domicilio en activos
      const domicilio = activos.find((d) => d.id === id);
      if (!domicilio) throw new Error('Domicilio no encontrado');

      // Crear venta automáticamente
      await crearVentaDesdedomicilio(domicilio);

      // Actualizar estado a "entregado"
      await updateDomicilioEstado(id, 'entregado');

      // El listener se actualizará automáticamente
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error marcando entregado: ${errMsg}`);
      throw err;
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [activos, entregados] = await Promise.all([
        getDomiciliosActivos(jornada),
        getDomiciliosEntregados(jornada),
      ]);
      setActivos(activos);
      setEntregados(entregados);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Error refrescando: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    activos,
    entregados,
    loading,
    error,
    updateEstado,
    marcarEntregado,
    refresh,
  };
}
