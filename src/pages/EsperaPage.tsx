import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Hourglass,
  MessageSquare,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Utensils,
  XCircle,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useMesas } from '@/hooks/useMesas';
import { useMeseros } from '@/hooks/useMeseros';
import { useListaEspera } from '@/hooks/useListaEspera';
import { useHoraActual } from '@/hooks/useHoraActual';
import type { TurnoEspera } from '@/types/espera';
import {
  calcularMinutosEnEspera,
  construirMensajeMesaLista,
  filtrarMesasCompatibles,
  normalizarTelefonoEspera,
} from '@/utils/esperaUtils';
import { RegistrarWalkInModal } from '@/components/espera/RegistrarWalkInModal';
import { AsignarMesaEsperaModal } from '@/components/espera/AsignarMesaEsperaModal';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';

export function EsperaPage() {
  const { negocioActual } = useNegocio();
  const {
    mesas,
    zonasDisponibles,
    totalLibres,
    loading: loadingMesas,
  } = useMesas(negocioActual.id);
  const { meserosOpciones } = useMeseros();
  const {
    turnosActivos,
    turnosSentados,
    turnosCerrados,
    loading: loadingEspera,
    error,
    tiempoEstimadoBase,
    estimarParaGrupo,
    registrarWalkIn,
    notificarWhatsApp,
    marcarNotificado,
    sentarEnMesa,
    cancelarTurno,
    marcarNoShow,
  } = useListaEspera(negocioActual.id, mesas);

  const ahora = useHoraActual();
  const ahoraMs = ahora.getTime();

  const [tabActivo, setTabActivo] = useState<'cola' | 'historial'>('cola');
  const [modalWalkInOpen, setModalWalkInOpen] = useState(false);
  const [turnoParaSentar, setTurnoParaSentar] = useState<TurnoEspera | null>(null);
  const [notificandoId, setNotificandoId] = useState<string | null>(null);

  const mesasLibres = useMemo(
    () => mesas.filter((m) => m.estado === 'libre'),
    [mesas]
  );

  // Coincidencia inteligente: primer turno en espera con mesa libre compatible ahora mismo
  const sugerenciaMatch = useMemo(() => {
    for (const turno of turnosActivos) {
      const compatibles = filtrarMesasCompatibles(
        mesas,
        turno.personas,
        turno.zonaPreferida
      );
      if (compatibles.length > 0) {
        return { turno, mesa: compatibles[0] };
      }
    }
    return null;
  }, [mesas, turnosActivos]);

  const handleLlamarWhatsApp = async (turno: TurnoEspera) => {
    const compatibles = filtrarMesasCompatibles(
      mesas,
      turno.personas,
      turno.zonaPreferida
    );
    const mesaSugerida = compatibles[0];
    setNotificandoId(turno.id);

    try {
      await notificarWhatsApp(turno, negocioActual.nombre, mesaSugerida);
    } catch (err: unknown) {
      const tel = normalizarTelefonoEspera(turno.clienteTelefono);
      if (tel) {
        const msg = construirMensajeMesaLista({
          negocioNombre: negocioActual.nombre,
          clienteNombre: turno.clienteNombre,
          codigoTurno: turno.codigoTurno,
          mesaNombre: mesaSugerida?.nombre,
        });
        window.open(
          `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`,
          '_blank',
          'noopener,noreferrer'
        );
        await marcarNotificado(turno.id);
      } else {
        const msg = err instanceof Error ? err.message : 'No se pudo enviar WhatsApp';
        createToast(msg, 'error');
      }
    } finally {
      setNotificandoId(null);
    }
  };

  if (loadingEspera && loadingMesas) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-base-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Hourglass className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white tracking-tight">
              Lista de Espera & Walk-ins
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">
            Gestión inteligente de comensales en puerta, estimación por ocupación y llamado por WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/mesas"
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs font-bold text-neutral-200 transition-colors hover:border-amber-400 hover:text-white"
          >
            <Utensils className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>Ver Mesas ({totalLibres} libres)</span>
          </Link>

          <Button
            type="button"
            onClick={() => setModalWalkInOpen(true)}
            className="min-h-[44px] gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 px-5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Registrar Walk-in
          </Button>
        </div>
      </header>

      {/* 4 KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-label="Indicadores de lista de espera">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/15 p-4">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">En Espera</span>
            <Users className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">
            {turnosActivos.length}
          </div>
          <span className="text-[11px] text-neutral-400">
            {turnosActivos.reduce((sum, t) => sum + (t.personas || 0), 0)} comensales en puerta
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Espera Estimada</span>
            <Clock className="h-4 w-4 text-amber-400" aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-amber-400">
            {tiempoEstimadoBase === 0 ? 'Inmediata' : `${tiempoEstimadoBase} min`}
          </div>
          <span className="text-[11px] text-neutral-500">Para nuevo grupo de 2 pers.</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-4">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mesas Libres</span>
            <Utensils className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-white">
            {totalLibres}
          </div>
          <span className="text-[11px] text-neutral-400">
            de {mesas.length} mesas totales
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Sentados Hoy</span>
            <UserCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="mt-2 font-display text-2xl sm:text-3xl font-black text-emerald-400">
            {turnosSentados.length}
          </div>
          <span className="text-[11px] text-neutral-500">Grupos asignados a mesa</span>
        </div>
      </section>

      {/* Banner inteligente cuando una mesa libre coincide con alguien esperando */}
      {sugerenciaMatch && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/25 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                ¡{sugerenciaMatch.mesa.nombre} ({sugerenciaMatch.mesa.capacidad} sillas) está libre para{' '}
                <span className="text-amber-400">
                  {sugerenciaMatch.turno.codigoTurno} — {sugerenciaMatch.turno.clienteNombre}
                </span>
                !
              </p>
              <p className="text-xs text-emerald-200/80">
                Grupo de {sugerenciaMatch.turno.personas} personas en espera. Puedes avisarle por WhatsApp o sentarlo de una vez.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {sugerenciaMatch.turno.clienteTelefono && sugerenciaMatch.turno.estado === 'esperando' && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleLlamarWhatsApp(sugerenciaMatch.turno)}
                disabled={notificandoId === sugerenciaMatch.turno.id}
                className="min-h-[44px] gap-1.5 border border-emerald-500/40 text-xs font-bold text-emerald-300"
              >
                <MessageSquare className="h-4 w-4" />
                Avisar WhatsApp
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setTurnoParaSentar(sugerenciaMatch.turno)}
              className="min-h-[44px] gap-1.5 bg-emerald-500 text-xs font-black text-neutral-950 hover:bg-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" />
              Sentar Ahora
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Pestañas Cola Activa / Historial del Día */}
      <div className="flex gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          aria-pressed={tabActivo === 'cola'}
          onClick={() => setTabActivo('cola')}
          className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors ${
            tabActivo === 'cola'
              ? 'bg-amber-500 text-neutral-950'
              : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
        >
          Cola Activa ({turnosActivos.length})
        </button>
        <button
          type="button"
          aria-pressed={tabActivo === 'historial'}
          onClick={() => setTabActivo('historial')}
          className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors ${
            tabActivo === 'historial'
              ? 'bg-amber-500 text-neutral-950'
              : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
        >
          Historial de Hoy ({turnosCerrados.length})
        </button>
      </div>

      {/* Lista de turnos */}
      {tabActivo === 'cola' ? (
        turnosActivos.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-10 text-center">
            <Hourglass className="mx-auto mb-3 h-10 w-10 text-neutral-600" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              No hay grupos esperando en puerta
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              Cuando el salón esté lleno, registra aquí a los comensales para calcular su espera y avisarles por WhatsApp.
            </p>
            <Button
              type="button"
              onClick={() => setModalWalkInOpen(true)}
              className="mt-4 min-h-[44px] gap-2 bg-amber-500 text-xs font-black text-neutral-950 hover:bg-amber-400"
            >
              <UserPlus className="h-4 w-4" />
              Registrar Primer Walk-in
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {turnosActivos.map((turno, index) => {
              const minutosEsperando = calcularMinutosEnEspera(turno.creadoEn, ahoraMs);
              const esNotificado = turno.estado === 'notificado';
              const compatibles = filtrarMesasCompatibles(
                mesas,
                turno.personas,
                turno.zonaPreferida
              );

              return (
                <article
                  key={turno.id}
                  className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 transition-colors ${
                    esNotificado
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : 'border-neutral-800 bg-neutral-900/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                        <span className="font-display text-sm font-black text-amber-400">
                          {turno.codigoTurno}
                        </span>
                        <span className="text-[9px] text-neutral-400">#{index + 1}</span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-white">{turno.clienteNombre}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              esNotificado
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-yellow-500/20 text-yellow-300'
                            }`}
                          >
                            {esNotificado ? 'Llamado por WhatsApp' : 'Esperando'}
                          </span>
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                          <span className="font-semibold text-neutral-200">
                            {turno.personas} {turno.personas === 1 ? 'persona' : 'personas'}
                          </span>
                          <span>• {turno.zonaPreferida || 'Cualquiera'}</span>
                          {turno.clienteTelefono && <span>• 📱 {turno.clienteTelefono}</span>}
                        </div>

                        {turno.notas && (
                          <p className="mt-1.5 text-xs italic text-amber-300/90">
                            “{turno.notas}”
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block font-mono text-xs font-bold text-white">
                        {minutosEsperando} min
                      </span>
                      <span className="block text-[10px] text-neutral-500">
                        Est: {turno.tiempoEstimadoMin === 0 ? 'Ya' : `~${turno.tiempoEstimadoMin}m`}
                      </span>
                    </div>
                  </div>

                  {/* Acciones táctiles */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {turno.clienteTelefono ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleLlamarWhatsApp(turno)}
                          disabled={notificandoId === turno.id}
                          className="min-h-[44px] gap-1.5 border border-emerald-500/30 text-xs font-bold text-emerald-300"
                        >
                          <BellRing className="h-4 w-4" />
                          {notificandoId === turno.id
                            ? 'Enviando...'
                            : esNotificado
                            ? 'Reenviar WhatsApp'
                            : 'Tu Mesa Está Lista'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => marcarNotificado(turno.id)}
                          disabled={esNotificado}
                          className="min-h-[44px] gap-1.5 text-xs"
                        >
                          <BellRing className="h-4 w-4" />
                          {esNotificado ? 'Ya llamado' : 'Marcar llamado'}
                        </Button>
                      )}

                      <Button
                        type="button"
                        onClick={() => setTurnoParaSentar(turno)}
                        disabled={mesasLibres.length === 0}
                        className="min-h-[44px] gap-1.5 bg-amber-500 text-xs font-black text-neutral-950 hover:bg-amber-400 disabled:opacity-40"
                      >
                        <Utensils className="h-4 w-4" />
                        {compatibles.length > 0
                          ? `Sentar (${compatibles[0].nombre})`
                          : mesasLibres.length > 0
                          ? 'Sentar en Mesa'
                          : 'Sin mesas libres'}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => marcarNoShow(turno.id)}
                        aria-label={`Marcar no se presentó a ${turno.clienteNombre}`}
                        title="No se presentó (No-Show)"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-amber-500/40 hover:text-amber-400"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelarTurno(turno.id)}
                        aria-label={`Cancelar turno de ${turno.clienteNombre}`}
                        title="Cancelar turno"
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-red-500/40 hover:text-red-400"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : turnosCerrados.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
          Aún no hay turnos sentados o cerrados hoy.
        </div>
      ) : (
        <div className="divide-y divide-neutral-800 rounded-2xl border border-neutral-800 bg-neutral-900/50">
          {turnosCerrados.map((turno) => (
            <div
              key={turno.id}
              className="flex flex-wrap items-center justify-between gap-2 p-4 text-xs"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-amber-400">{turno.codigoTurno}</span>
                <span className="font-semibold text-white">{turno.clienteNombre}</span>
                <span className="text-neutral-400">({turno.personas} pers.)</span>
              </div>
              <div className="flex items-center gap-2">
                {turno.mesaAsignadaNombre && (
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-300">
                    {turno.mesaAsignadaNombre}
                  </span>
                )}
                <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-neutral-300">
                  {turno.estado === 'sentado'
                    ? 'Sentado'
                    : turno.estado === 'no_show'
                    ? 'No llegó'
                    : 'Cancelado'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales */}
      <RegistrarWalkInModal
        isOpen={modalWalkInOpen}
        onClose={() => setModalWalkInOpen(false)}
        onSubmit={async (input) => {
          await registrarWalkIn(input);
        }}
        zonasDisponibles={zonasDisponibles}
        estimarTiempo={estimarParaGrupo}
      />

      <AsignarMesaEsperaModal
        isOpen={Boolean(turnoParaSentar)}
        turno={turnoParaSentar}
        mesas={mesas}
        meseros={meserosOpciones}
        onClose={() => setTurnoParaSentar(null)}
        onConfirmar={async (params) => {
          await sentarEnMesa(params);
        }}
      />
    </div>
  );
}
