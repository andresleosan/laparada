import React, { useEffect, useState } from 'react';
import { Banknote, Bike, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import {
  MONTOS_BASE_RAPIDOS_RUTA,
  sanitizarMontoRuta,
} from '@/utils/liquidacionDomiciliariosUtils';

export interface RepartidorOption {
  id: string;
  nombre: string;
}

interface ModalEntregarBaseRutaProps {
  isOpen: boolean;
  repartidores: RepartidorOption[];
  entregadoPorDefault: string;
  loading?: boolean;
  onClose: () => void;
  onConfirmar: (datos: {
    domiciliarioId: string;
    domiciliarioNombre: string;
    montoBaseInicial: number;
    entregadoPor: string;
    observacionesBase?: string;
  }) => Promise<void>;
}

export function ModalEntregarBaseRuta({
  isOpen,
  repartidores,
  entregadoPorDefault,
  loading = false,
  onClose,
  onConfirmar,
}: ModalEntregarBaseRutaProps) {
  const [domiciliarioId, setDomiciliarioId] = useState('');
  const [nombreManual, setNombreManual] = useState('');
  const [montoStr, setMontoStr] = useState('50000');
  const [observaciones, setObservaciones] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    setMontoStr('50000');
    setObservaciones('');
    if (repartidores.length > 0) {
      setDomiciliarioId(repartidores[0].id);
      setNombreManual('');
    } else {
      setDomiciliarioId('manual');
      setNombreManual('');
    }
  }, [isOpen, repartidores]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const montoNumerico = sanitizarMontoRuta(montoStr);
  const repartidorSeleccionado = repartidores.find((r) => r.id === domiciliarioId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (montoNumerico <= 0) {
      setErrorLocal('Ingresa un monto de base válido mayor a $0');
      return;
    }

    const esManual = domiciliarioId === 'manual' || !repartidorSeleccionado;
    const nombreFinal = esManual
      ? nombreManual.trim()
      : repartidorSeleccionado.nombre.trim();
    const idFinal = esManual
      ? `rep-${nombreFinal.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : repartidorSeleccionado.id;

    if (nombreFinal.length < 2) {
      setErrorLocal('Ingresa el nombre del domiciliario (mínimo 2 caracteres)');
      return;
    }

    await onConfirmar({
      domiciliarioId: idFinal,
      domiciliarioNombre: nombreFinal,
      montoBaseInicial: montoNumerico,
      entregadoPor: entregadoPorDefault,
      observacionesBase: observaciones.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-base-ruta"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Bike className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="titulo-modal-base-ruta"
                className="font-display text-lg font-bold text-white"
              >
                Entregar Base de Sencillo
              </h2>
              <p className="text-xs text-neutral-400">
                Se descuenta temporalmente del cajón hasta liquidar la ruta
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar modal de entrega de base"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="select-repartidor-base"
              className="mb-1.5 block text-xs font-semibold text-neutral-300"
            >
              Domiciliario
            </label>
            <select
              id="select-repartidor-base"
              value={domiciliarioId}
              onChange={(e) => setDomiciliarioId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-sm text-white focus:border-amber-500 focus:outline-none"
            >
              {repartidores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
              <option value="manual">+ Otro repartidor / turno eventual</option>
            </select>
          </div>

          {(domiciliarioId === 'manual' || !repartidorSeleccionado) && (
            <Input
              label="Nombre del Repartidor"
              placeholder="Ej. Carlos Mendoza"
              value={nombreManual}
              onChange={(e) => setNombreManual(e.target.value)}
              required
            />
          )}

          <div>
            <label
              htmlFor="input-monto-base-ruta"
              className="mb-1.5 block text-xs font-semibold text-neutral-300"
            >
              Monto de Base Inicial (COP)
            </label>
            <div className="relative">
              <Banknote
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400"
                aria-hidden="true"
              />
              <input
                id="input-monto-base-ruta"
                type="number"
                min={1000}
                step={1000}
                value={montoStr}
                onChange={(e) => setMontoStr(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-3 font-display text-base font-bold text-white focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {MONTOS_BASE_RAPIDOS_RUTA.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  onClick={() => setMontoStr(String(monto))}
                  aria-pressed={montoNumerico === monto}
                  className={`min-h-[44px] rounded-xl border text-xs font-bold transition-colors ${
                    montoNumerico === monto
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {formatCOP(monto)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Observaciones (Opcional)"
            placeholder="Ej. Sencillo en billetes de $2.000 y $5.000"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />

          {errorLocal && (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {errorLocal}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || montoNumerico <= 0}
              className="min-h-[44px] bg-amber-500 font-bold text-neutral-950 hover:bg-amber-400"
            >
              {loading ? 'Registrando...' : `Entregar ${formatCOP(montoNumerico)}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
