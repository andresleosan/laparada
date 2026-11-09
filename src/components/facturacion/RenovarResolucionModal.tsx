import { useState } from 'react';
import { X, Hash, FileText } from 'lucide-react';
import type { ResolucionDian } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface RenovarResolucionModalProps {
  isOpen: boolean;
  onClose: () => void;
  resolucionActual: ResolucionDian;
  onGuardar: (resolucion: ResolucionDian) => Promise<void>;
}

export function RenovarResolucionModal({
  isOpen,
  onClose,
  resolucionActual,
  onGuardar,
}: RenovarResolucionModalProps) {
  const [form, setForm] = useState<ResolucionDian>({ ...resolucionActual });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.numeroResolucion.trim()) {
      setError('El número de resolución DIAN es obligatorio');
      return;
    }
    if (!form.prefijo.trim()) {
      setError('El prefijo de facturación es obligatorio (ej: POS)');
      return;
    }
    if (form.rangoInicial < 1 || form.rangoFinal <= form.rangoInicial) {
      setError('El rango final debe ser mayor al rango inicial');
      return;
    }
    if (form.consecutivoActual < form.rangoInicial || form.consecutivoActual > form.rangoFinal) {
      setError('El consecutivo actual debe estar dentro del rango autorizado');
      return;
    }
    if (!form.fechaExpedicion || !form.fechaVencimiento) {
      setError('Las fechas de expedición y vencimiento son obligatorias');
      return;
    }

    try {
      setGuardando(true);
      await onGuardar({
        ...form,
        prefijo: form.prefijo.trim().toUpperCase(),
        numeroResolucion: form.numeroResolucion.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar resolución');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-resolucion-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-resolucion-title" className="font-display text-base font-bold text-white">
                Actualizar Resolución DIAN
              </h2>
              <p className="text-xs text-neutral-400">
                Rangos y vigencia de numeración para Documento Equivalente POS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="my-4 space-y-4 overflow-y-auto pr-1">
          {error && (
            <div className="rounded-lg border border-red-800/80 bg-red-950/50 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Número de Formulario / Resolución DIAN *
            </label>
            <Input
              value={form.numeroResolucion}
              onChange={(e) => setForm({ ...form, numeroResolucion: e.target.value })}
              placeholder="Ej: 18764089123456"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Prefijo Autorizado *
              </label>
              <Input
                value={form.prefijo}
                onChange={(e) => setForm({ ...form, prefijo: e.target.value.toUpperCase() })}
                placeholder="POS"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Consecutivo Actual a Emitir *
              </label>
              <Input
                type="number"
                min={form.rangoInicial}
                max={form.rangoFinal}
                value={form.consecutivoActual}
                onChange={(e) => setForm({ ...form, consecutivoActual: parseInt(e.target.value, 10) || 1 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Rango Inicial *
              </label>
              <Input
                type="number"
                min={1}
                value={form.rangoInicial}
                onChange={(e) => setForm({ ...form, rangoInicial: parseInt(e.target.value, 10) || 1 })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Rango Final *
              </label>
              <Input
                type="number"
                min={form.rangoInicial + 1}
                value={form.rangoFinal}
                onChange={(e) => setForm({ ...form, rangoFinal: parseInt(e.target.value, 10) || 1000 })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Fecha de Expedición *
              </label>
              <Input
                type="date"
                value={form.fechaExpedicion}
                onChange={(e) => setForm({ ...form, fechaExpedicion: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Fecha de Vencimiento *
              </label>
              <Input
                type="date"
                value={form.fechaVencimiento}
                onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-400">
            <p className="flex items-center gap-1.5 font-medium text-neutral-200">
              <Hash className="h-4 w-4 text-amber-400" />
              Previsualización del siguiente documento:
            </p>
            <p className="mt-1 font-mono text-amber-400">
              {form.prefijo || 'POS'}-{String(form.consecutivoActual).padStart(5, '0')}
            </p>
          </div>

          <div className="flex justify-end gap-3 border-t border-neutral-800 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando}
              className="min-h-[44px] font-bold"
            >
              {guardando ? 'Guardando...' : 'Guardar Resolución'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
