import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Flame,
  MessageCircle,
  Scale,
  Settings2,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  EstadoEjecucionPresupuesto,
  ResumenMetasYPresupuesto,
  SeveridadAlertaPresupuesto,
} from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import {
  obtenerMesKeyAnterior,
  obtenerMesKeySiguiente,
} from '@/utils/metasPresupuestoUtils';

export interface CentroMetasPresupuestoCardProps {
  resumen: ResumenMetasYPresupuesto;
  loading: boolean;
  error: string | null;
  puedeEditar: boolean;
  tieneMesAnteriorParaCopiar: boolean;
  guardando: boolean;
  urlWhatsApp: string;
  onCambiarMes: (nuevoMesKey: string) => void;
  onAbrirConfiguracion: () => void;
  onCopiarMesAnterior: () => Promise<void>;
  onExportarCsv: () => void;
  onNotificarBandeja: () => Promise<number>;
  onReintentar: () => void;
}

const BADGE_ESTADO_LINEA: Record<
  EstadoEjecucionPresupuesto,
  { label: string; className: string; barClass: string }
> = {
  controlado: {
    label: 'Controlado',
    className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
    barClass: 'bg-emerald-500',
  },
  alerta: {
    label: 'Precaución',
    className: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
    barClass: 'bg-amber-400',
  },
  excedido: {
    label: 'Excedido',
    className: 'border-red-500/40 bg-red-500/20 text-red-300',
    barClass: 'bg-red-500',
  },
  sin_presupuesto: {
    label: 'Sin tope',
    className: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
    barClass: 'bg-sky-400',
  },
};

const ESTILO_ALERTA: Record<
  SeveridadAlertaPresupuesto,
  { container: string; iconColor: string; badge: string; label: string }
> = {
  critica: {
    container: 'border-red-500/40 bg-red-500/10',
    iconColor: 'text-red-400',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    label: 'Crítica',
  },
  alta: {
    container: 'border-amber-500/40 bg-amber-500/10',
    iconColor: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    label: 'Preventiva',
  },
  media: {
    container: 'border-sky-500/35 bg-sky-500/10',
    iconColor: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    label: 'Seguimiento',
  },
};

