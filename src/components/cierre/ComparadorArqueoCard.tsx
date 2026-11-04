import { CheckCircle2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import type { ArqueoEfectivo } from '@/types/cierreCaja';
import { formatCOP } from '@/utils/formatCOP';

interface ComparadorArqueoCardProps {
  arqueo: ArqueoEfectivo;
  className?: string;
}

export function ComparadorArqueoCard({ arqueo, className = '' }: ComparadorArqueoCardProps) {
  const { totalBilletes, totalMonedas, totalFisico, efectivoEsperado, diferencia, estadoCuadre } = arqueo;

  return (
    <div className={`rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 sm:p-5 ${className}`}>
      {/* Grid de 3 métricas clave */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Físico Contado */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-3.5">
          <span className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Total Físico en Caja
          </span>
          <span className="block mt-1 font-display font-black text-xl text-white">
            {formatCOP(totalFisico)}
          </span>
          <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Billetes: <strong className="text-neutral-300">{formatCOP(totalBilletes)}</strong></span>
            <span>Monedas: <strong className="text-neutral-300">{formatCOP(totalMonedas)}</strong></span>
          </div>
        </div>

        {/* Efectivo Esperado en Sistema */}
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/70 p-3.5">
          <span className="block text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
            Efectivo Esperado (Sistema)
          </span>
          <span className="block mt-1 font-display font-black text-xl text-amber-400">
            {formatCOP(efectivoEsperado)}
          </span>
          <p className="mt-1 text-[11px] text-neutral-400">
            Base inicial + Ventas efectivo - Gastos
          </p>
        </div>

        {/* Diferencia / Balance */}
        <div
          className={`rounded-xl border p-3.5 transition-colors ${
            estadoCuadre === 'cuadrado'
              ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400'
              : estadoCuadre === 'sobrante'
              ? 'border-sky-500/40 bg-sky-950/20 text-sky-400'
              : 'border-red-500/40 bg-red-950/20 text-red-400'
          }`}
        >
          <span className="block text-[11px] font-medium uppercase tracking-wider opacity-80">
            Diferencia de Cuadre
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-display font-black text-xl">
            {estadoCuadre === 'cuadrado' && (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>$ 0 COP</span>
              </>
            )}
            {estadoCuadre === 'sobrante' && (
              <>
                <TrendingUp className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>+{formatCOP(diferencia)}</span>
              </>
            )}
            {estadoCuadre === 'faltante' && (
              <>
                <TrendingDown className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>-{formatCOP(Math.abs(diferencia))}</span>
              </>
            )}
          </div>
          <div className="mt-1 text-[11px] font-semibold flex items-center gap-1">
            {estadoCuadre === 'cuadrado' && (
              <span className="text-emerald-400">¡Cuadre exacto sin diferencias!</span>
            )}
            {estadoCuadre === 'sobrante' && (
              <span className="text-sky-300">Sobrante a favor de caja</span>
            )}
            {estadoCuadre === 'faltante' && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Falta dinero físico según el sistema
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
