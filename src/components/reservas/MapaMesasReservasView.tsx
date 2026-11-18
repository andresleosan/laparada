import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  MessageCircle,
  Users,
  Utensils,
} from 'lucide-react';
import type { Mesa } from '@/types/mesa';
import type { ReservaNegocio } from '@/types/reserva';
import { formatCOP } from '@/utils/formatCOP';
import { getBadgeEstadoMesa } from '@/utils/mesasUtils';
import {
  construirMensajeRecordatorioReservaWhatsApp,
  evaluarDisponibilidadMesasParaReserva,
  generarUrlWhatsAppReserva,
} from '@/utils/reservasUtils';
import { formatFechaHora } from './ReservaCard';

export interface MapaMesasReservasViewProps {
  mesas: Mesa[];
  reservas: ReservaNegocio[];
  negocioNombre: string;
  onAgendarEnMesa: (mesa: Mesa, fechaHora: string) => void;
  onSentarReserva: (reserva: ReservaNegocio, mesa: Mesa) => void;
  onEnviarWhatsApp?: (reserva: ReservaNegocio) => void;
}

function toLocalDateTimeInput(d: Date): string {
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function buildQuickHourToday(hora24: number): string {
  const d = new Date();
  d.setHours(hora24, 0, 0, 0);
  return toLocalDateTimeInput(d);
}

export function MapaMesasReservasView({
  mesas,
  reservas,
  negocioNombre,
  onAgendarEnMesa,
  onSentarReserva,
  onEnviarWhatsApp,
}: MapaMesasReservasViewProps) {
  const [fechaHoraInspeccion, setFechaHoraInspeccion] = useState<string>(() =>
    toLocalDateTimeInput(new Date())
  );
  const [personasConsulta, setPersonasConsulta] = useState<number>(2);
  const [zonaFiltro, setZonaFiltro] = useState<string>('todas');

  const zonasDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const m of mesas) {
      if (m.zona?.trim()) set.add(m.zona.trim());
    }
    return Array.from(set).sort();
  }, [mesas]);

  const evaluaciones = useMemo(() => {
    const lista = evaluarDisponibilidadMesasParaReserva({
      mesas,
      reservas,
      fechaHoraReserva: fechaHoraInspeccion,
      personas: personasConsulta,
      zonaPreferida: zonaFiltro !== 'todas' ? zonaFiltro : undefined,
    });

    if (zonaFiltro === 'todas') return lista;
    return lista.filter(
      (item) => (item.mesa.zona || 'Salón Principal').trim() === zonaFiltro
    );
  }, [mesas, reservas, fechaHoraInspeccion, personasConsulta, zonaFiltro]);

  const totalDisponiblesFranja = evaluaciones.filter((e) => e.disponibleEnHorario).length;
  const totalReservadasFranja = evaluaciones.length - totalDisponiblesFranja;

  if (mesas.length === 0) {
    return (
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/50 p-10 text-center">
        <Utensils className="mx-auto mb-3 h-10 w-10 text-neutral-600" />
        <h3 className="font-display text-lg font-bold text-white">
          Aún no hay mesas configuradas en Salón
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-neutral-400">
          Crea las mesas del restaurante o auto-inicializa las 6 mesas estándar en Modo Mesas para asignarlas desde el libro de reservas.
        </p>
        <Link
          to="/mesas"
          className="mt-5 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gold-400 px-5 text-xs font-black text-neutral-950 hover:bg-gold-500 transition-colors"
        >
          <Utensils className="h-4 w-4" />
          Ir a Configurar Mesas
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Mapa interactivo de mesas por franja horaria" className="space-y-4">
      {/* Barra de inspección horaria y filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="mapa-fecha-inspeccion"
              className="flex items-center gap-1.5 text-xs font-bold text-neutral-300"
            >
              <Clock className="h-4 w-4 text-gold-400" />
              Franja a consultar:
            </label>
            <input
              id="mapa-fecha-inspeccion"
              type="datetime-local"
              value={fechaHoraInspeccion}
              onChange={(e) => setFechaHoraInspeccion(e.target.value)}
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFechaHoraInspeccion(toLocalDateTimeInput(new Date()))}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-gold-400 hover:text-white transition-colors"
              >
                Ahora
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setHours(d.getHours() + 1);
                  setFechaHoraInspeccion(toLocalDateTimeInput(d));
                }}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-gold-400 hover:text-white transition-colors"
              >
                +1h
              </button>
              <button
                type="button"
                onClick={() => setFechaHoraInspeccion(buildQuickHourToday(19))}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-gold-400 hover:text-white transition-colors"
              >
                Hoy 7:00 PM
              </button>
              <button
                type="button"
                onClick={() => setFechaHoraInspeccion(buildQuickHourToday(20))}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-gold-400 hover:text-white transition-colors"
              >
                Hoy 8:00 PM
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 min-h-[44px]">
              <Users className="h-4 w-4 text-gold-400" />
              <label htmlFor="mapa-personas-consulta" className="text-xs text-neutral-400">
                Grupo:
              </label>
              <input
                id="mapa-personas-consulta"
                type="number"
                min={1}
                max={30}
                value={personasConsulta}
                onChange={(e) => setPersonasConsulta(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-12 bg-transparent text-xs font-bold text-white focus:outline-none"
              />
            </div>

            {zonasDisponibles.length > 0 && (
              <select
                aria-label="Filtrar mesas por zona"
                value={zonaFiltro}
                onChange={(e) => setZonaFiltro(e.target.value)}
                className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-200 focus:border-gold-400 focus:outline-none"
              >
                <option value="todas">Todas las zonas</option>
                {zonasDisponibles.map((zona) => (
                  <option key={zona} value={zona}>
                    {zona}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 border-t border-neutral-800/80 pt-2.5">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {totalDisponiblesFranja} disponibles en esta franja
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
            <Clock className="h-3.5 w-3.5" />
            {totalReservadasFranja} reservadas (±2h)
          </span>
          <span>·</span>
          <span>Las mesas libres en vivo pueden recibir Check-In inmediato.</span>
        </div>
      </div>

      {/* Cuadrícula visual de mesas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {evaluaciones.map((item) => {
          const { mesa, disponibleEnHorario, capacidadSuficiente, conflicto, recomendada } = item;
          const badgeVivo = getBadgeEstadoMesa(mesa.estado);
          const { hora: horaConflicto } = conflicto
            ? formatFechaHora(conflicto.fechaHoraReserva)
            : { hora: '' };

          const whatsappUrl = conflicto
            ? generarUrlWhatsAppReserva(
                conflicto.clienteTelefono,
                construirMensajeRecordatorioReservaWhatsApp({
                  reserva: conflicto,
                  negocioNombre,
                })
              )
            : '';

          return (
            <article
              key={mesa.id}
              data-testid={`mapa-reserva-mesa-${mesa.id}`}
              className={`flex flex-col justify-between rounded-2xl border-2 p-4 shadow-lg transition-all ${
                !disponibleEnHorario
                  ? 'border-amber-500/50 bg-amber-950/15'
                  : recomendada
                    ? 'border-emerald-500/60 bg-emerald-950/15'
                    : 'border-neutral-800 bg-neutral-900/90'
              }`}
            >
              <div>
                <header className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-black text-white truncate">
                        {mesa.nombre}
                      </h3>
                      {recomendada && (
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Óptima
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-neutral-400">
                      {mesa.zona || 'Salón Principal'} · {mesa.capacidad}{' '}
                      {mesa.capacidad === 1 ? 'silla' : 'sillas'}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${badgeVivo.colorClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badgeVivo.dotClass}`} />
                    {badgeVivo.label}
                  </span>
                </header>

                <div className="my-3 min-h-[76px]">
                  {conflicto ? (
                    <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-amber-300 truncate">
                          {conflicto.clienteNombre}
                        </span>
                        <span className="font-display text-xs font-black text-gold-400 shrink-0">
                          {horaConflicto}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                        <span>{conflicto.personas} pers.</span>
                        {conflicto.anticipoMonto && conflicto.anticipoMonto > 0 && (
                          <span
                            className={`font-semibold ${
                              conflicto.anticipoEstado === 'verificado'
                                ? 'text-emerald-400'
                                : 'text-amber-300'
                            }`}
                          >
                            · Anticipo {formatCOP(conflicto.anticipoMonto)} (
                            {conflicto.anticipoEstado === 'verificado' ? 'Verif.' : 'Pend.'})
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/50 p-3 text-xs">
                      <p className="font-semibold text-emerald-400">
                        Disponible en esta franja horaria
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {capacidadSuficiente
                          ? `Apta para grupo de ${personasConsulta} comensales`
                          : `Capacidad (${mesa.capacidad}) menor al grupo (${personasConsulta})`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                {conflicto ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onSentarReserva(conflicto, mesa)}
                      className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-black text-neutral-950 hover:bg-emerald-400 transition-colors"
                    >
                      <Utensils className="h-3.5 w-3.5" />
                      Sentar / Check-In
                    </button>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onEnviarWhatsApp?.(conflicto)}
                      aria-label={`Recordar por WhatsApp a ${conflicto.clienteNombre}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAgendarEnMesa(mesa, fechaHoraInspeccion)}
                    className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-neutral-950 hover:bg-gold-500 transition-colors"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Agendar en {mesa.nombre}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
