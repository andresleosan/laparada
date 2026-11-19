import { useState } from 'react';
import {
  Banknote,
  Bike,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileCheck2,
  PackageCheck,
  Smartphone,
} from 'lucide-react';
import { formatCOP } from '@/utils/formatCOP';
import type { LiquidacionRepartidor } from '@/utils/deliverySettlement';
import type { LiquidacionDomiciliario } from '@/types';

interface LiquidacionResumenCardProps {
  liquidacion: LiquidacionRepartidor;
  repartidorNombre?: string;
  baseInicialActiva?: number;
  codigoActaActiva?: string;
  ultimaActaLiquidada?: LiquidacionDomiciliario | null;
  onVerActa?: (acta: LiquidacionDomiciliario) => void;
}

export function LiquidacionResumenCard({
  liquidacion,
  repartidorNombre,
  baseInicialActiva = 0,
  codigoActaActiva,
  ultimaActaLiquidada,
  onVerActa,
}: LiquidacionResumenCardProps) {
  const [detallesAbiertos, setDetallesAbiertos] = useState(false);

  const efectivoTotalARendir = baseInicialActiva + liquidacion.totalEfectivo;

  return (
    <section
      aria-label="Liquidación de jornada del repartidor"
      className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
            <Bike className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Jornada de Entregas {codigoActaActiva ? `· ${codigoActaActiva}` : ''}
            </span>
            <h2 className="text-sm font-bold text-white">
              {repartidorNombre ? `Turno: ${repartidorNombre}` : 'Tu Liquidación de Hoy'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ultimaActaLiquidada && onVerActa && (
            <button
              type="button"
              onClick={() => onVerActa(ultimaActaLiquidada)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Acta {ultimaActaLiquidada.codigoActa}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetallesAbiertos((prev) => !prev)}
            aria-expanded={detallesAbiertos}
            aria-label={
              detallesAbiertos
                ? 'Ocultar desglose de liquidación'
                : 'Ver desglose de liquidación'
            }
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 transition-colors hover:text-white"
          >
            {detallesAbiertos ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div
        className={`mt-3 grid gap-2.5 ${
          baseInicialActiva > 0
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-neutral-400">
            <PackageCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>Entregas</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold text-white">
            {liquidacion.totalEntregas}
          </p>
          <span className="text-[10px] text-neutral-500">por liquidar</span>
        </div>

        {baseInicialActiva > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-amber-400">
              <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Base Ruta</span>
            </div>
            <p className="mt-1 font-display text-lg font-bold text-amber-300">
              {formatCOP(baseInicialActiva)}
            </p>
            <span className="text-[10px] text-amber-400/70">sencillo activo</span>
          </div>
        )}

        <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-gold-400">
            <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{baseInicialActiva > 0 ? 'A Rendir en Caja' : 'Efectivo en Mano'}</span>
          </div>
          <p className="mt-1 font-display text-lg font-bold text-gold-400">
            {formatCOP(efectivoTotalARendir)}
          </p>
          <span className="text-[10px] text-neutral-400">
            {baseInicialActiva > 0
              ? `base + ${formatCOP(liquidacion.totalEfectivo)} cobro`
              : 'efectivo en mano'}
          </span>
        </div>

        <div
          className={`${
            baseInicialActiva > 0 ? 'col-span-1' : 'col-span-2 sm:col-span-1'
          } rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3`}
        >
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
        <div className="mt-3 space-y-1.5 border-t border-neutral-800 pt-3 text-xs text-neutral-300">
          {baseInicialActiva > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Base de sencillo entregada al salir:</span>
              <span className="font-display font-bold text-amber-300">
                {formatCOP(baseInicialActiva)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Efectivo cobrado en entregas:</span>
            <span className="font-display font-bold text-white">
              {formatCOP(liquidacion.totalEfectivo)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">Total ventas en entregas pendientes:</span>
            <span className="font-display font-bold text-white">
              {formatCOP(liquidacion.granTotal)}
            </span>
          </div>
          <p className="pt-1 text-[11px] text-neutral-500">
            💡 Al terminar tu ruta, entrega en caja la base inicial más el efectivo cobrado para emitir tu Acta de Liquidación.
          </p>
        </div>
      )}
    </section>
  );
}
