import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Droplets,
  Flame,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Thermometer,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import { useBitacoraBpm } from '@/hooks/useBitacoraBpm';
import {
  ChecklistTurnoPanel,
  ConfigurarEquiposBpmModal,
  RegistrarAceiteModal,
  RegistrarTemperaturaModal,
} from '@/components/bpm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import type { RangoFechaBpm } from '@/types/bpm';
import {
  COLOR_ACEITE_META,
  ESTADO_ACEITE_META,
  ESTADO_CONFORMIDAD_TEMP_META,
  FRANJAS_BPM_META,
  generarResumenBpmWhatsApp,
  TIPO_EVENTO_ACEITE_META,
} from '@/utils/bpmUtils';

type TabBitacoraBpm = 'temperaturas' | 'aceite' | 'checklists';

const RANGOS_FILTRO: Array<{ id: RangoFechaBpm; label: string }> = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7dias', label: '7 días' },
  { id: '30dias', label: '30 días' },
  { id: 'todo', label: 'Todo' },
];

export function BitacoraBpmPage() {
  let nombreNegocio = 'La Parada';
  let esAdmin = false;
  try {
    const negCtx = useNegocio();
    nombreNegocio = negCtx.negocioActual.nombre || 'La Parada';
    esAdmin = negCtx.esSuperAdmin || negCtx.usuarioNegocio?.rol === 'admin';
  } catch {
    // Fallback seguro en pruebas aisladas
  }

  let responsableNombre = 'Administrador';
  try {
    const authCtx = useAuth();
    responsableNombre =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro
  }

  const {
    config,
    temperaturasFiltradas,
    aceiteFiltrado,
    checklistsFiltrados,
    equiposEvaluadosHoy,
    freidorasEvaluadas,
    resumen,
    loading,
    error,
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
  } = useBitacoraBpm();

  const [tab, setTab] = useState<TabBitacoraBpm>('temperaturas');
  const [modalTempOpen, setModalTempOpen] = useState(false);
  const [equipoPreseleccionado, setEquipoPreseleccionado] = useState<string | undefined>();
  const [modalAceiteOpen, setModalAceiteOpen] = useState(false);
  const [freidoraPreseleccionada, setFreidoraPreseleccionada] = useState<
    string | undefined
  >();
  const [modalConfigOpen, setModalConfigOpen] = useState(false);

  const [resolviendoId, setResolviendoId] = useState<string | null>(null);
  const [accionResolucion, setAccionResolucion] = useState('');
  const [guardandoResolucion, setGuardandoResolucion] = useState(false);

  const handleAbrirTempEquipo = (equipoId?: string) => {
    setEquipoPreseleccionado(equipoId);
    setModalTempOpen(true);
  };

  const handleAbrirAceiteFreidora = (freidoraId?: string) => {
    setFreidoraPreseleccionada(freidoraId);
    setModalAceiteOpen(true);
  };

  const handleCompartirWhatsApp = () => {
    const encoded = generarResumenBpmWhatsApp({
      nombreNegocio,
      resumen,
      equiposEvaluados: equiposEvaluadosHoy,
      freidorasEvaluadas,
    });
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmarResolucion = async (registroId: string) => {
    if (accionResolucion.trim().length < 3) {
      createToast('Describe la acción correctiva aplicada', 'error');
      return;
    }
    setGuardandoResolucion(true);
    try {
      await resolverDesviacion(registroId, {
        accionCorrectiva: accionResolucion.trim(),
        resueltoPor: responsableNombre,
      });
      createToast('Desviación térmica marcada como resuelta', 'success');
      setResolviendoId(null);
      setAccionResolucion('');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo resolver la desviación',
        'error'
      );
    } finally {
      setGuardandoResolucion(false);
    }
  };

  const handleEliminar = async (
    coleccion: 'registros_temperatura_bpm' | 'registros_aceite_bpm' | 'checklists_bpm',
    id: string
  ) => {
    if (!window.confirm('¿Eliminar este registro de la bitácora sanitaria BPM?')) {
      return;
    }
    try {
      await eliminarRegistro(coleccion, id);
      createToast('Registro BPM eliminado', 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo eliminar el registro',
        'error'
      );
    }
  };

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertTriangle}
            title="No pudimos cargar la Bitácora Sanitaria BPM"
            description={error}
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark px-4 pb-28 pt-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Bitácora Sanitaria BPM
              </h1>
              <Badge
                variant="outline"
                className="border-gold-400/40 bg-gold-400/10 text-gold-300 text-xs"
              >
                <Clock className="h-3 w-3 mr-1 inline" aria-hidden="true" />
                {resumen.fechaHoyIso}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400">
              Control diario de cadena de frío, aceite de freidoras y checklists INVIMA (Res. 2674 de 2013)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleAbrirTempEquipo()}
              className="min-h-[44px] text-xs font-bold"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>+ Temperatura</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => handleAbrirAceiteFreidora()}
              className="min-h-[44px] text-xs font-bold"
            >
              <Droplets className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>+ Aceite</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => exportarCarpetaCsv(nombreNegocio)}
              className="min-h-[44px] text-xs"
            >
              <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Exportar CSV INVIMA</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCompartirWhatsApp}
              aria-label="Compartir resumen sanitario BPM por WhatsApp"
              className="min-h-[44px] text-xs"
            >
              <Share2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            {esAdmin && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setModalConfigOpen(true)}
                aria-label="Configurar equipos de frío y freidoras"
                className="min-h-[44px] text-xs"
              >
                <Settings2 className="h-4 w-4 text-gold-400" aria-hidden="true" />
                <span>Equipos</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={refresh}
              aria-label="Actualizar bitácora sanitaria BPM"
              className="min-h-[44px] text-xs"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin text-gold-400' : ''}`}
                aria-hidden="true"
              />
            </Button>
          </div>
        </header>

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Cumplimiento BPM Hoy
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <span
                  className={`font-display text-2xl sm:text-3xl font-bold ${
                    resumen.estadoGlobal === 'cumple'
                      ? 'text-emerald-400'
                      : resumen.estadoGlobal === 'atencion'
                      ? 'text-amber-300'
                      : 'text-red-400'
                  }`}
                >
                  {resumen.scoreCumplimientoPct}%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.estadoGlobal === 'cumple'
                ? 'Apto para auditoría sanitaria'
                : resumen.estadoGlobal === 'atencion'
                ? 'Controles pendientes o preventivos'
                : 'Requiere acción correctiva inmediata'}
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Cadena de Frío Hoy
            </span>
            <div className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                `${resumen.equiposConformesHoy}/${resumen.equiposActivosCount}`
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.desviacionesSinResolverCount > 0
                ? `${resumen.desviacionesSinResolverCount} desvío(s) por resolver`
                : `${resumen.equiposConLecturaHoy} equipo(s) medidos hoy`}
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Freidoras / Aceite
            </span>
            <div className="mt-2 font-display text-2xl sm:text-3xl font-bold text-white">
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                `${resumen.freidorasOptimasCount}/${resumen.freidorasActivasCount}`
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.freidorasRequierenCambioCount > 0
                ? `${resumen.freidorasRequierenCambioCount} cambio urgente de cuba`
                : 'Ciclo térmico controlado'}
            </p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Checklists de Turno
            </span>
            <div className="mt-2 font-display text-xl sm:text-2xl font-bold text-gold-400">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                `${resumen.aperturaCompletada ? 'Ap. ✓' : 'Ap. ⏳'} · ${
                  resumen.cierreCompletado ? 'Ci. ✓' : 'Ci. ⏳'
                }`
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.hallazgosAbiertosHoy > 0
                ? `${resumen.hallazgosAbiertosHoy} hallazgo(s) abierto(s)`
                : 'Apertura y cierre diario'}
            </p>
          </Card>
        </section>

        {/* Pestañas principales y barra de filtros */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={tab === 'temperaturas'}
              onClick={() => setTab('temperaturas')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-xs font-bold transition-colors ${
                tab === 'temperaturas'
                  ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <Thermometer className="h-4 w-4" aria-hidden="true" />
              <span>Cadena de Frío ({temperaturasFiltradas.length})</span>
            </button>
            <button
              type="button"
              aria-pressed={tab === 'aceite'}
              onClick={() => setTab('aceite')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-xs font-bold transition-colors ${
                tab === 'aceite'
                  ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <Droplets className="h-4 w-4" aria-hidden="true" />
              <span>Aceite de Freidoras ({aceiteFiltrado.length})</span>
            </button>
            <button
              type="button"
              aria-pressed={tab === 'checklists'}
              onClick={() => setTab('checklists')}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-xs font-bold transition-colors ${
                tab === 'checklists'
                  ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
              <span>Checklists Turno ({checklistsFiltrados.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {RANGOS_FILTRO.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={filtros.rango === r.id}
                onClick={() => setFiltros((prev) => ({ ...prev, rango: r.id }))}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${
                  filtros.rango === r.id
                    ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}

            <button
              type="button"
              aria-pressed={filtros.soloAlertas}
              onClick={() =>
                setFiltros((prev) => ({ ...prev, soloAlertas: !prev.soloAlertas }))
              }
              className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${
                filtros.soloAlertas
                  ? 'border-red-500/60 bg-red-500/15 text-red-300'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              Solo alertas / hallazgos
            </button>

            <div className="relative min-w-[190px] flex-1 sm:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filtros.busqueda}
                onChange={(e) =>
                  setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
                }
                placeholder="Buscar equipo, responsable..."
                aria-label="Buscar en bitácora sanitaria BPM"
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 pl-9 pr-3 text-xs text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>
        </section>

        {/* TAB 1: CADENA DE FRÍO */}
        {tab === 'temperaturas' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">
                  Tablero en Vivo de Equipos ({resumen.fechaHoyIso})
                </h2>
                <span className="text-xs text-neutral-400">
                  Toca cualquier equipo para registrar lectura
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {equiposEvaluadosHoy.map((item) => {
                  const isPending = item.estadoHoy === 'pendiente';
                  const meta = isPending
                    ? null
                    : ESTADO_CONFORMIDAD_TEMP_META[item.estadoHoy as keyof typeof ESTADO_CONFORMIDAD_TEMP_META];
                  return (
                    <button
                      key={item.equipo.id}
                      type="button"
                      onClick={() => handleAbrirTempEquipo(item.equipo.id)}
                      className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition-all hover:border-gold-400/60 min-h-[140px] ${
                        meta
                          ? `bg-neutral-900/90 ${meta.borderClass}`
                          : 'border-neutral-800 bg-neutral-900/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <div className="flex items-center gap-2">
                          {item.equipo.tipo === 'congelacion' ? (
                            <Snowflake className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden="true" />
                          ) : item.equipo.tipo === 'caliente' ? (
                            <Flame className="h-4 w-4 text-orange-400 shrink-0" aria-hidden="true" />
                          ) : (
                            <Thermometer className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-xs font-bold text-neutral-400">
                            {item.equipo.ubicacion}
                          </span>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                            meta
                              ? meta.badgeClass
                              : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {meta ? meta.shortLabel : 'Pendiente'}
                        </span>
                      </div>

                      <div className="my-2">
                        <p className="text-sm font-bold text-white line-clamp-1">
                          {item.equipo.nombre}
                        </p>
                        <p className="font-display text-2xl font-bold text-gold-400 mt-1">
                          {item.ultimoRegistroHoy
                            ? `${item.ultimoRegistroHoy.temperaturaC} °C`
                            : 'Sin lectura'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between w-full text-[11px] text-neutral-400">
                        <span>
                          Óptimo: {item.equipo.tempMinOptimaC}° a {item.equipo.tempMaxOptimaC}°C
                        </span>
                        <span>{item.registrosHoyCount} hoy</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Historial de temperaturas */}
            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-white">
                Historial de Lecturas Térmicas
              </h2>

              {temperaturasFiltradas.length === 0 ? (
                <Card className="bg-neutral-900/90 border-neutral-800">
                  <EmptyState
                    icon={Thermometer}
                    title="No hay lecturas de temperatura con estos filtros"
                    description="Registra la primera toma del turno o ajusta el filtro de fechas."
                    action={
                      filtros.soloAlertas || filtros.busqueda || filtros.rango !== 'todo'
                        ? { label: 'Restablecer filtros', onClick: resetFiltros }
                        : { label: 'Registrar Temperatura', onClick: () => handleAbrirTempEquipo() }
                    }
                  />
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {temperaturasFiltradas.map((reg) => {
                    const meta = ESTADO_CONFORMIDAD_TEMP_META[reg.estadoConformidad];
                    const franjaMeta = FRANJAS_BPM_META[reg.franja];
                    const esDesvioAbierto =
                      reg.estadoConformidad !== 'conforme' && !reg.resuelto;

                    return (
                      <Card
                        key={reg.id}
                        className={`p-4 bg-neutral-900/90 ${meta.borderClass} space-y-2.5`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
                              >
                                {meta.shortLabel}
                              </span>
                              <span className="font-display text-base font-bold text-white">
                                {reg.equipoNombre}
                              </span>
                              <span className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-300">
                                {franjaMeta?.shortLabel || reg.franja}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400">
                              {reg.fechaIso} · {reg.horaTexto} · Rango:{' '}
                              {reg.tempMinOptimaC} °C a {reg.tempMaxOptimaC} °C · Por:{' '}
                              <strong className="text-neutral-200">
                                {reg.responsableNombre}
                              </strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 self-start sm:self-center">
                            <span
                              className={`font-display text-2xl font-bold ${meta.textClass}`}
                            >
                              {reg.temperaturaC} °C
                            </span>

                            {esDesvioAbierto && (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  setResolviendoId(reg.id);
                                  setAccionResolucion(reg.accionCorrectiva || '');
                                }}
                                className="min-h-[44px] text-xs"
                              >
                                Resolver Desvío
                              </Button>
                            )}

                            {esAdmin && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleEliminar('registros_temperatura_bpm', reg.id)
                                }
                                aria-label={`Eliminar lectura térmica de ${reg.equipoNombre}`}
                                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-red-500/50 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {(reg.accionCorrectiva || reg.observaciones || reg.resueltoPor) && (
                          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs text-neutral-300 space-y-1">
                            {reg.accionCorrectiva && (
                              <p>
                                <strong className="text-gold-400">Acción correctiva:</strong>{' '}
                                {reg.accionCorrectiva}
                              </p>
                            )}
                            {reg.resuelto && reg.resueltoPor && (
                              <p className="text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Resuelto y verificado por {reg.resueltoPor}</span>
                              </p>
                            )}
                            {reg.observaciones && (
                              <p className="text-neutral-400">Obs: {reg.observaciones}</p>
                            )}
                          </div>
                        )}

                        {resolviendoId === reg.id && (
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-800">
                            <input
                              type="text"
                              value={accionResolucion}
                              onChange={(e) => setAccionResolucion(e.target.value)}
                              placeholder="Describe la acción correctiva aplicada para cerrar la desviación..."
                              aria-label="Acción correctiva de resolución"
                              className="flex-1 min-h-[44px] rounded-xl border border-gold-400/50 bg-neutral-950 px-3 text-xs text-white"
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="primary"
                                loading={guardandoResolucion}
                                onClick={() => handleConfirmarResolucion(reg.id)}
                                className="min-h-[44px] text-xs font-bold"
                              >
                                Confirmar Cierre
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => setResolviendoId(null)}
                                className="min-h-[44px] text-xs"
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: ACEITE DE FREIDORAS */}
        {tab === 'aceite' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-white">
                  Estado de Freidoras y Ciclo de Aceite
                </h2>
                <span className="text-xs text-neutral-400">
                  Toca una freidora para registrar cambio o inspección
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {freidorasEvaluadas.map((item) => {
                  const badgeCls =
                    item.estadoCiclo === 'optimo'
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : item.estadoCiclo === 'por_vencer'
                      ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                      : item.estadoCiclo === 'cambiar_urgente'
                      ? 'border-red-500/60 bg-red-500/15 text-red-300'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300';
                  const estadoLabel =
                    item.estadoCiclo === 'optimo'
                      ? 'Aceite Óptimo'
                      : item.estadoCiclo === 'por_vencer'
                      ? 'Filtrar / Cambio Hoy'
                      : item.estadoCiclo === 'cambiar_urgente'
                      ? 'Cambio Urgente'
                      : 'Sin Cambio Registrado';

                  return (
                    <button
                      key={item.freidora.id}
                      type="button"
                      onClick={() => handleAbrirAceiteFreidora(item.freidora.id)}
                      className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 text-left transition-all hover:border-gold-400/60 min-h-[140px]"
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <span className="text-xs font-bold text-neutral-400">
                          {item.freidora.capacidadLitros} L · Ciclo cada{' '}
                          {item.freidora.cicloMaxDiasCambio}d
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badgeCls}`}
                        >
                          {estadoLabel}
                        </span>
                      </div>

                      <div className="my-2">
                        <p className="text-sm font-bold text-white">
                          {item.freidora.nombre}
                        </p>
                        <p className="font-display text-xl font-bold text-gold-400 mt-1">
                          {item.diasDesdeUltimoCambio !== null
                            ? `${item.diasDesdeUltimoCambio} día(s) desde cambio`
                            : 'Sin cambio total previo'}
                        </p>
                      </div>

                      <div className="text-[11px] text-neutral-400">
                        {item.ultimoEvento
                          ? `Últ. evento: ${
                              TIPO_EVENTO_ACEITE_META[item.ultimoEvento.tipoEvento]?.shortLabel
                            } (${item.ultimoEvento.fechaIso})`
                          : 'Toca para registrar inspección inicial'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-white">
                Bitácora de Cambios, Filtrados e Inspecciones
              </h2>

              {aceiteFiltrado.length === 0 ? (
                <Card className="bg-neutral-900/90 border-neutral-800">
                  <EmptyState
                    icon={Droplets}
                    title="No hay eventos de aceite en el período"
                    description="Registra el cambio de aceite o inspección sensorial diaria de las freidoras."
                    action={{
                      label: 'Registrar Control de Aceite',
                      onClick: () => handleAbrirAceiteFreidora(),
                    }}
                  />
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {aceiteFiltrado.map((reg) => {
                    const colorMeta = COLOR_ACEITE_META[reg.colorAceite];
                    const estadoMeta = ESTADO_ACEITE_META[reg.estadoAceite];
                    const eventoMeta = TIPO_EVENTO_ACEITE_META[reg.tipoEvento];

                    return (
                      <Card
                        key={reg.id}
                        className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${estadoMeta.badgeClass}`}
                            >
                              {estadoMeta.shortLabel}
                            </span>
                            <span className="font-display text-base font-bold text-white">
                              {reg.freidoraNombre}
                            </span>
                            <span className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-gold-300 font-semibold">
                              {eventoMeta.label}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-0.5 text-[11px] text-neutral-300">
                              <span
                                className={`h-2.5 w-2.5 rounded-full border ${colorMeta.swatchClass}`}
                                aria-hidden="true"
                              />
                              {colorMeta.shortLabel}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400">
                            {reg.fechaIso} · {reg.horaTexto} · Por:{' '}
                            <strong className="text-neutral-200">
                              {reg.responsableNombre}
                            </strong>
                            {typeof reg.litrosCambiados === 'number'
                              ? ` · ${reg.litrosCambiados} L`
                              : ''}
                            {reg.loteAceiteNuevo ? ` · Lote: ${reg.loteAceiteNuevo}` : ''}
                            {reg.gestorResiduosNombre
                              ? ` · ACU: ${reg.gestorResiduosNombre}`
                              : ''}
                          </p>
                          {reg.observaciones && (
                            <p className="text-xs text-neutral-400">
                              Obs: {reg.observaciones}
                            </p>
                          )}
                        </div>

                        {esAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              handleEliminar('registros_aceite_bpm', reg.id)
                            }
                            aria-label={`Eliminar evento de aceite de ${reg.freidoraNombre}`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-red-500/50 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: CHECKLISTS DE TURNO */}
        {tab === 'checklists' && (
          <div className="space-y-6">
            <Card className="p-5 bg-neutral-900/90 border-neutral-800">
              <ChecklistTurnoPanel
                plantillaApertura={config.plantillaApertura}
                plantillaCierre={config.plantillaCierre}
                checklistAperturaHoy={resumen.checklistAperturaHoy}
                checklistCierreHoy={resumen.checklistCierreHoy}
                onGuardarChecklist={guardarChecklist}
              />
            </Card>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-bold text-white">
                Historial de Checklists Firmados
              </h2>

              {checklistsFiltrados.length === 0 ? (
                <Card className="bg-neutral-900/90 border-neutral-800">
                  <EmptyState
                    icon={ClipboardCheck}
                    title="Aún no hay checklists registrados en este período"
                    description="Completa el checklist de apertura o cierre en el panel superior."
                  />
                </Card>
              ) : (
                <div className="space-y-2.5">
                  {checklistsFiltrados.map((chk) => (
                    <Card
                      key={chk.id}
                      className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              chk.estado === 'completado'
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : chk.estado === 'con_hallazgos'
                                ? 'border-red-500/50 bg-red-500/15 text-red-300'
                                : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {chk.estado === 'con_hallazgos' && (
                              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                            )}
                            {chk.estado === 'completado'
                              ? 'Completado'
                              : chk.estado === 'con_hallazgos'
                              ? `Con ${chk.itemsNoConformes} Hallazgo(s)`
                              : 'En Progreso'}
                          </span>
                          <span className="font-display text-base font-bold text-white">
                            {chk.tipo === 'apertura'
                              ? 'Checklist Apertura'
                              : 'Checklist Cierre'}{' '}
                            · {chk.fechaIso}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400">
                          Cumplimiento:{' '}
                          <strong className="text-gold-400 font-mono">
                            {chk.porcentajeCumplimiento}%
                          </strong>{' '}
                          ({chk.itemsCumplidos} cumplen, {chk.itemsNoConformes} no
                          conformes, {chk.itemsNa} N/A) · Responsable:{' '}
                          <strong className="text-neutral-200">
                            {chk.cerradoPor || chk.responsableNombre}
                          </strong>
                        </p>
                      </div>

                      {esAdmin && (
                        <button
                          type="button"
                          onClick={() => handleEliminar('checklists_bpm', chk.id)}
                          aria-label={`Eliminar checklist ${chk.tipo} ${chk.fechaIso}`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-red-500/50 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Modales */}
      <RegistrarTemperaturaModal
        isOpen={modalTempOpen}
        onClose={() => setModalTempOpen(false)}
        equipos={config.equiposFrio}
        equipoPreseleccionadoId={equipoPreseleccionado}
        onRegistrar={registrarTemperatura}
      />

      <RegistrarAceiteModal
        isOpen={modalAceiteOpen}
        onClose={() => setModalAceiteOpen(false)}
        freidoras={config.freidoras}
        freidoraPreseleccionadaId={freidoraPreseleccionada}
        onRegistrar={registrarAceite}
      />

      {esAdmin && (
        <ConfigurarEquiposBpmModal
          isOpen={modalConfigOpen}
          onClose={() => setModalConfigOpen(false)}
          config={config}
          onGuardar={guardarConfiguracion}
        />
      )}
    </div>
  );
}
