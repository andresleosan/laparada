import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import {
  eliminarRegistroPrecioInsumo,
  getHistorialPreciosInsumos,
  onHistorialPreciosInsumosChange,
  registrarPrecioInsumo,
} from '@/services/preciosProveedoresService';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';
import {
  calcularResumenInflacionBodega,
  construirComparativasInsumos,
  descargarCsvComparadorPrecios,
  filtrarRegistrosPorPeriodo,
  filtrarYOrdenarComparativas,
  unificarRegistrosPrecios,
} from '@/utils/preciosProveedoresUtils';
import type {
  Combo,
  ComparativaInsumoProveedores,
  FacturaCompra,
  FiltrosComparadorPrecios,
  Insumo,
  MovimientoKardex,
  Producto,
  Proveedor,
  RegistrarPrecioInsumoInput,
  RegistroPrecioInsumo,
  ResumenInflacionBodega,
} from '@/types';

export interface UsePreciosProveedoresOptions {
  insumos?: Insumo[];
  proveedores?: Proveedor[];
  facturas?: FacturaCompra[];
  movimientosKardex?: MovimientoKardex[];
  productos?: Producto[];
  combos?: Combo[];
  limite?: number;
}

export interface UsePreciosProveedoresResult {
  registrosHistorial: RegistroPrecioInsumo[];
  registrosUnificados: RegistroPrecioInsumo[];
  comparativas: ComparativaInsumoProveedores[];
  comparativasPorInsumo: Record<string, ComparativaInsumoProveedores>;
  comparativasFiltradas: ComparativaInsumoProveedores[];
  resumenInflacion: ResumenInflacionBodega;
  filtros: FiltrosComparadorPrecios;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosComparadorPrecios>>;
  resetFiltros: () => void;
  registrarCotizacionManual: (
    input: Omit<RegistrarPrecioInsumoInput, 'negocioId'>
  ) => Promise<{ id: string; variacionPct: number; esAlzaCritica: boolean }>;
  eliminarRegistro: (registroId: string) => Promise<void>;
  exportarCsv: (nombreNegocioCustom?: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DEFAULT_FILTROS: FiltrosComparadorPrecios = {
  busqueda: '',
  periodo: 'todo',
  soloAlzasCriticas: false,
  soloMultiProveedor: false,
  orden: 'alza_desc',
};

export function usePreciosProveedores(
  options: UsePreciosProveedoresOptions = {}
): UsePreciosProveedoresResult {
  const {
    insumos = [],
    proveedores = [],
    facturas = [],
    movimientosKardex = [],
    productos = [],
    combos = [],
    limite = 500,
  } = options;

  let tenantId = 'laparada';
  let nombreNegocio = 'La Parada';
  try {
    const ctx = useNegocio() as {
      negocioActual?: { id?: string; nombre?: string };
      negocio?: { id?: string; nombre?: string };
      negocioId?: string;
    };
    tenantId =
      ctx?.negocioActual?.id || ctx?.negocio?.id || ctx?.negocioId || 'laparada';
    nombreNegocio =
      ctx?.negocioActual?.nombre || ctx?.negocio?.nombre || 'La Parada';
  } catch {
    // Fallback seguro en pruebas unitarias sin NegocioProvider
  }

  const [registrosHistorial, setRegistrosHistorial] = useState<RegistroPrecioInsumo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosComparadorPrecios>(DEFAULT_FILTROS);

  const requestGuardRef = useRef(createScopedRequestGuard());

  useEffect(() => {
    if (!tenantId) {
      setRegistrosHistorial([]);
      setLoading(false);
      return;
    }

    const token = requestGuardRef.current.begin(tenantId);
    setLoading(true);
    setError(null);

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onHistorialPreciosInsumosChange(
        tenantId,
        (lista) => {
          if (!requestGuardRef.current.isCurrent(token, tenantId)) return;
          setRegistrosHistorial(lista);
          setLoading(false);
        },
        (err) => {
          if (!requestGuardRef.current.isCurrent(token, tenantId)) return;
          setError(err.message || 'Error al cargar el histórico de precios.');
          setLoading(false);
        },
        limite
      );
    } catch (err) {
      if (requestGuardRef.current.isCurrent(token, tenantId)) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudo suscribir al histórico de precios.'
        );
        setLoading(false);
      }
    }

    return () => {
      requestGuardRef.current.invalidate();
      unsubscribe?.();
    };
  }, [tenantId, limite]);

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const token = requestGuardRef.current.begin(tenantId);
    setLoading(true);
    setError(null);
    try {
      const lista = await getHistorialPreciosInsumos(tenantId, limite);
      if (!requestGuardRef.current.isCurrent(token, tenantId)) return;
      setRegistrosHistorial(lista);
    } catch (err) {
      if (!requestGuardRef.current.isCurrent(token, tenantId)) return;
      setError(
        err instanceof Error ? err.message : 'Error recargando el histórico de precios.'
      );
    } finally {
      if (requestGuardRef.current.isCurrent(token, tenantId)) {
        setLoading(false);
      }
    }
  }, [tenantId, limite]);

  const registrosUnificados = useMemo(
    () =>
      unificarRegistrosPrecios({
        registrosHistorial,
        facturas,
        movimientosKardex,
        proveedores,
        insumos,
      }),
    [registrosHistorial, facturas, movimientosKardex, proveedores, insumos]
  );

  const registrosPeriodo = useMemo(
    () => filtrarRegistrosPorPeriodo(registrosUnificados, filtros.periodo),
    [registrosUnificados, filtros.periodo]
  );

  const comparativas = useMemo(
    () =>
      construirComparativasInsumos({
        registros: registrosUnificados,
        insumos,
        proveedores,
        productos,
        combos,
        movimientosKardex,
        periodo: filtros.periodo,
      }),
    [
      registrosUnificados,
      insumos,
      proveedores,
      productos,
      combos,
      movimientosKardex,
      filtros.periodo,
    ]
  );

  const comparativasPorInsumo = useMemo(() => {
    const mapa: Record<string, ComparativaInsumoProveedores> = {};
    for (const c of comparativas) {
      mapa[c.insumoId] = c;
    }
    return mapa;
  }, [comparativas]);

  const comparativasFiltradas = useMemo(
    () => filtrarYOrdenarComparativas(comparativas, filtros),
    [comparativas, filtros]
  );

  const resumenInflacion = useMemo(
    () =>
      calcularResumenInflacionBodega(
        comparativas,
        registrosPeriodo,
        filtros.periodo
      ),
    [comparativas, registrosPeriodo, filtros.periodo]
  );

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
  }, []);

  const registrarCotizacionManual = useCallback(
    async (input: Omit<RegistrarPrecioInsumoInput, 'negocioId'>) => {
      if (!tenantId) throw new Error('No hay negocio activo seleccionado');
      return registrarPrecioInsumo({
        ...input,
        negocioId: tenantId,
      });
    },
    [tenantId]
  );

  const eliminarRegistro = useCallback(
    async (registroId: string) => {
      if (!tenantId) throw new Error('No hay negocio activo seleccionado');
      await eliminarRegistroPrecioInsumo(tenantId, registroId);
    },
    [tenantId]
  );

  const exportarCsv = useCallback(
    (nombreNegocioCustom?: string) => {
      descargarCsvComparadorPrecios({
        comparativas: comparativasFiltradas,
        resumen: resumenInflacion,
        nombreNegocio: nombreNegocioCustom || nombreNegocio,
      });
    },
    [comparativasFiltradas, resumenInflacion, nombreNegocio]
  );

  return {
    registrosHistorial,
    registrosUnificados,
    comparativas,
    comparativasPorInsumo,
    comparativasFiltradas,
    resumenInflacion,
    filtros,
    setFiltros,
    resetFiltros,
    registrarCotizacionManual,
    eliminarRegistro,
    exportarCsv,
    refresh,
    loading,
    error,
  };
}
