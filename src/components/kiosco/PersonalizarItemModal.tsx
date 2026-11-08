import { useState } from 'react';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Combo, ItemKioscoCustomizado, Producto } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

export interface PersonalizarItemModalProps {
  item: Producto | Combo;
  isCombo: boolean;
  onClose: () => void;
  onConfirm: (customItem: ItemKioscoCustomizado) => void;
}

const MODIFICADORES_PREDETERMINADOS = [
  'Sin cebolla',
  'Sin salsas',
  'Salsas aparte',
  'Sin ripio de papa',
  'Sin tocineta',
  'Queso extra',
  'Bien cocido',
  'Término medio',
  'Sin hielo',
  'Bebida bien fría',
];

export function PersonalizarItemModal({
  item,
  isCombo,
  onClose,
  onConfirm,
}: PersonalizarItemModalProps) {
  const precioUnitario = isCombo
    ? (item as Combo).precioEspecial
    : (item as Producto).precio;

  const [cantidad, setCantidad] = useState(1);
  const [modificadoresSeleccionados, setModificadoresSeleccionados] = useState<string[]>([]);
  const [notas, setNotas] = useState('');

  const toggleModificador = (mod: string) => {
    setModificadoresSeleccionados((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleIncrementar = () => {
    setCantidad((prev) => Math.min(prev + 1, 20));
  };

  const handleDecrementar = () => {
    setCantidad((prev) => Math.max(prev - 1, 1));
  };

  const subtotal = precioUnitario * cantidad;

  const handleAgregar = () => {
    const customItem: ItemKioscoCustomizado = {
      tipo: isCombo ? 'combo' : 'producto',
      referenciaId: item.id,
      nombre: item.nombre,
      cantidad,
      precioUnitario,
      subtotal,
      modificadores: modificadoresSeleccionados.length > 0 ? modificadoresSeleccionados : undefined,
      notas: notas.trim() || undefined,
    };
    onConfirm(customItem);
  };

  return (
    <StorefrontDialog
      labelledBy="modal-personalizar-titulo"
      onClose={onClose}
      className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl"
    >
      {/* Cabecera */}
      <header className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-gold-400">
            Personalizar Pedido
          </span>
          <h2 id="modal-personalizar-titulo" className="font-display text-2xl font-black text-white">
            {item.nombre}
          </h2>
          <span className="font-mono text-base font-bold text-neutral-400">
            {formatCOP(precioUnitario)} c/u
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          aria-label="Cerrar personalizador"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Contenido */}
      <div className="mt-5 space-y-6 max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
        {/* Modificadores Rápidos */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-3">
            Opciones y Preferencias
          </label>
          <div className="flex flex-wrap gap-2">
            {MODIFICADORES_PREDETERMINADOS.map((mod) => {
              const selected = modificadoresSeleccionados.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModificador(mod)}
                  aria-pressed={selected}
                  className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all min-h-[44px] ${
                    selected
                      ? 'border-gold-400 bg-gold-400 text-black shadow-md'
                      : 'border-neutral-800 bg-neutral-950/80 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {selected ? '✓ ' : '+ '}
                  {mod}
                </button>
              );
            })}
          </div>
        </div>

        {/* Notas / Instrucción adicional para cocina */}
        <div>
          <label
            htmlFor="kiosco-notas-item"
            className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-2"
          >
            Instrucciones para Cocina (Opcional)
          </label>
          <textarea
            id="kiosco-notas-item"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Salsa de piña aparte, término 3/4..."
            rows={2}
            className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
          />
        </div>

        {/* Selector de Cantidad */}
        <div className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
          <span className="text-sm font-black text-neutral-300">
            Cantidad de porciones
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDecrementar}
              disabled={cantidad <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800 active:scale-95 transition-transform"
              aria-label="Disminuir cantidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="font-display text-2xl font-black text-white w-8 text-center">
              {cantidad}
            </span>
            <button
              type="button"
              onClick={handleIncrementar}
              disabled={cantidad >= 20}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-neutral-800 active:scale-95 transition-transform"
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pie con Subtotal y Botón Confirmar */}
      <footer className="mt-6 flex items-center justify-between border-t border-neutral-800 pt-5">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-neutral-400 uppercase">Subtotal</span>
          <span className="font-display text-2xl font-black text-gold-400">
            {formatCOP(subtotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAgregar}
          className="inline-flex items-center gap-2 rounded-2xl bg-gold-400 px-6 py-3.5 text-sm font-black text-black shadow-xl transition-all hover:bg-gold-500 active:scale-95 min-h-[48px]"
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Agregar al Pedido</span>
        </button>
      </footer>
    </StorefrontDialog>
  );
}
