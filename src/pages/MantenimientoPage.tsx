import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Flame,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import { useMantenimiento } from '@/hooks/useMantenimiento';
import {
  EquipoActivoModal,
  HojaVidaEquipoModal,
  RegistrarOrdenMantenimientoModal,
  ReportarFallaModal,
} from '@/components/mantenimiento';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import type {
  CategoriaEquipoMantenimiento,
  EquipoActivoMantenimiento,
  EquipoMantenimientoEvaluado,
  EstadoOperativoEquipo,
  EstadoSemaforoMantenimiento,
  ReporteFallaEquipo,
} from '@/types/mantenimiento';
import { formatCOP } from '@/utils/formatCOP';
import {
  CATEGORIA_EQUIPO_META,
  CATEGORIA_EQUIPO_ORDEN,
  ESTADO_FALLA_META,
  ESTADO_OPERATIVO_EQUIPO_META,
  generarResumenMantenimientoWhatsApp,
  SEMAFORO_MANTENIMIENTO_META,
  SEVERIDAD_FALLA_META,
  TIPO_AGENTE_EXTINTOR_META,
  TIPO_ORDEN_MANTENIMIENTO_META,
} from '@/utils/mantenimientoUtils';

type TabMantenimiento = 'hoja_vida' | 'seguridad' | 'fallas' | 'historial';

