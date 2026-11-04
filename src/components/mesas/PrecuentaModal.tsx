import { useState, useId, useEffect, useRef } from 'react';
import { Check, Copy, DollarSign, MessageSquare, Printer, Receipt, X } from 'lucide-react';
import type { CuentaMesa } from '@/types/mesa';
import { generarTextoPrecuentaTicket } from '@/utils/mesasUtils';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

export interface PrecuentaModalProps {
  isOpen: boolean;
  cuenta: CuentaMesa | null;
  negocioNombre?: string;
  onClose: () => void;
  onProcederCobro?: () => void;
}

export function PrecuentaModal({
  isOpen,
  cuenta,
  negocioNombre = 'La Parada',
  onClose,
  onProcederCobro,
}: PrecuentaModalProps) {
  const generatedId = useId();
  const titleId = `modal-precuenta-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cuenta) return null;

  const textoTicket = generarTextoPrecuentaTicket(cuenta, negocioNombre);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(textoTicket);
      setCopiado(true);
      createToast('Pre-cuenta copiada al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      createToast('No se pudo copiar el texto', 'info');
    }
  };

  const handleCompartirWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(textoTicket)}`;
    window.open(url, '_blank');
  };

  const handleImprimir = () => {
    window.print();
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
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Pre-Cuenta de Salón
              </h2>
              <p className="text-xs text-neutral-400">
                {cuenta.mesaNombre} · Total {formatCOP(cuenta.total)}
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

        {/* Papel Térmico de Pre-Cuenta */}
        <div className="mt-4 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 font-mono text-xs text-neutral-200 shadow-inner">
          <pre className="whitespace-pre-wrap font-mono leading-relaxed select-all">
            {textoTicket}
          </pre>
        </div>

        {/* Acciones */}
        <div className="mt-5 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleImprimir}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-neutral-800 text-xs font-bold text-white border border-neutral-700 hover:bg-neutral-700 active:scale-95 transition-all"
            >
              <Printer className="h-4 w-4 text-neutral-300" />
              Imprimir
            </button>

            <button
              type="button"
              onClick={handleCompartirWhatsApp}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-neutral-800 text-xs font-bold text-emerald-300 border border-neutral-700 hover:bg-neutral-700 active:scale-95 transition-all"
            >
              <MessageSquare className="h-4 w-4 text-emerald-400" />
              WhatsApp
            </button>

            <button
              type="button"
              onClick={handleCopiar}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-neutral-800 text-xs font-bold text-white border border-neutral-700 hover:bg-neutral-700 active:scale-95 transition-all"
            >
              {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-neutral-300" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          {onProcederCobro && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onProcederCobro();
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2.5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              <DollarSign className="h-4 w-4" />
              Proceder a Cobrar y Liberar Mesa
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
