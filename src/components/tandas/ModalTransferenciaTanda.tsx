import React, { useState } from 'react';
import { X, Smartphone, CheckCircle2 } from 'lucide-react';
import type { MetodoTransferenciaTanda } from '@/types/tanda';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';

interface ModalTransferenciaTandaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (
    monto: number,
    metodo: MetodoTransferenciaTanda,
    referencia?: string,
    fotoUrl?: string,
    nota?: string
  ) => Promise<void>;
}

export function ModalTransferenciaTanda({
  isOpen,
  onClose,
  onConfirmar,
}: ModalTransferenciaTandaProps) {
  const [monto, setMonto] = useState<number>(10000);
  const [metodo, setMetodo] = useState<MetodoTransferenciaTanda>('nequi');
  const [referencia, setReferencia] = useState('');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!isOpen) return null;

  const presetsMonto = [5000, 10000, 15000, 20000, 25000, 50000];
  const metodos: { id: MetodoTransferenciaTanda; label: string; color: string }[] = [
    { id: 'nequi', label: 'Nequi', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { id: 'daviplata', label: 'Daviplata', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
    { id: 'bancolombia', label: 'Bancolombia', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { id: 'otro', label: 'Otra Transferencia', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (monto <= 0) {
      setErrorLocal('Ingresa un monto válido mayor a 0');
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      await onConfirmar(
        monto,
        metodo,
        referencia.trim() || undefined,
        undefined,
        nota.trim() || undefined
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar transferencia';
      setErrorLocal(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-transferencia-tanda-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
              <Smartphone className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="modal-transferencia-tanda-title"
                className="font-display text-base font-bold text-white"
              >
                Registrar Transferencia (Tanda)
              </h2>
              <p className="text-xs text-neutral-400">
                Guarda pagos de Nequi / Daviplata para descontarlos del efectivo en el arqueo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal"
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorLocal && (
            <div className="rounded-lg bg-red-950/60 border border-red-800/80 p-2 text-xs text-red-200">
              {errorLocal}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Valor transferido (COP):
            </label>
            <Input
              type="number"
              min={100}
              step={100}
              value={monto || ''}
              onChange={(e) => setMonto(parseInt(e.target.value, 10) || 0)}
              className="h-12 text-center font-bold text-xl text-amber-400"
              placeholder="$ 0"
            />
          </div>

          {/* Atajos de montos */}
          <div className="flex flex-wrap gap-1.5">
            {presetsMonto.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setMonto(val)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  monto === val
                    ? 'bg-amber-500 text-neutral-950'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {formatCOP(val)}
              </button>
            ))}
          </div>

          {/* Selección de billetera/método */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Plataforma o canal:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {metodos.map((m) => {
                const activo = metodo === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMetodo(m.id)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs font-bold transition-colors ${
                      activo
                        ? `${m.color} ring-1 ring-white/30`
                        : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:bg-neutral-900'
                    }`}
                  >
                    <span>{m.label}</span>
                    {activo && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Referencia opcional */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Referencia / Comprobante (opcional):
            </label>
            <Input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              placeholder="Ej: M123456 o últimos 4 dígitos"
              className="h-9 text-xs"
            />
          </div>

          {/* Nota opcional */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Nota o cliente (opcional):
            </label>
            <Input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Pago de 3 pancerottis"
              className="h-9 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando || monto <= 0}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              {guardando ? 'Guardando...' : `Registrar ${formatCOP(monto)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
