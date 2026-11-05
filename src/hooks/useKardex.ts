import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type {
  EntradaInventario,
  FiltrosKardex,
  Insumo,
  MetricasKardex,
  MotivoAjusteInventario,
  MotivoMerma,
} from '@/types';
import {
  getTodosMovimientosInventario,
  onTodosMovimientosInventarioChange,
  registrarEntradaInventario,
  registrarSalidaInventario,
  registrarMermaInventario,
  registrarAjusteInventario,
} from '@/services/inventarioService';
import { useNegocio } from '@/context/NegocioContext';
import {
  calcularMetricasKardex,
  descargarKardexCsv,
  filtrarMovimientosKardex,
} from '@/utils/kardexInventarioUtils';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

export interface UseKardexOptions {
  insumos?: Insumo[];
  limite?: number;
  initialFiltros?: FiltrosKardex;
}

export interface UseKardexResult {
  movimientos: EntradaInventario[];
  movimientosFiltrados: EntradaInventario[];
  metricas: MetricasKardex;
  loading: boolean;
  error: string | null;
  filtros: FiltrosKardex;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosKardex>>;
  resetFiltros: () => void;
  registrarEntrada: (
    insumoId: string,
    cantidad: number,
    costo: number,
    proveedor?: string,
    notas?: string,
    responsable?: string
  ) => Promise<string>;
  registrarSalida: (
    insumoId: string,
    cantidad: number,
    notas?: string,
    responsable?: string
  ) => Promise<void>;
  registrarMerma: (
    insumoId: string,
    cantidad: number,
    motivo: MotivoMerma | string,
    notas?: string,
    responsable?: string
  ) => Promise<void>;
  registrarAjuste: (
    insumoId: string,
    nuevoStockFisico: number,
    motivo: MotivoAjusteInventario | string,
    notas?: string,
    responsable?: string
  ) => Promise<void>;
  exportarCsv: (nombreNegocio?: string) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTROS: FiltrosKardex = {
  insumoId: 'todos',
  tipoMovimiento: 'todos',
  rangoFecha: 'todos',
  busqueda: '',
};

export function useKardex(options: UseKardexOptions = {}): UseKardexResult {
  let tenantId = 'laparada';
  let nombreNegocio = 'La Parada';
  try {
    const negocioCtx = useNegocio();
    tenantId = negocioCtx.negocioActual.id;
    nombreNegocio = negocioCtx.negocioActual.nombre;
  } catch {
    // Fallback seguro si se renderiza en pruebas unitarias sin NegocioProvider
  }
  const insumos = options.insumos || [];
  const limite = options.limite || 200;

  const [movimientos, setMovimientos] = useState<EntradaInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateScope, setStateScope] = useState(tenantId);
  const [filtros, setFiltros] = useState<FiltrosKardex>({
    ...DEFAULT_FILTROS,
    ...(options.initialFiltros || {}),
  });

  const activeScopeRef = useRef(tenantId);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = tenantId;

  useEffect(() => {
    setStateScope(tenantId);
    setLoading(true);
    setError(null);
    setMovimientos([]);

    let cancelled = false;
    const isActiveScope = () => !cancelled && activeScopeRef.current === tenantId;

    const timeoutId = setTimeout(() => {
      if (!isActiveScope()) return;
      setLoading(false);
      setError('Tiempo de espera agotado al consultar movimientos');
    }, 10000);

    const unsubscribe = onTodosMovimientosInventarioChange(
      tenantId,
      (datos) => {
        if (!isActiveScope()) return;
        refreshGuardRef.current.invalidate();
        setMovimientos(datos);
        setLoading(false);
        clearTimeout(timeoutId);
      },
      (err) => {
        if (!isActiveScope()) return;
        console.error('Error listening to movimientos kardex:', err);
        setError(`Error: ${err.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      },
      limite
    );

    return () => {
      cancelled = true;
      refreshGuardRef.current.invalidate();
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [tenantId, limite]);

  const registrarEntrada = useCallback(
    async (
      insumoId: string,
      cantidad: number,
      costo: number,
      proveedor?: string,
      notas?: string,
      responsable?: string
    ) => {
      try {
        const id = await registrarEntradaInventario(
          tenantId,
          insumoId,
          cantidad,
          costo,
          proveedor,
          notas,
          responsable
        );
        setError(null);
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error registrando entrada';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const registrarSalida = useCallback(
    async (
      insumoId: string,
      cantidad: number,
      notas?: string,
      responsable?: string
    ) => {
      try {
        await registrarSalidaInventario(tenantId, insumoId, cantidad, notas, responsable);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error registrando salida';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const registrarMerma = useCallback(
    async (
      insumoId: string,
      cantidad: number,
      motivo: MotivoMerma | string,
      notas?: string,
      responsable?: string
    ) => {
      try {
        await registrarMermaInventario(tenantId, insumoId, cantidad, motivo, notas, responsable);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error registrando merma';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const registrarAjuste = useCallback(
    async (
      insumoId: string,
      nuevoStockFisico: number,
      motivo: MotivoAjusteInventario | string,
      notas?: string,
      responsable?: string
    ) => {
      try {
        await registrarAjusteInventario(tenantId, insumoId, nuevoStockFisico, motivo, notas, responsable);
        setError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error registrando ajuste';
        setError(msg);
        throw err;
      }
    },
    [tenantId]
  );

  const refresh = useCallback(async () => {
    const request = refreshGuardRef.current.begin(tenantId);
    setLoading(true);
    try {
      const datos = await getTodosMovimientosInventario(tenantId, limite);
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setMovimientos(datos);
      setError(null);
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      const msg = err instanceof Error ? err.message : 'Error al actualizar movimientos';
      setError(msg);
    } finally {
      if (refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) {
        setLoading(false);
      }
    }
  }, [tenantId, limite]);

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
  }, []);

  const movimientosFiltrados = useMemo(() => {
    return filtrarMovimientosKardex(movimientos, filtros);
  }, [movimientos, filtros]);

  const metricas = useMemo(() => {
    return calcularMetricasKardex(movimientosFiltrados, insumos);
  }, [movimientosFiltrados, insumos]);

  const exportarCsv = useCallback(
    (nombreOverride?: string) => {
      const nombre = nombreOverride || nombreNegocio || 'La Parada';
      descargarKardexCsv(movimientosFiltrados, nombre);
    },
    [movimientosFiltrados, nombreNegocio]
  );

  const stateIsCurrent = stateScope === tenantId;

  return {
    movimientos: stateIsCurrent ? movimientos : [],
    movimientosFiltrados: stateIsCurrent ? movimientosFiltrados : [],
    metricas,
    loading: stateIsCurrent ? loading : true,
    error: stateIsCurrent ? error : null,
    filtros,
    setFiltros,
    resetFiltros,
    registrarEntrada,
    registrarSalida,
    registrarMerma,
    registrarAjuste,
    exportarCsv,
    refresh,
  };
}
