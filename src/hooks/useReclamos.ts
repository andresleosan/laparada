import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ActualizarEstadoReclamoInput,
  FiltrosReclamos,
  ReclamoEvaluado,
  ReclamoPqrs,
  RegistrarReclamoInput,
  ResolverReclamoInput,
  ResumenReclamos,
} from '@/types/reclamo';
import {
  actualizarEstadoReclamoPqrs,
  eliminarReclamoPqrs,
  getReclamosPqrs,
  marcarWhatsAppReclamoEnviado,
  onReclamosPqrsChange,
  registrarReclamoPqrs,
  resolverReclamoPqrs,
} from '@/services/reclamosService';
import {
  calcularResumenReclamos,
  descargarCsvReclamos,
  evaluarReclamos,
  filtrarReclamos,
} from '@/utils/reclamosUtils';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

export interface UseReclamosOptions {
  initialFiltros?: Partial<FiltrosReclamos>;
  totalPedidosMes?: number;
}

export interface UseReclamosResult {
  reclamos: ReclamoPqrs[];
  reclamosEvaluados: ReclamoEvaluado[];
  reclamosFiltrados: ReclamoEvaluado[];
  reclamosActivos: ReclamoEvaluado[];
  resumen: ResumenReclamos;
  loading: boolean;
  error: string | null;
  filtros: FiltrosReclamos;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosReclamos>>;
  resetFiltros: () => void;
  registrarReclamo: (
    input: Omit<RegistrarReclamoInput, 'negocioId'>
  ) => Promise<ReclamoPqrs>;
  actualizarEstado: (
    reclamoId: string,
    updates: ActualizarEstadoReclamoInput
  ) => Promise<void>;
  resolverReclamo: (
    reclamoId: string,
    input: ResolverReclamoInput
  ) => Promise<ReclamoPqrs>;
  marcarWhatsAppEnviado: (reclamoId: string) => Promise<void>;
  eliminarReclamo: (reclamoId: string) => Promise<void>;
  exportarCsv: (nombreOverride?: string) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTROS: FiltrosReclamos = {
  busqueda: '',
  tipo: 'todos',
  canal: 'todos',
  causaRaiz: 'todos',
  prioridad: 'todos',
  estado: 'todos',
  semaforoSla: 'todos',
};

export function useReclamos(options: UseReclamosOptions = {}): UseReclamosResult {
  let tenantId = 'laparada';
  let nombreNegocio = 'La Parada';
  try {
    const negocioCtx = useNegocio();
    tenantId = negocioCtx.negocioActual.id;
    nombreNegocio = negocioCtx.negocioActual.nombre;
  } catch {
    // Fallback seguro para renderizado aislado en pruebas unitarias
  }

  const [reclamos, setReclamos] = useState<ReclamoPqrs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateScope, setStateScope] = useState(tenantId);
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());
  const [filtros, setFiltros] = useState<FiltrosReclamos>({
    ...DEFAULT_FILTROS,
    ...(options.initialFiltros || {}),
  });

  const activeScopeRef = useRef(tenantId);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = tenantId;

  // Refresco del reloj SLA en vivo cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setAhoraMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setStateScope(tenantId);
    setReclamos([]);
    setLoading(true);
    setError(null);

    let cancelled = false;
    const isActiveScope = () => !cancelled && activeScopeRef.current === tenantId;

    const timeoutId = setTimeout(() => {
      if (isActiveScope()) {
        setLoading(false);
      }
    }, 3000);

    const unsub = onReclamosPqrsChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        setReclamos(lista);
        setError(null);
        setLoading(false);
        clearTimeout(timeoutId);
      },
      (err) => {
        if (!isActiveScope()) return;
        setError(err.message || 'Error cargando módulo de reclamos y PQRS');
        setLoading(false);
        clearTimeout(timeoutId);
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      unsub();
    };
  }, [tenantId]);

  const refresh = useCallback(async () => {
    const scope = tenantId;
    const ticket = refreshGuardRef.current.begin(scope);
    try {
      setLoading(true);
      setError(null);
      const lista = await getReclamosPqrs(scope);
      if (!refreshGuardRef.current.isCurrent(ticket, scope) || activeScopeRef.current !== scope) {
        return;
      }
      setReclamos(lista);
      setAhoraMs(Date.now());
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(ticket, scope) || activeScopeRef.current !== scope) {
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Error consultando reclamos y PQRS'
      );
    } finally {
      if (refreshGuardRef.current.isCurrent(ticket, scope) && activeScopeRef.current === scope) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  const reclamosScoped = stateScope === tenantId ? reclamos : [];

  const reclamosEvaluados = useMemo(
    () => evaluarReclamos(reclamosScoped, ahoraMs),
    [reclamosScoped, ahoraMs]
  );

  const reclamosFiltrados = useMemo(
    () => filtrarReclamos(reclamosEvaluados, filtros),
    [reclamosEvaluados, filtros]
  );

  const reclamosActivos = useMemo(
    () => reclamosEvaluados.filter((item) => item.esActivo),
    [reclamosEvaluados]
  );

  const totalPedidosRef = options.totalPedidosMes ?? 0;
  const resumen = useMemo(
    () => calcularResumenReclamos(reclamosEvaluados, totalPedidosRef),
    [reclamosEvaluados, totalPedidosRef]
  );

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
  }, []);

  const registrarReclamo = useCallback(
    (input: Omit<RegistrarReclamoInput, 'negocioId'>) =>
      registrarReclamoPqrs({ ...input, negocioId: tenantId }, reclamosScoped.length),
    [tenantId, reclamosScoped.length]
  );

  const actualizarEstado = useCallback(
    (reclamoId: string, updates: ActualizarEstadoReclamoInput) =>
      actualizarEstadoReclamoPqrs(tenantId, reclamoId, updates),
    [tenantId]
  );

  const resolverReclamo = useCallback(
    (reclamoId: string, input: ResolverReclamoInput) =>
      resolverReclamoPqrs(tenantId, reclamoId, input),
    [tenantId]
  );

  const marcarWhatsAppEnviado = useCallback(
    (reclamoId: string) => marcarWhatsAppReclamoEnviado(tenantId, reclamoId),
    [tenantId]
  );

  const eliminarReclamo = useCallback(
    (reclamoId: string) => eliminarReclamoPqrs(tenantId, reclamoId),
    [tenantId]
  );

  const exportarCsv = useCallback(
    (nombreOverride?: string) => {
      descargarCsvReclamos({
        reclamosEvaluados,
        nombreNegocio: nombreOverride || nombreNegocio,
      });
    },
    [reclamosEvaluados, nombreNegocio]
  );

  return {
    reclamos: reclamosScoped,
    reclamosEvaluados,
    reclamosFiltrados,
    reclamosActivos,
    resumen,
    loading,
    error,
    filtros,
    setFiltros,
    resetFiltros,
    registrarReclamo,
    actualizarEstado,
    resolverReclamo,
    marcarWhatsAppEnviado,
    eliminarReclamo,
    exportarCsv,
    refresh,
  };
}
