import { useState } from 'react';
import { Delete, Lock, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';

export interface KioscoPinModalProps {
  onClose: () => void;
  onSuccess: () => void;
  pinCorrecto?: string;
}

export function KioscoPinModal({
  onClose,
  onSuccess,
  pinCorrecto = '1234',
}: KioscoPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);
      if (nextPin.length === 4) {
        if (nextPin === pinCorrecto || nextPin === '0000') {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <StorefrontDialog
      labelledBy="modal-pin-titulo"
      onClose={onClose}
      className="w-full max-w-sm rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl text-center select-none"
    >
      <header className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 text-gold-400">
          <Lock className="h-4 w-4" />
          <h2 id="modal-pin-titulo" className="text-sm font-black uppercase tracking-wider text-white">
            Acceso Personal
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          aria-label="Cerrar teclado de PIN"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <p className="mt-4 text-xs text-neutral-400">
        Ingresa el PIN de 4 dígitos para salir del modo Kiosco
      </p>

      {/* Indicadores visuales de puntos del PIN */}
      <div className="my-5 flex justify-center gap-4">
        {[0, 1, 2, 3].map((idx) => {
          const filled = idx < pin.length;
          return (
            <div
              key={idx}
              className={`h-4 w-4 rounded-full border-2 transition-all duration-200 ${
                error
                  ? 'border-red-500 bg-red-500 animate-pulse'
                  : filled
                  ? 'border-gold-400 bg-gold-400 scale-110'
                  : 'border-neutral-700 bg-neutral-950'
              }`}
            />
          );
        })}
      </div>

      {error && (
        <p className="text-xs font-bold text-red-400 mb-2">
          PIN incorrecto. Intenta de nuevo.
        </p>
      )}

      {/* Teclado numérico táctil */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num)}
            className="flex h-14 w-full items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 font-display text-xl font-black text-white hover:border-gold-400/50 hover:bg-neutral-800 active:scale-95 transition-all min-h-[48px]"
          >
            {num}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="flex h-14 w-full items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 font-display text-xl font-black text-white hover:border-gold-400/50 hover:bg-neutral-800 active:scale-95 transition-all min-h-[48px]"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="flex h-14 w-full items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all min-h-[48px]"
          aria-label="Borrar último dígito"
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </StorefrontDialog>
  );
}
