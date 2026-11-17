import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  Scale,
  Settings2,
  Target,
} from 'lucide-react';
import type { ResumenMetasYPresupuesto } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/utils/formatCOP';

export interface MetasBreakEvenWidgetProps {
  resumen: ResumenMetasYPresupuesto;
  loading: boolean;
  error: string | null;
  puedeEditar: boolean;
  onAbrirConfiguracion: () => void;
  onReintentar: () => void;
}

export function MetasBreakEvenWidget({
  resumen,
  loading,
  error,
  puedeEditar,
  onAbrirConfiguracion,
  onReintentar,
}: MetasBreakEvenWidgetProps) {
  if (loading) {
    return (
      <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>No pudimos cargar las metas del mes</span>
        </div>
        <p className="text-xs text-neutral-400">{error}</p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onReintentar}
          className="min-h-[44px] text-xs"
        >
          Reintentar consulta
        </Button>
      </Card>
    );
  }

  const {
    temporalidad,
    tieneConfiguracionGuardada,
    metaComercial,
    puntoEquilibrio,
    alertas,
    saludPresupuestal,
  } = resumen;

  const metaHoyObjetivo =
    metaComercial.metaDiariaRequeridaRestanteCOP > 0
      ? metaComercial.metaDiariaRequeridaRestanteCOP
      : metaComercial.metaDiariaBaseCOP;
  const pctHoy =
    metaHoyObjetivo > 0
      ? Math.min(100, Math.round((metaComercial.ventasHoyCOP / metaHoyObjetivo) * 100))
      : 0;
  const pctMes = Math.min(100, Math.max(0, metaComercial.porcentajeCumplimiento));
  const pctBE = Math.min(100, Math.max(0, puntoEquilibrio.porcentajeEquilibrioAlcanzado));

  return (
    <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Target className="h-5 w-5 text-gold-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              Metas & Punto de Equilibrio
            </h2>
            <p className="text-[11px] text-neutral-400">
              {temporalidad.etiquetaMes} · Día {temporalidad.diasTranscurridos}/{temporalidad.diasEnMes}
            </p>
          </div>
        </div>

        <Badge
          variant={
            !tieneConfiguracionGuardada
              ? 'pendiente'
              : saludPresupuestal === 'optima'
              ? 'entregado'
              : saludPresupuestal === 'atencion'
              ? 'pendiente'
              : 'no-disponible'
          }
          className="text-[10px] font-bold shrink-0"
        >
          {!tieneConfiguracionGuardada && 'Sin configurar'}
          {tieneConfiguracionGuardada && saludPresupuestal === 'optima' && 'En regla'}
          {tieneConfiguracionGuardada && saludPresupuestal === 'atencion' && `${alertas.length} alertas`}
          {tieneConfiguracionGuardada && saludPresupuestal === 'critica' && 'Sobregiro'}
        </Badge>
      </div>

      {!tieneConfiguracionGuardada ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 p-3.5 text-xs space-y-1.5">
            <p className="font-bold text-gold-200">
              Activa tu Punto de Equilibrio y Alertas de Gastos
            </p>
            <p className="text-neutral-300 leading-relaxed">
              Este mes llevas <strong className="text-white">{formatCOP(metaComercial.ventasNetasMesCOP)}</strong> en ventas netas y{' '}
              <strong className="text-red-300">{formatCOP(resumen.totalEjecutadoOpexCOP)}</strong> en gastos. Define tu meta y costos fijos para saber cuánto debes vender al día.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {puedeEditar && (
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={onAbrirConfiguracion}
                className="flex-1 min-h-[44px] gap-1.5 text-xs font-bold"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
                <span>Configurar Metas</span>
              </Button>
            )}
            <Link
              to="/reportes"
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-white"
            >
              <span>Ver Reportes</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Meta de Hoy + Meta del Mes */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-neutral-400">Meta de Hoy</span>
                <span className="font-bold text-gold-400">{pctHoy}%</span>
              </div>
              <div className="font-display text-base font-bold text-white">
                {formatCOP(metaComercial.ventasHoyCOP)}
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pctHoy >= 100 ? 'bg-emerald-500' : 'bg-gold-400'
                  }`}
                  style={{ width: `${pctHoy}%` }}
                />
              </div>
              <span className="block text-[10px] text-neutral-400">
                Meta hoy: {formatCOP(metaHoyObjetivo)}
              </span>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold uppercase tracking-wider text-neutral-400">Meta del Mes</span>
                <span className="font-bold text-emerald-400">{metaComercial.porcentajeCumplimiento}%</span>
              </div>
              <div className="font-display text-base font-bold text-white">
                {formatCOP(metaComercial.ventasNetasMesCOP)}
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pctMes >= 100
                      ? 'bg-emerald-500'
                      : metaComercial.enRitmoMeta
                      ? 'bg-gold-400'
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${pctMes}%` }}
                />
              </div>
              <span className="block text-[10px] text-neutral-400">
                Meta: {formatCOP(metaComercial.metaVentasMensualCOP)}
              </span>
            </div>
          </div>

          {/* Break-Even en vivo */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-sky-300 flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Punto de Equilibrio</span>
              </span>
              <span className="font-mono font-bold text-white">
                {formatCOP(puntoEquilibrio.puntoEquilibrioMensualCOP)}
              </span>
            </div>

            <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  puntoEquilibrio.equilibrioAlcanzado ? 'bg-emerald-500' : 'bg-sky-400'
                }`}
                style={{ width: `${pctBE}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              {puntoEquilibrio.equilibrioAlcanzado ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                  Equilibrio superado (+{formatCOP(puntoEquilibrio.superavitSobreEquilibrioVentasCOP)})
                </span>
              ) : (
                <span className="text-neutral-300">
                  Faltan <strong className="text-amber-400">{formatCOP(puntoEquilibrio.faltanteParaEquilibrioCOP)}</strong>
                </span>
              )}
              <span className="text-neutral-400 font-mono">
                {formatCOP(puntoEquilibrio.puntoEquilibrioDiarioCOP)}/día
              </span>
            </div>
          </div>

          {/* Alertas de desviación */}
          {alertas.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                Alertas de Desviación ({alertas.length})
              </span>
              {alertas.slice(0, 3).map((alerta) => (
                <Link
                  key={alerta.id}
                  to={alerta.rutaAccion}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors hover:brightness-110 ${
                    alerta.severidad === 'critica'
                      ? 'border-red-500/35 bg-red-500/10 text-red-200'
                      : alerta.severidad === 'alta'
                      ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
                      : 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                  }`}
                >
                  <span className="truncate font-medium">{alerta.titulo}</span>
                  <span className="shrink-0 font-mono font-bold text-[11px]">
                    {alerta.porcentajeActual !== undefined ? `${alerta.porcentajeActual}%` : formatCOP(alerta.impactoCOP)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Gastos del mes dentro del presupuesto</span>
            </div>
          )}

          {/* Acciones */}
          <div className="flex flex-wrap gap-2 pt-1">
            {puedeEditar && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={onAbrirConfiguracion}
                className="flex-1 min-h-[44px] gap-1.5 text-xs"
              >
                <Settings2 className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                <span>Ajustar Metas</span>
              </Button>
            )}
            <Link
              to="/reportes"
              className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-white"
            >
              <span>Ver Presupuesto</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
