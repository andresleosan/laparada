import { useState, useEffect } from 'react';
import { Caja, Jornada } from '../types';
import { getCajaHoy, crearCaja } from '../services/cajaService';
import { useJornada } from '../context/JornadaContext';

export interface UseCajaResult {
  cajaActual: Caja | null;
  loading: boolean;
  error: string | null;
  crearCajaHoy: (montoInicial: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook para manejar la caja de la jornada
 */
export function useCaja(): UseCajaResult {
  const { jornadaActual } = useJornada();
  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar caja actual
   */
  const cargarCaja = async (jornada: Jornada) => {
    setLoading(true);
    try {
      const caja = await getCajaHoy(jornada);
      setCajaActual(caja);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error cargando caja: ${errMsg}`);
      console.error('Error loading caja:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Crear caja para hoy
   */
  const crearCajaHoy = async (montoInicial: number) => {
    try {
      await crearCaja(jornadaActual, montoInicial);
      await cargarCaja(jornadaActual);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error creando caja: ${errMsg}`);
      console.error('Error creating caja:', err);
    }
  };

  /**
   * Refrescar caja
   */
  const refresh = async () => {
    await cargarCaja(jornadaActual);
  };

  /**
   * Cargar caja al montar el componente
   */
  useEffect(() => {
    cargarCaja(jornadaActual);
  }, [jornadaActual]);

  return {
    cajaActual,
    loading,
    error,
    crearCajaHoy,
    refresh,
  };
}
