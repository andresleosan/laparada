import { useState, useId, useEffect, useRef, type FormEvent } from 'react';
import {
  ArrowRightLeft,
  Check,
  User,
  X,
} from 'lucide-react';
import type { Mesa } from '@/types/mesa';

export interface ReasignarMeseroModalProps {
  isOpen: boolean;
  mesa: Mesa | null;
  meserosDisponibles: Array<{ id: string; nombre: string }>;
  onClose: () => void;
  onConfirmarReasignacion: (mesaId: string, mesero: { id?: string; nombre: string }) => Promise<void>;
  cargando?: boolean;
}

export function ReasignarMeseroModal({
  isOpen,
  mesa,
  meserosDisponibles,
  onClose,
  onConfirmarReasignacion,
  cargando = false,
}: ReasignarMeseroModalProps) {
  const generatedId = useId();
  const titleId = `modal-reasignar-mesero-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [meseroSeleccionado, setMeseroSeleccionado] = useState<{ id?: string; nombre: string } | null>(null);
  const [nombreManual, setNombreManual] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !mesa) return;
    const actualNombre = mesa.meseroNombre || mesa.mesero;
    const encontrado = meserosDisponibles.find(
      (m) => m.nombre.toLowerCase() === (actualNombre || '').toLowerCase()
    );
    if (encontrado) {
      setMeseroSeleccionado(encontrado);
      setNombreManual('');
    } else if (actualNombre) {
      setMeseroSeleccionado(null);
      setNombreManual(actualNombre);
    } else {
      setMeseroSeleccionado(null);
      setNombreManual('');
    }
    setErrorLocal(null);
  }, [isOpen, mesa, meserosDisponibles]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mesa) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreFinal = meseroSeleccionado?.nombre || nombreManual.trim();
    if (!nombreFinal) {
      setErrorLocal('Por favor selecciona o escribe el nombre del mesero.');
      return;
    }

    try {
      await onConfirmarReasignacion(mesa.id, {
        id: meseroSeleccionado?.id,
        nombre: nombreFinal,
      });
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al reasignar mesero.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowRightLeft className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Reasignar Mesero
              </h2>
              <p className="text-xs text-neutral-400">
                {mesa.nombre} ({mesa.zona})
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

        {errorLocal && (
          <div className="mt-4 rounded-xl bg-red-950/50 border border-red-500/50 p-3 text-xs text-red-300">
            {errorLocal}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3.5 text-xs">
            <span className="text-neutral-400 block mb-0.5">Atención actual:</span>
            <p className="font-bold text-white text-sm flex items-center gap-1.5">
              <User className="h-4 w-4 text-amber-400" />
              <span>{mesa.meseroNombre || mesa.mesero || 'Sin mesero asignado'}</span>
            </p>
          </div>

          {/* Chips de Meseros Disponibles */}
          {meserosDisponibles.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                Seleccionar del Equipo de Salón
              </label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                {meserosDisponibles.map((m) => {
                  const isSelected = meseroSeleccionado?.nombre === m.nombre;
                  return (
                    <button
                      key={m.id || m.nombre}
                      type="button"
                      onClick={() => {
                        setMeseroSeleccionado(m);
                        setNombreManual('');
                      }}
                      className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                          : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>{m.nombre}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* O escribir nombre manual */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              O escribir nombre de mesero
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={nombreManual}
                onChange={(e) => {
                  setNombreManual(e.target.value);
                  setMeseroSeleccionado(null);
                }}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                placeholder="Ej. Andrés, Valentina..."
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || (!meseroSeleccionado && !nombreManual.trim())}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {cargando ? 'Reasignando...' : 'Confirmar Reasignación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
