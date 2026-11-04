import { useState, useId, useEffect, useRef } from 'react';
import { Check, Copy, Divide, Users, X } from 'lucide-react';
import { dividirCuentaEnPartesIguales } from '@/utils/mesasUtils';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

export interface DividirCuentaModalProps {
  isOpen: boolean;
  mesaNombre: string;
  totalCuenta: number;
  comensalesIniciales?: number;
  onClose: () => void;
}

export function DividirCuentaModal({
  isOpen,
  mesaNombre,
  totalCuenta,
  comensalesIniciales = 2,
  onClose,
}: DividirCuentaModalProps) {
  const generatedId = useId();
  const titleId = `modal-dividir-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [partes, setPartes] = useState<number>(Math.max(1, comensalesIniciales || 2));
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resultado = dividirCuentaEnPartesIguales(totalCuenta, partes);

  const handleCopiar = async () => {
    const texto = `🧾 *División de Cuenta — ${mesaNombre}*\n` +
      `💰 Total: ${formatCOP(totalCuenta)}\n` +
      `👥 Personas: ${resultado.comensales}\n` +
      `💵 *Cada uno paga:* ${formatCOP(resultado.montoPorPersona)}` +
      (resultado.residuo > 0 ? `\n(Residuo de ajuste: ${formatCOP(resultado.residuo)})` : '') +
      `\n\n¡Gracias por compartir en La Parada!`;

    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      createToast('Desglose copiado al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      createToast('No se pudo copiar al portapapeles', 'info');
    }
  };

  const opcionesRapidas = [2, 3, 4, 5, 6];

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
              <Divide className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Dividir Cuenta
              </h2>
              <p className="text-xs text-neutral-400">
                {mesaNombre} · Total {formatCOP(totalCuenta)}
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

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              ¿Entre cuántas personas se divide?
            </label>
            <div className="flex items-center gap-2 mb-2">
              {opcionesRapidas.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPartes(num)}
                  aria-pressed={partes === num}
                  className={`flex-1 min-h-[44px] rounded-xl text-sm font-bold transition-all ${
                    partes === num
                      ? 'bg-amber-400 text-neutral-950 shadow-md font-black'
                      : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="number"
                min="1"
                max="50"
                value={partes}
                onChange={(e) => setPartes(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Tarjeta de Cálculo */}
          <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-5 text-center shadow-lg">
            <span className="text-xs uppercase font-black tracking-wider text-amber-300/80 block mb-1">
              Cada persona paga:
            </span>
            <div className="font-display text-4xl font-black text-amber-400 tracking-tight my-1">
              {formatCOP(resultado.montoPorPersona)}
            </div>
            <p className="text-xs text-neutral-400">
              {resultado.comensales} comensales pagan {formatCOP(resultado.montoPorPersona)} cada uno
            </p>
            {resultado.residuo > 0 && (
              <p className="mt-2 text-[11px] font-semibold text-neutral-400 bg-neutral-900/60 rounded-lg py-1 px-2 inline-block">
                Ajuste indivisible: {formatCOP(resultado.residuo)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopiar}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-2.5 text-sm font-bold text-white border border-neutral-700 hover:bg-neutral-700 active:scale-95 transition-all"
            >
              {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Copiado' : 'Copiar Desglose'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-black text-neutral-950 shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
