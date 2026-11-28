import { AlertTriangle, Ban, Clock, Flame, Sparkles } from 'lucide-react';
import type { EvaluacionControl86 } from '@/types';

interface Badge86EstadoProps {
  evaluacion: EvaluacionControl86;
  compacto?: boolean;
  className?: string;
}

export function Badge86Estado({
  evaluacion,
  compacto = false,
  className = '',
}: Badge86EstadoProps) {
  if (evaluacion.estado === 'agotado_86') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-red-500/60 bg-red-950/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-red-200 shadow-sm backdrop-blur-xs ${className}`}
        title={evaluacion.nota86 || evaluacion.motivo86Label || 'Agotado hoy (Control 86)'}
      >
        <Ban className="h-3 w-3 shrink-0 text-red-400" aria-hidden="true" />
        <span>{compacto ? '86 · Agotado' : '86 · Agotado hoy'}</span>
      </span>
    );
  }

  if (evaluacion.estado === 'fuera_horario_especial') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-neutral-950/90 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-xs ${className}`}
        title={evaluacion.especial.resumenHorario}
      >
        <Clock className="h-3 w-3 shrink-0 text-amber-400" aria-hidden="true" />
        <span>Fuera de horario</span>
      </span>
    );
  }

  if (evaluacion.estado === 'ultimas_porciones' && evaluacion.porcionesDisponibles !== null) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-orange-500/60 bg-orange-950/90 px-2 py-0.5 text-[10px] font-black text-orange-200 shadow-sm backdrop-blur-xs ${className}`}
      >
        <Flame className="h-3 w-3 shrink-0 text-orange-400" aria-hidden="true" />
        <span>
          {evaluacion.porcionesDisponibles === 1
            ? '¡Última porción!'
            : `¡Últimas ${evaluacion.porcionesDisponibles}!`}
        </span>
      </span>
    );
  }

  if (
    evaluacion.estado === 'disponible_limitado' &&
    evaluacion.porcionesDisponibles !== null
  ) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border border-gold-400/40 bg-neutral-950/85 px-2 py-0.5 text-[10px] font-bold text-gold-300 backdrop-blur-xs ${className}`}
      >
        <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-gold-400" aria-hidden="true" />
        <span>{evaluacion.porcionesDisponibles} disp.</span>
      </span>
    );
  }

  return null;
}

interface BadgeEspecialDelDiaProps {
  evaluacion: EvaluacionControl86;
  compacto?: boolean;
  className?: string;
}

export function BadgeEspecialDelDia({
  evaluacion,
  compacto = false,
  className = '',
}: BadgeEspecialDelDiaProps) {
  if (!evaluacion.especial.esEspecialVigente || evaluacion.agotado86) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-gold-400/60 bg-gold-400/20 px-2 py-0.5 text-[10px] font-black text-gold-300 shadow-sm backdrop-blur-xs ${className}`}
      title={
        evaluacion.especial.mensajeSugerido ||
        evaluacion.especial.resumenHorario ||
        evaluacion.especial.etiqueta
      }
    >
      <Sparkles className="h-3 w-3 shrink-0 text-gold-400" aria-hidden="true" />
      <span>
        {compacto ? evaluacion.especial.etiqueta : `⭐ ${evaluacion.especial.etiqueta}`}
      </span>
    </span>
  );
}
