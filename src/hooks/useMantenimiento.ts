import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ActualizarEquipoMantenimientoInput,
  CrearEquipoMantenimientoInput,
  EquipoActivoMantenimiento,
  EquipoMantenimientoEvaluado,
  FiltrosMantenimiento,
  OrdenMantenimiento,
  RegistrarOrdenMantenimientoInput,
  ReporteFallaEquipo,
  ReportarFallaEquipoInput,
  ResolverFallaEquipoInput,
  ResumenMantenimiento,
} from '@/types/mantenimiento';
import {
  actualizarEquipoMantenimiento,
  actualizarEstadoFallaEquipo,
  crearEquipoMantenimiento,
  eliminarEquipoMantenimiento,
  eliminarOrdenMantenimiento,
  eliminarReporteFalla,
  getEquiposMantenimiento,
  getOrdenesMantenimiento,
  getReportesFallaEquipos,
  inicializarPlantillaEquiposMantenimiento,
  onEquiposMantenimientoChange,
  onOrdenesMantenimientoChange,
  onReportesFallaEquiposChange,
  registrarOrdenMantenimiento,
  reportarFallaEquipo,
} from '@/services/mantenimientoService';
import {
  calcularResumenMantenimiento,
  descargarCsvMantenimiento,
  evaluarEquiposMantenimiento,
  filtrarEquiposMantenimiento,
} from '@/utils/mantenimientoUtils';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

export interface UseMantenimientoOptions {
  initialFiltros?: Partial<FiltrosMantenimiento>;
}

