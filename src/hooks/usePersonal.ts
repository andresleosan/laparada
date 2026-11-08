import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  EmpleadoPersonal,
  TurnoPersonal,
  ValePersonal,
  LiquidacionNomina,
  CargoPersonal,
  EstadoTurnoPersonal,
  EstadoValePersonal,
  ModoDistribucionPropinas,
  CrearTurnoInput,
  CrearValeInput,
  CrearLiquidacionInput,
  ResumenPreLiquidacionEmpleado,
} from '@/types/personal';
import type { Venta } from '@/types';
import {
  onEmpleadosPersonalChange,
  onTurnosPersonalChange,
  onValesPersonalChange,
  onLiquidacionesNominaChange,
  crearEmpleadoPersonal,
  actualizarEmpleadoPersonal,
  eliminarEmpleadoPersonal,
  registrarTurnoPersonal,
  cerrarTurnoPersonal,
  anularTurnoPersonal,
  registrarValePersonal,
  anularValePersonal,
  registrarLiquidacionNomina,
  getVentasRecientesParaPropinas,
} from '@/services/personalService';
import {
  calcularPreLiquidacionEmpleado,
  distribuirPropinasEquipo,
  calcularPropinasRecaudadasVentas,
  calcularMetricasPersonal,
  exportarPersonalNominaCsv,
} from '@/utils/personalUtils';

