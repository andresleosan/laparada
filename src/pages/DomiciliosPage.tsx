import { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle,
  Bike,
  CheckCircle,
  ChefHat,
  CircleDot,
  Clock,
  DollarSign,
  Download,
  Map as MapIcon,
  Package,
  Search,
  Send,
  Truck,
  X,
} from 'lucide-react';
import { useDomicilios } from '../hooks/useDomicilios';
import {
  AsignarRepartidorModal,
  ConfigurarZonasDomicilioModal,
  DomicilioCard,
} from '../components/domicilios';
import type { RepartidorSugerido } from '../components/domicilios/AsignarRepartidorModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { createToast } from '../components/ui/Toast';
import {
  asignarRepartidorDomicilio,
  despacharLoteDomicilios,
  guardarConfiguracionZonasDomicilio,
  onConfiguracionZonasDomicilioChange,
  onNuevoDomicilio,
} from '../services/domiciliosService';
import { onEmpleadosPersonalChange } from '../services/personalService';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ConfiguracionZonasDomicilio,
  Domicilio,
  EstadoDomicilio,
  OrigenVenta,
} from '../types';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularKpisDespachoDomicilios,
  descargarDomiciliosCsv,
  esPedidoDomicilioReal,
  filtrarDomiciliosDespacho,
  getConfiguracionZonasDefault,
} from '@/utils/despachoDomiciliosUtils';

const ESTADOS_DOMICILIO_VALIDOS: ReadonlyArray<EstadoDomicilio> = [
  'pendiente',
  'en_preparacion',
  'en_camino',
  'entregado',
];

function isEstadoDomicilio(valor: string): valor is EstadoDomicilio {
  return (ESTADOS_DOMICILIO_VALIDOS as readonly string[]).includes(valor);
}

function playNewOrderChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const notes = [880, 1174.66]; // A5 -> D6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.14;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });

    setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 600);
  } catch (err) {
    console.warn('No se pudo reproducir sonido de alerta:', err);
  }
}

