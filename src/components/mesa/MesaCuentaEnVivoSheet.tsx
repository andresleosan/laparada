import React, { useEffect, useId } from 'react';
import { Receipt, Utensils, X, User } from 'lucide-react';
import type { CuentaMesa } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { calcularResumenCuentaMesa } from '@/utils/menuMesaUtils';

export interface MesaCuentaEnVivoSheetProps {
  isOpen: boolean;
  mesaNumero: number;
  mesaNombre: string;
  cuenta: CuentaMesa | null;
  onClose: () => void;
  onPedirCuenta: () => void;
}

export const MesaCuentaEnVivoSheet: React.FC<MesaCuentaEnVivoSheetProps> = ({
  isOpen,
  mesaNumero,
  mesaNombre,
  cuenta,
  onClose,
  onPedirCuenta,
}) => {
  const idPrefix = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cuenta) return null;

  const resumen = calcularResumenCuentaMesa(cuenta);
  const rondas = Array.isArray(cuenta.rondas) ? cuenta.rondas : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-title`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm transition-all"
    >
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 id={`${idPrefix}-title`} className="font-display text-lg font-bold text-white">
                Cuenta en Vivo
              </h2>
              <p className="text-xs text-neutral-400">
                {mesaNombre || `Mesa ${mesaNumero}`} · {resumen.itemsCount} platos consumidos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mesero */}
        {(cuenta.meseroNombre || cuenta.mesero) && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-300">
            <User className="h-4 w-4 text-amber-400" />
            <span>
              Mesero asignado: <strong className="text-white">{cuenta.meseroNombre || cuenta.mesero}</strong>
            </span>
          </div>
        )}

        {/* Lista de Rondas o Ítems Consolidados */}
        <div className="my-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {rondas.length > 0 ? (
            rondas.map((ronda) => (
              <div
                key={ronda.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 border-b border-neutral-800/80 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Utensils className="h-3.5 w-3.5 text-amber-400" />
                    Ronda {ronda.numero}
                  </span>
                  <span className="font-mono text-neutral-300">
                    {formatCOP(ronda.total)}
                  </span>
                </div>

                <div className="space-y-1">
                  {ronda.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs text-neutral-300">
                      <span>
                        {it.cantidad}x {it.nombre}
                        {it.notas && <span className="block text-[10px] text-neutral-500 italic">{it.notas}</span>}
                      </span>
                      <span className="font-mono text-neutral-400">
                        {formatCOP((it.precioUnitario || 0) * (it.cantidad || 1))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-1.5">
              {(cuenta.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs text-neutral-300 border-b border-neutral-900 py-1.5">
                  <span>
                    {it.cantidad}x {it.nombre}
                    {it.notas && <span className="block text-[10px] text-neutral-500 italic">{it.notas}</span>}
                  </span>
                  <span className="font-mono text-neutral-400">
                    {formatCOP((it.precioUnitario || 0) * (it.cantidad || 1))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen Total y Botón para pedir cuenta */}
        <div className="border-t border-neutral-800 pt-3 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase font-bold text-neutral-400">Total Acumulado:</span>
            <span className="font-display text-2xl font-black text-amber-400">
              {formatCOP(resumen.total)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onPedirCuenta();
            }}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <Receipt className="h-4 w-4" />
            <span>Pedir Pre-Cuenta y Pagar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
