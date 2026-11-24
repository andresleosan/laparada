import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ChecklistTurnoBpm,
  ConfiguracionBpm,
  CrearNotificacionInput,
  EstadoEquipoFrioEvaluado,
  EstadoFreidoraEvaluada,
  FiltrosBitacoraBpm,
  GuardarChecklistBpmInput,
  RegistrarAceiteBpmInput,
  RegistrarTemperaturaBpmInput,
  RegistroAceiteBpm,
  RegistroTemperaturaBpm,
  ResumenCumplimientoBpm,
} from '@/types';
import {
  type ColeccionRegistroBpm,
  eliminarRegistroBpm,
  getChecklistsBpm,
  getConfiguracionBpm,
  getRegistrosAceiteBpm,
  getRegistrosTemperaturaBpm,
  guardarChecklistTurnoBpm,
  guardarConfiguracionBpm,
  onChecklistsBpmChange,
  onConfiguracionBpmChange,
  onRegistrosAceiteBpmChange,
  onRegistrosTemperaturaBpmChange,
  registrarEventoAceiteBpm,
  registrarTemperaturaBpm,
  resolverDesviacionTemperaturaBpm,
} from '@/services/bpmService';
import {
  calcularResumenCumplimientoBpm,
  construirAlertasBpm,
  crearConfiguracionBpmDefault,
  descargarCsvCarpetaSanitariaBpm,
  evaluarEquiposFrioHoy,
  evaluarFreidorasEstado,
  filtrarRegistrosBpm,
} from '@/utils/bpmUtils';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

export interface UseBitacoraBpmOptions {
  initialFiltros?: Partial<FiltrosBitacoraBpm>;
}

export interface UseBitacoraBpmResult {
  config: ConfiguracionBpm;
  temperaturas: RegistroTemperaturaBpm[];
  aceite: RegistroAceiteBpm[];
  checklists: ChecklistTurnoBpm[];
  temperaturasFiltradas: RegistroTemperaturaBpm[];
  aceiteFiltrado: RegistroAceiteBpm[];
  checklistsFiltrados: ChecklistTurnoBpm[];
  equiposEvaluadosHoy: EstadoEquipoFrioEvaluado[];
  freidorasEvaluadas: EstadoFreidoraEvaluada[];
  resumen: ResumenCumplimientoBpm;
  alertasBpmEnVivo: CrearNotificacionInput[];
  loading: boolean;
  error: string | null;
  filtros: FiltrosBitacoraBpm;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosBitacoraBpm>>;
  resetFiltros: () => void;
  registrarTemperatura: (input: RegistrarTemperaturaBpmInput) => Promise<{
    id: string;
    estadoConformidad: RegistroTemperaturaBpm['estadoConformidad'];
  }>;
  resolverDesviacion: (
    registroId: string,
    input: { accionCorrectiva: string; resueltoPor: string; observaciones?: string }
  ) => Promise<void>;
  registrarAceite: (input: RegistrarAceiteBpmInput) => Promise<{
    id: string;
    estadoAceite: RegistroAceiteBpm['estadoAceite'];
  }>;
  guardarChecklist: (input: GuardarChecklistBpmInput) => Promise<{
    id: string;
    estado: ChecklistTurnoBpm['estado'];
    porcentajeCumplimiento: number;
  }>;
  guardarConfiguracion: (
    input: Partial<Omit<ConfiguracionBpm, 'negocioId'>> & { actualizadoPor?: string }
  ) => Promise<void>;
  eliminarRegistro: (coleccion: ColeccionRegistroBpm, id: string) => Promise<void>;
  exportarCarpetaCsv: (nombreOverride?: string) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTROS: FiltrosBitacoraBpm = {
  rango: '7dias',
  busqueda: '',
  soloAlertas: false,
};

export function useBitacoraBpm(
  options: UseBitacoraBpmOptions = {}
): UseBitacoraBpmResult {
  let tenantId = 'laparada';
  let nombreNegocio = 'La Parada';
  try {
    const negocioCtx = useNegocio();
    tenantId = negocioCtx.negocioActual.id;
    nombreNegocio = negocioCtx.negocioActual.nombre;
  } catch {
    // Fallback seguro para renderizado aislado en pruebas unitarias sin NegocioProvider
  }

  const [config, setConfig] = useState<ConfiguracionBpm>(() =>
    crearConfiguracionBpmDefault(tenantId)
  );
  const [temperaturas, setTemperaturas] = useState<RegistroTemperaturaBpm[]>([]);
  const [aceite, setAceite] = useState<RegistroAceiteBpm[]>([]);
  const [checklists, setChecklists] = useState<ChecklistTurnoBpm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateScope, setStateScope] = useState(tenantId);
  const [filtros, setFiltros] = useState<FiltrosBitacoraBpm>({
    ...DEFAULT_FILTROS,
    ...(options.initialFiltros || {}),
  });

