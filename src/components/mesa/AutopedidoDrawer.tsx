import React, { useState, useEffect, useId } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Send,
  CheckCircle2,
} from 'lucide-react';
import type { ItemVenta } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

export interface AutopedidoDrawerProps {
  isOpen: boolean;
  mesaNumero: number;
  mesaNombre: string;
  items: ItemVenta[];
  onClose: () => void;
  onIncrementItem: (itemId: string) => void;
  onDecrementItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItemNotas: (itemId: string, notas: string) => void;
  onEnviarPedido: (params: { clienteNombre?: string; notas?: string }) => Promise<void>;
}

export const AutopedidoDrawer: React.FC<AutopedidoDrawerProps> = ({
  isOpen,
  mesaNumero,
  mesaNombre,
  items,
  onClose,
  onIncrementItem,
  onDecrementItem,
  onRemoveItem,
  onUpdateItemNotas,
  onEnviarPedido,
}) => {
  const idPrefix = useId();
  const [clienteNombre, setClienteNombre] = useState('');
  const [notasGenerales, setNotasGenerales] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !enviando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enviando, onClose]);

  if (!isOpen) return null;

  const totalRonda = items.reduce(
    (acc, it) => acc + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1),
    0
  );
  const cantidadTotal = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || enviando) return;

    setEnviando(true);
    try {
      await onEnviarPedido({
        clienteNombre: clienteNombre.trim() || undefined,
        notas: notasGenerales.trim() || undefined,
      });
      setExito(true);
      setTimeout(() => {
        setExito(false);
        onClose();
      }, 2500);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-title`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm transition-all"
    >
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 id={`${idPrefix}-title`} className="font-display text-lg font-bold text-white">
                Mi Autopedido en Mesa
              </h2>
              <p className="text-xs text-neutral-400">
                {mesaNombre || `Mesa ${mesaNumero}`} · {cantidadTotal} platos listos para enviar
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar pedido"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {exito ? (
          <div className="my-10 py-6 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="text-xl font-black text-white font-display">
              ¡Pedido Enviado a Cocina!
            </h3>
            <p className="text-xs text-neutral-300 max-w-xs mx-auto">
              Tu comanda fue registrada con éxito en {mesaNombre || `Mesa ${mesaNumero}`}. El equipo de cocina ya está preparándola.
            </p>
          </div>
        ) : (
          <form onSubmit={handleConfirmar} className="mt-4 flex flex-col flex-1 overflow-hidden">
            {/* Lista de Ítems */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {items.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-xs">
                  Aún no has agregado platos a tu autopedido.
                </div>
              ) : (
                items.map((it) => (
                  <div
                    key={it.referenciaId}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-white text-xs block leading-tight">
                          {it.nombre}
                        </span>
                        <span className="font-mono text-xs text-amber-400">
                          {formatCOP(it.precioUnitario)}
                        </span>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-1 bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                        <button
                          type="button"
                          onClick={() => onDecrementItem(it.referenciaId)}
                          aria-label={`Disminuir ${it.nombre}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-neutral-300 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-white">
                          {it.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => onIncrementItem(it.referenciaId)}
                          aria-label={`Aumentar ${it.nombre}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-neutral-300 hover:text-white"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(it.referenciaId)}
                          aria-label={`Eliminar ${it.nombre}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:text-red-400 ml-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Notas / Modificadores del Plato */}
                    <input
                      type="text"
                      value={it.notas || ''}
                      onChange={(e) => onUpdateItemNotas(it.referenciaId, e.target.value)}
                      placeholder="Notas: ej. sin cebolla, término 3/4..."
                      maxLength={80}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-[11px] text-neutral-200 placeholder-neutral-600 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Datos adicionales: Nombre y Notas Generales */}
            {items.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-neutral-800 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    placeholder="Tu nombre (Opcional)"
                    maxLength={30}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={notasGenerales}
                    onChange={(e) => setNotasGenerales(e.target.value)}
                    placeholder="Instrucciones para cocina..."
                    maxLength={100}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Subtotal de la Ronda */}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-xs uppercase font-bold text-neutral-400">Total de esta Ronda:</span>
                  <span className="font-display text-2xl font-black text-amber-400">
                    {formatCOP(totalRonda)}
                  </span>
                </div>

                {/* Botón de Enviar Pedido */}
                <button
                  type="submit"
                  disabled={enviando || items.length === 0}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-sm font-black text-neutral-950 shadow-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{enviando ? 'Enviando a Cocina...' : 'Confirmar y Enviar Pedido a Cocina'}</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
