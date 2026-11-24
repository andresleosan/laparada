import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { LoteEvaluadoSanitario, ResumenSanitarioBodega } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/utils/formatCOP';
import {
  formatearFechaVencimientoCorta,
  SEMAFORO_SANITARIO_META,
} from '@/utils/lotesInventarioUtils';

export interface SemaforoSanitarioWidgetProps {
  resumen: ResumenSanitarioBodega;
  lotesEvaluados: LoteEvaluadoSanitario[];
  loading: boolean;
  error: string | null;
  onReintentar: () => void;
}

export function SemaforoSanitarioWidget({
  resumen,
  lotesEvaluados,
  loading,
  error,
  onReintentar,
}: SemaforoSanitarioWidgetProps) {
  if (loading) {
    return (
      <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-3">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-3">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-bold">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <span>No pudimos consultar los lotes de bodega</span>
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

  const lotesEnRiesgo = lotesEvaluados.filter(
    (l) =>
      l.estado === 'activo' &&
      l.cantidadDisponible > 0 &&
      (l.estadoSemaforo === 'vencido' ||
        l.estadoSemaforo === 'critico_3d' ||
        l.estadoSemaforo === 'proximo_7d')
  );

  const badgeVariant =
    resumen.estadoGlobal === 'critico'
      ? 'no-disponible'
      : resumen.estadoGlobal === 'alerta' || resumen.estadoGlobal === 'preventivo'
      ? 'pendiente'
      : 'entregado';

  const badgeLabel =
    resumen.estadoGlobal === 'critico'
      ? `${resumen.vencidosCount} vencido(s)`
      : resumen.estadoGlobal === 'alerta'
      ? `Alerta ≤ 3d (${resumen.criticos3dCount})`
      : resumen.estadoGlobal === 'preventivo'
      ? `Preventivo 7d (${resumen.proximos7dCount})`
      : 'Saludable';

  return (
    <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {resumen.estadoGlobal === 'saludable' ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              Semáforo Sanitario PEPS
            </h2>
            <p className="text-[11px] text-neutral-400">
              {resumen.totalLotesActivos} lote(s) activo(s) en bodega
            </p>
          </div>
        </div>

        <Badge variant={badgeVariant} className="text-[10px] font-bold shrink-0">
          {badgeLabel}
        </Badge>
      </div>

      {/* 3 Contadores de Caducidad */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-2.5 text-center">
          <span className="block text-[10px] font-bold uppercase text-red-300">Vencidos</span>
          <span className="mt-0.5 block font-display text-lg font-bold text-red-400">
            {resumen.vencidosCount}
          </span>
        </div>
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-2.5 text-center">
          <span className="block text-[10px] font-bold uppercase text-orange-300">≤ 3 días</span>
          <span className="mt-0.5 block font-display text-lg font-bold text-orange-400">
            {resumen.criticos3dCount}
          </span>
        </div>
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-center">
          <span className="block text-[10px] font-bold uppercase text-amber-300">4–7 días</span>
          <span className="mt-0.5 block font-display text-lg font-bold text-amber-300">
            {resumen.proximos7dCount}
          </span>
        </div>
      </div>

      {lotesEnRiesgo.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2">
            <span className="text-neutral-300">Capital perecedero en riesgo:</span>
            <strong className="font-mono font-bold text-gold-400">
              {formatCOP(resumen.valorEnRiesgoCOP)}
            </strong>
          </div>

          <div className="space-y-1.5">
            {lotesEnRiesgo.slice(0, 3).map((lote) => {
              const meta = SEMAFORO_SANITARIO_META[lote.estadoSemaforo];
              return (
                <Link
                  key={lote.id}
                  to="/inventario?tab=lotes"
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors hover:brightness-110 ${meta.badgeClass}`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">
                      {lote.insumoNombre} · <span className="font-mono">{lote.codigoLote}</span>
                    </div>
                    <div className="text-[11px] opacity-90">
                      {lote.cantidadDisponible} {lote.unidadMedida} · Vence{' '}
                      {formatearFechaVencimientoCorta(lote.fechaVencimiento)}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] font-bold">
                    {lote.diasParaVencer !== null && lote.diasParaVencer < 0
                      ? `${Math.abs(lote.diasParaVencer)}d venc.`
                      : lote.diasParaVencer === 0
                      ? 'HOY'
                      : `${lote.diasParaVencer}d`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {resumen.totalLotesActivos > 0
              ? 'Todos los lotes perecederos están vigentes y rotando por PEPS.'
              : 'Sin vencimientos próximos ni lotes vencidos en bodega.'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/inventario?tab=lotes"
          className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gold-400/15 border border-gold-400/40 px-3 text-xs font-bold text-gold-300 hover:bg-gold-400/25"
        >
          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Gestionar Lotes PEPS</span>
        </Link>
        <Link
          to="/notificaciones"
          className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-white"
        >
          <Bell className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ver Alertas</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
