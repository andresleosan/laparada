import { useState, useMemo, type FC } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  Download,
  Map as MapIcon,
  ListChecks,
  ShieldCheck,
  Utensils,
} from 'lucide-react';
import { useReservas } from '@/hooks/useReservas';
import { ReservaCard } from '@/components/reservas/ReservaCard';
import { NuevaReservaModal } from '@/components/reservas/NuevaReservaModal';
import { MapaMesasReservasView } from '@/components/reservas/MapaMesasReservasView';
import { CheckInReservaMesaModal } from '@/components/reservas/CheckInReservaMesaModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import type { Mesa } from '@/types/mesa';
import type {
  EstadoReserva,
  NuevaReservaInput,
  ReservaNegocio,
} from '@/types/reserva';
import { formatCOP } from '@/utils/formatCOP';
import {
  descargarReservasCsv,
  parsearFechaHoraReservaMs,
} from '@/utils/reservasUtils';

function getLocalTodayYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getReservaFechaCorta(fechaHoraStr?: string): string {
  const ms = parsearFechaHoraReservaMs(fechaHoraStr);
  if (ms !== null) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return (fechaHoraStr || '').slice(0, 10);
}

export const ReservasPage: FC = () => {
  const {
    reservas,
    mesas = [],
    negocioNombre = 'La Parada',
    loading,
    error,
    metricas,
    crear,
    cambiarEstado,
    actualizarAnticipo,
    registrarRecordatorio,
    hacerCheckInEnMesa,
    eliminar,
    recargar,
  } = useReservas();

  const [vistaActiva, setVistaActiva] = useState<'libro' | 'mapa'>('libro');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoReserva>('todos');
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'proximos' | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mesaPreseleccionada, setMesaPreseleccionada] = useState<Mesa | null>(null);
  const [fechaHoraInicial, setFechaHoraInicial] = useState<string | undefined>(undefined);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const [checkInModalState, setCheckInModalState] = useState<{
    reserva: ReservaNegocio;
    mesa?: Mesa | null;
  } | null>(null);

  const reservasFiltradas = useMemo(() => {
    const hoyStr = getLocalTodayYYYYMMDD();
    const termino = busqueda.trim().toLowerCase();

    return reservas.filter((res) => {
      if (filtroEstado !== 'todos' && res.estado !== filtroEstado) {
        return false;
      }

      const fechaCorta = getReservaFechaCorta(res.fechaHoraReserva);
      if (filtroFecha === 'hoy' && fechaCorta !== hoyStr) {
        return false;
      }
      if (filtroFecha === 'proximos' && fechaCorta < hoyStr) {
        return false;
      }

      if (termino) {
        const mesaStr = res.mesaNombre || (res.mesaNumero ? `mesa ${res.mesaNumero}` : '');
        const objetivo = [
          res.clienteNombre,
          res.clienteTelefono,
          mesaStr,
          res.zonaPreferida || '',
          res.anticipoReferencia || '',
          res.notas || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!objetivo.includes(termino)) {
          return false;
        }
      }

      return true;
    });
  }, [reservas, filtroEstado, filtroFecha, busqueda]);

  const abrirModalNuevaReserva = (mesa: Mesa | null = null, fechaHora?: string) => {
    setMesaPreseleccionada(mesa);
    setFechaHoraInicial(fechaHora);
    setIsModalOpen(true);
  };

  const handleCrearReserva = async (input: NuevaReservaInput) => {
    setGuardando(true);
    try {
      await crear(input);
      createToast(
        `✅ Reserva para ${input.clienteNombre} (${input.personas} pers.) agendada exitosamente.`,
        'success'
      );
      setIsModalOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al agendar reserva';
      createToast(msg, 'error');
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarEstado = async (id: string, nuevoEstado: EstadoReserva) => {
    setProcesandoId(id);
    try {
      await cambiarEstado(id, nuevoEstado);
      const labels: Record<EstadoReserva, string> = {
        confirmada: 'Reserva confirmada',
        completada: 'Mesa completada / comensales llegaron',
        cancelada: 'Reserva cancelada',
        pendiente: 'Reserva marcada como pendiente',
      };
      createToast(labels[nuevoEstado] || 'Estado actualizado', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar reserva';
      createToast(msg, 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleVerificarAnticipo = async (reserva: ReservaNegocio) => {
    if (!actualizarAnticipo) return;
    setProcesandoId(reserva.id);
    try {
      await actualizarAnticipo(reserva.id, {
        anticipoMonto: Math.round(Number(reserva.anticipoMonto) || 0),
        anticipoMetodo: reserva.anticipoMetodo || 'transferencia',
        anticipoEstado: 'verificado',
        anticipoReferencia: reserva.anticipoReferencia,
      });
      createToast(
        `✅ Anticipo de ${formatCOP(reserva.anticipoMonto || 0)} verificado para ${reserva.clienteNombre}.`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al verificar anticipo';
      createToast(msg, 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEnviarRecordatorioWhatsApp = async (reserva: ReservaNegocio) => {
    if (!registrarRecordatorio) return;
    try {
      await registrarRecordatorio(reserva.id, reserva.estado === 'pendiente');
      createToast(
        reserva.estado === 'pendiente'
          ? `Confirmación enviada por WhatsApp a ${reserva.clienteNombre}.`
          : `Recordatorio enviado por WhatsApp a ${reserva.clienteNombre}.`,
        'info'
      );
    } catch (err) {
      console.warn('No se pudo registrar marca de recordatorio:', err);
    }
  };

  const handleConfirmarCheckIn = async (params: {
    reserva: ReservaNegocio;
    mesa: Mesa;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
    verificarAnticipoAlSentar?: boolean;
  }) => {
    if (!hacerCheckInEnMesa) return;
    setProcesandoId(params.reserva.id);
    try {
      await hacerCheckInEnMesa(params);
      createToast(
        `✅ ${params.reserva.clienteNombre} sentado en ${params.mesa.nombre}. Cuenta abierta en Salón.`,
        'success'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al sentar en mesa';
      createToast(msg, 'error');
      throw err;
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm('¿Deseas eliminar permanentemente esta reserva?')) return;
    setProcesandoId(id);
    try {
      await eliminar(id);
      createToast('Reserva eliminada.', 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      createToast(msg, 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleExportarCsv = () => {
    descargarReservasCsv(reservasFiltradas);
    createToast(`Exportadas ${reservasFiltradas.length} reservas a CSV.`, 'success');
  };

  // Estado de carga inicial
  if (loading && reservas.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-10 w-48 bg-neutral-900 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl bg-neutral-900" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl bg-neutral-900" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Estado de error crítico
  if (error && reservas.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            icon={AlertCircle}
            title="Error al conectar con la agenda de reservas"
            description={error}
            action={{ label: 'Reintentar conexión', onClick: recargar }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-400 border border-gold-400/20">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
                  Agenda y Reservas
                </h1>
                <p className="mt-0.5 text-xs sm:text-sm text-neutral-400">
                  Libro de reservas, mapa de mesas, anticipos offline y recordatorios por WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/mesas"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white transition-colors"
            >
              <Utensils className="h-4 w-4 text-gold-400" />
              <span>Ir a Salón ({mesas.length})</span>
            </Link>

            <button
              type="button"
              onClick={handleExportarCsv}
              disabled={reservasFiltradas.length === 0}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white transition-colors disabled:opacity-45"
            >
              <Download className="h-4 w-4 text-gold-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() => abrirModalNuevaReserva(null)}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 text-sm font-bold shadow-lg shadow-gold-500/10 transition-all font-display"
            >
              <Plus className="h-4 w-4" />
              <span>Nueva Reserva</span>
            </button>
          </div>
        </div>

        {/* Tarjetas KPI Superiores */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-semibold">Reservas Hoy</span>
              <CalendarDays className="h-4 w-4 text-gold-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-white">
              {metricas.hoy}
            </p>
            <span className="text-[11px] text-neutral-500">
              {metricas.proximas2Horas ?? 0} en las próximas 2h
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-semibold">Pendientes</span>
              <Clock className="h-4 w-4 text-yellow-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-yellow-400">
              {metricas.pendientes}
            </p>
            <span className="text-[11px] text-neutral-500">Por confirmar</span>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-semibold">Confirmadas</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-emerald-400">
              {metricas.confirmadas}
            </p>
            <span className="text-[11px] text-neutral-500">
              {metricas.conMesaAsignada ?? 0} con mesa asignada
            </span>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-semibold">Personas Hoy</span>
              <Users className="h-4 w-4 text-gold-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-gold-400">
              {metricas.personasHoy}
            </p>
            <span className="text-[11px] text-neutral-500">Comensales esperados</span>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-4">
            <div className="flex items-center justify-between text-emerald-300 mb-2">
              <span className="text-xs font-semibold">Anticipos Verificados</span>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="font-display text-xl sm:text-2xl font-black text-emerald-400 truncate">
              {formatCOP(metricas.totalAnticiposVerificadosCOP ?? 0)}
            </p>
            <span className="text-[11px] text-neutral-400">
              Pendientes: {formatCOP(metricas.totalAnticiposPendientesCOP ?? 0)}
            </span>
          </div>
        </div>

        {/* Selector de Vista (Libro de Reservas vs Mapa de Mesas) + Buscador */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex rounded-2xl border border-neutral-800 bg-neutral-900/80 p-1">
            <button
              type="button"
              aria-pressed={vistaActiva === 'libro'}
              onClick={() => setVistaActiva('libro')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
                vistaActiva === 'libro'
                  ? 'bg-gold-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ListChecks className="h-4 w-4" />
              <span>Libro de Reservas</span>
            </button>
            <button
              type="button"
              aria-pressed={vistaActiva === 'mapa'}
              onClick={() => setVistaActiva('mapa')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
                vistaActiva === 'mapa'
                  ? 'bg-gold-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              <span>Mapa de Mesas ({mesas.length})</span>
            </button>
          </div>

          {vistaActiva === 'libro' && (
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-500" />
              <input
                type="search"
                aria-label="Buscar reserva por cliente, teléfono o mesa"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar cliente, teléfono o mesa..."
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 pl-9 pr-4 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
              />
            </div>
          )}
        </div>

        {vistaActiva === 'mapa' ? (
          <MapaMesasReservasView
            mesas={mesas}
            reservas={reservas}
            negocioNombre={negocioNombre}
            onAgendarEnMesa={(mesa, fechaHora) => abrirModalNuevaReserva(mesa, fechaHora)}
            onSentarReserva={(reserva, mesa) => setCheckInModalState({ reserva, mesa })}
            onEnviarWhatsApp={handleEnviarRecordatorioWhatsApp}
          />
        ) : (
          <>
            {/* Barra de Filtros del Libro */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 backdrop-blur-sm">
              {/* Filtro de Fecha */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  aria-pressed={filtroFecha === 'todos'}
                  onClick={() => setFiltroFecha('todos')}
                  className={`h-11 px-4 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-w-[44px] ${
                    filtroFecha === 'todos'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  Todas las Fechas
                </button>
                <button
                  type="button"
                  aria-pressed={filtroFecha === 'hoy'}
                  onClick={() => setFiltroFecha('hoy')}
                  className={`h-11 px-4 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-w-[44px] ${
                    filtroFecha === 'hoy'
                      ? 'bg-gold-400 text-neutral-950 font-black'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  Solo Hoy
                </button>
                <button
                  type="button"
                  aria-pressed={filtroFecha === 'proximos'}
                  onClick={() => setFiltroFecha('proximos')}
                  className={`h-11 px-4 rounded-xl text-xs font-bold transition-colors whitespace-nowrap min-w-[44px] ${
                    filtroFecha === 'proximos'
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  Próximos Días
                </button>
              </div>

              {/* Filtro de Estado */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="hidden lg:flex items-center gap-1 text-xs text-neutral-500 mr-1">
                  <Filter className="h-3 w-3" />
                  Estado:
                </span>
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'pendiente', label: 'Pendientes' },
                    { id: 'confirmada', label: 'Confirmadas' },
                    { id: 'completada', label: 'Completadas' },
                    { id: 'cancelada', label: 'Canceladas' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={filtroEstado === opt.id}
                    onClick={() => setFiltroEstado(opt.id)}
                    className={`h-11 px-3.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap min-w-[44px] ${
                      filtroEstado === opt.id
                        ? 'bg-neutral-800 text-gold-400 border border-gold-400/30'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Reservas / EmptyState */}
            {reservasFiltradas.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title={
                  filtroEstado !== 'todos' || filtroFecha !== 'todos' || busqueda.trim()
                    ? 'No hay reservas con los filtros aplicados'
                    : 'Aún no hay reservas registradas'
                }
                description={
                  filtroEstado !== 'todos' || filtroFecha !== 'todos' || busqueda.trim()
                    ? 'Prueba cambiando los filtros de fecha, estado o búsqueda para visualizar otras reservas.'
                    : 'Las reservas tomadas por WhatsApp mediante Sarin IA o ingresadas en este panel aparecerán aquí organizadas cronológicamente.'
                }
                action={{
                  label: '+ Crear primera reserva',
                  onClick: () => abrirModalNuevaReserva(null),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reservasFiltradas.map((reserva) => (
                  <ReservaCard
                    key={reserva.id}
                    reserva={reserva}
                    negocioNombre={negocioNombre}
                    onCambiarEstado={handleCambiarEstado}
                    onVerificarAnticipo={handleVerificarAnticipo}
                    onEnviarRecordatorioWhatsApp={handleEnviarRecordatorioWhatsApp}
                    onSentarEnMesa={(res) => setCheckInModalState({ reserva: res })}
                    onEliminar={handleEliminar}
                    procesandoId={procesandoId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Creación */}
      <NuevaReservaModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setMesaPreseleccionada(null);
          setFechaHoraInicial(undefined);
        }}
        onSubmit={handleCrearReserva}
        cargando={guardando}
        mesas={mesas}
        reservasExistentes={reservas}
        mesaPreseleccionada={mesaPreseleccionada}
        fechaHoraInicial={fechaHoraInicial}
      />

      {/* Modal de Check-In en Mesa */}
      <CheckInReservaMesaModal
        isOpen={Boolean(checkInModalState)}
        reserva={checkInModalState?.reserva || null}
        mesas={mesas}
        mesaPreseleccionada={checkInModalState?.mesa || null}
        onClose={() => setCheckInModalState(null)}
        onConfirmarCheckIn={handleConfirmarCheckIn}
      />
    </div>
  );
};
