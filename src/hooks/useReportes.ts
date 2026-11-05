// src/hooks/useReportes.ts
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  CierreCaja,
  Combo,
  EstadoResultadosPL,
  Gasto,
  Insumo,
  MovimientoKardex,
  Producto,
  RangoFechaReporte,
  TipoPeriodoReporte,
  Venta,
} from '@/types';
import { getUltimosCierres } from '@/services/cierreCajaService';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useNegocio } from '@/context/NegocioContext';
import { buildAdminReportSummary } from '@/utils/adminReports';
import {
  calcularEstadoResultados,
  descargarReportePLCSV,
  obtenerRangoFechaReporte,
} from '@/utils/analiticaFinancieraUtils';

export const DEFAULT_REPORT_DAYS = 30;

export interface ReporteResumen {
  totalVentas: number;
  ventasEfectivo: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  ventaPromedio: number;
  totalPropinas?: number;
  totalDescuentos?: number;
  cantidadDescuentos?: number;
  totalAnuladas?: number;
  cantidadAnuladas?: number;
  productoMasVendido: { nombre: string; cantidad: number } | null;
  gastosPorCategoria: Record<string, number>;
}

export interface UseReportesResult {
  resumen: ReporteResumen;
  ventas: Venta[];
  gastos: Gasto[];
  cierres: CierreCaja[];
  movimientosKardex: MovimientoKardex[];
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  estadoResultados: EstadoResultadosPL;
  tipoPeriodo: TipoPeriodoReporte;
  rangoPeriodo: RangoFechaReporte;
  loading: boolean;
  error: string | null;
  cambiarPeriodo: (tipo: TipoPeriodoReporte, customInicio?: Date, customFin?: Date) => Promise<void>;
  filtrarPorFecha: (inicio: Date, fin: Date) => Promise<void>;
  exportarPLCSV: () => void;
  refresh: () => Promise<void>;
}

/**
 * Hook para cálculos y análisis de reportes y centro de analítica financiera P&L
 */
