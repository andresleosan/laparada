import { Ban, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { useNegocio } from '@/context/NegocioContext';
import { useControl86 } from '@/hooks/useControl86';
import { Control86Board } from './Control86Board';

interface Control86DrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Control86DrawerModal({ isOpen, onClose }: Control86DrawerModalProps) {
  const { negocioActual } = useNegocio();
  const {
    productos,
    combos,
    items,
    resumen,
    ahora,
    actionLoadingKey,
    puedeConfigurarEspeciales,
    marcar86,
    reactivar86,
    ajustarPorciones,
    ajustarPorcionesDelta,
    guardarEspecial,
    restablecerTurno86,
  } = useControl86();

  if (!isOpen) return null;

  return (
    <StorefrontDialog
      labelledBy="control86-drawer-title"
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-xs"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-red-500/35 bg-neutral-950 text-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 text-red-400">
              <Ban className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="control86-drawer-title"
                className="font-display text-lg font-black text-white"
              >
                Control &quot;86&quot; en Vivo &amp; Porciones
              </h2>
              <p className="text-xs text-neutral-400">
                Sincronización instantánea con POS, Storefront, Kiosco, Menú QR y WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Control 86"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-300 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <Control86Board
            nombreNegocio={negocioActual.nombre || 'La Parada'}
            productos={productos}
            combos={combos}
            items={items}
            resumen={resumen}
            ahora={ahora}
            actionLoadingKey={actionLoadingKey}
            puedeConfigurarEspeciales={puedeConfigurarEspeciales}
            onMarcar86={marcar86}
            onReactivar86={reactivar86}
            onAjustarPorciones={ajustarPorciones}
            onAjustarPorcionesDelta={ajustarPorcionesDelta}
            onGuardarEspecial={guardarEspecial}
            onRestablecerTodos={restablecerTurno86}
          />
        </div>
      </div>
    </StorefrontDialog>
  );
}
