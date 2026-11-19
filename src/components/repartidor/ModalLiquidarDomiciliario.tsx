import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  DollarSign,
  Smartphone,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { formatCOP } from '@/utils/formatCOP';
import type { Domicilio, LiquidacionDomiciliario } from '@/types';
import {
  calcularDiferenciaRendicion,
  calcularLiquidacionConBase,
  sanitizarMontoRuta,
} from '@/utils/liquidacionDomiciliariosUtils';

interface ModalLiquidarDomiciliarioProps {
  isOpen: boolean;
  baseActiva?: LiquidacionDomiciliario | null;
  domiciliarioId: string;
  domiciliarioNombre: string;
  domiciliosEntregados: Domicilio[];
  idsYaLiquidados: Set<string>;
  loading?: boolean;
  onClose: () => void;
  onConfirmar: (datos: {
    liquidacionId?: string;
    domiciliarioId: string;
    domiciliarioNombre: string;
    efectivoEntregadoFisico: number;
    notasLiquidacion?: string;
  }) => Promise<void>;
}

export function ModalLiquidarDomiciliario({
  isOpen,
  baseActiva,
  domiciliarioId,
  domiciliarioNombre,
  domiciliosEntregados,
  idsYaLiquidados,
  loading = false,
  onClose,
  onConfirmar,
}: ModalLiquidarDomiciliarioProps) {
  const calculo = useMemo(
    () =>
      calcularLiquidacionConBase(domiciliosEntregados, {
        domiciliarioId,
        montoBaseInicial: baseActiva?.montoBaseInicial || 0,
        idsYaLiquidados,
      }),
    [domiciliosEntregados, domiciliarioId, baseActiva?.montoBaseInicial, idsYaLiquidados]
  );

  const [efectivoStr, setEfectivoStr] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setEfectivoStr(String(calculo.efectivoEsperadoRendir));
    setNotas('');
  }, [isOpen, calculo.efectivoEsperadoRendir]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const efectivoFisico = sanitizarMontoRuta(efectivoStr);
  const { diferencia, estadoCuadre } = calcularDiferenciaRendicion(
    calculo.efectivoEsperadoRendir,
    efectivoFisico
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirmar({
      liquidacionId: baseActiva?.id,
      domiciliarioId,
      domiciliarioNombre,
      efectivoEntregadoFisico: efectivoFisico,
      notasLiquidacion: notas.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-liquidar-domiciliario"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="titulo-modal-liquidar-domiciliario"
                className="font-display text-lg font-bold text-white"
              >
                Liquidar Ruta · {domiciliarioNombre}
              </h2>
              <p className="text-xs text-neutral-400">
                {baseActiva
                  ? `Acta ${baseActiva.codigoActa} · Base inicial ${formatCOP(baseActiva.montoBaseInicial)}`
                  : 'Liquidación directa de turno (sin base inicial previa)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar modal de liquidación"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Resumen de carreras y montos */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
              <span className="text-[11px] font-semibold uppercase text-neutral-400">
                Base Inicial
              </span>
              <p className="mt-1 font-display text-base font-bold text-white">
                {formatCOP(calculo.montoBaseInicial)}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
              <span className="text-[11px] font-semibold uppercase text-neutral-400">
                Entregas ({calculo.totalEntregas})
              </span>
              <p className="mt-1 font-display text-base font-bold text-emerald-400">
                +{formatCOP(calculo.totalEfectivo)} efec.
              </p>
            </div>

            <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 p-3">
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-gold-400">
                <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Esperado en Caja</span>
              </div>
              <p className="mt-1 font-display text-lg font-black text-gold-400">
                {formatCOP(calculo.efectivoEsperadoRendir)}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-sky-400">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Transferencias</span>
              </div>
              <p className="mt-1 font-display text-base font-bold text-sky-400">
                {formatCOP(calculo.totalTransferencia)}
              </p>
            </div>
          </div>

          {/* Entrada de efectivo físico entregado */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="input-efectivo-entregado-repartidor"
                className="text-xs font-semibold text-neutral-300"
              >
                Efectivo Físico Entregado por Repartidor (COP)
              </label>
              <button
                type="button"
                onClick={() => setEfectivoStr(String(calculo.efectivoEsperadoRendir))}
                className="text-xs font-bold text-amber-400 hover:text-amber-300"
              >
                Usar monto exacto
              </button>
            </div>
            <input
              id="input-efectivo-entregado-repartidor"
              type="number"
              min={0}
              step={500}
              value={efectivoStr}
              onChange={(e) => setEfectivoStr(e.target.value)}
              className="min-h-[48px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 font-display text-xl font-black text-white focus:border-amber-500 focus:outline-none"
              required
            />
          </div>

          {/* Semáforo de cuadre */}
          <div
            className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
              estadoCuadre === 'cuadrado'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : estadoCuadre === 'sobrante'
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {estadoCuadre === 'cuadrado' ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {estadoCuadre === 'cuadrado'
                  ? 'Cuadre Exacto en Caja'
                  : estadoCuadre === 'sobrante'
                  ? 'Sobrante de Ruta'
                  : 'Faltante en Rendición (genera alerta)'}
              </span>
            </div>
            <span className="font-display text-sm">
              {diferencia > 0 ? `+${formatCOP(diferencia)}` : formatCOP(diferencia)}
            </span>
          </div>

          <Textarea
            label="Notas de Liquidación (Opcional)"
            placeholder="Ej. Entregó $50.000 en billetes y $35.000 en monedas..."
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

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
              disabled={loading}
              className="min-h-[44px] bg-emerald-500 font-bold text-neutral-950 hover:bg-emerald-400"
            >
              {loading ? 'Conciliando...' : 'Confirmar y Emitir Acta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
