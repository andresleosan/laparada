import { useEffect, useState } from 'react';
import { Sparkles, Trash2, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { EspecialDelDiaEditor } from './EspecialDelDiaEditor';
import { sanitizarControl86, sanitizarEspecialDelDia } from '@/utils/control86Utils';
import type { EspecialDelDiaConfig, ItemCatalogo86 } from '@/types';

interface ProgramarEspecialModalProps {
  item: ItemCatalogo86 | null;
  isOpen: boolean;
  guardando?: boolean;
  onClose: () => void;
  onGuardar: (config: EspecialDelDiaConfig | null) => Promise<void>;
}

export function ProgramarEspecialModal({
  item,
  isOpen,
  guardando = false,
  onClose,
  onGuardar,
}: ProgramarEspecialModalProps) {
  const [especial, setEspecial] = useState<EspecialDelDiaConfig>(() =>
    sanitizarEspecialDelDia({ activo: true })
  );

  useEffect(() => {
    if (!isOpen || !item) return;
    setEspecial(
      sanitizarEspecialDelDia(
        item.especialDelDia
          ? { ...item.especialDelDia, activo: true }
          : { activo: true, diasSemana: [] }
      )
    );
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    await onGuardar(sanitizarEspecialDelDia(especial));
    onClose();
  };

  const handleQuitarEspecial = async () => {
    await onGuardar(null);
    onClose();
  };

  return (
    <StorefrontDialog
      labelledBy="programar-especial-title"
      onClose={onClose}
      onBackdropClick={() => !guardando && onClose()}
      canClose={!guardando}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gold-400/40 bg-neutral-950 p-5 sm:p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/15 text-gold-400">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="programar-especial-title"
                className="font-display text-lg font-black text-white"
              >
                Programar Especial del Día
              </h2>
              <p className="text-xs text-neutral-400">{item.nombre}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de Especial del Día"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleGuardar} className="space-y-4">
          <EspecialDelDiaEditor
            mostrarSoloEspecial
            control86={sanitizarControl86(item.control86)}
            onChangeControl86={() => {}}
            especialDelDia={especial}
            onChangeEspecialDelDia={setEspecial}
            disabled={guardando}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800 pt-4">
            {item.especialDelDia?.activo ? (
              <button
                type="button"
                disabled={guardando}
                onClick={() => void handleQuitarEspecial()}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/40 px-4 text-xs font-bold text-red-300 hover:bg-red-900/50"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Quitar programación</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={guardando}
                onClick={onClose}
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-4 text-xs font-bold text-neutral-300 hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="min-h-[44px] rounded-xl bg-gold-400 px-5 text-xs font-black text-neutral-950 shadow-lg hover:bg-amber-300 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar Especial'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
