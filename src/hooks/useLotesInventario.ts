import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  BajaRapidaLoteMermaInput,
  CrearNotificacionInput,
  FiltrosLotesInventario,
  Insumo,
  LoteEvaluadoSanitario,
  LoteInventario,
  NotificacionOperativa,
  RegistrarLoteManualInput,
  ResultadoBajaLoteMerma,
  ResumenLotesPorInsumoItem,
  ResumenSanitarioBodega,
} from '@/types';
import {
  cambiarCuarentenaLote,
  darDeBajaLoteAMerma,
  getTodosLotesInventario,
  onTodosLotesInventarioChange,
  registrarLoteInventarioManual,
  sincronizarAlertasSanitariasLotes,
} from '@/services/lotesInventarioService';
import {
  calcularResumenSanitarioBodega,
  construirAlertasSanitariasLotes,
  descargarCsvTrazabilidadSanitaria,
  evaluarLotesSanitarios,
  filtrarLotesInventario,
  obtenerResumenLotesPorInsumo,
} from '@/utils/lotesInventarioUtils';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

export interface UseLotesInventarioOptions {
  insumos?: Insumo[];
  limite?: number;
  initialFiltros?: FiltrosLotesInventario;
}

export interface UseLotesInventarioResult {
  lotes: LoteInventario[];
  lotesEvaluados: LoteEvaluadoSanitario[];
  lotesFiltrados: LoteEvaluadoSanitario[];
  resumenSanitario: ResumenSanitarioBodega;
  resumenPorInsumo: Record<string, ResumenLotesPorInsumoItem>;
  alertasSanitariasEnVivo: CrearNotificacionInput[];
  loading: boolean;
  error: string | null;
  filtros: FiltrosLotesInventario;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosLotesInventario>>;
  resetFiltros: () => void;
  registrarLoteManual: (input: RegistrarLoteManualInput) => Promise<string>;
  darDeBajaLote: (input: BajaRapidaLoteMermaInput) => Promise<ResultadoBajaLoteMerma>;
  toggleCuarentena: (
    loteId: string,
    enCuarentena: boolean,
    motivo?: string,
    responsable?: string
  ) => Promise<void>;
  sincronizarAlertas: (
    notificacionesExistentes?: NotificacionOperativa[]
  ) => Promise<{ emitidas: number }>;
  exportarTrazabilidadCsv: (nombreNegocio?: string) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTROS: FiltrosLotesInventario = {
  insumoId: 'todos',
  estadoSemaforo: 'todos',
  estadoLote: 'activo',
  busqueda: '',
};

export function useLotesInventario(
  options: UseLotesInventarioOptions = {}
): UseLotesInventarioResult {
  let tenantId = 'laparada';
  let nombreNegocio = 'La Parada';
  try {
    const negocioCtx = useNegocio();
    tenantId = negocioCtx.negocioActual.id;
    nombreNegocio = negocioCtx.negocioActual.nombre;
  } catch {
    // Fallback seguro para renderizado aislado en pruebas unitarias sin NegocioProvider
  }

  const limite = options.limite || 300;
  const [lotes, setLotes] = useState<LoteInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateScope, setStateScope] = useState(tenantId);
  const [filtros, setFiltros] = useState<FiltrosLotesInventario>({
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
    setLotes([]);

    let cancelled = false;
    const isActiveScope = () => !cancelled && activeScopeRef.current === tenantId;

    const timeoutId = setTimeout(() => {
      if (!isActiveScope()) return;
      setLoading(false);
      setError('Tiempo de espera agotado al consultar lotes e historial sanitario');
    }, 10000);

    const unsubscribe = onTodosLotesInventarioChange(
      tenantId,
      (datos) => {
        if (!isActiveScope()) return;
        refreshGuardRef.current.invalidate();
        setLotes(datos);
        setLoading(false);
        clearTimeout(timeoutId);
      },
      (err) => {
        if (!isActiveScope()) return;
        console.error('Error listening to lotes_inventario:', err);
        setError(`Error al consultar lotes: ${err.message}`);
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

  const refresh = useCallback(async () => {
    const request = refreshGuardRef.current.begin(tenantId);
    setLoading(true);
    try {
      const datos = await getTodosLotesInventario(tenantId, limite);
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setLotes(datos);
      setError(null);
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      const msg = err instanceof Error ? err.message : 'Error refrescando lotes';
      setError(msg);
    } finally {
      if (refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) {
        setLoading(false);
      }
    }
  }, [tenantId, limite]);

  const registrarLoteManual = useCallback(
    async (input: RegistrarLoteManualInput) => {
      const id = await registrarLoteInventarioManual(tenantId, input);
      setError(null);
      return id;
    },
    [tenantId]
  );

  const darDeBajaLote = useCallback(
    async (input: BajaRapidaLoteMermaInput) => {
      const res = await darDeBajaLoteAMerma(tenantId, input);
      setError(null);
      return res;
    },
    [tenantId]
  );

  const toggleCuarentena = useCallback(
    async (
      loteId: string,
      enCuarentena: boolean,
      motivo?: string,
      responsable?: string
    ) => {
      await cambiarCuarentenaLote(tenantId, loteId, enCuarentena, motivo, responsable);
      setError(null);
    },
    [tenantId]
  );

  const lotesActuales = useMemo(
    () => (stateScope === tenantId ? lotes : []),
    [stateScope, tenantId, lotes]
  );

  const lotesEvaluados = useMemo(
    () => evaluarLotesSanitarios(lotesActuales),
    [lotesActuales]
  );

  const lotesFiltrados = useMemo(
    () => filtrarLotesInventario(lotesEvaluados, filtros),
    [lotesEvaluados, filtros]
  );

  const resumenSanitario = useMemo(
    () => calcularResumenSanitarioBodega(lotesActuales),
    [lotesActuales]
  );

  const resumenPorInsumo = useMemo(
    () => obtenerResumenLotesPorInsumo(lotesActuales),
    [lotesActuales]
  );

  const alertasSanitariasEnVivo = useMemo(
    () => construirAlertasSanitariasLotes(lotesActuales),
    [lotesActuales]
  );

  const sincronizarAlertas = useCallback(
    async (notificacionesExistentes: NotificacionOperativa[] = []) => {
      return sincronizarAlertasSanitariasLotes(
        tenantId,
        lotesActuales,
        notificacionesExistentes
      );
    },
    [tenantId, lotesActuales]
  );

  const exportarTrazabilidadCsv = useCallback(
    (nombreOverride?: string) => {
      const nombre = nombreOverride || nombreNegocio || 'La Parada';
      descargarCsvTrazabilidadSanitaria(lotesActuales, nombre);
    },
    [lotesActuales, nombreNegocio]
  );

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
  }, []);

  const stateIsCurrent = stateScope === tenantId;

  return {
    lotes: lotesActuales,
    lotesEvaluados,
    lotesFiltrados,
    resumenSanitario,
    resumenPorInsumo,
    alertasSanitariasEnVivo,
    loading: stateIsCurrent ? loading : true,
    error: stateIsCurrent ? error : null,
    filtros,
    setFiltros,
    resetFiltros,
    registrarLoteManual,
    darDeBajaLote,
    toggleCuarentena,
    sincronizarAlertas,
    exportarTrazabilidadCsv,
    refresh,
  };
}
