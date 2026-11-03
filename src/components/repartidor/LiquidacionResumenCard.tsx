import { useState } from 'react';
import { Bike, ChevronDown, ChevronUp, DollarSign, PackageCheck, Smartphone } from 'lucide-react';
import { formatCOP } from '@/utils/formatCOP';
import type { LiquidacionRepartidor } from '@/utils/deliverySettlement';

interface LiquidacionResumenCardProps {
  liquidacion: LiquidacionRepartidor;
  repartidorNombre?: string;
}

export function LiquidacionResumenCard({
  liquidacion,
  repartidorNombre,
}: LiquidacionResumenCardProps) {
  const [detallesAbiertos, setDetallesAbiertos] = useState(false);

  return (
    <section
      aria-label="Liquidación de jornada del repartidor"
      className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-400/10 border border-gold-400/30 text-gold-400">
            <Bike className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
              Jornada de Entregas
            </span>
            <h2 className="text-sm font-bold text-white">
              {repartidorNombre ? `Turno: ${repartidorNombre}` : 'Tu Liquidación de Hoy'}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetallesAbiertos((prev) => !prev)}
          aria-expanded={detallesAbiertos}
          aria-label={detallesAbiertos ? 'Ocultar desglose de liquidación' : 'Ver desglose de liquidación'}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white transition-colors"
        >
          {detallesAbiertos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Tarjetas resumen */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-neutral-400">
            <PackageCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>Entregas</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold text-white">
            {liquidacion.totalEntregas}
          </p>
          <span className="text-[10px] text-neutral-500">carreras cerradas</span>
        </div>

        <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-gold-400">
            <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Efectivo en Mano</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold text-gold-400">
            {formatCOP(liquidacion.totalEfectivo)}
          </p>
          <span className="text-[10px] text-neutral-400">a rendir en caja</span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-neutral-400">
            <Smartphone className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            <span>Transferencias</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold text-sky-400">
            {formatCOP(liquidacion.totalTransferencia)}
          </p>
          <span className="text-[10px] text-neutral-500">pagos validados</span>
        </div>
      </div>

      {/* Desglose desplegable */}
      {detallesAbiertos && (
        <div className="mt-3 border-t border-neutral-800 pt-3 text-xs text-neutral-300">
          <div className="flex justify-between items-center py-1">
            <span className="text-neutral-400">Total recaudado en la jornada:</span>
            <span className="font-display font-bold text-white">
              {formatCOP(liquidacion.granTotal)}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            💡 Recuerda entregar el efectivo en mano al cajero antes de salir del turno para cuadrar el Cierre de Caja.
          </p>
        </div>
      )}
    </section>
  );
}
