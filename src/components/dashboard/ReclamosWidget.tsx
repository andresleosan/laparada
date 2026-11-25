import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { ReclamoEvaluado, ResumenReclamos } from '@/types/reclamo';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/utils/formatCOP';
import { CAUSA_RAIZ_META, SLA_RECLAMO_META } from '@/utils/reclamosUtils';

export interface ReclamosWidgetProps {
  resumen: ResumenReclamos;
  reclamosActivos: ReclamoEvaluado[];
  loading: boolean;
  error: string | null;
  onReintentar: () => void;
}

export function ReclamosWidget({
  resumen,
  reclamosActivos,
  loading,
  error,
  onReintentar,
}: ReclamosWidgetProps) {
  if (loading) {
    return (
      <Card className="space-y-3 border-neutral-800 bg-neutral-900/90 p-5">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="space-y-3 border-neutral-800 bg-neutral-900/90 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>No pudimos consultar Reclamos &amp; PQRS</span>
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

  const badgeVariant =
    resumen.estadoGlobal === 'critico'
      ? 'no-disponible'
      : resumen.estadoGlobal === 'atencion'
      ? 'pendiente'
      : 'entregado';

  const badgeLabel =
    resumen.estadoGlobal === 'critico'
      ? `Crítico · SLA ${resumen.tasaCumplimientoSlaPct}%`
      : resumen.estadoGlobal === 'atencion'
      ? `En gestión · SLA ${resumen.tasaCumplimientoSlaPct}%`
      : `Al día · SLA ${resumen.tasaCumplimientoSlaPct}%`;

  return (
    <Card className="space-y-4 border-neutral-800 bg-neutral-900/90 p-5">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          {resumen.estadoGlobal === 'al_dia' ? (
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <ShieldAlert
              className={`h-5 w-5 shrink-0 ${
                resumen.estadoGlobal === 'critico' ? 'text-red-400' : 'text-amber-400'
              }`}
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">
              Reclamos, PQRS &amp; Garantías
            </h2>
            <p className="text-[11px] text-neutral-400">
              {resumen.resueltosCount} resuelto(s) · Compensaciones mes:{' '}
              {formatCOP(resumen.costoCompensacionesMesCOP)}
            </p>
          </div>
        </div>

        <Badge variant={badgeVariant} className="shrink-0 text-[10px] font-bold">
          {badgeLabel}
        </Badge>
      </div>

      {/* 3 Mini KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-amber-300">
            <LifeBuoy className="h-3 w-3" aria-hidden="true" />
            Activos
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.activosCount}
          </span>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-red-300">
            <Clock className="h-3 w-3" aria-hidden="true" />
            SLA Vencido
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.slaVencidosCount}
          </span>
        </div>

        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-sky-300">
            Tasa %
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.tasaReclamosSobrePedidosPct}%
          </span>
        </div>
      </div>

      {reclamosActivos.length > 0 ? (
        <div className="space-y-1.5">
          {reclamosActivos.slice(0, 3).map((item) => (
            <Link
              key={item.reclamo.id}
              to="/reclamos"
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors hover:brightness-110 ${
                SLA_RECLAMO_META[item.semaforoSla].badgeClass
              }`}
            >
              <span className="truncate font-semibold">
                {item.reclamo.codigoRadicado} · {item.reclamo.clienteNombre} (
                {CAUSA_RAIZ_META[item.reclamo.causaRaiz].shortLabel})
              </span>
              <span className="shrink-0 font-mono font-bold">
                {SLA_RECLAMO_META[item.semaforoSla].shortLabel}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {resumen.totalReclamos > 0
              ? 'Sin reclamos pendientes. Todos los casos han sido atendidos.'
              : 'Sin PQRS ni garantías registradas en la operación.'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/reclamos"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-400/15 px-3 text-xs font-bold text-gold-300 hover:bg-gold-400/25"
        >
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Gestionar PQRS</span>
        </Link>
        <Link
          to="/domicilios"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-white"
        >
          <span>Ir a Domicilios</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
