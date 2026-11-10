import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileCheck2,
  User,
  Coins,
  Receipt,
} from 'lucide-react';
import type { ResumenDiaCierre } from '@/hooks/useCierreCaja';
import type { Caja } from '@/types';
import type { DesgloseDenominaciones, ArqueoEfectivo } from '@/types/cierreCaja';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import { calcularTotalesArqueo } from '@/utils/arqueoCaja';
import { DesgloseDenominacionesGrid } from './DesgloseDenominacionesGrid';
import { ComparadorArqueoCard } from './ComparadorArqueoCard';

interface ModalCierreCajaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (
    notas: string,
    extra: {
      arqueo: ArqueoEfectivo;
      cajeroNombre: string;
    }
  ) => Promise<void>;
  resumenDia: ResumenDiaCierre;
  cajaActual: Caja | null;
  guardando: boolean;
}

export function ModalCierreCaja({
  isOpen,
  onClose,
  onConfirmar,
  resumenDia,
  cajaActual,
  guardando,
}: ModalCierreCajaProps) {
  const [pasoActivo, setPasoActivo] = useState<'arqueo' | 'resumen'>('arqueo');
  const [denominaciones, setDenominaciones] = useState<DesgloseDenominaciones>({});
  const [cajeroNombre, setCajeroNombre] = useState('');
  const [notas, setNotas] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // El efectivo esperado en sistema toma la caja abierta actual o el saldo calculado
  const efectivoEsperado =
    cajaActual?.saldoActual !== undefined
      ? Math.max(0, cajaActual.saldoActual)
      : resumenDia.saldoCajaEsperado;

  const arqueoActual = calcularTotalesArqueo(denominaciones, efectivoEsperado);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, guardando]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    await onConfirmar(notas, {
      arqueo: arqueoActual,
      cajeroNombre: cajeroNombre.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cierre-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-6 shadow-2xl"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <FileCheck2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-cierre-title" className="font-display text-lg font-bold text-white">
                Cierre de Turno y Arqueo de Efectivo
              </h2>
              <p className="text-xs text-neutral-400">
                Auditoría obligatoria de balance e inventario físico de dinero
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de arqueo"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Pestañas de Navegación del Modal */}
        <div className="flex border-b border-neutral-800 my-3">
          <button
            type="button"
            onClick={() => setPasoActivo('arqueo')}
            className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              pasoActivo === 'arqueo'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Coins className="h-4 w-4" aria-hidden="true" />
            <span>1. Arqueo Físico COP</span>
          </button>

          <button
            type="button"
            onClick={() => setPasoActivo('resumen')}
            className={`flex-1 pb-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              pasoActivo === 'resumen'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Receipt className="h-4 w-4" aria-hidden="true" />
            <span>2. Balance y Datos</span>
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="overflow-y-auto px-1 py-1 space-y-4 max-h-[62vh]">
          {pasoActivo === 'arqueo' ? (
            <div className="space-y-4">
              {/* Comparador en Vivo en la parte superior del arqueo */}
              <ComparadorArqueoCard arqueo={arqueoActual} />

              {/* Grid interactivo de denominaciones */}
              <DesgloseDenominacionesGrid
                denominaciones={denominaciones}
                onChange={setDenominaciones}
                disabled={guardando}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen Financiero del Día */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                  Balance del Turno (Sistema)
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-400 block text-[11px]">Ventas Mostrador (POS)</span>
                    <span className="text-white font-bold text-sm block mt-0.5">
                      {formatCOP(resumenDia.ventasPos)}
                    </span>
                  </div>

                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-400 block text-[11px]">Ventas WhatsApp / Web</span>
                    <span className="text-white font-bold text-sm block mt-0.5">
                      {formatCOP(resumenDia.ventasWhatsapp)}
                    </span>
                  </div>

                  {Boolean(resumenDia.ventasTandas && resumenDia.ventasTandas > 0) && (
                    <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                      <span className="text-neutral-400 block text-[11px]">Ventas Tandas (Vitrina)</span>
                      <span className="text-amber-300 font-bold text-sm block mt-0.5">
                        {formatCOP(resumenDia.ventasTandas || 0)}
                      </span>
                    </div>
                  )}

                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-400 block text-[11px]">Total Ingresos</span>
                    <span className="text-amber-400 font-bold text-sm block mt-0.5">
                      {formatCOP(resumenDia.totalVentas)}
                    </span>
                  </div>

                  <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80">
                    <span className="text-neutral-400 block text-[11px]">Total Gastos</span>
                    <span className="text-red-400 font-bold text-sm block mt-0.5">
                      -{formatCOP(resumenDia.totalGastos)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                  <span className="text-sm font-semibold text-neutral-200">Utilidad Neta del Turno:</span>
                  <span className="font-display font-black text-lg text-emerald-400">
                    {formatCOP(resumenDia.utilidadNeta)}
                  </span>
                </div>
              </div>

              {/* Datos de Autoría y Notas */}
              <div className="space-y-3 pt-1">
                <div>
                  <label htmlFor="cajero-nombre" className="block text-xs font-medium text-neutral-300 mb-1">
                    Nombre del Cajero / Responsable del Cierre
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-neutral-500" aria-hidden="true" />
                    <Input
                      id="cajero-nombre"
                      type="text"
                      placeholder="Ej: Andrés Sánchez (Cajero Principal)"
                      value={cajeroNombre}
                      onChange={(e) => setCajeroNombre(e.target.value)}
                      disabled={guardando}
                      className="pl-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notas-cierre" className="block text-xs font-medium text-neutral-300 mb-1">
                    Observaciones o Notas de Cierre (Opcional)
                  </label>
                  <Textarea
                    id="notas-cierre"
                    placeholder="Ej: Billetes arqueados y verificados conforme a la caja registradora. Se entrega turno sin novedades."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    rows={3}
                    disabled={guardando}
                    className="w-full text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="border-t border-neutral-800 pt-3 mt-3 flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={guardando}
            className="flex-1 min-h-[44px]"
          >
            Cancelar
          </Button>

          {pasoActivo === 'arqueo' ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setPasoActivo('resumen')}
              disabled={guardando}
              className="flex-1 min-h-[44px] font-bold"
            >
              Continuar a Balance ➔
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              loading={guardando}
              disabled={guardando}
              onClick={handleSubmit}
              className="flex-1 min-h-[44px] font-bold bg-amber-500 hover:bg-amber-400 text-black"
            >
              Confirmar Cierre y Guardar Acta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
