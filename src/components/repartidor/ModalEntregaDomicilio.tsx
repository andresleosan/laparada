import React, { useEffect, useRef, useState } from 'react';
import { Banknote, CheckCircle, CreditCard, Image as ImageIcon, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { formatCOP } from '@/utils/formatCOP';
import type { Domicilio, MetodoPago } from '@/types';

interface ModalEntregaDomicilioProps {
  isOpen: boolean;
  domicilio: Domicilio | null;
  onClose: () => void;
  onConfirmar: (datos: {
    metodoPago: MetodoPago;
    notasEntrega?: string;
    fotoTransferencia?: File | null;
  }) => Promise<void>;
  loading?: boolean;
}

export function ModalEntregaDomicilio({
  isOpen,
  domicilio,
  onClose,
  onConfirmar,
  loading = false,
}: ModalEntregaDomicilioProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [notas, setNotas] = useState('');
  const [fotoTransferencia, setFotoTransferencia] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (domicilio) {
      setMetodoPago(domicilio.metodoPago || 'efectivo');
      setNotas('');
      setFotoTransferencia(null);
      setPreviewUrl(null);
    }
  }, [domicilio]);

  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFotoTransferencia(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveFoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFotoTransferencia(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domicilio || loading) return;
    await onConfirmar({
      metodoPago,
      notasEntrega: notas.trim() || undefined,
      fotoTransferencia,
    });
  };

  if (!isOpen || !domicilio) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-entrega-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl text-white"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h2 id="modal-entrega-title" className="font-display text-base font-bold text-white">
              Confirmar Entrega de Pedido
            </h2>
            <p className="text-xs text-neutral-400">
              Registra el cobro y finaliza la carrera
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar modal de entrega"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Resumen del Destino y Cliente */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs text-neutral-300">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-white">{domicilio.clienteNombre}</p>
                <div className="flex items-center gap-1.5 mt-1 text-neutral-300">
                  <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="font-medium">{domicilio.direccion} ({domicilio.barrio})</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total a cobrar</span>
                <span className="font-display font-black text-base text-gold-400">
                  {formatCOP(domicilio.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Método de pago recibido */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              ¿Cómo pagó el cliente? *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                aria-pressed={metodoPago === 'efectivo'}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  metodoPago === 'efectivo'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <Banknote className="h-4 w-4 text-emerald-400" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                aria-pressed={metodoPago === 'transferencia'}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  metodoPago === 'transferencia'
                    ? 'border-sky-500 bg-sky-500/20 text-sky-300 ring-2 ring-sky-500/20'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <CreditCard className="h-4 w-4 text-sky-400" />
                <span>Transferencia</span>
              </button>
            </div>
          </div>

          {/* Si es transferencia: comprobante opcional */}
          {metodoPago === 'transferencia' && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 space-y-2">
              <label className="block text-xs font-semibold text-sky-200">
                Foto del Comprobante (opcional)
              </label>
              {previewUrl ? (
                <div className="relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Vista previa del comprobante"
                    className="h-24 w-24 object-cover rounded-lg border border-sky-400/40"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveFoto}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                    aria-label="Quitar foto de comprobante"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-sky-400/40 bg-neutral-900 px-3 py-2 text-xs font-medium text-sky-300 hover:bg-neutral-800">
                  <ImageIcon className="h-4 w-4" />
                  <span>Tomar foto o subir comprobante</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFotoChange}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          )}

          {/* Notas de entrega */}
          <div>
            <label htmlFor="notas-entrega" className="block text-xs font-semibold text-neutral-300 mb-1">
              Notas de la entrega (opcional)
            </label>
            <Textarea
              id="notas-entrega"
              placeholder="Ej: Entregado en portería torre 2, recibió don Pedro."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className="w-full text-xs bg-neutral-900 border-neutral-800 text-white placeholder-neutral-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1 min-h-[44px] text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={loading}
              className="flex-1 min-h-[44px] text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Confirmar Entrega</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