export function CentroMetasPresupuestoCard({
  resumen,
  loading,
  error,
  puedeEditar,
  tieneMesAnteriorParaCopiar,
  guardando,
  urlWhatsApp,
  onCambiarMes,
  onAbrirConfiguracion,
  onCopiarMesAnterior,
  onExportarCsv,
  onNotificarBandeja,
  onReintentar,
}: CentroMetasPresupuestoCardProps) {
  const {
    temporalidad,
    configuracion,
    tieneConfiguracionGuardada,
    lineasPresupuesto,
    puntoEquilibrio,
    metaComercial,
    alertas,
    saludPresupuestal,
  } = resumen;

  const handleNotificarEquipo = async () => {
    const enviadas = await onNotificarBandeja();
    if (enviadas > 0) {
      createToast(
        `${enviadas} alerta${enviadas > 1 ? 's' : ''} enviada${enviadas > 1 ? 's' : ''} a la Bandeja de Notificaciones`,
        'success'
      );
    } else {
      createToast(
        'Las alertas de desviación de este mes ya están registradas o no hay alertas críticas/altas activas.',
        'info'
      );
    }
  };

  const handleCopiarPrevio = async () => {
    try {
      await onCopiarMesAnterior();
      createToast(`Presupuesto clonado para ${temporalidad.etiquetaMes}`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos copiar el mes anterior';
      createToast(msg, 'error');
    }
  };

  if (loading) {
    return (
      <Card className="p-5 sm:p-6 bg-neutral-900/90 border-neutral-800 space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5 bg-neutral-900/90 border-neutral-800">
        <EmptyState
          icon={AlertTriangle}
          title="No pudimos cargar el Centro de Metas y Presupuesto"
          description={error}
          action={{ label: 'Reintentar', onClick: onReintentar }}
        />
      </Card>
    );
  }

  const porcentajeBarraMeta = Math.min(100, Math.max(0, metaComercial.porcentajeCumplimiento));
  const porcentajeBarraBE = Math.min(100, Math.max(0, puntoEquilibrio.porcentajeEquilibrioAlcanzado));

  return (
    <Card
      id="centro-metas-presupuesto"
      className="p-4 sm:p-6 bg-neutral-900/90 border-neutral-800 shadow-xl space-y-6"
    >
      {/* Cabecera del Centro de Metas, Presupuesto y Punto de Equilibrio */}
      <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-gold-400" aria-hidden="true" />
              <span>Metas Comerciales, Presupuesto & Punto de Equilibrio</span>
            </h2>
            <Badge
              variant={
                saludPresupuestal === 'optima'
                  ? 'entregado'
                  : saludPresupuestal === 'atencion'
                  ? 'pendiente'
                  : 'no-disponible'
              }
              className="text-xs font-bold px-2.5 py-0.5"
            >
              {saludPresupuestal === 'optima' && 'Presupuesto Saludable'}
              {saludPresupuestal === 'atencion' && 'Desviaciones Preventivas'}
              {saludPresupuestal === 'critica' && 'Alerta de Sobregiro'}
            </Badge>
          </div>
          <p className="text-xs text-neutral-400">
            Mes evaluado: <strong className="text-neutral-200">{temporalidad.etiquetaMes}</strong> · Día{' '}
            <strong className="text-neutral-200">{temporalidad.diasTranscurridos}</strong> de{' '}
            {temporalidad.diasEnMes} ({temporalidad.porcentajeMesTranscurrido}% del mes transcurrido)
          </p>
        </div>

        {/* Controles de Mes y Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex items-center rounded-xl border border-neutral-700 bg-neutral-950 p-1"
            role="group"
            aria-label="Cambiar mes de presupuesto"
          >
            <button
              type="button"
              onClick={() => onCambiarMes(obtenerMesKeyAnterior(resumen.mesKey))}
              aria-label="Ver mes anterior de presupuesto"
              className="grid h-10 w-10 place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="px-3 text-xs font-bold text-white font-display">
              {temporalidad.etiquetaMes}
            </span>
            <button
              type="button"
              onClick={() => onCambiarMes(obtenerMesKeySiguiente(resumen.mesKey))}
              aria-label="Ver mes siguiente de presupuesto"
              className="grid h-10 w-10 place-items-center rounded-lg text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {puedeEditar && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onAbrirConfiguracion}
              className="min-h-[44px] gap-1.5 text-xs font-bold"
            >
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              <span>{tieneConfiguracionGuardada ? 'Editar Metas y Presupuesto' : 'Configurar Metas'}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onExportarCsv}
            aria-label="Exportar presupuesto, metas y punto de equilibrio a CSV"
            className="min-h-[44px] gap-1.5 text-xs font-semibold text-neutral-200 hover:border-emerald-400"
          >
            <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>CSV</span>
          </Button>

          <a
            href={urlWhatsApp}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Compartir pulso de metas y punto de equilibrio por WhatsApp"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Onboarding si el mes aún no tiene presupuesto guardado */}
      {!tieneConfiguracionGuardada && (
        <div className="rounded-xl border border-gold-400/35 bg-gold-400/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-bold text-gold-200 flex items-center gap-2">
              <Target className="h-4 w-4 text-gold-400" aria-hidden="true" />
              Aún no has definido las metas ni el presupuesto de {temporalidad.etiquetaMes}
            </p>
            <p className="text-xs text-neutral-300">
              Seguimos mostrando tus ventas y gastos reales del mes. Configura tus costos fijos y topes por categoría para activar el Punto de Equilibrio y las alertas automáticas.
            </p>
          </div>
          {puedeEditar && (
            <div className="flex flex-wrap gap-2 shrink-0">
              {tieneMesAnteriorParaCopiar && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={guardando}
                  onClick={handleCopiarPrevio}
                  className="min-h-[44px] gap-1.5 border-gold-400/40 text-xs font-semibold text-gold-200"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copiar mes anterior</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={onAbrirConfiguracion}
                className="min-h-[44px] gap-1.5 text-xs font-bold"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Configurar ahora</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Alertas de Desviación de Gastos y Rentabilidad */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>Monitor de Alertas y Desviaciones ({alertas.length})</span>
          </h3>
          {alertas.length > 0 && temporalidad.esMesActual && tieneConfiguracionGuardada && (
            <button
              type="button"
              onClick={handleNotificarEquipo}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 transition-colors hover:border-amber-400 hover:text-white"
            >
              <BellRing className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Enviar a Bandeja Operativa</span>
            </button>
          )}
        </div>

        {alertas.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3.5 flex items-center gap-3 text-xs text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            <span>
              {tieneConfiguracionGuardada
                ? 'Todas las categorías de gasto y el Food Cost se mantienen dentro de los umbrales presupuestados.'
                : 'Sin sobregiros configurados aún. Define tus topes mensuales para monitorear desviaciones en vivo.'}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {alertas.map((alerta) => {
              const style = ESTILO_ALERTA[alerta.severidad];
              return (
                <div
                  key={alerta.id}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 ${style.container}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${style.iconColor}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-white">{alerta.titulo}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-300 leading-relaxed">{alerta.mensaje}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[11px]">
                    <span className="text-neutral-300 font-mono">
                      Impacto: <strong className="text-white">{formatCOP(alerta.impactoCOP)}</strong>
                    </span>
                    <Link
                      to={alerta.rutaAccion}
                      className="inline-flex items-center gap-1 font-semibold text-gold-300 hover:text-gold-200"
                    >
                      <span>{alerta.etiquetaAccion}</span>
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bloque Dual: Meta Comercial + Punto de Equilibrio */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Panel 1: Meta Comercial & Ritmo */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gold-400">
                1. Meta Comercial del Mes
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-black text-white">
                  {formatCOP(metaComercial.ventasNetasMesCOP)}
                </span>
                <span className="text-xs text-neutral-400">
                  / {metaComercial.metaVentasMensualCOP > 0 ? formatCOP(metaComercial.metaVentasMensualCOP) : 'Sin meta'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`font-display text-xl font-black ${
                  metaComercial.porcentajeCumplimiento >= 100
                    ? 'text-emerald-400'
                    : metaComercial.enRitmoMeta
                    ? 'text-gold-400'
                    : 'text-amber-400'
                }`}
              >
                {metaComercial.porcentajeCumplimiento}%
              </span>
              <span className="block text-[11px] text-neutral-400">Cumplimiento</span>
            </div>
          </div>

          {/* Barra de progreso con marcador de ritmo esperado */}
          <div className="space-y-1.5">
            <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  metaComercial.porcentajeCumplimiento >= 100
                    ? 'bg-emerald-500'
                    : metaComercial.enRitmoMeta
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${porcentajeBarraMeta}%` }}
              />
              {temporalidad.esMesActual && metaComercial.metaVentasMensualCOP > 0 && (
                <div
                  title={`Ritmo ideal del día: ${temporalidad.porcentajeMesTranscurrido}%`}
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                  style={{ left: `${Math.min(99, temporalidad.porcentajeMesTranscurrido)}%` }}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-neutral-400">
                Ritmo esperado hoy ({temporalidad.porcentajeMesTranscurrido}%):{' '}
                <strong className="text-neutral-200">{formatCOP(metaComercial.ventaEsperadaAlDiaCOP)}</strong>
              </span>
              {metaComercial.metaVentasMensualCOP > 0 && (
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    metaComercial.desviacionRitmoCOP >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {metaComercial.desviacionRitmoCOP >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {metaComercial.desviacionRitmoCOP >= 0 ? '+' : ''}
                    {formatCOP(metaComercial.desviacionRitmoCOP)} vs ritmo
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-800/80 text-xs">
            <div className="rounded-xl bg-neutral-900 p-3 border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Proyección Cierre Mes</span>
              <span className="mt-0.5 font-display text-sm sm:text-base font-bold text-white block">
                {formatCOP(metaComercial.proyeccionCierreMesCOP)}
              </span>
              <span className="text-[10px] text-neutral-500">
                Prom. actual: {formatCOP(metaComercial.ventaDiariaPromedioActualCOP)}/día
              </span>
            </div>

            <div className="rounded-xl bg-neutral-900 p-3 border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Meta Diaria Necesaria</span>
              <span className="mt-0.5 font-display text-sm sm:text-base font-bold text-gold-400 block">
                {formatCOP(metaComercial.metaDiariaRequeridaRestanteCOP)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {temporalidad.diasRestantesIncluyendoHoy > 0
                  ? `Para los ${temporalidad.diasRestantesIncluyendoHoy} días restantes`
                  : 'Período finalizado'}
              </span>
            </div>

            {metaComercial.metaUtilidadNetaMensualCOP > 0 && (
              <div className="col-span-2 rounded-xl bg-neutral-900 p-3 border border-neutral-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Utilidad Neta Real vs Meta</span>
                  <span className="text-xs text-neutral-300">
                    Objetivo: {formatCOP(metaComercial.metaUtilidadNetaMensualCOP)}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-display text-sm sm:text-base font-bold ${
                      metaComercial.utilidadNetaActualCOP >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCOP(metaComercial.utilidadNetaActualCOP)}
                  </span>
                  <span className="block text-[10px] text-neutral-400">
                    {metaComercial.porcentajeCumplimientoUtilidad}% logrado
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel 2: Punto de Equilibrio (Break-Even Point) en Tiempo Real */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                2. Punto de Equilibrio (Break-Even)
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-2xl font-black text-white">
                  {formatCOP(puntoEquilibrio.puntoEquilibrioMensualCOP)}
                </span>
                <span className="text-xs text-neutral-400">en ventas/mes</span>
              </div>
            </div>

            <Badge
              variant={puntoEquilibrio.equilibrioAlcanzado ? 'entregado' : 'pendiente'}
              className="text-xs font-bold px-2.5 py-1"
            >
              {puntoEquilibrio.equilibrioAlcanzado ? '¡Equilibrio Superado!' : `${puntoEquilibrio.porcentajeEquilibrioAlcanzado}% cubierto`}
            </Badge>
          </div>

          {/* Termómetro visual de Break-Even */}
          <div className="space-y-1.5">
            <div className="h-3.5 w-full overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  puntoEquilibrio.equilibrioAlcanzado
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : puntoEquilibrio.porcentajeEquilibrioAlcanzado >= 70
                    ? 'bg-gradient-to-r from-amber-500 to-gold-400'
                    : 'bg-gradient-to-r from-red-500 to-orange-500'
                }`}
                style={{ width: `${porcentajeBarraBE}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              {puntoEquilibrio.equilibrioAlcanzado ? (
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  Superávit post-equilibrio: +{formatCOP(puntoEquilibrio.superavitSobreEquilibrioVentasCOP)} en ventas
                </span>
              ) : (
                <span className="text-neutral-300">
                  Faltan <strong className="text-amber-400">{formatCOP(puntoEquilibrio.faltanteParaEquilibrioCOP)}</strong> para cubrir costos fijos
                </span>
              )}

              {puntoEquilibrio.diaEstimadoEquilibrio && !puntoEquilibrio.equilibrioAlcanzado && (
                <span className="text-neutral-400">
                  Cruce estimado: Día {Math.min(temporalidad.diasEnMes + 15, puntoEquilibrio.diaEstimadoEquilibrio)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-neutral-800/80 text-xs">
            <div className="rounded-xl bg-neutral-900 p-3 border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Break-Even Diario</span>
              <span className="mt-0.5 font-display text-sm sm:text-base font-bold text-sky-300 block">
                {formatCOP(puntoEquilibrio.puntoEquilibrioDiarioCOP)}
              </span>
              <span className="text-[10px] text-neutral-500">
                {puntoEquilibrio.pedidosEquilibrioMes > 0
                  ? `≈ ${puntoEquilibrio.pedidosEquilibrioMes} pedidos en el mes`
                  : 'Según ticket promedio'}
              </span>
            </div>

            <div className="rounded-xl bg-neutral-900 p-3 border border-neutral-800/80">
              <span className="text-[11px] text-neutral-400 block">Costos Fijos + Margen</span>
              <span className="mt-0.5 font-display text-sm sm:text-base font-bold text-white block">
                {formatCOP(puntoEquilibrio.costosFijosConsideradosCOP)}
              </span>
              <span className="text-[10px] text-neutral-500">
                Margen contribución: {puntoEquilibrio.margenContribucionAplicadoPct}% (
                {puntoEquilibrio.fuenteMargen === 'real' ? 'Real' : 'Objetivo'})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla / Matriz de Ejecución de Presupuesto por Categoría */}
      <div className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Ejecución del Presupuesto Operativo Mensual (OPEX & Food Cost)
            </h3>
            <p className="text-xs text-neutral-400">
              Comparativa en vivo de gastos registrados vs tope mensual (alerta preventiva al {configuracion.umbralAlertaGastoPct}%).
            </p>
          </div>
          <div className="text-xs text-neutral-300 font-mono">
            Ejecutado:{' '}
            <strong className={resumen.porcentajeEjecucionOpex > 100 ? 'text-red-400' : 'text-white'}>
              {formatCOP(resumen.totalEjecutadoOpexCOP)}
            </strong>{' '}
            / {formatCOP(resumen.totalPresupuestoOpexCOP)} ({resumen.porcentajeEjecucionOpex}%)
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {lineasPresupuesto.map((linea) => {
            const metaBadge = BADGE_ESTADO_LINEA[linea.estado];
            const anchoBarra = Math.min(100, Math.max(0, linea.porcentajeEjecucion));

            return (
              <div
                key={linea.categoria}
                className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">{linea.nombre}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          linea.tipoCosto === 'fijo'
                            ? 'bg-sky-500/15 text-sky-300'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {linea.tipoCosto}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-500">
                      {linea.cantidadRegistros} registro{linea.cantidadRegistros !== 1 ? 's' : ''} en el mes
                    </span>
                  </div>

                  <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold ${metaBadge.className}`}>
                    {metaBadge.label}
                  </span>
                </div>

                {/* Barra de ejecución con marca del umbral preventivo */}
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${metaBadge.barClass}`}
                    style={{ width: `${anchoBarra}%` }}
                  />
                  {linea.presupuestadoCOP > 0 && (
                    <div
                      title={`Umbral preventivo: ${configuracion.umbralAlertaGastoPct}%`}
                      className="absolute top-0 bottom-0 w-0.5 bg-neutral-300/70"
                      style={{ left: `${configuracion.umbralAlertaGastoPct}%` }}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-neutral-300">
                    Gastado: <strong className="font-mono text-white">{formatCOP(linea.ejecutadoCOP)}</strong>{' '}
                    <span className="text-neutral-500">
                      / {linea.presupuestadoCOP > 0 ? formatCOP(linea.presupuestadoCOP) : 'Sin tope'}
                    </span>
                  </span>
                  <span
                    className={`font-mono font-semibold ${
                      linea.disponibleCOP < 0
                        ? 'text-red-400'
                        : linea.estado === 'alerta'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {linea.presupuestadoCOP > 0
                      ? linea.disponibleCOP >= 0
                        ? `Disponible: ${formatCOP(linea.disponibleCOP)} (${linea.porcentajeEjecucion}%)`
                        : `Sobregiro: +${formatCOP(linea.excedidoCOP)} (${linea.porcentajeEjecucion}%)`
                      : linea.ejecutadoCOP > 0
                      ? 'Requiere asignar tope'
                      : '0%'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Fila de Control de Food Cost (CMV %) */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-xs font-bold text-white">
              Control de Costo de Recetas (Food Cost / CMV Real vs Objetivo)
            </span>
            <p className="text-[11px] text-neutral-400">
              Insumos consumidos por ventas del mes: {formatCOP(resumen.cmvRealCOP)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-400">
              Objetivo máx: <strong className="text-white">{configuracion.foodCostObjetivoPct}%</strong>
            </span>
            <Badge
              variant={
                resumen.porcentajeCmvReal <= configuracion.foodCostObjetivoPct
                  ? 'entregado'
                  : 'no-disponible'
              }
              className="font-mono text-xs font-bold"
            >
              Real: {resumen.porcentajeCmvReal}%
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
