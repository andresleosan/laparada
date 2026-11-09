import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { EvaluacionResolucionDian } from '@/types';

interface AlertaResolucionBannerProps {
  evaluacion: EvaluacionResolucionDian;
  onRenovarClick?: () => void;
}

export function AlertaResolucionBanner({
  evaluacion,
  onRenovarClick,
}: AlertaResolucionBannerProps) {
  if (!evaluacion.requiereAtencion) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-emerald-900/60 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>
            <strong>Resolución DIAN al día:</strong> {evaluacion.mensaje}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-emerald-400/80">
          <span>{evaluacion.diasRestantes} días restantes</span>
          <span>•</span>
          <span>{evaluacion.foliosRestantes} folios libres</span>
        </div>
      </div>
    );
  }

  const esCritico = evaluacion.color === 'rojo';

  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border p-4 shadow-lg ${
        esCritico
          ? 'border-red-600/70 bg-red-950/40 text-red-200'
          : 'border-amber-500/70 bg-amber-950/40 text-amber-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {esCritico ? (
          <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
        )}
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-sm">
            <span>{esCritico ? '¡Alerta Fiscal Crítica!' : 'Advertencia de Resolución DIAN'}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${
                esCritico ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'
              }`}
            >
              {evaluacion.estado.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="mt-1 text-xs opacity-90">{evaluacion.mensaje}</p>
          <div className="mt-1.5 flex gap-3 text-[11px] opacity-80 font-mono">
            <span>Folios usados: {evaluacion.porcentajeFoliosUsados}%</span>
            <span>•</span>
            <span>Folios restantes: {evaluacion.foliosRestantes}</span>
          </div>
        </div>
      </div>

      {onRenovarClick && (
        <button
          type="button"
          onClick={onRenovarClick}
          className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold transition-colors min-h-[44px] flex items-center justify-center ${
            esCritico
              ? 'bg-red-600 text-white hover:bg-red-500 shadow-md shadow-red-900/50'
              : 'bg-amber-500 text-black hover:bg-amber-400 shadow-md shadow-amber-900/50'
          }`}
        >
          Actualizar Resolución
        </button>
      )}
    </div>
  );
}
