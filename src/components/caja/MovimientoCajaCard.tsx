import { ArrowDownLeft, ArrowUpRight, Printer, ShieldAlert } from 'lucide-react';
import type { MovimientoCaja } from '@/types';
import { CATALOGO_TIPOS_MOVIMIENTO_CAJA } from '@/utils/movimientosCajaUtils';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { formatHora } from '@/utils/dateUtils';

interface MovimientoCajaCardProps {
  movimiento: MovimientoCaja;
  onVerComprobante: (movimiento: MovimientoCaja) => void;
}

export function MovimientoCajaCard({
  movimiento,
  onVerComprobante,
}: MovimientoCajaCardProps) {
  const info = CATALOGO_TIPOS_MOVIMIENTO_CAJA[movimiento.tipo];
  const fechaObj = toValidAdminDate(movimiento.fecha);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 transition-colors hover:border-neutral-700 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${info.badgeClass}`}
        >
          {movimiento.tipo === 'ingreso_sencillo' ? (
            <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
          ) : movimiento.tipo === 'sangria_caja_fuerte' ? (
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold text-gold-400">
              {movimiento.codigoComprobante}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${info.badgeClass}`}
            >
              {info.shortLabel}
            </span>
            {fechaObj && (
              <span className="text-[11px] text-neutral-400">
                {formatHora(fechaObj)}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-white">{movimiento.motivo}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
            <span>Responsable: {movimiento.responsableNombre}</span>
            {movimiento.autorizadoPor && (
              <span>Autoriza: {movimiento.autorizadoPor}</span>
            )}
            {movimiento.referencia && (
              <span className="font-mono text-[11px] text-neutral-300">
                Ref: {movimiento.referencia}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-neutral-800 pt-3 sm:border-t-0 sm:pt-0">
        <span className={`font-display text-lg font-black ${info.amountClass}`}>
          {info.signo > 0 ? '+' : '-'}
          {formatCOP(movimiento.monto)}
        </span>

        <button
          type="button"
          onClick={() => onVerComprobante(movimiento)}
          aria-label={`Ver comprobante de ${movimiento.codigoComprobante}`}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800/80 px-3 text-xs font-semibold text-neutral-200 transition-colors hover:border-gold-400 hover:text-gold-400"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          <span>Comprobante</span>
        </button>
      </div>
    </div>
  );
}