export function useReportes(): UseReportesResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodoReporte>('30dias');
  const [rangoPeriodo, setRangoPeriodo] = useState<RangoFechaReporte>(() =>
    obtenerRangoFechaReporte('30dias')
  );

  const [resumen, setResumen] = useState<ReporteResumen>({
    totalVentas: 0,
    ventasEfectivo: 0,
    totalGastos: 0,
    gananciaNeta: 0,
    cantidadVentas: 0,
    ventaPromedio: 0,
    totalPropinas: 0,
    productoMasVendido: null,
    gastosPorCategoria: {},
  });

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cierres, setCierres] = useState<CierreCaja[]>([]);
  const [movimientosKardex, setMovimientosKardex] = useState<MovimientoKardex[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);

  /**
   * Cargar datos del período seleccionado con aislamiento estricto multi-tenant
   */
  const cargarDatosPeriodo = useCallback(
    async (rango: RangoFechaReporte) => {
      const generation = ++requestGenerationRef.current;
      setLoading(true);

      try {
        const { inicio, fin } = rango;
        const tsInicio = Timestamp.fromDate(inicio);
        const tsFin = Timestamp.fromDate(fin);

        // Consultas concurrentes acotadas por tenantId y fechas
        const ventasQuery = query(
          collection(db, 'ventas'),
          where('negocioId', '==', tenantId),
          where('fecha', '>=', tsInicio),
          where('fecha', '<=', tsFin),
          orderBy('fecha', 'desc')
        );

        const gastosQuery = query(
          collection(db, 'gastos'),
          where('negocioId', '==', tenantId),
          where('fecha', '>=', tsInicio),
          where('fecha', '<=', tsFin),
          orderBy('fecha', 'desc')
        );

        const movimientosQuery = query(
          collection(db, 'entradas_inventario'),
          where('negocioId', '==', tenantId),
          where('fecha', '>=', tsInicio),
          where('fecha', '<=', tsFin),
          orderBy('fecha', 'desc')
        );

        const productosQuery = query(
          collection(db, 'productos'),
          where('negocioId', '==', tenantId)
        );

        const combosQuery = query(
          collection(db, 'combos'),
          where('negocioId', '==', tenantId)
        );

        const insumosQuery = query(
          collection(db, 'inventario'),
          where('negocioId', '==', tenantId)
        );

        const [
          ventasSnap,
          gastosSnap,
          movimientosSnap,
          productosSnap,
          combosSnap,
          insumosSnap,
          cierresData,
        ] = await Promise.all([
          getDocs(ventasQuery),
          getDocs(gastosQuery),
          getDocs(movimientosQuery),
          getDocs(productosQuery),
          getDocs(combosQuery),
          getDocs(insumosQuery),
          getUltimosCierres(tenantId, 30),
        ]);

        if (generation !== requestGenerationRef.current) return;

        const ventasData = ventasSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Venta));
        const gastosData = gastosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Gasto));
        const movimientosData = movimientosSnap.docs.map(
          (d) => ({ ...d.data(), id: d.id } as MovimientoKardex)
        );
        const productosData = productosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Producto));
        const combosData = combosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Combo));
        const insumosData = insumosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Insumo));

        setVentas(ventasData);
        setGastos(gastosData);
        setMovimientosKardex(movimientosData);
        setProductos(productosData);
        setCombos(combosData);
        setInsumos(insumosData);
        setCierres(cierresData);
        setResumen(buildAdminReportSummary(ventasData, gastosData));
        setError(null);
      } catch (err) {
        if (generation !== requestGenerationRef.current) return;
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error cargando datos: ${errMsg}`);
      } finally {
        if (generation === requestGenerationRef.current) {
          setLoading(false);
        }
      }
    },
    [tenantId]
  );

  useEffect(() => {
    cargarDatosPeriodo(rangoPeriodo);
    return () => {
      requestGenerationRef.current += 1;
    };
  }, [cargarDatosPeriodo, rangoPeriodo]);

  /**
   * Cambia el período de tiempo y actualiza los datos
   */
  const cambiarPeriodo = useCallback(
    async (tipo: TipoPeriodoReporte, customInicio?: Date, customFin?: Date) => {
      const nuevoRango = obtenerRangoFechaReporte(tipo, customInicio, customFin);
      setTipoPeriodo(tipo);
      setRangoPeriodo(nuevoRango);
      await cargarDatosPeriodo(nuevoRango);
    },
    [cargarDatosPeriodo]
  );

  /**
   * Filtrado manual por fechas (compatibilidad con filtros de fecha previos)
   */
  const filtrarPorFecha = useCallback(
    async (inicio: Date, fin: Date) => {
      await cambiarPeriodo('personalizado', inicio, fin);
    },
    [cambiarPeriodo]
  );

  /**
   * Refrescar datos actuales
   */
  const refresh = useCallback(async () => {
    await cargarDatosPeriodo(rangoPeriodo);
  }, [cargarDatosPeriodo, rangoPeriodo]);

  /**
   * Cálculo memoizado del Estado de Resultados (P&L)
   */
  const estadoResultados = useMemo<EstadoResultadosPL>(() => {
    return calcularEstadoResultados({
      ventas,
      gastos,
      movimientosKardex,
      productos,
      combos,
      insumos,
      periodo: rangoPeriodo,
    });
  }, [ventas, gastos, movimientosKardex, productos, combos, insumos, rangoPeriodo]);

  /**
   * Exporta el Estado de Resultados a archivo CSV estructurado
   */
  const exportarPLCSV = useCallback(() => {
    descargarReportePLCSV(estadoResultados, negocioActual.nombre || 'La Parada');
  }, [estadoResultados, negocioActual.nombre]);

  return {
    resumen,
    ventas,
    gastos,
    cierres,
    movimientosKardex,
    productos,
    combos,
    insumos,
    estadoResultados,
    tipoPeriodo,
    rangoPeriodo,
    loading,
    error,
    cambiarPeriodo,
    filtrarPorFecha,
    exportarPLCSV,
    refresh,
  };
}