export interface UseMantenimientoResult {
  equipos: EquipoActivoMantenimiento[];
  ordenes: OrdenMantenimiento[];
  fallas: ReporteFallaEquipo[];
  equiposEvaluados: EquipoMantenimientoEvaluado[];
  equiposFiltrados: EquipoMantenimientoEvaluado[];
  equiposSeguridad: EquipoMantenimientoEvaluado[];
  fallasAbiertas: ReporteFallaEquipo[];
  resumen: ResumenMantenimiento;
  loading: boolean;
  error: string | null;
  filtros: FiltrosMantenimiento;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosMantenimiento>>;
  resetFiltros: () => void;
  crearEquipo: (
    input: Omit<CrearEquipoMantenimientoInput, 'negocioId'>
  ) => Promise<EquipoActivoMantenimiento>;
  actualizarEquipo: (
    equipoId: string,
    updates: ActualizarEquipoMantenimientoInput
  ) => Promise<void>;
  eliminarEquipo: (equipoId: string) => Promise<void>;
  inicializarPlantilla: (
    creadoPor?: string
  ) => Promise<{ creadosCount: number; totalExistentes: number }>;
  registrarOrden: (
    input: Omit<RegistrarOrdenMantenimientoInput, 'negocioId'>
  ) => Promise<OrdenMantenimiento>;
  eliminarOrden: (ordenId: string) => Promise<void>;
  reportarFalla: (
    input: Omit<ReportarFallaEquipoInput, 'negocioId'>
  ) => Promise<ReporteFallaEquipo>;
  resolverFalla: (fallaId: string, input: ResolverFallaEquipoInput) => Promise<void>;
  eliminarFalla: (fallaId: string) => Promise<void>;
  exportarCsv: (nombreOverride?: string) => void;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTROS: FiltrosMantenimiento = {
  busqueda: '',
  categoria: 'todas',
  semaforo: 'todos',
  estadoOperativo: 'todos',
  soloSeguridad: false,
};

export function useMantenimiento(
  options: UseMantenimientoOptions = {}
): UseMantenimientoResult {
  let tenantId = 'laparada';
  let nombreNegocio = 'La Parada';
  try {
    const negocioCtx = useNegocio();
    tenantId = negocioCtx.negocioActual.id;
    nombreNegocio = negocioCtx.negocioActual.nombre;
  } catch {
    // Fallback seguro para renderizado aislado en pruebas unitarias
  }

  const [equipos, setEquipos] = useState<EquipoActivoMantenimiento[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenMantenimiento[]>([]);
  const [fallas, setFallas] = useState<ReporteFallaEquipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateScope, setStateScope] = useState(tenantId);
  const [filtros, setFiltros] = useState<FiltrosMantenimiento>({
    ...DEFAULT_FILTROS,
    ...(options.initialFiltros || {}),
  });

  const activeScopeRef = useRef(tenantId);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = tenantId;

  useEffect(() => {
    setStateScope(tenantId);
    setEquipos([]);
    setOrdenes([]);
    setFallas([]);
    setLoading(true);
    setError(null);

    let cancelled = false;
    let eqListo = false;
    let ordListo = false;
    let fallasListo = false;
    const isActiveScope = () => !cancelled && activeScopeRef.current === tenantId;

    const marcarCargaSiCompleta = () => {
      if (eqListo && ordListo && fallasListo) {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    const timeoutId = setTimeout(() => {
      if (isActiveScope()) {
        setLoading(false);
      }
    }, 3000);

    const handleErr = (err: Error) => {
      if (!isActiveScope()) return;
      setError(err.message || 'Error cargando módulo de mantenimiento preventivo');
      setLoading(false);
      clearTimeout(timeoutId);
    };

    const unsubEq = onEquiposMantenimientoChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        setEquipos(lista);
        setError(null);
        eqListo = true;
        marcarCargaSiCompleta();
      },
      handleErr
    );

    const unsubOrd = onOrdenesMantenimientoChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        setOrdenes(lista);
        setError(null);
        ordListo = true;
        marcarCargaSiCompleta();
      },
      handleErr
    );

    const unsubFallas = onReportesFallaEquiposChange(
      tenantId,
      (lista) => {
        if (!isActiveScope()) return;
        setFallas(lista);
        setError(null);
        fallasListo = true;
        marcarCargaSiCompleta();
      },
      handleErr
    );

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      unsubEq();
      unsubOrd();
      unsubFallas();
    };
  }, [tenantId]);

  const refresh = useCallback(async () => {
    const scope = tenantId;
    const ticket = refreshGuardRef.current.begin(scope);
    try {
      setLoading(true);
      setError(null);
      const [eqList, ordList, fallasList] = await Promise.all([
        getEquiposMantenimiento(scope),
        getOrdenesMantenimiento(scope),
        getReportesFallaEquipos(scope),
      ]);
      if (!refreshGuardRef.current.isCurrent(ticket, scope) || activeScopeRef.current !== scope) {
        return;
      }
      setEquipos(eqList);
      setOrdenes(ordList);
      setFallas(fallasList);
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(ticket, scope) || activeScopeRef.current !== scope) {
        return;
      }
      setError(
        err instanceof Error ? err.message : 'Error consultando mantenimiento preventivo'
      );
    } finally {
      if (refreshGuardRef.current.isCurrent(ticket, scope) && activeScopeRef.current === scope) {
        setLoading(false);
      }
    }
  }, [tenantId]);

  const equiposScoped = stateScope === tenantId ? equipos : [];
  const ordenesScoped = stateScope === tenantId ? ordenes : [];
  const fallasScoped = stateScope === tenantId ? fallas : [];

  const equiposEvaluados = useMemo(
    () => evaluarEquiposMantenimiento(equiposScoped, fallasScoped),
    [equiposScoped, fallasScoped]
  );

  const equiposFiltrados = useMemo(
    () => filtrarEquiposMantenimiento(equiposEvaluados, filtros),
    [equiposEvaluados, filtros]
  );

  const equiposSeguridad = useMemo(
    () => equiposEvaluados.filter((item) => item.esEquipoSeguridad),
    [equiposEvaluados]
  );

  const fallasAbiertas = useMemo(
    () =>
      fallasScoped.filter(
        (f) => f.estado === 'abierta' || f.estado === 'en_atencion'
      ),
    [fallasScoped]
  );

  const resumen = useMemo(
    () => calcularResumenMantenimiento(equiposEvaluados, ordenesScoped, fallasScoped),
    [equiposEvaluados, ordenesScoped, fallasScoped]
  );

  const resetFiltros = useCallback(() => {
    setFiltros(DEFAULT_FILTROS);
  }, []);

  const crearEquipo = useCallback(
    (input: Omit<CrearEquipoMantenimientoInput, 'negocioId'>) =>
      crearEquipoMantenimiento({ ...input, negocioId: tenantId }, equiposScoped.length),
    [tenantId, equiposScoped.length]
  );

  const actualizarEquipo = useCallback(
    (equipoId: string, updates: ActualizarEquipoMantenimientoInput) =>
      actualizarEquipoMantenimiento(tenantId, equipoId, updates),
    [tenantId]
  );

  const eliminarEquipo = useCallback(
    (equipoId: string) => eliminarEquipoMantenimiento(tenantId, equipoId),
    [tenantId]
  );

  const inicializarPlantilla = useCallback(
    (creadoPor?: string) =>
      inicializarPlantillaEquiposMantenimiento(tenantId, creadoPor),
    [tenantId]
  );

  const registrarOrden = useCallback(
    (input: Omit<RegistrarOrdenMantenimientoInput, 'negocioId'>) =>
      registrarOrdenMantenimiento({ ...input, negocioId: tenantId }),
    [tenantId]
  );

  const eliminarOrden = useCallback(
    (ordenId: string) => eliminarOrdenMantenimiento(tenantId, ordenId),
    [tenantId]
  );

  const reportarFalla = useCallback(
    (input: Omit<ReportarFallaEquipoInput, 'negocioId'>) =>
      reportarFallaEquipo({ ...input, negocioId: tenantId }),
    [tenantId]
  );

  const resolverFalla = useCallback(
    (fallaId: string, input: ResolverFallaEquipoInput) =>
      actualizarEstadoFallaEquipo(tenantId, fallaId, input),
    [tenantId]
  );

  const eliminarFalla = useCallback(
    (fallaId: string) => eliminarReporteFalla(tenantId, fallaId),
    [tenantId]
  );

  const exportarCsv = useCallback(
    (nombreOverride?: string) => {
      descargarCsvMantenimiento({
        equiposEvaluados,
        ordenes: ordenesScoped,
        fallas: fallasScoped,
        nombreNegocio: nombreOverride || nombreNegocio,
      });
    },
    [equiposEvaluados, ordenesScoped, fallasScoped, nombreNegocio]
  );

  return {
    equipos: equiposScoped,
    ordenes: ordenesScoped,
    fallas: fallasScoped,
    equiposEvaluados,
    equiposFiltrados,
    equiposSeguridad,
    fallasAbiertas,
    resumen,
    loading,
    error,
    filtros,
    setFiltros,
    resetFiltros,
    crearEquipo,
    actualizarEquipo,
    eliminarEquipo,
    inicializarPlantilla,
    registrarOrden,
    eliminarOrden,
    reportarFalla,
    resolverFalla,
    eliminarFalla,
    exportarCsv,
    refresh,
  };
}
