import { useState, useEffect, useRef } from 'react';
import { Venta, Gasto, CierreCaja } from '../types';

import { getUltimosCierres } from '../services/cierreCajaService';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNegocio } from '../context/NegocioContext';
import { buildAdminReportSummary, getRollingReportRange } from '@/utils/adminReports';

export const DEFAULT_REPORT_DAYS = 30;

export interface ReporteResumen {
  totalVentas: number;
  ventasEfectivo: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  ventaPromedio: number;
  productoMasVendido: { nombre: string; cantidad: number } | null;
  gastosPorCategoria: Record<string, number>;
}

export interface UseReportesResult {
  resumen: ReporteResumen;
  ventas: Venta[];
  gastos: Gasto[];
  cierres: CierreCaja[];
  loading: boolean;
  error: string | null;
  filtrarPorFecha: (inicio: Date, fin: Date) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook para cálculos y análisis de reportes
 */
export function useReportes(): UseReportesResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;
  const [resumen, setResumen] = useState<ReporteResumen>({
    totalVentas: 0,
    ventasEfectivo: 0,
    totalGastos: 0,
    gananciaNeta: 0,
    cantidadVentas: 0,
    ventaPromedio: 0,
    productoMasVendido: null,
    gastosPorCategoria: {},
  });

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);

  /**
   * Calcular resumen de reportes
   */
  const commitReportData = (
    generation: number,
    ventasData: Venta[],
    gastosData: Gasto[],
    cierresData?: CierreCaja[]
  ) => {
    if (generation !== requestGenerationRef.current) return false;
    setVentas(ventasData);
    setGastos(gastosData);
    if (cierresData) setCierres(cierresData);
    setResumen(buildAdminReportSummary(ventasData, gastosData));
    setError(null);
    return true;
  };

  /**
   * Cargar datos iniciales
   */
  useEffect(() => {
    const cargarDatos = async () => {
      const generation = ++requestGenerationRef.current;
      setLoading(true);
      try {
        const { inicio, fin } = getRollingReportRange(DEFAULT_REPORT_DAYS);
        // Obtener ventas
        const ventasRef = collection(db, 'ventas');
        const ventasSnap = await getDocs(query(
          ventasRef,
          where('negocioId', '==', tenantId),
          where('fecha', '>=', Timestamp.fromDate(inicio)),
          where('fecha', '<=', Timestamp.fromDate(fin)),
          orderBy('fecha', 'desc')
        ));
        const ventasData = ventasSnap.docs.map((doc: any) => ({
          ...doc.data(),
          id: doc.id,
        } as Venta));
        const gastosRef = collection(db, 'gastos');
        const [gastosSnap, cierresData] = await Promise.all([
          getDocs(query(
            gastosRef,
            where('negocioId', '==', tenantId),
            where('fecha', '>=', Timestamp.fromDate(inicio)),
            where('fecha', '<=', Timestamp.fromDate(fin)),
            orderBy('fecha', 'desc')
          )),
          getUltimosCierres(tenantId, 30),
        ]);
        const gastosData = gastosSnap.docs.map((doc: any) => ({
          ...doc.data(),
          id: doc.id,
        } as Gasto));
        commitReportData(generation, ventasData, gastosData, cierresData);
      } catch (err) {
        if (generation !== requestGenerationRef.current) return;
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error cargando datos: ${errMsg}`);
      } finally {
        if (generation === requestGenerationRef.current) setLoading(false);
      }
    };

    cargarDatos();
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [tenantId]);

  const filtrarPorFecha = async (inicio: Date, fin: Date) => {
    const generation = ++requestGenerationRef.current;
    try {
      setLoading(true);

      // Filtrar ventas
      const ventasRef = collection(db, 'ventas');
      const ventasQuery = query(
        ventasRef,
        where('negocioId', '==', tenantId),
        where('fecha', '>=', Timestamp.fromDate(inicio)),
        where('fecha', '<=', Timestamp.fromDate(fin)),
        orderBy('fecha', 'desc')
      );
      const ventasSnap = await getDocs(ventasQuery);
      const ventasData = ventasSnap.docs.map((doc: any) => ({
        ...doc.data(),
        id: doc.id,
      } as Venta));
      // Filtrar gastos
      const gastosRef = collection(db, 'gastos');
      const gastosQuery = query(
        gastosRef,
        where('negocioId', '==', tenantId),
        where('fecha', '>=', Timestamp.fromDate(inicio)),
        where('fecha', '<=', Timestamp.fromDate(fin)),
        orderBy('fecha', 'desc')
      );
      const gastosSnap = await getDocs(gastosQuery);
      const gastosData = gastosSnap.docs.map((doc: any) => ({
        ...doc.data(),
        id: doc.id,
      } as Gasto));
      commitReportData(generation, ventasData, gastosData);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error filtrando: ${errMsg}`);
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  };

  const refresh = async () => {
    const generation = ++requestGenerationRef.current;
    setLoading(true);
    try {
      const { inicio, fin } = getRollingReportRange(DEFAULT_REPORT_DAYS);
      const ventasRef = collection(db, 'ventas');
      const ventasSnap = await getDocs(query(
        ventasRef,
        where('negocioId', '==', tenantId),
        where('fecha', '>=', Timestamp.fromDate(inicio)),
        where('fecha', '<=', Timestamp.fromDate(fin)),
        orderBy('fecha', 'desc')
      ));
      const ventasData = ventasSnap.docs.map((doc: any) => ({
        ...doc.data(),
        id: doc.id,
      } as Venta));
      const gastosRef = collection(db, 'gastos');
      const [gastosSnap, cierresData] = await Promise.all([
        getDocs(query(
          gastosRef,
          where('negocioId', '==', tenantId),
          where('fecha', '>=', Timestamp.fromDate(inicio)),
          where('fecha', '<=', Timestamp.fromDate(fin)),
          orderBy('fecha', 'desc')
        )),
        getUltimosCierres(tenantId, 30),
      ]);
      const gastosData = gastosSnap.docs.map((doc: any) => ({
        ...doc.data(),
        id: doc.id,
      } as Gasto));
      commitReportData(generation, ventasData, gastosData, cierresData);
    } catch (err) {
      if (generation !== requestGenerationRef.current) return;
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error refrescando: ${errMsg}`);
    } finally {
      if (generation === requestGenerationRef.current) setLoading(false);
    }
  };

  return {
    resumen,
    ventas,
    gastos,
    cierres,
    loading,
    error,
    filtrarPorFecha,
    refresh,
  };
}
