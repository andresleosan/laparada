import React from 'react';
import { BellRing, Receipt, Users, UtensilsCrossed, User } from 'lucide-react';
import type { Mesa, CuentaMesa } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { calcularResumenCuentaMesa } from '@/utils/menuMesaUtils';

export interface MesaHeaderProps {
  negocioNombre: string;
  negocioLogo?: string;
  mesa: Mesa;
  cuenta: CuentaMesa | null;
  onAbrirLlamarMesero: () => void;
  onAbrirPrecuenta: () => void;
  onAbrirCuentaEnVivo: () => void;
}

export const MesaHeader: React.FC<MesaHeaderProps> = ({
  negocioNombre,
  negocioLogo,
  mesa,
  cuenta,
  onAbrirLlamarMesero,
  onAbrirPrecuenta,
  onAbrirCuentaEnVivo,
}) => {
  const tieneCuentaActiva = Boolean(cuenta && cuenta.items && cuenta.items.length > 0);
  const resumen = calcularResumenCuentaMesa(cuenta);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md shadow-2xl">
      {/* Barra superior con marca del restaurante y mesa */}
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Logo y Nombre del Restaurante */}
          <div className="flex items-center gap-2.5 min-w-0">
            {negocioLogo ? (
              <img
                src={negocioLogo}
                alt={negocioNombre}
                className="h-10 w-10 rounded-xl object-cover border border-amber-500/20 shadow-md"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block truncate">
                {negocioNombre}
              </span>
              <h1 className="font-display text-lg font-black text-white leading-tight truncate">
                {mesa.nombre || `Mesa ${mesa.numero}`}
              </h1>
            </div>
          </div>

          {/* Badge de Zona / Estado */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-neutral-300">
              <Users className="h-3.5 w-3.5 text-neutral-400" />
              {mesa.zona || 'Salón Principal'}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                mesa.estado === 'libre'
                  ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400'
                  : mesa.estado === 'por_cobrar'
                  ? 'border-amber-500/30 bg-amber-950/30 text-amber-300 animate-pulse'
                  : 'border-yellow-500/30 bg-yellow-950/30 text-yellow-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  mesa.estado === 'libre'
                    ? 'bg-emerald-400'
                    : mesa.estado === 'por_cobrar'
                    ? 'bg-amber-400'
                    : 'bg-yellow-400'
                }`}
              />
              {mesa.estado === 'libre'
                ? 'Disponible'
                : mesa.estado === 'por_cobrar'
                ? 'Pidiendo Cuenta'
                : 'En Atención'}
            </span>
          </div>
        </div>

        {/* Info de Mesero y Total consumido (si aplica) */}
        {tieneCuentaActiva && (
          <div className="mt-2.5 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <User className="h-4 w-4 text-amber-400" />
              <span>
                {mesa.meseroNombre || mesa.mesero ? (
                  <>
                    Atendido por: <strong className="text-white">{mesa.meseroNombre || mesa.mesero}</strong>
                  </>
                ) : (
                  <span className="text-neutral-400">Atención de Salón</span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={onAbrirCuentaEnVivo}
              className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold transition-colors"
            >
              <span>Consumo: {formatCOP(resumen.total)}</span>
              <span className="text-[10px] text-neutral-400 underline">(ver detalle)</span>
            </button>
          </div>
        )}

        {/* Botones de acción rápida: Llamar Mesero & Pedir Cuenta */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAbrirLlamarMesero}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 px-3 py-2 text-xs font-black text-amber-300 shadow-sm transition-all hover:border-amber-400 hover:bg-amber-500/20 active:scale-95"
          >
            <BellRing className="h-4 w-4 text-amber-400" />
            <span>Llamar Mesero</span>
          </button>

          <button
            type="button"
            onClick={onAbrirPrecuenta}
            disabled={!tieneCuentaActiva}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition-all active:scale-95 ${
              tieneCuentaActiva
                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-400'
                : 'border-neutral-800 bg-neutral-900 text-neutral-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>{tieneCuentaActiva ? 'Pedir Cuenta' : 'Sin Consumo'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
