import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  LifeBuoy,
  MessageCircle,
  Play,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useReclamos } from '@/hooks/useReclamos';
import { useReportes } from '@/hooks/useReportes';
import {
  DetalleReclamoModal,
  RegistrarReclamoModal,
  ResolverReclamoModal,
} from '@/components/reclamos';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import type {
  CanalIncidenteReclamo,
  CausaRaizReclamo,
  ReclamoEvaluado,
  ReclamoPqrs,
  TipoPqrs,
} from '@/types/reclamo';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { formatCOP } from '@/utils/formatCOP';
import { obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';
import {
  CANAL_INCIDENTE_META,
  CANAL_INCIDENTE_ORDEN,
  CAUSA_RAIZ_META,
  CAUSA_RAIZ_ORDEN,
  construirUrlWhatsAppReclamo,
  ESTADO_RECLAMO_META,
  generarResumenReclamosWhatsApp,
  PRIORIDAD_RECLAMO_META,
  SLA_RECLAMO_META,
  TIPO_PQRS_META,
  TIPO_PQRS_ORDEN,
  TIPO_RESOLUCION_META,
} from '@/utils/reclamosUtils';

type TabReclamos = 'activos' | 'historial' | 'analitica';

export function ReclamosPage() {
  let nombreNegocio = 'La Parada';
  let esAdmin = false;
  try {
    const negCtx = useNegocio();
    nombreNegocio = negCtx.negocioActual.nombre || 'La Parada';
    esAdmin = negCtx.esSuperAdmin || negCtx.usuarioNegocio?.rol === 'admin';
  } catch {
    // Fallback seguro para renderizado aislado
  }

  const { ventas, resumen: resumenReportes } = useReportes();

  const totalPedidosMes = useMemo(() => {
    const mesPrefix = obtenerFechaIsoColombia().slice(0, 7);
    const delMes = (ventas || []).filter((v) => {
      if (v.estado === 'anulada') return false;
      const dt = toValidAdminDate(v.fecha);
      if (!dt) return false;
      return obtenerFechaIsoColombia(dt).startsWith(mesPrefix);
    }).length;
    return delMes > 0 ? delMes : resumenReportes?.cantidadVentas || 0;
  }, [ventas, resumenReportes?.cantidadVentas]);

  const {
    reclamos,
    reclamosFiltrados,
    reclamosActivos,
    resumen,
    loading,
    error,
    filtros,
    setFiltros,
    resetFiltros,
    registrarReclamo,
    actualizarEstado,
    resolverReclamo,
    marcarWhatsAppEnviado,
    eliminarReclamo,
    exportarCsv,
    refresh,
  } = useReclamos({ totalPedidosMes });

  const [tab, setTab] = useState<TabReclamos>('activos');
  const [modalRegistroOpen, setModalRegistroOpen] = useState(false);
  const [reclamoParaResolver, setReclamoParaResolver] = useState<ReclamoPqrs | null>(null);
  const [itemDetalle, setItemDetalle] = useState<ReclamoEvaluado | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const listaTab = useMemo(() => {
    if (tab === 'activos') {
      return reclamosFiltrados.filter((item) => item.esActivo);
    }
    if (tab === 'historial') {
      return reclamosFiltrados.filter((item) => !item.esActivo);
    }
    return reclamosFiltrados;
  }, [reclamosFiltrados, tab]);

  const handlePasarEnGestion = async (reclamo: ReclamoPqrs) => {
    try {
      setProcesandoId(reclamo.id);
      await actualizarEstado(reclamo.id, { estado: 'en_gestion' });
      createToast(`Caso ${reclamo.codigoRadicado} marcado En Gestión`, 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo actualizar el estado',
        'error'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleDescartar = async (reclamo: ReclamoPqrs) => {
    try {
      setProcesandoId(reclamo.id);
      await actualizarEstado(reclamo.id, { estado: 'descartado' });
      createToast(`Caso ${reclamo.codigoRadicado} descartado`, 'info');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo descartar el reclamo',
        'error'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleEliminar = async (reclamo: ReclamoPqrs) => {
    if (!window.confirm(`¿Eliminar permanentemente el radicado ${reclamo.codigoRadicado}?`)) {
      return;
    }
    try {
      setProcesandoId(reclamo.id);
      await eliminarReclamo(reclamo.id);
      createToast(`Radicado ${reclamo.codigoRadicado} eliminado`, 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo eliminar el reclamo',
        'error'
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleWhatsAppCliente = (item: ReclamoEvaluado) => {
    const modo = item.esActivo ? 'acuse' : 'resolucion';
    const url = construirUrlWhatsAppReclamo(item.reclamo, nombreNegocio, modo);
    window.open(url, '_blank', 'noopener,noreferrer');
    void marcarWhatsAppEnviado(item.reclamo.id).catch(() => undefined);
  };

  const handleCompartirResumenWhatsApp = () => {
    const encoded = generarResumenReclamosWhatsApp(nombreNegocio, resumen);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  if (error && !loading && reclamos.length === 0) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertTriangle}
            title="No pudimos cargar el módulo de Reclamos y PQRS"
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
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <LifeBuoy className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                Reclamos, PQRS &amp; Garantías
              </h1>
              <p className="text-xs text-neutral-400 sm:text-sm">
                Control de incidentes, SLA en vivo y compensación offline (reenvío, bono o caja)
              </p>
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
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin text-gold-400' : ''}`}
                aria-hidden="true"
              />
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
              onClick={handleCompartirResumenWhatsApp}
              className="min-h-[44px] gap-1.5 border-emerald-500/40 text-xs text-emerald-300"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setModalRegistroOpen(true)}
              className="min-h-[44px] gap-1.5 text-xs"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Registrar Reclamo
            </Button>
          </div>
        </header>

        {/* 4 KPI Cards */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Reclamos Abiertos &amp; SLA
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span
                className={`font-display text-2xl font-black ${
                  resumen.slaVencidosCount > 0
                    ? 'text-red-400'
                    : resumen.activosCount > 0
                    ? 'text-amber-300'
                    : 'text-emerald-400'
                }`}
              >
                {loading ? <Skeleton className="h-8 w-12" /> : resumen.activosCount}
              </span>
              <Badge
                variant={
                  resumen.slaVencidosCount > 0
                    ? 'no-disponible'
                    : resumen.activosCount > 0
                    ? 'pendiente'
                    : 'entregado'
                }
                className="text-[10px]"
              >
                SLA {resumen.tasaCumplimientoSlaPct}%
              </Badge>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.slaVencidosCount} vencido(s) · {resumen.slaPorVencerCount} por vencer
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Tasa de Reclamos
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="font-display text-2xl font-black text-sky-400">
                {loading ? (
                  <Skeleton className="h-8 w-14" />
                ) : (
                  `${resumen.tasaReclamosSobrePedidosPct}%`
                )}
              </span>
              <span className="text-xs font-semibold text-neutral-300">
                {resumen.resueltosCount} resuelto(s)
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Sobre {resumen.totalPedidosReferencia} pedido(s) · Prom.{' '}
              {resumen.tiempoPromedioResolucionMin} min
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Compensaciones (Mes)
            </p>
            <div className="mt-2 font-display text-2xl font-black text-gold-300">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                formatCOP(resumen.costoCompensacionesMesCOP)
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.reenviosGarantiaCount} reenvíos · {resumen.bonosCortesiaEmitidosCount}{' '}
              bonos · {resumen.devolucionesCajaCount} caja
            </p>
          </Card>

          <Card className="border-neutral-800 bg-neutral-900/90 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Causa Raíz Principal
            </p>
            <div className="mt-2 truncate font-display text-lg font-black text-white">
              {loading ? (
                <Skeleton className="h-7 w-28" />
              ) : resumen.causaRaizPrincipal ? (
                CAUSA_RAIZ_META[resumen.causaRaizPrincipal.causaRaiz].shortLabel
              ) : (
                'Sin incidentes'
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {resumen.causaRaizPrincipal
                ? `${resumen.causaRaizPrincipal.cantidad} caso(s) · ${resumen.causaRaizPrincipal.porcentaje}% del total`
                : 'Operación libre de reclamos'}
            </p>
          </Card>
        </section>

        {/* Tabs de navegación */}
        <nav aria-label="Vistas de reclamos y PQRS" className="flex flex-wrap gap-2">
          {(
            [
              {
                id: 'activos',
                label: `Activos y SLA (${reclamosActivos.length})`,
              },
              {
                id: 'historial',
                label: `Historial Resueltos (${resumen.resueltosCount + resumen.descartadosCount})`,
              },
              {
                id: 'analitica',
                label: `Analítica de Causas Raíz (${resumen.topCausasRaiz.length})`,
              },
            ] as Array<{ id: TabReclamos; label: string }>
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

        {/* Barra de Filtros (Tabs Activos / Historial) */}
        {tab !== 'analitica' && (
          <Card className="border-neutral-800 bg-neutral-900/80 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="relative lg:col-span-2">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Buscar por radicado, cliente, teléfono o causa"
                  value={filtros.busqueda}
                  onChange={(e) =>
                    setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
                  }
                  placeholder="Buscar radicado, cliente, bono, barrio..."
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-9 pr-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>

              <select
                aria-label="Filtrar por tipo PQRS"
                value={filtros.tipo}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    tipo: e.target.value as TipoPqrs | 'todos',
                  }))
                }
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white"
              >
                <option value="todos">Todos los tipos</option>
                {TIPO_PQRS_ORDEN.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_PQRS_META[t].label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por canal"
                value={filtros.canal}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    canal: e.target.value as CanalIncidenteReclamo | 'todos',
                  }))
                }
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white"
              >
                <option value="todos">Todos los canales</option>
                {CANAL_INCIDENTE_ORDEN.map((c) => (
                  <option key={c} value={c}>
                    {CANAL_INCIDENTE_META[c].label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por causa raíz"
                value={filtros.causaRaiz}
                onChange={(e) =>
                  setFiltros((prev) => ({
                    ...prev,
                    causaRaiz: e.target.value as CausaRaizReclamo | 'todos',
                  }))
                }
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-white"
              >
                <option value="todos">Todas las causas raíz</option>
                {CAUSA_RAIZ_ORDEN.map((c) => (
                  <option key={c} value={c}>
                    {CAUSA_RAIZ_META[c].shortLabel}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        )}

        {/* TAB 1 y 2: Listado de Casos */}
        {tab !== 'analitica' && (
          <>
            {loading && reclamos.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-56 w-full rounded-2xl" />
                ))}
              </div>
            ) : listaTab.length === 0 ? (
              <EmptyState
                icon={LifeBuoy}
                title={
                  tab === 'activos'
                    ? 'Sin reclamos activos pendientes'
                    : 'Sin casos resueltos con estos filtros'
                }
                description={
                  reclamos.length === 0
                    ? 'Cuando se registre una PQRS o garantía desde mostrador o domicilios aparecerá aquí con su reloj SLA.'
                    : 'No hay registros que coincidan con los filtros seleccionados.'
                }
                action={{
                  label:
                    reclamos.length === 0 ? 'Registrar primer reclamo' : 'Limpiar filtros',
                  onClick: () =>
                    reclamos.length === 0
                      ? setModalRegistroOpen(true)
                      : resetFiltros(),
                }}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {listaTab.map((item) => {
                  const { reclamo: r } = item;
                  const ocupado = procesandoId === r.id;
                  return (
                    <Card
                      key={r.id}
                      className="flex flex-col justify-between gap-4 border-neutral-800 bg-neutral-900/90 p-4"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-lg border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 font-mono text-xs font-bold text-gold-300">
                            {r.codigoRadicado}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold ${
                              SLA_RECLAMO_META[item.semaforoSla].badgeClass
                            }`}
                          >
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {SLA_RECLAMO_META[item.semaforoSla].shortLabel} ·{' '}
                            {item.minutosTranscurridos}m/{r.slaObjetivoMin}m
                          </span>
                        </div>

                        <div>
                          <h2 className="font-display text-lg font-bold text-white">
                            {r.clienteNombre}
                          </h2>
                          <p className="text-xs text-neutral-400">
                            {r.clienteTelefono || 'Sin teléfono'} · Pedido{' '}
                            <strong className="text-gold-300">
                              {formatCOP(r.montoPedidoCOP)}
                            </strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              TIPO_PQRS_META[r.tipo].badgeClass
                            }`}
                          >
                            {TIPO_PQRS_META[r.tipo].shortLabel}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              CANAL_INCIDENTE_META[r.canal].badgeClass
                            }`}
                          >
                            {CANAL_INCIDENTE_META[r.canal].shortLabel}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              PRIORIDAD_RECLAMO_META[r.prioridad].badgeClass
                            }`}
                          >
                            {PRIORIDAD_RECLAMO_META[r.prioridad].label}
                          </span>
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                              ESTADO_RECLAMO_META[r.estado].badgeClass
                            }`}
                          >
                            {ESTADO_RECLAMO_META[r.estado].label}
                          </span>
                        </div>

                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 text-xs space-y-1">
                          <p className="font-semibold text-amber-300">
                            Causa: {CAUSA_RAIZ_META[r.causaRaiz].label}
                          </p>
                          <p className="line-clamp-3 text-neutral-300">{r.descripcion}</p>
                        </div>

                        {r.tipoResolucion && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs">
                            <p className="font-bold text-emerald-300">
                              ✓ {TIPO_RESOLUCION_META[r.tipoResolucion].shortLabel}
                              {typeof r.montoCompensacionCOP === 'number' &&
                              r.montoCompensacionCOP > 0
                                ? ` · ${formatCOP(r.montoCompensacionCOP)}`
                                : ''}
                            </p>
                            {r.bonoCortesiaCodigo && (
                              <p className="font-mono text-[11px] text-gold-300">
                                Bono: {r.bonoCortesiaCodigo}
                              </p>
                            )}
                            {r.movimientoCajaCodigo && (
                              <p className="font-mono text-[11px] text-rose-300">
                                Caja: {r.movimientoCajaCodigo}
                              </p>
                            )}
                            {r.reenvioDomicilioId && (
                              <p className="font-mono text-[11px] text-sky-300">
                                Reenvío: #{r.reenvioDomicilioId.slice(-6).toUpperCase()}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setItemDetalle(item)}
                          className="min-h-[44px] text-xs"
                        >
                          <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          Detalle
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleWhatsAppCliente(item)}
                          className="min-h-[44px] border-emerald-500/40 text-xs text-emerald-300"
                        >
                          <MessageCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                          WhatsApp
                        </Button>

                        {item.esActivo && r.estado === 'abierto' && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={ocupado}
                            onClick={() => handlePasarEnGestion(r)}
                            className="min-h-[44px] border-amber-500/40 text-xs text-amber-300"
                          >
                            <Play className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            En Gestión
                          </Button>
                        )}

                        {item.esActivo && (
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            disabled={ocupado}
                            onClick={() => setReclamoParaResolver(r)}
                            className="min-h-[44px] flex-1 text-xs"
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            Resolver
                          </Button>
                        )}

                        {item.esActivo && esAdmin && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={ocupado}
                            onClick={() => handleDescartar(r)}
                            className="min-h-[44px] text-xs text-neutral-400"
                          >
                            Descartar
                          </Button>
                        )}

                        {!item.esActivo && esAdmin && (
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => handleEliminar(r)}
                            aria-label={`Eliminar radicado ${r.codigoRadicado}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/40"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* TAB 3: Analítica de Causas Raíz */}
        {tab === 'analitica' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Card className="border-neutral-800 bg-neutral-900/90 p-5 lg:col-span-7">
              <div className="mb-4 flex items-center gap-2 border-b border-neutral-800 pb-3">
                <BarChart3 className="h-5 w-5 text-gold-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-white">
                  Ranking de Causas Raíz &amp; Costo de Garantías
                </h2>
              </div>

              {resumen.topCausasRaiz.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  Aún no hay casos suficientes para construir el Pareto de causas raíz.
                </p>
              ) : (
                <div className="space-y-3">
                  {resumen.topCausasRaiz.map((c) => (
                    <div
                      key={c.causaRaiz}
                      className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white">{c.label}</span>
                          <span className="ml-2 text-neutral-400">
                            ({CAUSA_RAIZ_META[c.causaRaiz].areaResponsable})
                          </span>
                        </div>
                        <span className="font-mono font-bold text-gold-300">
                          {c.cantidad} ({c.porcentaje}%) · {formatCOP(c.compensacionCOP)}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-gold-400 transition-all"
                          style={{ width: `${Math.max(4, c.porcentaje)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border-neutral-800 bg-neutral-900/90 p-5 lg:col-span-5">
              <div className="mb-4 border-b border-neutral-800 pb-3">
                <h2 className="font-display text-lg font-bold text-white">
                  Incidentes por Canal
                </h2>
                <p className="text-xs text-neutral-400">
                  Distribución por punto de contacto con el cliente
                </p>
              </div>
              <div className="space-y-2.5">
                {CANAL_INCIDENTE_ORDEN.map((canal) => (
                  <div
                    key={canal}
                    className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950/70 px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-semibold text-neutral-200">
                      {CANAL_INCIDENTE_META[canal].label}
                    </span>
                    <span className="font-display text-base font-black text-white">
                      {resumen.porCanal[canal] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      <RegistrarReclamoModal
        isOpen={modalRegistroOpen}
        onClose={() => setModalRegistroOpen(false)}
        onRegistrarReclamo={registrarReclamo}
      />

      <ResolverReclamoModal
        isOpen={Boolean(reclamoParaResolver)}
        onClose={() => setReclamoParaResolver(null)}
        reclamo={reclamoParaResolver}
        nombreNegocio={nombreNegocio}
        onResolverReclamo={resolverReclamo}
        onMarcarWhatsApp={marcarWhatsAppEnviado}
      />

      <DetalleReclamoModal
        isOpen={Boolean(itemDetalle)}
        onClose={() => setItemDetalle(null)}
        item={itemDetalle}
        nombreNegocio={nombreNegocio}
        onMarcarWhatsApp={marcarWhatsAppEnviado}
        onAbrirResolver={(item) => setReclamoParaResolver(item.reclamo)}
      />
    </div>
  );
}
