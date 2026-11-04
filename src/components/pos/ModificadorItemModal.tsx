// src/components/pos/ModificadorItemModal.tsx
import { useEffect, useId, useRef, useState } from 'react';
import { Check, UtensilsCrossed, X } from 'lucide-react';
import type { ItemVenta } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

export interface ModificadorItemModalProps {
  isOpen: boolean;
  item: ItemVenta | null;
  onClose: () => void;
  onGuardar: (modificadores: string[], notas?: string) => void;
}

export function ModificadorItemModal({
  isOpen,
  item,
  onClose,
  onGuardar,
}: ModificadorItemModalProps) {
  const generatedId = useId();
  const titleId = `modal-modificadores-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [notas, setNotas] = useState<string>('');

  // Sincronizar estado cuando se abre para un nuevo ítem
  useEffect(() => {
    if (item && isOpen) {
      setSeleccionados(item.modificadores ? [...item.modificadores] : []);
      setNotas(item.notas || '');
    }
  }, [item, isOpen]);

  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const toggleModificador = (mod: string) => {
    setSeleccionados((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    );
  };

  const handleLimpiar = () => {
    setSeleccionados([]);
    setNotas('');
  };

  const handleGuardar = () => {
    onGuardar(seleccionados, notas.trim() || undefined);
    onClose();
  };

  // Categorías de chips
  const terminos = ['Término 3/4', 'Término Medio', 'Bien Asado'];
  const exclusiones = ['Sin cebolla', 'Sin salsas', 'Salsas aparte', 'Poco picante', 'Sin sal'];
  const extras = ['Queso extra', 'Tocineta extra'];
  const empaques = ['Para llevar', 'Para mesa'];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Términos y Modificadores
              </h2>
              <p className="text-xs text-neutral-400">
                {item.nombre} · {formatCOP(item.precioUnitario)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="my-4 overflow-y-auto space-y-4 pr-1">
          {/* Términos de Cocción */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 block mb-2">
              🥩 Término de Cocción
            </span>
            <div className="flex flex-wrap gap-2">
              {terminos.map((mod) => {
                const activo = seleccionados.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleModificador(mod)}
                    aria-pressed={activo}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      activo
                        ? 'bg-amber-400 text-neutral-950 font-black shadow-md border-amber-400'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                    }`}
                  >
                    {activo && <Check className="h-3.5 w-3.5" />}
                    <span>{mod}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exclusiones y Preferencias */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 block mb-2">
              🌿 Preferencias y Exclusiones
            </span>
            <div className="flex flex-wrap gap-2">
              {exclusiones.map((mod) => {
                const activo = seleccionados.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => toggleModificador(mod)}
                    aria-pressed={activo}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      activo
                        ? 'bg-amber-400 text-neutral-950 font-black shadow-md border-amber-400'
                        : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                    }`}
                  >
                    {activo && <Check className="h-3.5 w-3.5" />}
                    <span>{mod}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Extras y Empaque */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 block mb-2">
                🧀 Extras
              </span>
              <div className="flex flex-wrap gap-2">
                {extras.map((mod) => {
                  const activo = seleccionados.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModificador(mod)}
                      aria-pressed={activo}
                      className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        activo
                          ? 'bg-amber-400 text-neutral-950 font-black shadow-md border-amber-400'
                          : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {activo && <Check className="h-3.5 w-3.5" />}
                      <span>{mod}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 block mb-2">
                📦 Servicio / Empaque
              </span>
              <div className="flex flex-wrap gap-2">
                {empaques.map((mod) => {
                  const activo = seleccionados.includes(mod);
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModificador(mod)}
                      aria-pressed={activo}
                      className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        activo
                          ? 'bg-amber-400 text-neutral-950 font-black shadow-md border-amber-400'
                          : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {activo && <Check className="h-3.5 w-3.5" />}
                      <span>{mod}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notas libres para cocina */}
          <div>
            <label
              htmlFor="notas-cocina-input"
              className="block text-[11px] font-bold uppercase tracking-wider text-neutral-300 mb-1.5"
            >
              📝 Instrucciones Específicas para Cocina
            </label>
            <input
              id="notas-cocina-input"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: salsa tártara aparte, sin tomate, bien tostado..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Previsualización del ítem */}
          {(seleccionados.length > 0 || Boolean(notas.trim())) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                Comanda de Cocina (Vista previa):
              </span>
              <p className="text-xs text-neutral-200">
                <span className="font-bold text-white">{item.cantidad}× {item.nombre}</span>
                {seleccionados.length > 0 && (
                  <span className="text-amber-300 font-semibold block mt-0.5">
                    Modificadores: {seleccionados.join(', ')}
                  </span>
                )}
                {Boolean(notas.trim()) && (
                  <span className="text-amber-200/90 italic block mt-0.5">
                    Nota: {notas.trim()}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-3 gap-2">
          <button
            type="button"
            onClick={handleLimpiar}
            className="min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
          >
            Limpiar Modificadores
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardar}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2 text-xs font-black text-neutral-950 shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              <Check className="h-4 w-4" />
              Guardar en Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

