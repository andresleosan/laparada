import React, { useEffect, useId, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import type {
  BajaRapidaLoteMermaInput,
  LoteEvaluadoSanitario,
  MotivoMerma,
  ResultadoBajaLoteMerma,
} from '@/types';
import { parseFiniteNumber, validatePositiveAmount } from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import { MOTIVOS_MERMA } from '@/utils/kardexInventarioUtils';
import {
  formatearFechaVencimientoCorta,
  SEMAFORO_SANITARIO_META,
} from '@/utils/lotesInventarioUtils';

export interface BajaRapidaLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: LoteEvaluadoSanitario | null;
  onConfirmarBaja: (input: BajaRapidaLoteMermaInput) => Promise<ResultadoBajaLoteMerma>;
  onSuccess?: (res: ResultadoBajaLoteMerma) => void;
}

const MOTIVOS_BAJA_LOTE: MotivoMerma[] = [
  'vencimiento',
  'dañado_almacenamiento',
  'desperdicio_cocina',
  'accidente_caida',
];

export function BajaRapidaLoteModal({
  isOpen,
  onClose,
  lote,
  onConfirmarBaja,
  onSuccess,
}: BajaRapidaLoteModalProps) {
  const generatedId = useId();
  const titleId = `baja-rapida-lote-modal-${generatedId.replace(/:/g, '')}-title`;

  let responsableNombre = 'Administrador';
  const responsableRol = 'admin';
  try {
    const authCtx = useAuth();
    responsableNombre =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro en pruebas unitarias sin AuthProvider
  }

  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState<MotivoMerma>('vencimiento');
  const [notas, setNotas] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (!isOpen || !lote) return;
    setCantidad(String(lote.cantidadDisponible));
    setMotivo(
      lote.estadoSemaforo === 'vencido' || lote.estadoSemaforo === 'critico_3d'
        ? 'vencimiento'
        : 'dañado_almacenamiento'
    );
    setNotas('');
  }, [isOpen, lote]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !procesando) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, procesando, onClose]);

  if (!isOpen || !lote) return null;

  const cantNum = parseFiniteNumber(cantidad) ?? 0;
  const costoEstimadoCOP = Math.round(
    Math.max(0, Math.min(lote.cantidadDisponible, cantNum)) * (lote.costoUnitario || 0)
  );
  const semaforoMeta = SEMAFORO_SANITARIO_META[lote.estadoSemaforo];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errCant = validatePositiveAmount(cantidad);
    if (errCant) {
      createToast(errCant, 'error');
      return;
    }
    if (cantNum > lote.cantidadDisponible) {
      createToast(
        `No puedes dar de baja más de ${lote.cantidadDisponible} ${lote.unidadMedida}`,
        'error'
      );
      return;
    }

    setProcesando(true);
    try {
      const res = await onConfirmarBaja({
        loteId: lote.id,
        cantidad: cantNum,
        motivo,
        notas: notas.trim() || undefined,
        responsable: responsableNombre,
        responsableRol,
      });

      createToast(
        `Baja sanitaria registrada: -${res.cantidadBaja} ${res.unidadMedida} (${res.codigoLote})`,
        'success'
      );
      onSuccess?.(res);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al dar de baja el lote';
      createToast(msg, 'error');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !procesando) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl border border-red-500/30 bg-neutral-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/30 bg-red-500/15 text-red-400">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Baja Rápida de Lote a Merma
              </h2>
              <p className="text-xs text-neutral-400">
                Descuenta el lote, actualiza bodega y registra impacto en Kardex y P&amp;L
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            className="grid h-11 w-11 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
            aria-label="Cerrar modal de baja de lote"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ficha del lote */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-sm text-white">{lote.insumoNombre}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${semaforoMeta.badgeClass}`}>
                {semaforoMeta.shortLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-neutral-400">
              <span>
                Lote: <strong className="font-mono text-gold-300">{lote.codigoLote}</strong>
              </span>
              <span>
                Saldo actual:{' '}
                <strong className="text-white">
                  {lote.cantidadDisponible} {lote.unidadMedida}
                </strong>
              </span>
              <span>
                Caducidad:{' '}
                <strong className="text-neutral-200">
                  {formatearFechaVencimientoCorta(lote.fechaVencimiento)}
                </strong>
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label={`Cantidad a retirar (${lote.unidadMedida})`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={lote.cantidadDisponible}
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCantidad(String(lote.cantidadDisponible))}
                className="min-h-[44px] shrink-0 text-xs"
              >
                Todo ({lote.cantidadDisponible})
              </Button>
            </div>
          </div>

          {/* Motivo sanitario */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-neutral-300">
              Motivo de la Baja Sanitaria
            </span>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {MOTIVOS_MERMA.filter((m) => MOTIVOS_BAJA_LOTE.includes(m.id)).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMotivo(m.id)}
                  className={`min-h-[44px] rounded-xl border p-2.5 text-left text-xs transition-all ${
                    motivo === m.id
                      ? 'border-red-500 bg-red-500/15 font-semibold text-white'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-medium text-white">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Acta / Observación de descarte (opcional)"
            placeholder="Ej: Retiro preventivo en nevera 2, cambio de olor/color..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

          {/* Impacto económico */}
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs">
            <span className="flex items-center gap-1.5 text-red-200 font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
              Impacto estimado en Merma / P&amp;L:
            </span>
            <strong className="font-display text-base font-bold text-red-300">
              -{formatCOP(costoEstimadoCOP)}
            </strong>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-800 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={procesando}
              className="min-h-[44px] px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={procesando}
              disabled={procesando}
              className="min-h-[44px] border-0 bg-red-600 px-5 text-white hover:bg-red-500"
            >
              Confirmar Baja a Merma
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
