import { useState, useMemo, type FC } from 'react';
import {
  CalendarDays,
  Plus,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { useReservas } from '@/hooks/useReservas';
import { ReservaCard } from '@/components/reservas/ReservaCard';
import { NuevaReservaModal } from '@/components/reservas/NuevaReservaModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import type { EstadoReserva, NuevaReservaInput } from '@/types/reserva';

export const ReservasPage: FC = () => {
  const {
    reservas,
    loading,
    error,
    metricas,
    crear,
    cambiarEstado,
    eliminar,
    recargar,
  } = useReservas();

  const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoReserva>('todos');
  const [filtroFecha, setFiltroFecha] = useState<'hoy' | 'proximos' | 'todos'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  // Filtrado reactivo de reservas
  const reservasFiltradas = useMemo(() => {
    const hoyStr = new Date().toISOString().slice(0, 10);

    return reservas.filter((res) => {
      // Filtro por estado
      if (filtroEstado !== 'todos' && res.estado !== filtroEstado) {
        return false;
      }

      // Filtro por fecha
      const fechaCorta = res.fechaHoraReserva ? res.fechaHoraReserva.slice(0, 10) : '';
      if (filtroFecha === 'hoy' && fechaCorta !== hoyStr) {
        return false;
      }
      if (filtroFecha === 'proximos' && fechaCorta < hoyStr) {
        return false;
      }

      return true;
    });
  }, [reservas, filtroEstado, filtroFecha]);

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

  // Estado de carga inicial
  if (loading && reservas.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-10 w-48 bg-neutral-900 rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
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
                  Control de mesas, comensales programados y reservas de WhatsApp por Sarin IA
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 text-sm font-bold shadow-lg shadow-gold-500/10 transition-all font-display self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Nueva Reserva</span>
          </button>
        </div>

        {/* Tarjetas KPI Superiores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-semibold">Reservas Hoy</span>
              <CalendarDays className="h-4 w-4 text-gold-400" />
            </div>
            <p className="font-display text-2xl sm:text-3xl font-black text-white">
              {metricas.hoy}
            </p>
            <span className="text-[11px] text-neutral-500">Programadas para hoy</span>
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
            <span className="text-[11px] text-neutral-500">Listas para recibir</span>
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
        </div>

        {/* Barra de Filtros */}
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
              filtroEstado !== 'todos' || filtroFecha !== 'todos'
                ? 'No hay reservas con los filtros aplicados'
                : 'Aún no hay reservas registradas'
            }
            description={
              filtroEstado !== 'todos' || filtroFecha !== 'todos'
                ? 'Prueba cambiando los filtros de fecha o estado para visualizar otras reservas.'
                : 'Las reservas tomadas por WhatsApp mediante Sarin IA o ingresadas en este panel aparecerán aquí organizadas cronológicamente.'
            }
            action={{
              label: '+ Crear primera reserva',
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reservasFiltradas.map((reserva) => (
              <ReservaCard
                key={reserva.id}
                reserva={reserva}
                onCambiarEstado={handleCambiarEstado}
                onEliminar={handleEliminar}
                procesandoId={procesandoId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      <NuevaReservaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCrearReserva}
        cargando={guardando}
      />
    </div>
  );
};
