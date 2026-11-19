import React, { useEffect, useState } from 'react';
import { RefreshCw, UserCheck, X } from 'lucide-react';
import type { DesgloseDenominaciones, RegistrarCorteXInput } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { calcularTotalesArqueo } from '@/utils/arqueoCaja';
import { DesgloseDenominacionesGrid } from '@/components/cierre/DesgloseDenominacionesGrid';
import { ComparadorArqueoCard } from '@/components/cierre/ComparadorArqueoCard';

interface CorteXModalProps {
  isOpen: boolean;
  cajaId?: string;
  cajeroSalienteDefault?: string;
  efectivoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ingresosSencillo: number;
  sangriasCajaFuerte: number;
  egresosCajaMenor: number;
  gastosOperativos: number;
  efectivoEsperado: number;
  guardando: boolean;
  onClose: () => void;
  onConfirmar: (
    input: Omit<RegistrarCorteXInput, 'negocioId'>
  ) => Promise<void>;
}

export function CorteXModal({
  isOpen,
  cajaId,
  cajeroSalienteDefault = '',
  efectivoInicial,
  ventasEfectivo,
  ventasTransferencia,
  ingresosSencillo,
  sangriasCajaFuerte,
  egresosCajaMenor,
  gastosOperativos,
  efectivoEsperado,
  guardando,
  onClose,
  onConfirmar,
}: CorteXModalProps) {
  const [denominaciones, setDenominaciones] = useState<DesgloseDenominaciones>({});
  const [cajeroSaliente, setCajeroSaliente] = useState(cajeroSalienteDefault);
  const [cajeroEntrante, setCajeroEntrante] = useState('');
  const [notas, setNotas] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDenominaciones({});
    setCajeroSaliente(cajeroSalienteDefault);
    setCajeroEntrante('');
    setNotas('');
    setErrorMsg(null);
  }, [isOpen, cajeroSalienteDefault]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, guardando, onClose]);

  if (!isOpen) return null;

  const arqueoActual = calcularTotalesArqueo(denominaciones, efectivoEsperado);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setErrorMsg(null);

    if (cajeroSaliente.trim().length < 2) {
      setErrorMsg('Ingresa el nombre del cajero saliente que entrega el turno.');
      return;
    }

    try {
      await onConfirmar({
        cajaId,
        cajeroSaliente: cajeroSaliente.trim(),
        cajeroEntrante: cajeroEntrante.trim() || undefined,
        efectivoInicial,
        ventasEfectivo,
        ventasTransferencia,
        ingresosSencillo,
        sangriasCajaFuerte,
        egresosCajaMenor,
        gastosOperativos,
        efectivoEsperado,
        arqueo: arqueoActual,
        notas: notas.trim() || undefined,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo guardar el Corte X.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-corte-x-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-corte-x-title" className="font-display text-lg font-bold text-white">
                Corte X — Arqueo Parcial de Relevo
              </h2>
              <p className="text-xs text-neutral-400">
                Verifica el efectivo del cajón sin cerrar la jornada contable del día
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de Corte X"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          <ComparadorArqueoCard arqueo={arqueoActual} />

          <DesgloseDenominacionesGrid
            denominaciones={denominaciones}
            onChange={setDenominaciones}
            disabled={guardando}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cajero-saliente" className="mb-1 block text-xs font-medium text-neutral-300">
                Cajero Saliente (Entrega)
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-3 h-4 w-4 text-neutral-500" aria-hidden="true" />
                <Input
                  id="cajero-saliente"
                  type="text"
                  placeholder="Nombre quien entrega"
                  value={cajeroSaliente}
                  onChange={(e) => setCajeroSaliente(e.target.value)}
                  disabled={guardando}
                  className="pl-9 text-xs"
                  required
                />
              </div>
            </div>

            <Input
              label="Cajero Entrante (Recibe · Opcional)"
              type="text"
              placeholder="Nombre quien recibe turno"
              value={cajeroEntrante}
              onChange={(e) => setCajeroEntrante(e.target.value)}
              disabled={guardando}
            />
          </div>

          <Textarea
            label="Notas de relevo (Opcional)"
            rows={2}
            placeholder="Ej: Se entrega cajón cuadrado con base en monedas de $500."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={guardando}
          />

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando}
              className="flex-1 min-h-[44px] font-bold"
            >
              Emitir Acta de Corte X
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
