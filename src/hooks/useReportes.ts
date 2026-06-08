import { useState, useEffect } from 'react';
import { Venta, Gasto, CierreCaja } from '../types';

import { getTodosGastos, getGastosPorCategoriaAgrupados } from '../services/gastosService';
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

  /**
   * Calcular resumen de reportes
   */
  const calcularResumen = async (ventasData: Venta[], gastosData: Gasto[]) => {
    try {
      const totalVentas = ventasData.reduce((sum, v) => sum + (v.total || 0), 0);
      const ventasEfectivo = ventasData
        .filter(v => v.metodoPago === 'efectivo')
        .reduce((sum, v) => sum + (v.total || 0), 0);
      const totalGastos = gastosData.reduce((sum, g) => sum + (g.monto || 0), 0);
      const gananciaNeta = totalVentas - totalGastos;
      const cantidadVentas = ventasData.length;
      const ventaPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

      // Producto más vendido
      const productosCont: Record<string, number> = {};
      ventasData.forEach((venta) => {
        venta.items?.forEach((item) => {
          productosCont[item.nombre] = (productosCont[item.nombre] || 0) + item.cantidad;
        });
      });
      const productoMasVendido =
        Object.entries(productosCont).length > 0
          ? {
              nombre: Object.entries(productosCont).sort((a, b) => b[1] - a[1])[0][0],
              cantidad: Object.entries(productosCont).sort((a, b) => b[1] - a[1])[0][1],
            }
          : null;

      // Gastos por categoría
      const gastosPorCategoria = await getGastosPorCategoriaAgrupados();

      setResumen({
        totalVentas,
        ventasEfectivo,
        totalGastos,
        gananciaNeta,
        cantidadVentas,
        ventaPromedio,
        productoMasVendido,
        gastosPorCategoria,
      });
    } catch (err) {
      console.error('Error calculando resumen:', err);
      setError('Error calculando resumen');
    }
  };

  /**
   * Cargar datos iniciales
   */
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      try {
        // Obtener ventas
        const ventasRef = collection(db, 'ventas');
        const ventasSnap = await getDocs(query(ventasRef, orderBy('fecha', 'desc')));
        const ventasData = ventasSnap.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        } as Venta));
        setVentas(ventasData);

        // Obtener gastos
        const gastosData = await getTodosGastos();
        setGastos(gastosData);

        // Obtener últimos cierres
        const cierresData = await getUltimosCierres(30);
        setCierres(cierresData);

        // Calcular resumen
        await calcularResumen(ventasData, gastosData);

        setError(null);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Error desconocido';
        setError(`Error cargando datos: ${errMsg}`);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const filtrarPorFecha = async (inicio: Date, fin: Date) => {
    try {
      setLoading(true);

      // Filtrar ventas
      const ventasRef = collection(db, 'ventas');
      const ventasQuery = query(
        ventasRef,
        where('fecha', '>=', Timestamp.fromDate(inicio)),
        where('fecha', '<=', Timestamp.fromDate(fin)),
        orderBy('fecha', 'desc')
      );
      const ventasSnap = await getDocs(ventasQuery);
      const ventasData = ventasSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      } as Venta));
      setVentas(ventasData);

      // Filtrar gastos
      const gastosRef = collection(db, 'gastos');
      const gastosQuery = query(
        gastosRef,
        where('fecha', '>=', Timestamp.fromDate(inicio)),
        where('fecha', '<=', Timestamp.fromDate(fin)),
        orderBy('fecha', 'desc')
      );
      const gastosSnap = await getDocs(gastosQuery);
      const gastosData = gastosSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      } as Gasto));
      setGastos(gastosData);

      // Recalcular resumen
      await calcularResumen(ventasData, gastosData);

      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error filtrando: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const ventasRef = collection(db, 'ventas');
      const ventasSnap = await getDocs(query(ventasRef, orderBy('fecha', 'desc')));
      const ventasData = ventasSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      } as Venta));
      setVentas(ventasData);

      const gastosData = await getTodosGastos();
      setGastos(gastosData);

      const cierresData = await getUltimosCierres(30);
      setCierres(cierresData);

      await calcularResumen(ventasData, gastosData);

      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error refrescando: ${errMsg}`);
    } finally {
      setLoading(false);
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
