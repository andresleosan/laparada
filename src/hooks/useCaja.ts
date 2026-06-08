import { useState, useEffect } from 'react';
import { Caja, Jornada, Venta } from '../types';
import { getCajaHoy, crearCaja, reiniciarCaja } from '../services/cajaService';
import { useJornada } from '../context/JornadaContext';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface UseCajaResult {
  cajaActual: Caja | null;
  loading: boolean;
  error: string | null;
  ventasEfectivo: number;
  crearCajaHoy: (montoInicial: number) => Promise<void>;
  refresh: () => Promise<void>;
  reiniciarCajaHoy: () => Promise<void>;
}

/**
 * Hook para manejar la caja de la jornada
 */
export function useCaja(): UseCajaResult {
  const { jornadaActual } = useJornada();
  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [ventasEfectivo, setVentasEfectivo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Obtener ventas en efectivo del día
   */
  const obtenerVentasEfectivo = async (): Promise<number> => {
    try {
      const hoy = new Date();
      const fechaInicio = new Date(hoy);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(hoy);
      fechaFin.setHours(23, 59, 59, 999);

      const ventasRef = collection(db, 'ventas');
      const q = query(
        ventasRef,
        where('metodoPago', '==', 'efectivo')
      );

      const snapshot = await getDocs(q);
      const total = snapshot.docs.reduce((sum, doc) => {
        const venta = doc.data() as Venta;
        const fecha = (venta.fecha as Timestamp).toDate();
        // Filter by date in memory
        if (fecha >= fechaInicio && fecha <= fechaFin) {
          return sum + (venta.total || 0);
        }
        return sum;
      }, 0);

      return total;
    } catch (err) {
      console.error('Error getting ventas efectivo:', err);
      return 0;
    }
  };

  /**
   * Cargar caja actual con ventas integradas
   */
  const cargarCaja = async (jornada: Jornada) => {
    setLoading(true);
    try {
      const caja = await getCajaHoy(jornada);
      const ventas = await obtenerVentasEfectivo();
      
      setVentasEfectivo(ventas);
      
      if (caja) {
        // Actualizar saldo incluuyendo ventas en efectivo del día
        const saldoActualizado = caja.montoInicial + ventas - caja.egresos;
        setCajaActual({
          ...caja,
          ingresos: ventas,
          saldoActual: saldoActualizado,
        });
      } else {
        setCajaActual(null);
      }
      
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
      throw err;
    }
  };

  /**
   * Refrescar caja
   */
  const refresh = async () => {
    await cargarCaja(jornadaActual);
  };

  /**
   * Reiniciar caja
   */
  const reiniciarCajaHoy = async () => {
    try {
      if (!cajaActual?.id) {
        throw new Error('No hay caja activa para reiniciar');
      }
      await reiniciarCaja(cajaActual.id);
      await cargarCaja(jornadaActual);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error reiniciando caja: ${errMsg}`);
      console.error('Error reiniciando caja:', err);
      throw err;
    }
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
    ventasEfectivo,
    crearCajaHoy,
    refresh,
    reiniciarCajaHoy,
  };
}
