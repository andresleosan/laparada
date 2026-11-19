import { useState, useEffect, useRef } from 'react';
import { Caja, MovimientoCaja, ResumenMovimientosCajaTurno, Venta } from '../types';
import { getCajaHoy, crearCaja, reiniciarCaja } from '../services/cajaService';
import { getTodosGastos } from '../services/gastosService';
import { getMovimientosCajaHoy } from '../services/movimientosCajaService';
import { useNegocio } from '../context/NegocioContext';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  calcularEfectivoEsperadoTurno,
  calcularResumenMovimientosCaja,
} from '@/utils/movimientosCajaUtils';
import { calcularGastosQueDescuentanCajaTurno } from '@/utils/gastosUtils';

export interface UseCajaResult {
  cajaActual: Caja | null;
  loading: boolean;
  error: string | null;
  ventasEfectivo: number;
  movimientosHoy: MovimientoCaja[];
  resumenMovimientos: ResumenMovimientosCajaTurno;
  crearCajaHoy: (montoInicial: number) => Promise<void>;
  refresh: () => Promise<void>;
  reiniciarCajaHoy: () => Promise<void>;
}

/**
 * Hook para manejar la caja del día
 */
export function useCaja(): UseCajaResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;
  const [cajaActual, setCajaActual] = useState<Caja | null>(null);
  const [ventasEfectivo, setVentasEfectivo] = useState(0);
  const [movimientosHoy, setMovimientosHoy] = useState<MovimientoCaja[]>([]);
  const [resumenMovimientos, setResumenMovimientos] = useState<ResumenMovimientosCajaTurno>(() =>
    calcularResumenMovimientosCaja([], 0)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);

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
        where('negocioId', '==', tenantId),
        where('metodoPago', '==', 'efectivo'),
        where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
        where('fecha', '<=', Timestamp.fromDate(fechaFin))
      );

      const snapshot = await getDocs(q);
      const total = snapshot.docs.reduce((sum, doc) => {
        const venta = doc.data() as Venta;
        if (venta.estado === 'anulada') return sum;
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
  const cargarCaja = async () => {
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    try {
      const [caja, ventas, todosGastos, movsHoy] = await Promise.all([
        getCajaHoy(tenantId),
        obtenerVentasEfectivo(),
        getTodosGastos(tenantId),
        getMovimientosCajaHoy(tenantId).catch(() => []),
      ]);
      if (generation !== requestGenerationRef.current) return;

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const gastosHoyList = todosGastos.filter((gasto) => {
        const fechaGasto = toValidAdminDate(gasto.fecha);
        if (!fechaGasto) return false;
        const fechaNormalizada = new Date(fechaGasto);
        fechaNormalizada.setHours(0, 0, 0, 0);
        return fechaNormalizada.getTime() === hoy.getTime();
      });
      const gastosCajaTurnoDelDia = calcularGastosQueDescuentanCajaTurno(gastosHoyList);

      setVentasEfectivo(ventas);
      setMovimientosHoy(movsHoy);

      const resumenBase = calcularResumenMovimientosCaja(movsHoy, 0);
      
      if (caja) {
        const egresosTotales =
          caja.egresos + gastosCajaTurnoDelDia + resumenBase.totalSangrias + resumenBase.totalCajaMenor;
        const ingresosTotales = caja.ingresos + ventas + resumenBase.totalIngresosSencillo;
        const saldoActualizado = calcularEfectivoEsperadoTurno({
          montoInicialCaja: caja.montoInicial,
          ingresosDirectosCaja: caja.ingresos,
          egresosDirectosCaja: caja.egresos,
          ventasEfectivo: ventas,
          totalGastos: gastosCajaTurnoDelDia,
          movimientos: movsHoy,
        });

        setResumenMovimientos(calcularResumenMovimientosCaja(movsHoy, saldoActualizado));
        setCajaActual({
          ...caja,
          ingresos: ingresosTotales,
          egresos: egresosTotales,
          saldoActual: saldoActualizado,
        });
      } else {
        setResumenMovimientos(resumenBase);
        setCajaActual(null);
      }
      
      setError(null);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error cargando caja: ${errMsg}`);
      console.error('Error loading caja:', err);
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  };

  /**
   * Crear caja para hoy
   */
  const crearCajaHoy = async (montoInicial: number) => {
    try {
      await crearCaja(tenantId, montoInicial);
      await cargarCaja();
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
    await cargarCaja();
  };

  /**
   * Reiniciar caja
   */
  const reiniciarCajaHoy = async () => {
    try {
      if (!cajaActual?.id) {
        throw new Error('No hay caja activa para reiniciar');
      }
      await reiniciarCaja(cajaActual.id, tenantId);
      await cargarCaja();
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
    cargarCaja();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [tenantId]);

  return {
    cajaActual,
    loading,
    error,
    ventasEfectivo,
    movimientosHoy,
    resumenMovimientos,
    crearCajaHoy,
    refresh,
    reiniciarCajaHoy,
  };
}
