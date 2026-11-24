import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
} from 'lucide-react';
import type {
  EstadoEquipoFrioEvaluado,
  EstadoFreidoraEvaluada,
  ResumenCumplimientoBpm,
} from '@/types/bpm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ESTADO_CONFORMIDAD_TEMP_META } from '@/utils/bpmUtils';

export interface BitacoraBpmWidgetProps {
  resumen: ResumenCumplimientoBpm;
  equiposEvaluados: EstadoEquipoFrioEvaluado[];
  freidorasEvaluadas: EstadoFreidoraEvaluada[];
  loading: boolean;
  error: string | null;
  onReintentar: () => void;
}

export function BitacoraBpmWidget({
  resumen,
  equiposEvaluados,
  freidorasEvaluadas,
  loading,
  error,
  onReintentar,
}: BitacoraBpmWidgetProps) {
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
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>No pudimos consultar la Bitácora Sanitaria BPM</span>
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
      ? `Crítico · ${resumen.scoreCumplimientoPct}%`
      : resumen.estadoGlobal === 'atencion'
      ? `Atención · ${resumen.scoreCumplimientoPct}%`
      : `Cumple · ${resumen.scoreCumplimientoPct}%`;

  const equiposPendientesOAlerta = equiposEvaluados.filter(
    (e) => e.estadoHoy !== 'conforme'
  );
  const freidorasAtencion = freidorasEvaluadas.filter(
    (f) => f.estadoCiclo === 'cambiar_urgente' || f.estadoCiclo === 'por_vencer'
  );

  return (
    <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2 min-w-0">
          {resumen.estadoGlobal === 'cumple' ? (
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
          ) : (
            <ShieldAlert
              className={`h-5 w-5 shrink-0 ${
                resumen.estadoGlobal === 'critico' ? 'text-red-400' : 'text-amber-400'
              }`}
              aria-hidden="true"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white truncate">
              Bitácora Sanitaria BPM
            </h2>
            <p className="text-[11px] text-neutral-400">
              {resumen.equiposConLecturaHoy}/{resumen.equiposActivosCount} equipo(s) medido(s) hoy
            </p>
          </div>
        </div>

        <Badge variant={badgeVariant} className="text-[10px] font-bold shrink-0">
          {badgeLabel}
        </Badge>
      </div>

      {/* 3 Bloques BPM */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-sky-300">
            <Thermometer className="h-3 w-3" aria-hidden="true" />
            Frío/Calor
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.equiposConformesHoy}/{resumen.equiposActivosCount}
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-amber-300">
            <Droplets className="h-3 w-3" aria-hidden="true" />
            Freidoras
          </span>
          <span className="mt-0.5 block font-display text-lg font-bold text-white">
            {resumen.freidorasOptimasCount}/{resumen.freidorasActivasCount}
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2.5 text-center">
          <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-emerald-300">
            <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
            Turno
          </span>
          <span className="mt-0.5 block text-xs font-bold text-white pt-1">
            Ap {resumen.aperturaCompletada ? '✓' : '⏳'} · Ci{' '}
            {resumen.cierreCompletado ? '✓' : '⏳'}
          </span>
        </div>
      </div>

      {/* Novedades destacadas o confirmación verde */}
      {equiposPendientesOAlerta.length > 0 || freidorasAtencion.length > 0 ? (
        <div className="space-y-1.5">
          {freidorasAtencion.slice(0, 1).map((fr) => (
            <Link
              key={fr.freidora.id}
              to="/bpm"
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors hover:brightness-110 ${
                fr.estadoCiclo === 'cambiar_urgente'
                  ? 'border-red-500/50 bg-red-500/15 text-red-200'
                  : 'border-amber-500/50 bg-amber-500/15 text-amber-200'
              }`}
            >
              <span className="truncate font-semibold">{fr.freidora.nombre}</span>
              <span className="shrink-0 font-bold">
                {fr.estadoCiclo === 'cambiar_urgente' ? 'Cambiar Aceite' : 'Filtrar Pronto'}
              </span>
            </Link>
          ))}

          {equiposPendientesOAlerta.slice(0, 2).map((eq) => {
            const cls =
              eq.estadoHoy === 'pendiente'
                ? 'border-neutral-700 bg-neutral-950/70 text-neutral-300'
                : ESTADO_CONFORMIDAD_TEMP_META[eq.estadoHoy].badgeClass;
            return (
              <Link
                key={eq.equipo.id}
                to="/bpm"
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs transition-colors hover:brightness-110 ${cls}`}
              >
                <span className="truncate font-semibold">{eq.equipo.nombre}</span>
                <span className="shrink-0 font-mono font-bold">
                  {eq.ultimoRegistroHoy
                    ? `${eq.ultimoRegistroHoy.temperaturaC} °C`
                    : 'Pendiente hoy'}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Cadena de frío, freidoras y controles INVIMA al día.</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <Link
          to="/bpm"
          className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-gold-400/15 border border-gold-400/40 px-3 text-xs font-bold text-gold-300 hover:bg-gold-400/25"
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Abrir Bitácora BPM</span>
        </Link>
        <Link
          to="/cocina"
          className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-white"
        >
          <span>Ir a Cocina</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