  const activeScopeRef = useRef(tenantId);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = tenantId;

  useEffect(() => {
    setStateScope(tenantId);
    setConfig(crearConfiguracionBpmDefault(tenantId));
    setTemperaturas([]);
    setAceite([]);
    setChecklists([]);
    setLoading(true);
    setError(null);

    let cancelled = false;
    let tempsListos = false;
    let aceiteListo = false;
    let checklistsListos = false;
    const isActiveScope = () => !cancelled && activeScopeRef.current === tenantId;

    const marcarCargaSiCompleta = () => {
      if (tempsListos && aceiteListo && checklistsListos) {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!isActiveScope()) return;
      setLoading(false);
      setError('Tiempo de espera agotado al consultar la Bitácora Sanitaria BPM');
    }, 10000);

    const unsubConfig = onConfiguracionBpmChange(
      tenantId,
      (cfg) => {
        if (!isActiveScope()) return;
        setConfig(cfg);
      },
      (err) => {
        if (!isActiveScope()) return;
        console.warn('Error cargando configuración BPM:', err);
      }
    );

    const unsubTemp = onRegistrosTemperaturaBpmChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        refreshGuardRef.current.invalidate();
        tempsListos = true;
        setTemperaturas(lista);
        setError(null);
        marcarCargaSiCompleta();
      },
      (err) => {
        if (!isActiveScope()) return;
        setError(`Error consultando temperaturas BPM: ${err.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    );

    const unsubAceite = onRegistrosAceiteBpmChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        refreshGuardRef.current.invalidate();
        aceiteListo = true;
        setAceite(lista);
        setError(null);
        marcarCargaSiCompleta();
      },
      (err) => {
        if (!isActiveScope()) return;
        setError(`Error consultando aceite de freidoras: ${err.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    );

    const unsubChecklists = onChecklistsBpmChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        refreshGuardRef.current.invalidate();
        checklistsListos = true;
        setChecklists(lista);
        setError(null);
        marcarCargaSiCompleta();
      },
      (err) => {
        if (!isActiveScope()) return;
        setError(`Error consultando checklists BPM: ${err.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    );

    return () => {
      cancelled = true;
      refreshGuardRef.current.invalidate();
      unsubConfig();
      unsubTemp();
      unsubAceite();
      unsubChecklists();
      clearTimeout(timeoutId);
    };
  }, [tenantId]);

  const refresh = useCallback(async () => {
    const request = refreshGuardRef.current.begin(tenantId);
    setLoading(true);
    try {
      const [cfg, temps, oils, chks] = await Promise.all([
        getConfiguracionBpm(tenantId),
        getRegistrosTemperaturaBpm(tenantId),
        getRegistrosAceiteBpm(tenantId),
        getChecklistsBpm(tenantId),
      ]);
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setConfig(cfg);
      setTemperaturas(temps);
      setAceite(oils);
      setChecklists(chks);
      setError(null);
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      const msg = err instanceof Error ? err.message : 'Error refrescando bitácora BPM';
      setError(msg);
    } finally {
      if (refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  const stateIsCurrent = stateScope === tenantId;
  const configActual = useMemo(
    () => (stateIsCurrent ? config : crearConfiguracionBpmDefault(tenantId)),
    [stateIsCurrent, config, tenantId]
  );
  const temperaturasActuales = useMemo(
    () => (stateIsCurrent ? temperaturas : []),
    [stateIsCurrent, temperaturas]
  );
  const aceiteActual = useMemo(
    () => (stateIsCurrent ? aceite : []),
    [stateIsCurrent, aceite]
  );
  const checklistsActuales = useMemo(
    () => (stateIsCurrent ? checklists : []),
    [stateIsCurrent, checklists]
  );

  const equiposEvaluadosHoy = useMemo(
    () => evaluarEquiposFrioHoy(configActual.equiposFrio, temperaturasActuales),
    [configActual.equiposFrio, temperaturasActuales]
  );

  const freidorasEvaluadas = useMemo(
    () => evaluarFreidorasEstado(configActual.freidoras, aceiteActual),
    [configActual.freidoras, aceiteActual]
  );

  const resumen = useMemo(
    () =>
      calcularResumenCumplimientoBpm({
        config: configActual,
        temperaturas: temperaturasActuales,
        aceite: aceiteActual,
        checklists: checklistsActuales,
      }),
    [configActual, temperaturasActuales, aceiteActual, checklistsActuales]
  );

  const alertasBpmEnVivo = useMemo(
    () =>
      construirAlertasBpm({
        config: configActual,
        temperaturas: temperaturasActuales,
        aceite: aceiteActual,
        checklists: checklistsActuales,
      }),
    [configActual, temperaturasActuales, aceiteActual, checklistsActuales]
  );

  const temperaturasFiltradas = useMemo(
    () =>
      filtrarRegistrosBpm(
        temperaturasActuales,
        filtros,
        (r) =>
          `${r.equipoNombre} ${r.ubicacion || ''} ${r.responsableNombre} ${
            r.accionCorrectiva || ''
          } ${r.observaciones || ''}`,
        (r) => r.estadoConformidad !== 'conforme'
      ),
    [temperaturasActuales, filtros]
  );

  const aceiteFiltrado = useMemo(
    () =>
      filtrarRegistrosBpm(
        aceiteActual,
        filtros,
        (r) =>
          `${r.freidoraNombre} ${r.tipoEvento} ${r.responsableNombre} ${
            r.loteAceiteNuevo || ''
          } ${r.observaciones || ''}`,
        (r) => r.estadoAceite !== 'optimo'
      ),
    [aceiteActual, filtros]
  );

  const checklistsFiltrados = useMemo(
    () =>
      filtrarRegistrosBpm(
        checklistsActuales,
        filtros,
        (c) =>
          `${c.tipo} ${c.responsableNombre} ${c.observacionesGenerales || ''} ${c.items
            .map((i) => `${i.titulo} ${i.observacion || ''}`)
            .join(' ')}`,
        (c) => c.itemsNoConformes > 0 || c.estado === 'con_hallazgos'
      ),
    [checklistsActuales, filtros]
  );

  const registrarTemperatura = useCallback(
    async (input: RegistrarTemperaturaBpmInput) => {
      const res = await registrarTemperaturaBpm(tenantId, input);
      setError(null);
      return res;
    },
    [tenantId]
  );

  const resolverDesviacion = useCallback(
    async (
      registroId: string,
      input: { accionCorrectiva: string; resueltoPor: string; observaciones?: string }
    ) => {
      await resolverDesviacionTemperaturaBpm(tenantId, registroId, input);
      setError(null);
    },
    [tenantId]
  );

  const registrarAceite = useCallback(
    async (input: RegistrarAceiteBpmInput) => {
      const res = await registrarEventoAceiteBpm(tenantId, input);
      setError(null);
      return res;
    },
    [tenantId]
  );

  const guardarChecklist = useCallback(
    async (input: GuardarChecklistBpmInput) => {
      const res = await guardarChecklistTurnoBpm(tenantId, input);
      setError(null);
      return res;
    },
    [tenantId]
  );

  const guardarConfiguracion = useCallback(
    async (
      input: Partial<Omit<ConfiguracionBpm, 'negocioId'>> & { actualizadoPor?: string }
    ) => {
      await guardarConfiguracionBpm(tenantId, input);
      setError(null);
    },
    [tenantId]
  );

  const eliminarRegistro = useCallback(
    async (coleccion: ColeccionRegistroBpm, id: string) => {
      await eliminarRegistroBpm(tenantId, coleccion, id);
      setError(null);
    },
    [tenantId]
  );

  const exportarCarpetaCsv = useCallback(
    (nombreOverride?: string) => {
      descargarCsvCarpetaSanitariaBpm({
        nombreNegocio: nombreOverride || nombreNegocio || 'La Parada',
        temperaturas: temperaturasActuales,
        aceite: aceiteActual,
        checklists: checklistsActuales,
      });
    },
    [nombreNegocio, temperaturasActuales, aceiteActual, checklistsActuales]
  );

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
  }, []);

  return {
    config: configActual,
    temperaturas: temperaturasActuales,
    aceite: aceiteActual,
    checklists: checklistsActuales,
    temperaturasFiltradas,
    aceiteFiltrado,
    checklistsFiltrados,
    equiposEvaluadosHoy,
    freidorasEvaluadas,
    resumen,
    alertasBpmEnVivo,
    loading: stateIsCurrent ? loading : true,
    error: stateIsCurrent ? error : null,
    filtros,
    setFiltros,
    resetFiltros,
    registrarTemperatura,
    resolverDesviacion,
    registrarAceite,
    guardarChecklist,
    guardarConfiguracion,
    eliminarRegistro,
    exportarCarpetaCsv,
    refresh,
  };
}
