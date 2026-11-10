import React, { useState } from 'react';
import { X, PlusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ModalAdicionMermaProps {
  isOpen: boolean;
  onClose: () => void;
  producto: { id: string; nombre: string } | null;
  modo: 'adicion' | 'merma';
  onConfirmar: (cantidad: number, notaOMotivo?: string) => Promise<void>;
}

export function ModalAdicionMerma({
  isOpen,
  onClose,
  producto,
  modo,
  onConfirmar,
}: ModalAdicionMermaProps) {
  const [cantidad, setCantidad] = useState(modo === 'adicion' ? 10 : 1);
  const [notaOMotivo, setNotaOMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!isOpen || !producto) return null;

  const esAdicion = modo === 'adicion';
  const presetsAdicion = [5, 10, 15, 20, 30, 50];
  const motivosMerma = [
    'Quemada o cocción defectuosa',
    'Caída al piso',
    'Cortesía / Degustación',
    'Prueba de calidad',
    'Vencida o no apta',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cantidad <= 0) {
      setErrorLocal('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      await onConfirmar(cantidad, notaOMotivo.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar';
      setErrorLocal(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-adicion-merma-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                esAdicion ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {esAdicion ? (
                <PlusCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2
                id="modal-adicion-merma-title"
                className="font-display text-base font-bold text-white"
              >
                {esAdicion ? 'Recargar Tanda (Adición)' : 'Registrar Merma / Baja'}
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-[240px]">{producto.nombre}</p>
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
              {esAdicion ? 'Unidades producidas a sumar:' : 'Unidades dadas de baja / mermadas:'}
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-11 text-center font-bold text-lg"
              />
            </div>
          </div>

          {/* Presets rápidos */}
          {esAdicion && (
            <div>
              <span className="text-[11px] font-medium text-neutral-400 block mb-1">
                Atajos rápidos:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {presetsAdicion.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCantidad(val)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      cantidad === val
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!esAdicion && (
            <div>
              <span className="text-[11px] font-medium text-neutral-400 block mb-1">
                Motivos frecuentes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {motivosMerma.map((motivo) => (
                  <button
                    key={motivo}
                    type="button"
                    onClick={() => setNotaOMotivo(motivo)}
                    className={`rounded-lg px-2 py-1 text-[11px] transition-colors ${
                      notaOMotivo === motivo
                        ? 'bg-red-500 text-neutral-950 font-bold'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {motivo}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              {esAdicion ? 'Observación o tanda (opcional):' : 'Detalle o nota (opcional):'}
            </label>
            <Input
              type="text"
              value={notaOMotivo}
              onChange={(e) => setNotaOMotivo(e.target.value)}
              placeholder={esAdicion ? 'Ej: Salida de horno 2' : 'Ej: Se cayó de la bandeja'}
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
              disabled={guardando || cantidad <= 0}
              className={`text-xs font-bold ${
                esAdicion
                  ? 'bg-emerald-500 text-neutral-950 hover:bg-emerald-400'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}
            >
              {guardando
                ? 'Registrando...'
                : esAdicion
                ? `+ Sumar ${cantidad} a Vitrina`
                : `- Descontar ${cantidad} por Merma`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