export function MantenimientoPage() {
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
    equipos,
    ordenes,
    fallas,
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
  } = useMantenimiento();

  const [tab, setTab] = useState<TabMantenimiento>('hoja_vida');
  const [inicializandoPlantilla, setInicializandoPlantilla] = useState(false);

  const [modalEquipoOpen, setModalEquipoOpen] = useState(false);
  const [equipoEditar, setEquipoEditar] = useState<EquipoActivoMantenimiento | null>(null);

  const [modalOrdenOpen, setModalOrdenOpen] = useState(false);
  const [equipoParaOrdenId, setEquipoParaOrdenId] = useState<string | undefined>();
  const [fallaParaOrden, setFallaParaOrden] = useState<ReporteFallaEquipo | null>(null);

  const [modalFallaOpen, setModalFallaOpen] = useState(false);
  const [equipoParaFallaId, setEquipoParaFallaId] = useState<string | undefined>();

  const [hojaVidaItem, setHojaVidaItem] = useState<EquipoMantenimientoEvaluado | null>(null);

  const handleInicializarPlantilla = async () => {
    try {
      setInicializandoPlantilla(true);
      const res = await inicializarPlantilla(responsableNombre);
      if (res.creadosCount > 0) {
        createToast(
          `Se agregaron ${res.creadosCount} activos base (cocción, frío, extracción, extintor y red de gas)`,
          'success'
        );
      } else {
        createToast('La plantilla estándar ya se encuentra cargada', 'info');
      }
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo cargar la plantilla base',
        'error'
      );
    } finally {
      setInicializandoPlantilla(false);
    }
  };

  const handleCompartirWhatsApp = () => {
    const encoded = generarResumenMantenimientoWhatsApp(
      nombreNegocio,
      resumen,
      equiposEvaluados,
      fallas
    );
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleAbrirOrdenParaEquipo = (equipoId?: string, falla?: ReporteFallaEquipo) => {
    setEquipoParaOrdenId(equipoId);
    setFallaParaOrden(falla || null);
    setModalOrdenOpen(true);
  };

  const handleDescartarFalla = async (falla: ReporteFallaEquipo) => {
    try {
      await resolverFalla(falla.id, {
        estado: 'descartada',
        resueltoPor: responsableNombre,
        resolucionNotas: 'Descartada / verificada sin daño mecánico',
      });
      createToast('Reporte de falla cerrado', 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo cerrar la falla',
        'error'
      );
    }
  };

  if (error && !loading && equipos.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertTriangle}
            title="No pudimos cargar el módulo de Mantenimiento"
            description={error}
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark px-4 pb-24 pt-4 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabecera */}
        <header className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
                <Wrench className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Mantenimiento Preventivo &amp; Activos
                </h1>
                <p className="text-xs text-neutral-400 sm:text-sm">
                  Hoja de vida de equipos, calendario preventivo, extintores/red de gas y fallas KDS
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="min-h-[44px] gap-1.5 text-xs"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-gold-400' : ''}`} />
              Actualizar
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => exportarCsv(nombreNegocio)}
              className="min-h-[44px] gap-1.5 text-xs"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exportar CSV
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCompartirWhatsApp}
              className="min-h-[44px] gap-1.5 border-emerald-500/40 text-xs text-emerald-300"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setEquipoParaFallaId(undefined);
                setModalFallaOpen(true);
              }}
              className="min-h-[44px] gap-1.5 border-red-500/40 bg-red-950/30 text-xs text-red-200 hover:bg-red-900/40"
            >
              <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
              Reportar Falla
            </Button>

            {esAdmin && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAbrirOrdenParaEquipo()}
                  disabled={equipos.length === 0}
                  className="min-h-[44px] gap-1.5 border-emerald-500/40 bg-emerald-500/15 text-xs text-emerald-200"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  Registrar Orden
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEquipoEditar(null);
                    setModalEquipoOpen(true);
                  }}
                  className="min-h-[44px] gap-1.5 text-xs"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Nuevo Activo
                </Button>
              </>
            )}
          </div>
        </header>

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Salud del Parque
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-black text-white">
                {loading ? <Skeleton className="h-8 w-16" /> : `${resumen.scoreSaludPct}%`}
              </span>
              <Badge
                variant={
                  resumen.estadoGlobal === 'critico'
                    ? 'no-disponible'
                    : resumen.estadoGlobal === 'atencion'
                    ? 'pendiente'
                    : 'entregado'
                }
                className="text-[10px]"
              >
                {resumen.activosOperativos}/{resumen.totalActivos} operativos
              </Badge>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.vencidosCount} vencido(s) · {resumen.proximos7dCount} ≤ 7 días
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Extintores &amp; Red Gas
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span
                className={`font-display text-2xl font-black ${
                  resumen.extintoresYGasAlertaCount > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {loading ? <Skeleton className="h-8 w-12" /> : equiposSeguridad.length}
              </span>
              <span className="text-xs font-semibold text-neutral-300">
                {resumen.extintoresYGasAlertaCount > 0
                  ? `${resumen.extintoresYGasAlertaCount} por vencer/vencido`
                  : 'Certificados al día'}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Recargas anuales y hermeticidad
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Fallas Abiertas KDS
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span
                className={`font-display text-2xl font-black ${
                  resumen.fallasCriticasCount > 0
                    ? 'text-red-400'
                    : resumen.fallasAbiertasCount > 0
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {loading ? <Skeleton className="h-8 w-12" /> : resumen.fallasAbiertasCount}
              </span>
              {resumen.fallasCriticasCount > 0 && (
                <Badge variant="no-disponible" className="text-[10px]">
                  {resumen.fallasCriticasCount} crítica(s)
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.activosConFallaOFueraServicio} equipo(s) con novedad
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Gasto Mantenimiento (Mes)
            </p>
            <div className="mt-2 font-display text-2xl font-black text-gold-300">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCOP(resumen.gastoMantenimientoMesCOP)
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.ordenesConciliadasCount} orden(es) conciliada(s) en /gastos
            </p>
          </Card>
        </section>

        {/* Tabs de navegación */}
        <nav aria-label="Vistas de mantenimiento" className="flex flex-wrap gap-2">
          {(
            [
              {
                id: 'hoja_vida',
                label: `Hoja de Vida y Calendario (${equiposEvaluados.length})`,
              },
              {
                id: 'seguridad',
                label: `Extintores & Red de Gas (${equiposSeguridad.length})`,
              },
              {
                id: 'fallas',
                label: `Fallas Reportadas (${fallasAbiertas.length} abiertas)`,
              },
              {
                id: 'historial',
                label: `Historial y Costos (${ordenes.length})`,
              },
            ] as Array<{ id: TabMantenimiento; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`min-h-[44px] rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
                tab === item.id
                  ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Estado vacío inicial con plantilla de 6 activos */}
        {!loading && equipos.length === 0 && tab !== 'fallas' && tab !== 'historial' && (
          <Card className="border-neutral-800 bg-neutral-900/90 p-8 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <Sparkles className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Inicializa el Inventario de Equipos de Cocina
            </h2>
            <p className="mx-auto mt-1 max-w-xl text-sm text-neutral-400">
              Crea tus activos manualmente o carga en 1 clic la plantilla estándar de La Parada
              (Freidora, Plancha, Nevera, Campana Extractora, Extintor Tipo K y Red de Gas).
            </p>
            {esAdmin && (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  variant="primary"
                  loading={inicializandoPlantilla}
                  disabled={inicializandoPlantilla}
                  onClick={handleInicializarPlantilla}
                  className="min-h-[44px]"
                >
                  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Cargar 6 Equipos Estándar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setEquipoEditar(null);
                    setModalEquipoOpen(true);
                  }}
                  className="min-h-[44px]"
                >
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Crear Activo Manual
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* TAB 1: HOJA DE VIDA Y CALENDARIO */}
        {tab === 'hoja_vida' && equipos.length > 0 && (
          <div className="space-y-4">
            {/* Barra de filtros */}
            <Card className="border-neutral-800 bg-neutral-900/80 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="relative lg:col-span-2">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    aria-label="Buscar equipo por nombre, código o técnico"
                    value={filtros.busqueda}
                    onChange={(e) =>
                      setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
                    }
                    placeholder="Buscar equipo, código, ubicación o técnico..."
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <select
                  aria-label="Filtrar por categoría"
                  value={filtros.categoria}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      categoria: e.target.value as CategoriaEquipoMantenimiento | 'todas',
                    }))
                  }
                  className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white"
                >
                  <option value="todas">Todas las categorías</option>
                  {CATEGORIA_EQUIPO_ORDEN.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORIA_EQUIPO_META[cat].label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Filtrar por semáforo preventivo"
                  value={filtros.semaforo}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      semaforo: e.target.value as EstadoSemaforoMantenimiento | 'todos',
                    }))
                  }
                  className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white"
                >
                  <option value="todos">Todo vencimiento</option>
                  <option value="vencido">Vencidos</option>
                  <option value="proximo_7d">Próximos ≤ 7 días</option>
                  <option value="proximo_30d">Próximos 8–30 días</option>
                  <option value="al_dia">Al día</option>
                  <option value="sin_programar">Sin fecha</option>
                </select>

                <select
                  aria-label="Filtrar por estado operativo"
                  value={filtros.estadoOperativo}
                  onChange={(e) =>
                    setFiltros((prev) => ({
                      ...prev,
                      estadoOperativo: e.target.value as EstadoOperativoEquipo | 'todos',
                    }))
                  }
                  className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white"
                >
                  <option value="todos">Todos los estados</option>
                  <option value="operativo">Operativo</option>
                  <option value="en_mantenimiento">En Mantenimiento</option>
                  <option value="con_falla">Con Falla</option>
                  <option value="fuera_servicio">Fuera de Servicio</option>
                </select>
              </div>
            </Card>

            {equiposFiltrados.length === 0 ? (
              <Card className="border-neutral-800 bg-neutral-900/90 p-8 text-center">
                <p className="text-sm text-neutral-400">
                  Ningún equipo coincide con los filtros seleccionados.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetFiltros}
                  className="mt-3 min-h-[44px]"
                >
                  Limpiar filtros
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {equiposFiltrados.map((item) => {
                  const { equipo } = item;
                  return (
                    <Card
                      key={equipo.id}
                      className="flex flex-col justify-between gap-4 border-neutral-800 bg-neutral-900/90 p-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-lg border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 font-mono text-xs font-bold text-gold-300">
                            {equipo.codigoActivo}
                          </span>
                          <span
                            className={`rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                              SEMAFORO_MANTENIMIENTO_META[item.semaforo].badgeClass
                            }`}
                          >
                            {SEMAFORO_MANTENIMIENTO_META[item.semaforo].label}
                          </span>
                        </div>

                        <div>
                          <h2 className="font-display text-lg font-bold text-white">
                            {equipo.nombre}
                          </h2>
                          <p className="text-xs text-neutral-400">{equipo.ubicacion}</p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              CATEGORIA_EQUIPO_META[equipo.categoria].badgeClass
                            }`}
                          >
                            {CATEGORIA_EQUIPO_META[equipo.categoria].shortLabel}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              ESTADO_OPERATIVO_EQUIPO_META[equipo.estadoOperativo].badgeClass
                            }`}
                          >
                            {ESTADO_OPERATIVO_EQUIPO_META[equipo.estadoOperativo].label}
                          </span>
                          {item.fallasAbiertasCount > 0 && (
                            <span className="rounded-md border border-red-500/50 bg-red-500/15 px-2 py-0.5 text-[11px] font-bold text-red-300">
                              {item.fallasAbiertasCount} falla(s) abierta(s)
                            </span>
                          )}
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-neutral-400">{item.motivoVencimiento}:</span>
                            <span className="font-mono font-bold text-white">
                              {item.fechaVencimientoCriticaIso || 'Sin fecha'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-400">Acumulado / Interv.:</span>
                            <span className="font-mono text-gold-300">
                              {formatCOP(equipo.costoAcumuladoCOP)} · {equipo.totalIntervenciones}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setHojaVidaItem(item)}
                          className="min-h-[44px] flex-1 text-xs"
                        >
                          Hoja de Vida
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setEquipoParaFallaId(equipo.id);
                            setModalFallaOpen(true);
                          }}
                          className="min-h-[44px] border-red-500/30 text-xs text-red-300"
                        >
                          Falla
                        </Button>
                        {esAdmin && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleAbrirOrdenParaEquipo(equipo.id)}
                            className="min-h-[44px] text-xs"
                          >
                            Orden
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXTINTORES Y RED DE GAS */}
        {tab === 'seguridad' && (
          <div className="space-y-4">
            {equiposSeguridad.length === 0 ? (
              <Card className="border-neutral-800 bg-neutral-900/90 p-8 text-center">
                <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-gold-400" aria-hidden="true" />
                <p className="text-sm text-neutral-300">
                  No hay extintores ni certificados de red de gas registrados aún.
                </p>
                {esAdmin && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleInicializarPlantilla}
                    className="mt-4 min-h-[44px]"
                  >
                    Cargar Extintor Tipo K y Red de Gas
                  </Button>
                )}
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {equiposSeguridad.map((item) => {
                  const { equipo } = item;
                  const esExtintor = equipo.categoria === 'extintor';
                  return (
                    <Card
                      key={equipo.id}
                      className="space-y-3 border-neutral-800 bg-neutral-900/90 p-5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                              esExtintor
                                ? 'border-red-500/40 bg-red-500/15 text-red-300'
                                : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {esExtintor ? (
                              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <Flame className="h-5 w-5" aria-hidden="true" />
                            )}
                          </div>
                          <div>
                            <h2 className="font-display text-lg font-bold text-white">
                              {equipo.nombre}
                            </h2>
                            <p className="text-xs text-neutral-400">
                              {equipo.codigoActivo} · {equipo.ubicacion}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
                            SEMAFORO_MANTENIMIENTO_META[item.semaforo].badgeClass
                          }`}
                        >
                          {SEMAFORO_MANTENIMIENTO_META[item.semaforo].label}
                        </span>
                      </div>

                      {esExtintor ? (
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs">
                          <div>
                            <span className="text-neutral-400">Agente:</span>
                            <p className="font-semibold text-white">
                              {equipo.tipoAgenteExtintor
                                ? TIPO_AGENTE_EXTINTOR_META[equipo.tipoAgenteExtintor].label
                                : 'Tipo K'}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Capacidad:</span>
                            <p className="font-semibold text-white">
                              {equipo.capacidadExtintor || 'No especificada'}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Vence recarga anual:</span>
                            <p className="font-mono font-bold text-gold-300">
                              {equipo.fechaRecargaVenceIso || 'Sin programar'}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Prueba hidrostática:</span>
                            <p className="font-mono font-bold text-white">
                              {equipo.fechaPruebaHidrostaticaIso || 'Sin programar'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs">
                          <div>
                            <span className="text-neutral-400">Vence certificado gas:</span>
                            <p className="font-mono font-bold text-gold-300">
                              {equipo.certificadoGasVenceIso || 'Sin programar'}
                            </p>
                          </div>
                          <div>
                            <span className="text-neutral-400">Empresa certificadora:</span>
                            <p className="font-semibold text-white">
                              {equipo.empresaCertificadora || 'Por definir'}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setHojaVidaItem(item)}
                          className="min-h-[44px] flex-1 text-xs"
                        >
                          Ver Ficha
                        </Button>
                        {esAdmin && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleAbrirOrdenParaEquipo(equipo.id)}
                            className="min-h-[44px] flex-1 text-xs"
                          >
                            {esExtintor ? 'Registrar Recarga' : 'Registrar Inspección Gas'}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FALLAS REPORTADAS (KDS Y PANEL) */}
        {tab === 'fallas' && (
          <div className="space-y-3">
            {fallas.length === 0 ? (
              <Card className="border-neutral-800 bg-neutral-900/90 p-8 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" aria-hidden="true" />
                <p className="font-display text-lg font-bold text-white">
                  Sin fallas de equipos reportadas
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  Cuando cocina reporte una avería desde la pantalla KDS o desde aquí, aparecerá inmediatamente en este tablero.
                </p>
              </Card>
            ) : (
              fallas.map((falla) => (
                <Card
                  key={falla.id}
                  className="flex flex-col justify-between gap-4 border-neutral-800 bg-neutral-900/90 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                          SEVERIDAD_FALLA_META[falla.severidad].badgeClass
                        }`}
                      >
                        {SEVERIDAD_FALLA_META[falla.severidad].label}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                          ESTADO_FALLA_META[falla.estado].badgeClass
                        }`}
                      >
                        {ESTADO_FALLA_META[falla.estado].label}
                      </span>
                      {falla.detieneOperacion && (
                        <span className="rounded-md border border-red-500/60 bg-red-500/20 px-2 py-0.5 text-[11px] font-black text-red-200">
                          DETIENE OPERACIÓN
                        </span>
                      )}
                      <span className="font-mono text-xs text-neutral-400">
                        {falla.fechaIso} · {falla.origenReporte}
                      </span>
                    </div>

                    <h3 className="font-display text-base font-bold text-white">
                      {falla.equipoNombre}
                    </h3>
                    <p className="text-sm text-neutral-300">{falla.descripcion}</p>
                    <p className="text-xs text-neutral-400">
                      Reportado por: <strong className="text-neutral-200">{falla.reportadoPor}</strong>
                      {falla.resolucionNotas ? ` · Resolución: ${falla.resolucionNotas}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {esAdmin &&
                      (falla.estado === 'abierta' || falla.estado === 'en_atencion') && (
                        <>
                          {falla.equipoId && (
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                handleAbrirOrdenParaEquipo(falla.equipoId, falla)
                              }
                              className="min-h-[44px] text-xs"
                            >
                              Resolver con Orden
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDescartarFalla(falla)}
                            className="min-h-[44px] text-xs"
                          >
                            Cerrar
                          </Button>
                        </>
                      )}
                    {esAdmin && (
                      <button
                        type="button"
                        aria-label={`Eliminar reporte de falla ${falla.equipoNombre}`}
                        onClick={() => eliminarFalla(falla.id)}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-red-500/40 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 4: HISTORIAL DE ÓRDENES Y COSTOS */}
        {tab === 'historial' && (
          <div className="space-y-3">
            {ordenes.length === 0 ? (
              <Card className="border-neutral-800 bg-neutral-900/90 p-8 text-center">
                <p className="text-sm text-neutral-400">
                  Aún no hay órdenes de mantenimiento registradas.
                </p>
              </Card>
            ) : (
              ordenes.map((ord) => (
                <Card
                  key={ord.id}
                  className="flex flex-col justify-between gap-3 border-neutral-800 bg-neutral-900/90 p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-neutral-400">
                        {ord.fechaIso}
                      </span>
                      <span className="rounded-md border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 font-mono text-xs font-bold text-gold-300">
                        {ord.equipoCodigo || ord.equipoId}
                      </span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                          TIPO_ORDEN_MANTENIMIENTO_META[ord.tipo].badgeClass
                        }`}
                      >
                        {TIPO_ORDEN_MANTENIMIENTO_META[ord.tipo].label}
                      </span>
                      {ord.conciliadoConGasto && (
                        <span className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                          Conciliado /gastos
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base font-bold text-white">
                      {ord.equipoNombre}
                    </h3>
                    <p className="text-xs text-neutral-300">{ord.descripcionTrabajo}</p>
                    <p className="text-xs text-neutral-400">
                      Técnico: {ord.tecnicoNombre}
                      {ord.numeroFactura ? ` · Factura: ${ord.numeroFactura}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-display text-lg font-bold text-gold-300">
                        {formatCOP(ord.costoCOP)}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {ord.metodoPagoGasto ? `Pago: ${ord.metodoPagoGasto}` : 'Sin costo'}
                      </p>
                    </div>
                    {esAdmin && (
                      <button
                        type="button"
                        aria-label={`Eliminar orden de ${ord.equipoNombre}`}
                        onClick={() => eliminarOrden(ord.id)}
                        className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-red-500/40 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      <EquipoActivoModal
        isOpen={modalEquipoOpen}
        onClose={() => setModalEquipoOpen(false)}
        equipoEditar={equipoEditar}
        onCrear={crearEquipo}
        onActualizar={actualizarEquipo}
      />

      <RegistrarOrdenMantenimientoModal
        isOpen={modalOrdenOpen}
        onClose={() => {
          setModalOrdenOpen(false);
          setFallaParaOrden(null);
        }}
        equipos={equipos}
        equipoPreseleccionadoId={equipoParaOrdenId}
        fallaPreseleccionada={fallaParaOrden}
        onRegistrarOrden={registrarOrden}
      />

      <ReportarFallaModal
        isOpen={modalFallaOpen}
        onClose={() => setModalFallaOpen(false)}
        equipos={equipos}
        origenReporte="panel_mantenimiento"
        equipoPreseleccionadoId={equipoParaFallaId}
        onReportarFalla={reportarFalla}
      />

      <HojaVidaEquipoModal
        isOpen={Boolean(hojaVidaItem)}
        onClose={() => setHojaVidaItem(null)}
        item={hojaVidaItem}
        ordenes={ordenes}
        fallas={fallas}
        esAdmin={esAdmin}
        onEditar={() => {
          if (!hojaVidaItem) return;
          const eq = hojaVidaItem.equipo;
          setHojaVidaItem(null);
          setEquipoEditar(eq);
          setModalEquipoOpen(true);
        }}
        onRegistrarOrden={() => {
          if (!hojaVidaItem) return;
          const eqId = hojaVidaItem.equipo.id;
          setHojaVidaItem(null);
          handleAbrirOrdenParaEquipo(eqId);
        }}
      />

      {esAdmin && hojaVidaItem && (
        <span className="sr-only">
          <button
            type="button"
            onClick={() => eliminarEquipo(hojaVidaItem.equipo.id)}
          >
            Eliminar equipo
          </button>
        </span>
      )}
    </div>
  );
}