export const DomiciliosPage: React.FC = () => {
  const { negocioActual, esSuperAdmin, usuarioNegocio } = useNegocio();
  const esAdmin = esSuperAdmin || usuarioNegocio?.rol === 'admin';
  const { activos, entregados, loading, error, updateEstado, marcarEntregado, refresh } =
    useDomicilios();

  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());

  // Filtros de despacho
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoDomicilio>('todos');
  const [filtroOrigen, setFiltroOrigen] = useState<'todos' | OrigenVenta>('todos');
  const [filtroRepartidor, setFiltroRepartidor] = useState('todos');

  // Selección para despacho en lote
  const [seleccionadosIds, setSeleccionadosIds] = useState<string[]>([]);

  // Repartidores & Modales
  const [repartidoresPersonal, setRepartidoresPersonal] = useState<RepartidorSugerido[]>([]);
  const [modalAsignarObjetivo, setModalAsignarObjetivo] = useState<Domicilio[]>([]);
  const [asignandoRepartidor, setAsignandoRepartidor] = useState(false);

  // Tarifario de zonas
  const [configZonas, setConfigZonas] = useState<ConfiguracionZonasDomicilio>(() =>
    getConfiguracionZonasDefault(negocioActual.id)
  );
  const [modalZonasOpen, setModalZonasOpen] = useState(false);

  const playedNotifications = useRef<Set<string>>(new Set());

  // Reloj cada 30s para refrescar el semáforo SLA en vivo
  useEffect(() => {
    const timer = setInterval(() => {
      setAhoraMs(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Limpiar selecciones cuando cambia de tenant o pestaña
  useEffect(() => {
    setSeleccionadosIds([]);
  }, [negocioActual.id, tab]);

  // Suscripción al tarifario de zonas del negocio
  useEffect(() => {
    setConfigZonas(getConfiguracionZonasDefault(negocioActual.id));
    const unsub = onConfiguracionZonasDomicilioChange(negocioActual.id, setConfigZonas);
    return () => unsub();
  }, [negocioActual.id]);

  // Suscripción a colaboradores con cargo domiciliario
  useEffect(() => {
    const unsub = onEmpleadosPersonalChange(negocioActual.id, (empleados) => {
      const activosDom = empleados
        .filter((emp) => emp.activo && emp.cargo === 'domiciliario')
        .map((emp) => ({
          id: emp.id,
          nombre: emp.nombre,
          telefono: emp.telefono,
        }));
      setRepartidoresPersonal(activosDom);
    });
    return () => unsub();
  }, [negocioActual.id]);

  // Listener para nuevos domicilios (alerta sonora)
  useEffect(() => {
    const unsubscribe = onNuevoDomicilio(negocioActual.id, (domicilio) => {
      if (!esPedidoDomicilioReal(domicilio)) return;
      if (!playedNotifications.current.has(domicilio.id)) {
        playedNotifications.current.add(domicilio.id);
        playNewOrderChime();
        createToast(
          `🔔 Nuevo Domicilio: ${domicilio.clienteNombre} - ${domicilio.barrio || domicilio.clienteTelefono}`,
          'success'
        );
      }
    });

    return () => unsubscribe();
  }, [negocioActual.id]);

  // Excluir comandas internas de salón
  const activosReales = useMemo(() => activos.filter(esPedidoDomicilioReal), [activos]);
  const entregadosReales = useMemo(() => entregados.filter(esPedidoDomicilioReal), [entregados]);

  const kpis = useMemo(
    () => calcularKpisDespachoDomicilios(activosReales, entregadosReales, ahoraMs),
    [activosReales, entregadosReales, ahoraMs]
  );

  const repartidoresSugeridos = useMemo(() => {
    const mapa = new Map<string, RepartidorSugerido>();
    for (const rep of repartidoresPersonal) {
      mapa.set(rep.nombre.trim().toLowerCase(), rep);
    }
    for (const dom of [...activosReales, ...entregadosReales]) {
      if (dom.domiciliarioNombre) {
        const key = dom.domiciliarioNombre.trim().toLowerCase();
        if (!mapa.has(key)) {
          mapa.set(key, {
            id: dom.domiciliarioId || `rep-${key.replace(/\s+/g, '-')}`,
            nombre: dom.domiciliarioNombre.trim(),
          });
        }
      }
    }
    return Array.from(mapa.values());
  }, [repartidoresPersonal, activosReales, entregadosReales]);

  const baseList = tab === 'activos' ? activosReales : entregadosReales;

  const displayItems = useMemo(
    () =>
      filtrarDomiciliosDespacho(baseList, {
        busqueda,
        estado: tab === 'activos' ? filtroEstado : 'todos',
        origen: filtroOrigen,
        repartidor: filtroRepartidor,
      }),
    [baseList, busqueda, tab, filtroEstado, filtroOrigen, filtroRepartidor]
  );

  const handleEstadoChange = async (domicilioId: string, nuevoEstado: string) => {
    if (!isEstadoDomicilio(nuevoEstado)) {
      createToast(`Estado no válido: ${nuevoEstado}`, 'error');
      return;
    }
    setUpdatingId(domicilioId);
    try {
      if (nuevoEstado === 'entregado') {
        await marcarEntregado(domicilioId);
        createToast('Domicilio entregado; venta registrada automáticamente', 'success');
      } else {
        await updateEstado(domicilioId, nuevoEstado);
        createToast(`Estado actualizado: ${nuevoEstado}`, 'success');
      }
      setTimeout(() => refresh(), 500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      createToast(`Error: ${errMsg}`, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleSeleccion = (id: string) => {
    setSeleccionadosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmarAsignacion = async (datos: {
    domiciliarioId: string;
    domiciliarioNombre: string;
    despacharEnCamino: boolean;
  }) => {
    if (modalAsignarObjetivo.length === 0) return;
    setAsignandoRepartidor(true);
    try {
      if (modalAsignarObjetivo.length === 1 && !datos.despacharEnCamino) {
        await asignarRepartidorDomicilio(
          modalAsignarObjetivo[0].id,
          negocioActual.id,
          datos.domiciliarioId,
          datos.domiciliarioNombre,
          false
        );
        createToast(`Repartidor ${datos.domiciliarioNombre} asignado al pedido`, 'success');
      } else {
        const count = await despacharLoteDomicilios(
          modalAsignarObjetivo.map((d) => d.id),
          negocioActual.id,
          datos.domiciliarioId,
          datos.domiciliarioNombre
        );
        createToast(
          `🛵 ${count} pedido${count !== 1 ? 's' : ''} despachado${count !== 1 ? 's' : ''} con ${datos.domiciliarioNombre}`,
          'success'
        );
      }
      setSeleccionadosIds([]);
      setModalAsignarObjetivo([]);
      setTimeout(() => refresh(), 400);
    } finally {
      setAsignandoRepartidor(false);
    }
  };

  const handleGuardarZonas = async (
    input: Omit<ConfiguracionZonasDomicilio, 'id' | 'negocioId' | 'actualizadoEn'>
  ) => {
    const guardada = await guardarConfiguracionZonasDomicilio(negocioActual.id, input);
    setConfigZonas(guardada);
    createToast('Tarifario de zonas y barrios actualizado', 'success');
  };

  const handleExportarCsv = () => {
    const todos = [...activosReales, ...entregadosReales];
    if (todos.length === 0) {
      createToast('No hay domicilios para exportar en la jornada actual', 'info');
      return;
    }
    descargarDomiciliosCsv(todos);
    createToast('Reporte CSV de domicilios descargado', 'success');
  };

  const seleccionadosActivos = useMemo(
    () => activosReales.filter((d) => seleccionadosIds.includes(d.id)),
    [activosReales, seleccionadosIds]
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-4">
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Centro de Despacho de Domicilios
          </h1>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            icon={AlertCircle}
            title="Error cargando domicilios"
            description={error}
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Centro de Despacho de Domicilios
            </h1>
            <p className="mt-1 text-xs text-neutral-400 sm:text-sm">
              {tab === 'activos'
                ? `${activosReales.length} pedido${activosReales.length !== 1 ? 's' : ''} en cocina o ruta`
                : entregadosReales.length === 1
                  ? '1 pedido creado hoy, ya entregado'
                  : `${entregadosReales.length} pedidos creados hoy, ya entregados`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {esAdmin && (
              <button
                type="button"
                onClick={() => setModalZonasOpen(true)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-950/50"
              >
                <MapIcon className="h-4 w-4" aria-hidden="true" />
                <span>Zonas y Tarifas</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportarCsv}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-semibold text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
            >
              <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>

            <div className="flex gap-2" role="group" aria-label="Filtrar domicilios">
              <button
                type="button"
                onClick={() => setTab('activos')}
                aria-pressed={tab === 'activos'}
                className={`min-h-[44px] rounded-xl px-4 text-xs font-semibold transition-all ${
                  tab === 'activos'
                    ? 'border border-gold-400/40 bg-gold-400/20 text-gold-400 shadow-sm'
                    : 'border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <CircleDot className="h-3.5 w-3.5" aria-hidden="true" />
                  En progreso ({activosReales.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('historial')}
                aria-pressed={tab === 'historial'}
                className={`min-h-[44px] rounded-xl px-4 text-xs font-semibold transition-all ${
                  tab === 'historial'
                    ? 'border border-gold-400/40 bg-gold-400/20 text-gold-400 shadow-sm'
                    : 'border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Entregados hoy ({entregadosReales.length})
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 KPIs Ejecutivos */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-400">
              <span>En Cocina / Cola</span>
              <ChefHat className="h-4 w-4 text-amber-400" aria-hidden="true" />
            </div>
            <p className="font-display text-2xl font-black text-white">{kpis.pendientesCocina}</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">Por despachar a ruta</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-400">
              <span>En Ruta & SLA</span>
              <Truck className="h-4 w-4 text-sky-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2">
              <p className="font-display text-2xl font-black text-sky-400">{kpis.enRuta}</p>
              {kpis.demoradosCriticos > 0 && (
                <span className="rounded-full border border-red-500/40 bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-300">
                  {kpis.demoradosCriticos} demorado{kpis.demoradosCriticos > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {kpis.demoradosCriticos === 0
                ? 'Todos dentro de SLA (≤35 min)'
                : 'Superaron 35 min de espera'}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-400">
              <span>Efectivo en Calle</span>
              <DollarSign className="h-4 w-4 text-gold-400" aria-hidden="true" />
            </div>
            <p className="font-display text-2xl font-black text-gold-400">
              {formatCOP(kpis.efectivoEnCalle)}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-500">Por rendir de pedidos en ruta</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-400">
              <span>Entregados Hoy</span>
              <Clock className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="font-display text-2xl font-black text-emerald-400">
              {kpis.entregadosHoy}
            </p>
            <p className="mt-0.5 text-[11px] text-neutral-400">
              {formatCOP(kpis.facturacionEntregadosHoy)} · Prom. {kpis.tiempoPromedioMinutos} min
            </p>
          </div>
        </div>

        {/* Barra de Filtros Operativos */}
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3 md:flex-row md:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar domicilio</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
              aria-hidden="true"
            />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, barrio, dirección, teléfono o repartidor..."
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {tab === 'activos' && (
              <select
                aria-label="Filtrar por estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | EstadoDomicilio)}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 focus:border-gold-400 focus:outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_preparacion">En preparación</option>
                <option value="en_camino">En camino</option>
              </select>
            )}

            <select
              aria-label="Filtrar por canal de origen"
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value as 'todos' | OrigenVenta)}
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los canales</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="web">Tienda Web</option>
              <option value="pos">Mostrador POS</option>
              <option value="kiosco">Kiosco</option>
            </select>

            <select
              aria-label="Filtrar por repartidor"
              value={filtroRepartidor}
              onChange={(e) => setFiltroRepartidor(e.target.value)}
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los repartidores</option>
              <option value="sin_asignar">Sin repartidor asignado</option>
              {repartidoresSugeridos.map((rep) => (
                <option key={rep.id} value={rep.nombre}>
                  {rep.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra de Despacho en Lote */}
        {tab === 'activos' && seleccionadosActivos.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-400/50 bg-gold-400/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-gold-300">
              <Bike className="h-5 w-5" aria-hidden="true" />
              <span>
                {seleccionadosActivos.length} domicilio
                {seleccionadosActivos.length !== 1 ? 's' : ''} seleccionado
                {seleccionadosActivos.length !== 1 ? 's' : ''} para salida en ruta
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSeleccionadosIds([])}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-semibold text-neutral-300 hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                <span>Limpiar</span>
              </button>
              <button
                type="button"
                onClick={() => setModalAsignarObjetivo(seleccionadosActivos)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-neutral-950 shadow-lg hover:bg-gold-500"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span>Despachar seleccionados ({seleccionadosActivos.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Content en Grid Responsive */}
        {displayItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title={
              tab === 'activos'
                ? 'Sin pedidos activos con estos filtros'
                : 'Sin pedidos creados hoy ya entregados'
            }
            description={
              tab === 'activos'
                ? 'Todos los pedidos a domicilio han sido despachados o no coinciden con la búsqueda.'
                : 'No hay pedidos creados hoy que ya estén entregados.'
            }
            action={{
              label: busqueda || filtroEstado !== 'todos' || filtroOrigen !== 'todos' || filtroRepartidor !== 'todos'
                ? 'Limpiar filtros'
                : 'Refrescar',
              onClick: () => {
                if (
                  busqueda ||
                  filtroEstado !== 'todos' ||
                  filtroOrigen !== 'todos' ||
                  filtroRepartidor !== 'todos'
                ) {
                  setBusqueda('');
                  setFiltroEstado('todos');
                  setFiltroOrigen('todos');
                  setFiltroRepartidor('todos');
                } else {
                  void refresh();
                }
              },
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayItems.map((domicilio) => (
              <DomicilioCard
                key={domicilio.id}
                domicilio={domicilio}
                negocioNombre={negocioActual.nombre || 'La Parada'}
                onEstadoChange={(nuevoEstado) =>
                  handleEstadoChange(domicilio.id, nuevoEstado)
                }
                isUpdating={updatingId === domicilio.id}
                seleccionado={seleccionadosIds.includes(domicilio.id)}
                onToggleSeleccion={tab === 'activos' ? handleToggleSeleccion : undefined}
                onAbrirAsignarRepartidor={
                  tab === 'activos' ? (dom) => setModalAsignarObjetivo([dom]) : undefined
                }
                ahoraMs={ahoraMs}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de asignación / despacho en lote */}
      <AsignarRepartidorModal
        isOpen={modalAsignarObjetivo.length > 0}
        domiciliosObjetivo={modalAsignarObjetivo}
        repartidoresSugeridos={repartidoresSugeridos}
        negocioNombre={negocioActual.nombre || 'La Parada'}
        guardando={asignandoRepartidor}
        onConfirmar={handleConfirmarAsignacion}
        onClose={() => setModalAsignarObjetivo([])}
      />

      {/* Modal de configuración de zonas y barrios */}
      <ConfigurarZonasDomicilioModal
        isOpen={modalZonasOpen}
        configuracion={configZonas}
        onGuardar={handleGuardarZonas}
        onClose={() => setModalZonasOpen(false)}
      />
    </div>
  );
};
