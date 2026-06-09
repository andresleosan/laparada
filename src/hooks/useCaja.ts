import { useState, useEffect } from 'react';
import { Caja, Jornada, Venta } from '../types';
import { getCajaHoy, crearCaja, reiniciarCaja } from '../services/cajaService';
import { getTodosGastos } from '../services/gastosService';
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
        where('metodoPago', '==', 'efectivo'),
        where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
        where('fecha', '<=', Timestamp.fromDate(fechaFin))
      );

      const snapshot = await getDocs(q);
      const total = snapshot.docs.reduce((sum, doc) => {
        const venta = doc.data() as Venta;
        return sum + (venta.total || 0);
      }, 0);

      return total;
    } catch (err) {
      console.error('Error getting ventas efectivo:', err);
      return 0;
    }
  };

  /**
   * Cargar caja actual con ventas integradas y gastos del día
   */
  const cargarCaja = async (jornada: Jornada) => {
    setLoading(true);
    try {
      const caja = await getCajaHoy(jornada);
      const ventas = await obtenerVentasEfectivo();
      
      // Obtener gastos del día
      let gastosDelDia = 0;
      try {
        const todosgastos = await getTodosGastos();
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        gastosDelDia = todosgastos
          .filter(gasto => {
            const fechaGasto = gasto.fecha instanceof Date ? gasto.fecha : gasto.fecha?.toDate?.() || new Date();
            const fechaGastoDate = new Date(fechaGasto);
            fechaGastoDate.setHours(0, 0, 0, 0);
            return fechaGastoDate.getTime() === hoy.getTime();
          })
          .reduce((sum, gasto) => sum + (gasto.monto || 0), 0);
      } catch (err) {
        console.error('Error loading gastos:', err);
        gastosDelDia = 0;
      }
      
      setVentasEfectivo(ventas);
      
      if (caja) {
        // Calcular saldo: inicial + ingresos + ventas - gastos del día
        const egresosTotales = caja.egresos + gastosDelDia;
        const saldoActualizado = caja.montoInicial + caja.ingresos + ventas - egresosTotales;
        
        setCajaActual({
          ...caja,
          ingresos: caja.ingresos + ventas,
          egresos: egresosTotales,
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
