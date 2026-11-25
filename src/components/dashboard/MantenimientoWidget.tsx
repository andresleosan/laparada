import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type {
  EquipoMantenimientoEvaluado,
  ReporteFallaEquipo,
  ResumenMantenimiento,
} from '@/types/mantenimiento';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/utils/formatCOP';
import { SEMAFORO_MANTENIMIENTO_META } from '@/utils/mantenimientoUtils';

export interface MantenimientoWidgetProps {
  resumen: ResumenMantenimiento;
  equiposEvaluados: EquipoMantenimientoEvaluado[];
  fallasAbiertas: ReporteFallaEquipo[];
  loading: boolean;
  error: string | null;
  onReintentar: () => void;
}

export function MantenimientoWidget({
  resumen,
  equiposEvaluados,
  fallasAbiertas,
  loading,
  error,
  onReintentar,
}: MantenimientoWidgetProps) {
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
          <span>No pudimos consultar Mantenimiento Preventivo</span>
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
      ? `Crítico · ${resumen.scoreSaludPct}%`
      : resumen.estadoGlobal === 'atencion'
      ? `Atención · ${resumen.scoreSaludPct}%`
      : `Al día · ${resumen.scoreSaludPct}%`;

  const equiposEnAlerta = equiposEvaluados.filter(
    (e) =>
      e.semaforo === 'vencido' ||
      e.semaforo === 'proximo_7d' ||
      e.equipo.estadoOperativo === 'con_falla' ||
      e.equipo.estadoOperativo === 'fuera_servicio'
  );

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
              Mantenimiento &amp; Extintores
            </h2>
            <p className="text-[11px] text-neutral-400">
              {resumen.activosOperativos}/{resumen.totalActivos} equipo(s) operativo(s) · Mes:{' '}
              {formatCOP(resumen.gastoMantenimientoMesCOP)}
            </p>
          </div>
        </div>

        <Badge variant={badgeVariant} className="shrink-0 text-[10px] font-bold">
          {badgeLabel}
        </Badge>
      </div>

      {/* 3 Mini KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-orange-300">
            <Wrench className="h-3 w-3" aria-hidden="true" />
            Vencen ≤7d
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.vencidosCount + resumen.proximos7dCount}
          </span>
        </div>

        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-red-300">
            <Flame className="h-3 w-3" aria-hidden="true" />
            Gas / Extintor
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.extintoresYGasAlertaCount}
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-amber-300">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Fallas KDS
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.fallasAbiertasCount}
          </span>
        </div>
      </div>

      {/* Alertas o confirmación */}
      {fallasAbiertas.length > 0 || equiposEnAlerta.length > 0 ? (
        <div className="space-y-1.5">
          {fallasAbiertas.slice(0, 1).map((f) => (
            <Link
              key={f.id}
              to="/mantenimiento"
              className="flex items-center justify-between gap-2 rounded-xl border border-red-500/50 bg-red-500/15 px-3 py-2 text-xs text-red-200 transition-colors hover:brightness-110"
            >
              <span className="truncate font-semibold">
                Falla KDS: {f.equipoNombre}
              </span>
              <span className="shrink-0 font-bold uppercase">{f.severidad}</span>
            </Link>
          ))}

          {equiposEnAlerta.slice(0, 2).map((item) => (
            <Link
              key={item.equipo.id}
              to="/mantenimiento"
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors hover:brightness-110 ${
                SEMAFORO_MANTENIMIENTO_META[item.semaforo].badgeClass
              }`}
            >
              <span className="truncate font-semibold">{item.equipo.nombre}</span>
              <span className="shrink-0 font-mono font-bold">
                {item.fechaVencimientoCriticaIso || item.equipo.estadoOperativo}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {resumen.totalActivos > 0
              ? 'Equipos, extintores y red de gas operando al día.'
              : 'Sin activos registrados todavía. Configura tu hoja de vida.'}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/mantenimiento"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-400/15 px-3 text-xs font-bold text-gold-300 hover:bg-gold-400/25"
        >
          <Wrench className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Abrir Mantenimiento</span>
        </Link>
        <Link
          to="/gastos"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-white"
        >
          <span>Ver Gastos</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