export function usePersonal() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual?.id || '';
  const nombreNegocio = negocioActual?.nombre || 'La Parada';

  const [empleados, setEmpleados] = useState<EmpleadoPersonal[]>([]);
  const [turnos, setTurnos] = useState<TurnoPersonal[]>([]);
  const [vales, setVales] = useState<ValePersonal[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionNomina[]>([]);
  const [ventasRecientes, setVentasRecientes] = useState<Venta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros reactivos
  const [busqueda, setBusqueda] = useState('');
  const [filtroCargo, setFiltroCargo] = useState<CargoPersonal | 'todos'>('todos');
  const [filtroEstadoTurno, setFiltroEstadoTurno] = useState<EstadoTurnoPersonal | 'todos'>('todos');
  const [filtroEstadoVale, setFiltroEstadoVale] = useState<EstadoValePersonal | 'todos'>('todos');

  // Configuración de distribución de propinas
  const [modoPropinas, setModoPropinas] = useState<ModoDistribucionPropinas>('partes_iguales');
  const [fondoPropinasPersonalizado, setFondoPropinasPersonalizado] = useState<number | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setEmpleados([]);
      setTurnos([]);
      setVales([]);
      setLiquidaciones([]);
      setVentasRecientes([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    let unsubEmpleados: (() => void) | undefined;
    let unsubTurnos: (() => void) | undefined;
    let unsubVales: (() => void) | undefined;
    let unsubLiquidaciones: (() => void) | undefined;

    try {
      unsubEmpleados = onEmpleadosPersonalChange(negocioId, (lista) => {
        setEmpleados(lista);
        setCargando(false);
      });

      unsubTurnos = onTurnosPersonalChange(negocioId, (lista) => {
        setTurnos(lista);
        setCargando(false);
      });

      unsubVales = onValesPersonalChange(negocioId, (lista) => {
        setVales(lista);
        setCargando(false);
      });

      unsubLiquidaciones = onLiquidacionesNominaChange(negocioId, (lista) => {
        setLiquidaciones(lista);
        setCargando(false);
      });

      getVentasRecientesParaPropinas(negocioId, 7)
        .then((listaVentas) => setVentasRecientes(listaVentas))
        .catch((err) => console.warn('No se pudieron cargar ventas para propinas:', err));
    } catch (err) {
      console.error('Error suscribiendo a personal:', err);
      setError(err instanceof Error ? err.message : 'Error al conectar con el módulo de personal.');
      setCargando(false);
    }

    return () => {
      unsubEmpleados?.();
      unsubTurnos?.();
      unsubVales?.();
      unsubLiquidaciones?.();
    };
  }, [negocioId]);

  const propinasRecaudadas7Dias = useMemo(() => {
    return calcularPropinasRecaudadasVentas(ventasRecientes);
  }, [ventasRecientes]);

  const fondoPropinasActivo = useMemo(() => {
    return fondoPropinasPersonalizado !== null
      ? Math.max(0, fondoPropinasPersonalizado)
      : propinasRecaudadas7Dias;
  }, [fondoPropinasPersonalizado, propinasRecaudadas7Dias]);

  const distribucionPropinas = useMemo(() => {
    return distribuirPropinasEquipo(fondoPropinasActivo, empleados, turnos, modoPropinas);
  }, [fondoPropinasActivo, empleados, turnos, modoPropinas]);

  const propinasPorEmpleadoMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of distribucionPropinas) {
      map[item.empleadoId] = item.montoPropina;
    }
    return map;
  }, [distribucionPropinas]);

  const preLiquidacionesPorEmpleado = useMemo(() => {
    const map: Record<string, ResumenPreLiquidacionEmpleado> = {};
    for (const emp of empleados) {
      const propinaSug = propinasPorEmpleadoMap[emp.id] || 0;
      map[emp.id] = calcularPreLiquidacionEmpleado(emp, turnos, vales, propinaSug);
    }
    return map;
  }, [empleados, turnos, vales, propinasPorEmpleadoMap]);

  const metricas = useMemo(() => {
    return calcularMetricasPersonal(
      empleados,
      turnos,
      vales,
      liquidaciones,
      propinasRecaudadas7Dias
    );
  }, [empleados, turnos, vales, liquidaciones, propinasRecaudadas7Dias]);

  const empleadosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return empleados.filter((emp) => {
      if (filtroCargo !== 'todos' && emp.cargo !== filtroCargo) return false;
      if (q) {
        const matchNombre = emp.nombre.toLowerCase().includes(q);
        const matchTel = emp.telefono.includes(q);
        const matchDoc = emp.documento?.toLowerCase().includes(q) || false;
        if (!matchNombre && !matchTel && !matchDoc) return false;
      }
      return true;
    });
  }, [empleados, filtroCargo, busqueda]);

  const turnosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return turnos.filter((t) => {
      if (filtroCargo !== 'todos' && t.cargo !== filtroCargo) return false;
      if (filtroEstadoTurno !== 'todos' && t.estado !== filtroEstadoTurno) return false;
      if (q) {
        const matchNombre = t.empleadoNombre.toLowerCase().includes(q);
        const matchNotas = t.notas?.toLowerCase().includes(q) || false;
        if (!matchNombre && !matchNotas) return false;
      }
      return true;
    });
  }, [turnos, filtroCargo, filtroEstadoTurno, busqueda]);

  const valesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return vales.filter((v) => {
      if (filtroEstadoVale !== 'todos' && v.estado !== filtroEstadoVale) return false;
      if (q) {
        const matchNombre = v.empleadoNombre.toLowerCase().includes(q);
        const matchNotas = v.notas?.toLowerCase().includes(q) || false;
        if (!matchNombre && !matchNotas) return false;
      }
      return true;
    });
  }, [vales, filtroEstadoVale, busqueda]);

  // Acciones
  const crearEmpleadoAction = useCallback(
    async (data: Omit<EmpleadoPersonal, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return crearEmpleadoPersonal({ ...data, negocioId });
    },
    [negocioId]
  );

  const actualizarEmpleadoAction = useCallback(
    async (id: string, updates: Partial<Omit<EmpleadoPersonal, 'id' | 'negocioId' | 'creadoEn'>>) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return actualizarEmpleadoPersonal(id, updates, negocioId);
    },
    [negocioId]
  );

  const eliminarEmpleadoAction = useCallback(
    async (id: string) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return eliminarEmpleadoPersonal(id, negocioId);
    },
    [negocioId]
  );

  const registrarTurnoAction = useCallback(
    async (input: CrearTurnoInput) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return registrarTurnoPersonal(negocioId, input);
    },
    [negocioId]
  );

  const cerrarTurnoAction = useCallback(
    async (turnoId: string, horaSalida: string, bonoAdicional?: number) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return cerrarTurnoPersonal(negocioId, turnoId, horaSalida, bonoAdicional);
    },
    [negocioId]
  );

  const anularTurnoAction = useCallback(
    async (turnoId: string, motivo: string) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return anularTurnoPersonal(negocioId, turnoId, motivo);
    },
    [negocioId]
  );

  const registrarValeAction = useCallback(
    async (input: CrearValeInput) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return registrarValePersonal(negocioId, input);
    },
    [negocioId]
  );

  const anularValeAction = useCallback(
    async (valeId: string, motivo: string) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return anularValePersonal(negocioId, valeId, motivo);
    },
    [negocioId]
  );

  const liquidarNominaAction = useCallback(
    async (input: CrearLiquidacionInput) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return registrarLiquidacionNomina(negocioId, input);
    },
    [negocioId]
  );

  const exportarCsvAction = useCallback(() => {
    exportarPersonalNominaCsv(empleados, turnos, vales, liquidaciones, nombreNegocio);
  }, [empleados, turnos, vales, liquidaciones, nombreNegocio]);

  return {
    empleados,
    turnos,
    vales,
    liquidaciones,
    cargando,
    error,
    busqueda,
    setBusqueda,
    filtroCargo,
    setFiltroCargo,
    filtroEstadoTurno,
    setFiltroEstadoTurno,
    filtroEstadoVale,
    setFiltroEstadoVale,
    modoPropinas,
    setModoPropinas,
    fondoPropinasActivo,
    propinasRecaudadas7Dias,
    setFondoPropinasPersonalizado,
    distribucionPropinas,
    preLiquidacionesPorEmpleado,
    metricas,
    empleadosFiltrados,
    turnosFiltrados,
    valesFiltrados,
    crearEmpleadoAction,
    actualizarEmpleadoAction,
    eliminarEmpleadoAction,
    registrarTurnoAction,
    cerrarTurnoAction,
    anularTurnoAction,
    registrarValeAction,
    anularValeAction,
    liquidarNominaAction,
    exportarCsvAction,
  };
}
