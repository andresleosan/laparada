import React from 'react';
import { Minus, Plus, RotateCcw, Banknote, Coins } from 'lucide-react';
import type { DesgloseDenominaciones } from '@/types/cierreCaja';
import { BILLETES_COP, MONEDAS_COP, sanitizarCantidadDenominacion } from '@/utils/arqueoCaja';
import { formatCOP } from '@/utils/formatCOP';

interface DesgloseDenominacionesGridProps {
  denominaciones: DesgloseDenominaciones;
  onChange: (nuevas: DesgloseDenominaciones) => void;
  disabled?: boolean;
}

export function DesgloseDenominacionesGrid({
  denominaciones,
  onChange,
  disabled = false,
}: DesgloseDenominacionesGridProps) {
  const actualizarCantidad = (key: keyof DesgloseDenominaciones, valor: number) => {
    const safeValor = Math.max(0, Math.floor(valor));
    onChange({
      ...denominaciones,
      [key]: safeValor,
    });
  };

  const handleIncrement = (key: keyof DesgloseDenominaciones) => {
    const actual = denominaciones[key] || 0;
    actualizarCantidad(key, actual + 1);
  };

  const handleDecrement = (key: keyof DesgloseDenominaciones) => {
    const actual = denominaciones[key] || 0;
    if (actual > 0) {
      actualizarCantidad(key, actual - 1);
    }
  };

  const handleInputChange = (key: keyof DesgloseDenominaciones, e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = sanitizarCantidadDenominacion(e.target.value);
    actualizarCantidad(key, parsed);
  };

  const handleLimpiar = () => {
    onChange({});
  };

  const tieneValores = Object.values(denominaciones).some((v) => (v || 0) > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
          Conteo Físico por Denominación
        </span>
        {tieneValores && (
          <button
            type="button"
            onClick={handleLimpiar}
            disabled={disabled}
            aria-label="Reiniciar conteo de billetes y monedas"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-amber-400 transition-colors px-2 py-1 rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Limpiar conteo</span>
          </button>
        )}
      </div>

      {/* Sección Billetes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400/90">
          <Banknote className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>Billetes Colombianos (COP)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {BILLETES_COP.map((billete) => {
            const cantidad = denominaciones[billete.key] || 0;
            const subtotal = cantidad * billete.valor;

            return (
              <div
                key={billete.key}
                className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 transition-all"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-display font-bold text-sm text-white">
                    {billete.etiqueta}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    Subtotal: <span className="text-amber-400 font-medium">{formatCOP(subtotal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDecrement(billete.key)}
                    disabled={disabled || cantidad <= 0}
                    aria-label={`Disminuir billetes de ${billete.etiqueta}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={cantidad === 0 ? '' : cantidad}
                    placeholder="0"
                    onChange={(e) => handleInputChange(billete.key, e)}
                    disabled={disabled}
                    aria-label={`Cantidad de billetes de ${billete.etiqueta}`}
                    className="h-11 w-14 text-center font-mono text-sm font-bold bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => handleIncrement(billete.key)}
                    disabled={disabled}
                    aria-label={`Aumentar billetes de ${billete.etiqueta}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sección Monedas */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2 text-xs font-bold text-neutral-300">
          <Coins className="h-4 w-4 text-neutral-400" aria-hidden="true" />
          <span>Monedas Colombianas (COP)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MONEDAS_COP.map((moneda) => {
            const cantidad = denominaciones[moneda.key] || 0;
            const subtotal = cantidad * moneda.valor;

            return (
              <div
                key={moneda.key}
                className="flex items-center justify-between p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/80 hover:border-neutral-700 transition-all"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-display font-semibold text-sm text-neutral-200">
                    {moneda.etiqueta}
                  </div>
                  <div className="text-[11px] text-neutral-400 truncate">
                    Subtotal: <span className="text-neutral-300 font-medium">{formatCOP(subtotal)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDecrement(moneda.key)}
                    disabled={disabled || cantidad <= 0}
                    aria-label={`Disminuir monedas de ${moneda.etiqueta}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={cantidad === 0 ? '' : cantidad}
                    placeholder="0"
                    onChange={(e) => handleInputChange(moneda.key, e)}
                    disabled={disabled}
                    aria-label={`Cantidad de monedas de ${moneda.etiqueta}`}
                    className="h-11 w-14 text-center font-mono text-sm font-semibold bg-neutral-950 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => handleIncrement(moneda.key)}
                    disabled={disabled}
                    aria-label={`Aumentar monedas de ${moneda.etiqueta}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

