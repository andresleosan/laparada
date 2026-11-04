import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, Trash2, X } from 'lucide-react';
import type { Venta } from '@/types';
import type { MotivoAnulacionVenta, DatosAnulacionVenta } from '@/types/anulacionVenta';
import { CATALOGO_MOTIVOS_ANULACION, validarDatosAnulacion } from '@/utils/anulacionVentasUtils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

interface AnularVentaModalProps {
  venta: Venta | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (datos: DatosAnulacionVenta) => Promise<void>;
}

export function AnularVentaModal({
  venta,
  isOpen,
  onClose,
  onConfirmar,
}: AnularVentaModalProps) {
  const [motivo, setMotivo] = useState<MotivoAnulacionVenta>('error_digitacion');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [notas, setNotas] = useState('');
  const [revertirStock, setRevertirStock] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMotivo('error_digitacion');
      setMotivoPersonalizado('');
      setNotas('');
      setRevertirStock(true);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !venta) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const datos: DatosAnulacionVenta = {
      motivo,
      motivoPersonalizado: motivo === 'otro' ? motivoPersonalizado.trim() : undefined,
      notas: notas.trim() || undefined,
      revertirStock,
    };

    const validacion = validarDatosAnulacion(datos);
    if (!validacion.valido) {
      createToast(validacion.error || 'Complete los datos requeridos', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmar(datos);
      onClose();
    } catch (error) {
      console.error('Error al anular venta:', error);
      createToast('No fue posible anular la venta. Intente de nuevo.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="anular-venta-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-2xl border border-red-900/60 bg-neutral-950 p-6 shadow-2xl transition-all"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Cerrar modal de anulación"
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-50"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="anular-venta-title" className="font-display text-lg font-bold text-white">
              Anular Venta #{venta.id.slice(-6).toUpperCase()}
            </h2>
            <p className="text-xs text-neutral-400">
              Esta acción registrará la baja formal para auditoría contable y de caja.
            </p>
          </div>
        </div>

        {/* Resumen del ticket a anular */}
        <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-400">Total a anular:</span>
            <span className="font-display text-xl font-bold text-red-400">
              {formatCOP(venta.total)}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            <span>Método: <strong className="text-white capitalize">{venta.metodoPago}</strong></span>
            {venta.mesaNombre ? <span> · Mesa: <strong className="text-white">{venta.mesaNombre}</strong></span> : null}
            {venta.clienteNombre ? <span> · Cliente: <strong className="text-white">{venta.clienteNombre}</strong></span> : null}
          </div>
          {venta.items && venta.items.length > 0 && (
            <div className="mt-2 border-t border-neutral-800/80 pt-2 text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">Ítems ({venta.items.length}): </span>
              {venta.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Selector de Motivos */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Motivo de la anulación *
            </label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CATALOGO_MOTIVOS_ANULACION.map((m) => {
                const isSelected = motivo === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMotivo(m.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[44px] flex-col justify-center rounded-xl border p-2.5 text-left text-xs transition-all ${
                      isSelected
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-semibold">{m.label}</span>
                    <span className="mt-0.5 text-[10px] text-neutral-400">{m.descripcion}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Motivo personalizado si seleccionó 'otro' */}
          {motivo === 'otro' && (
            <div>
              <label htmlFor="motivo-personalizado" className="block text-xs font-medium text-neutral-300">
                Especifique el motivo de anulación *
              </label>
              <Input
                id="motivo-personalizado"
                type="text"
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                placeholder="Ej. Plato con exceso de cocción o cliente se fue sin esperar"
                required
                className="mt-1"
              />
            </div>
          )}

          {/* Opción de Reversión de Inventario */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={revertirStock}
                onChange={(e) => setRevertirStock(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-500 focus:ring-offset-neutral-950"
              />
              <div className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                  Reintegrar ingredientes al inventario
                </span>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  {revertirStock
                    ? 'Los insumos de receta volverán a sumarse al stock de bodega (el plato no se cocinó o sigue intacto).'
                    : 'No reintegrar stock: se registrará como merma/desperdicio de cocina ya preparado.'}
                </p>
              </div>
            </label>
          </div>

          {/* Notas internas */}
          <div>
            <label htmlFor="notas-anulacion" className="block text-xs font-medium text-neutral-300">
              Observaciones o notas de auditoría (opcional)
            </label>
            <textarea
              id="notas-anulacion"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles adicionales para el administrador o dueño del negocio..."
              className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 p-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px]"
            >
              Conservar venta
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={isSubmitting}
              disabled={isSubmitting}
              className="min-h-[44px] gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Confirmar anulación
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
