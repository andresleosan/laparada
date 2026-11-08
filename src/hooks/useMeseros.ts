import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type { Mesa } from '@/types/mesa';
import type { EmpleadoPersonal } from '@/types/personal';
import type { Venta } from '@/types';
import type {
  ConfiguracionMesero,
  LiquidacionMesero,
  CrearLiquidacionMeseroInput,
} from '@/types/mesero';
import { onMesasChange, reasignarMeseroMesa } from '@/services/mesasService';
import { onEmpleadosPersonalChange } from '@/services/personalService';
import {
  onConfiguracionesMeserosChange,
  onLiquidacionesMeserosChange,
  onVentasMeserosChange,
  guardarConfiguracionMesero,
  registrarLiquidacionMesero,
} from '@/services/meserosService';
import {
  calcularDesempenoMeseros,
  calcularResumenSalon,
  descargarCsvMeseros,
} from '@/utils/meserosUtils';

export type FiltroPeriodoMeseros = 'hoy' | 'semana' | 'mes' | 'todos';

export function useMeseros() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual?.id || '';
  const negocioSlug = negocioActual?.slug || 'la-parada';
  const negocioNombre = negocioActual?.nombre || 'La Parada';

  const [empleados, setEmpleados] = useState<EmpleadoPersonal[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionMesero[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionMesero[]>([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<FiltroPeriodoMeseros>('hoy');
  const [busqueda, setBusqueda] = useState('');

  // Suscripciones en tiempo real
  useEffect(() => {
    if (!negocioId) {
      setEmpleados([]);
      setMesas([]);
      setVentas([]);
      setConfiguraciones([]);
      setLiquidaciones([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    let unsubEmpleados: (() => void) | undefined;
    let unsubMesas: (() => void) | undefined;
    let unsubVentas: (() => void) | undefined;
    let unsubConfigs: (() => void) | undefined;
    let unsubLiquidaciones: (() => void) | undefined;

    try {
      unsubEmpleados = onEmpleadosPersonalChange(negocioId, (lista) => {
        setEmpleados(lista);
      });

      unsubMesas = onMesasChange(negocioId, (lista) => {
        setMesas(lista);
      });

      unsubVentas = onVentasMeserosChange(negocioId, 30, (lista) => {
        setVentas(lista);
        setCargando(false);
      });

      unsubConfigs = onConfiguracionesMeserosChange(negocioId, (lista) => {
        setConfiguraciones(lista);
      });

      unsubLiquidaciones = onLiquidacionesMeserosChange(negocioId, (lista) => {
        setLiquidaciones(lista);
      });
    } catch (err) {
      console.error('Error al conectar listeners de meseros:', err);
      setError(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
      setCargando(false);
    }

    return () => {
      unsubEmpleados?.();
      unsubMesas?.();
      unsubVentas?.();
      unsubConfigs?.();
      unsubLiquidaciones?.();
    };
  }, [negocioId]);

  // Filtrar solo colaboradores con rol mesero o activos
  const empleadosMeseros = useMemo(() => {
    return empleados.filter((e) => e.cargo === 'mesero' || e.activo);
  }, [empleados]);

  // Fechas según el período seleccionado
  const rangoFechas = useMemo(() => {
    const ahora = new Date();
    if (filtroPeriodo === 'hoy') {
      const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
      const fin = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);
      return { fechaInicio: inicio, fechaFin: fin, label: 'Hoy' };
    }
    if (filtroPeriodo === 'semana') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 7);
      inicio.setHours(0, 0, 0, 0);
      return { fechaInicio: inicio, fechaFin: ahora, label: 'Últimos 7 días' };
    }
    if (filtroPeriodo === 'mes') {
      const inicio = new Date();
      inicio.setDate(inicio.getDate() - 30);
      inicio.setHours(0, 0, 0, 0);
      return { fechaInicio: inicio, fechaFin: ahora, label: 'Últimos 30 días' };
    }
    return { fechaInicio: undefined, fechaFin: undefined, label: 'Histórico Total' };
  }, [filtroPeriodo]);

  // Cálculo de desempeño general
  const desempenos = useMemo(() => {
    return calcularDesempenoMeseros({
      ventas,
      mesasActivas: mesas,
      empleadosMeseros,
      configuraciones,
      fechaInicio: rangoFechas.fechaInicio,
      fechaFin: rangoFechas.fechaFin,
    });
  }, [ventas, mesas, empleadosMeseros, configuraciones, rangoFechas]);

  // Filtrado por buscador de texto
  const desempenosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return desempenos;
    const q = busqueda.trim().toLowerCase();
    return desempenos.filter((d) =>
      d.meseroNombre.toLowerCase().includes(q) ||
      (d.telefono && d.telefono.includes(q)) ||
      (d.documento && d.documento.includes(q)) ||
      d.mesasActivasNombres.some((m) => m.toLowerCase().includes(q))
    );
  }, [desempenos, busqueda]);

  // Resumen del salón
  const resumenSalon = useMemo(() => {
    return calcularResumenSalon(desempenos, mesas);
  }, [desempenos, mesas]);

  // Lista unificada de opciones de mesero para selectores y chips
  const meserosOpciones = useMemo(() => {
    const mapa = new Map<string, { id: string; nombre: string }>();

    for (const emp of empleadosMeseros) {
      mapa.set(emp.nombre.trim().toLowerCase(), { id: emp.id, nombre: emp.nombre.trim() });
    }
    for (const d of desempenos) {
      if (!mapa.has(d.meseroNombre.trim().toLowerCase())) {
        mapa.set(d.meseroNombre.trim().toLowerCase(), { id: d.meseroId, nombre: d.meseroNombre.trim() });
      }
    }

    return Array.from(mapa.values());
  }, [empleadosMeseros, desempenos]);

  // Acciones
  const guardarConfiguracion = useCallback(
    async (input: {
      id?: string;
      empleadoId: string;
      nombre: string;
      porcentajeComision: number;
      porcentajePropina: number;
      metaVentaTurno?: number;
      activo?: boolean;
    }) => {
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');
      return await guardarConfiguracionMesero(negocioId, input);
    },
    [negocioId]
  );

  const liquidarMesero = useCallback(
    async (input: CrearLiquidacionMeseroInput) => {
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');
      return await registrarLiquidacionMesero(negocioId, input);
    },
    [negocioId]
  );

  const reasignarMesa = useCallback(
    async (mesaId: string, mesero: { id?: string; nombre: string }) => {
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');
      return await reasignarMeseroMesa(negocioId, mesaId, mesero);
    },
    [negocioId]
  );

  const exportarCsv = useCallback(() => {
    descargarCsvMeseros(desempenosFiltrados, rangoFechas.label, negocioSlug);
  }, [desempenosFiltrados, rangoFechas.label, negocioSlug]);

  return {
    negocioId,
    negocioNombre,
    negocioSlug,
    cargando,
    error,
    mesas,
    empleados: empleadosMeseros,
    liquidaciones,
    desempenos: desempenosFiltrados,
    todosDesempenos: desempenos,
    resumenSalon,
    meserosOpciones,
    filtroPeriodo,
    setFiltroPeriodo,
    busqueda,
    setBusqueda,
    rangoFechas,
    guardarConfiguracion,
    liquidarMesero,
    reasignarMesa,
    exportarCsv,
  };
}
