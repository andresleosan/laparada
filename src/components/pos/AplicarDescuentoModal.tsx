// src/components/pos/AplicarDescuentoModal.tsx
import { useState, useEffect, useRef, useId, useMemo } from 'react';
import { Gift, Percent, Tag, X, Trash2, CheckCircle2 } from 'lucide-react';
import type { DescuentoAplicado, MotivoDescuentoId, TipoDescuento } from '@/types/descuento';
import {
  calcularDescuento,
  calcularTotalesConDescuentoYPropina,
  MOTIVOS_DESCUENTO_PREDEFINIDOS,
  PORCENTAJES_RAPIDOS_DESCUENTO,
} from '@/utils/descuentosUtils';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';

export interface AplicarDescuentoModalProps {
  isOpen: boolean;
  subtotal: number;
  descuentoActual?: DescuentoAplicado | null;
  onAplicarDescuento: (descuento: DescuentoAplicado) => void;
  onRemoverDescuento: () => void;
  onClose: () => void;
  autorizadoPor?: string;
}

export function AplicarDescuentoModal({
  isOpen,
  subtotal,
  descuentoActual,
  onAplicarDescuento,
  onRemoverDescuento,
  onClose,
  autorizadoPor,
}: AplicarDescuentoModalProps) {
  const generatedId = useId();
  const titleId = `modal-descuento-title-${generatedId.replace(/:/g, '')}`;
  const modalRef = useRef<HTMLDivElement>(null);

  // Modo: 'porcentaje' | 'monto_fijo' | 'cortesia_100'
  const [tipo, setTipo] = useState<TipoDescuento>(descuentoActual?.tipo || 'porcentaje');
  const [porcentajeSeleccionado, setPorcentajeSeleccionado] = useState<number>(
    descuentoActual?.tipo === 'porcentaje' ? descuentoActual.valor : 10
  );
  const [porcentajeLibre, setPorcentajeLibre] = useState('');
  const [montoFijoCOP, setMontoFijoCOP] = useState(
    descuentoActual?.tipo === 'monto_fijo' ? String(descuentoActual.valor) : ''
  );
  const [motivoId, setMotivoId] = useState<MotivoDescuentoId>(
    descuentoActual?.motivoId || 'cliente_vip'
  );
  const [motivoPersonalizado, setMotivoPersonalizado] = useState(
    descuentoActual && !descuentoActual.motivoId ? descuentoActual.motivo : ''
  );

  // Sincronizar estado cuando se abre o cambia el descuento actual
  useEffect(() => {
    if (isOpen) {
      if (descuentoActual) {
        setTipo(descuentoActual.tipo);
        if (descuentoActual.tipo === 'porcentaje') {
          setPorcentajeSeleccionado(descuentoActual.valor);
          setPorcentajeLibre(String(descuentoActual.valor));
        } else if (descuentoActual.tipo === 'monto_fijo') {
          setMontoFijoCOP(String(descuentoActual.valor));
        }
        if (descuentoActual.motivoId) {
          setMotivoId(descuentoActual.motivoId);
        } else {
          setMotivoId('otro');
          setMotivoPersonalizado(descuentoActual.motivo);
        }
      } else {
        setTipo('porcentaje');
        setPorcentajeSeleccionado(10);
        setPorcentajeLibre('10');
        setMontoFijoCOP('');
        setMotivoId('cliente_vip');
        setMotivoPersonalizado('');
      }
    }
  }, [isOpen, descuentoActual]);

  // Manejo de Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Motivo final
  const motivoTextoFinal = useMemo(() => {
    if (motivoId === 'otro' && motivoPersonalizado.trim()) {
      return motivoPersonalizado.trim();
    }
    const def = MOTIVOS_DESCUENTO_PREDEFINIDOS.find((m) => m.id === motivoId);
    return def ? def.label : 'Descuento autorizado';
  }, [motivoId, motivoPersonalizado]);

  // Descuento calculado en vivo
  const descuentoSimulado = useMemo(() => {
    if (tipo === 'cortesia_100') {
      return calcularDescuento(subtotal, 'cortesia_100', 100, motivoTextoFinal, motivoId, autorizadoPor);
    }
    if (tipo === 'porcentaje') {
      const valor = Number(porcentajeLibre) || porcentajeSeleccionado;
      return calcularDescuento(subtotal, 'porcentaje', valor, motivoTextoFinal, motivoId, autorizadoPor);
    }
    const valorMonto = parseInt(montoFijoCOP, 10) || 0;
    return calcularDescuento(subtotal, 'monto_fijo', valorMonto, motivoTextoFinal, motivoId, autorizadoPor);
  }, [subtotal, tipo, porcentajeLibre, porcentajeSeleccionado, montoFijoCOP, motivoTextoFinal, motivoId, autorizadoPor]);

  const totales = useMemo(() => {
    return calcularTotalesConDescuentoYPropina(subtotal, descuentoSimulado);
  }, [subtotal, descuentoSimulado]);

  if (!isOpen) return null;

  const handleConfirmar = () => {
    if (descuentoSimulado.montoDescontadoCOP <= 0 && tipo !== 'cortesia_100') {
      alert('Ingresa un valor válido de descuento');
      return;
    }
    onAplicarDescuento(descuentoSimulado);
    onClose();
  };

  const handleRemover = () => {
    onRemoverDescuento();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
              <Tag className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Descuento y Cortesía
              </h2>
              <p className="text-xs text-neutral-400">
                Aplica un beneficio comercial o cortesía sobre el consumo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de descuento"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Selector de Tipo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300">
              Tipo de Descuento
            </label>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo de descuento">
              <button
                type="button"
                onClick={() => setTipo('porcentaje')}
                aria-pressed={tipo === 'porcentaje'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  tipo === 'porcentaje'
                    ? 'bg-amber-400 text-neutral-950 shadow-md font-black'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Percent className="h-4 w-4" aria-hidden="true" />
                Porcentaje
              </button>
              <button
                type="button"
                onClick={() => setTipo('monto_fijo')}
                aria-pressed={tipo === 'monto_fijo'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  tipo === 'monto_fijo'
                    ? 'bg-amber-400 text-neutral-950 shadow-md font-black'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Tag className="h-4 w-4" aria-hidden="true" />
                Valor Fijo
              </button>
              <button
                type="button"
                onClick={() => setTipo('cortesia_100')}
                aria-pressed={tipo === 'cortesia_100'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  tipo === 'cortesia_100'
                    ? 'bg-emerald-500 text-neutral-950 shadow-md font-black'
                    : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <Gift className="h-4 w-4" aria-hidden="true" />
                Cortesía 100%
              </button>
            </div>
          </div>

          {/* Opciones según el tipo */}
          {tipo === 'porcentaje' && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-neutral-300">
                Porcentajes rápidos
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PORCENTAJES_RAPIDOS_DESCUENTO.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setPorcentajeSeleccionado(pct);
                      setPorcentajeLibre(String(pct));
                    }}
                    aria-pressed={porcentajeSeleccionado === pct}
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                      porcentajeSeleccionado === pct
                        ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <div className="pt-1">
                <label htmlFor="input-porcentaje-libre" className="text-[11px] text-neutral-400 block mb-1">
                  O escribe un porcentaje personalizado:
                </label>
                <div className="relative">
                  <input
                    id="input-porcentaje-libre"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Ej. 25"
                    value={porcentajeLibre}
                    onChange={(e) => {
                      setPorcentajeLibre(e.target.value);
                      const num = Number(e.target.value);
                      if (PORCENTAJES_RAPIDOS_DESCUENTO.includes(num as any)) {
                        setPorcentajeSeleccionado(num);
                      } else {
                        setPorcentajeSeleccionado(0);
                      }
                    }}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-2.5 px-3 pr-10 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-sm text-neutral-400 font-bold">%</span>
                </div>
              </div>
            </div>
          )}

          {tipo === 'monto_fijo' && (
            <div className="space-y-2">
              <label htmlFor="input-monto-fijo" className="text-xs font-semibold text-neutral-300">
                Monto en pesos (COP) a descontar:
              </label>
              <div className="relative">
                <input
                  id="input-monto-fijo"
                  type="number"
                  min="0"
                  max={subtotal}
                  placeholder={`Ej. 5000 (Máximo ${formatCOP(subtotal)})`}
                  value={montoFijoCOP}
                  onChange={(e) => setMontoFijoCOP(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-2.5 px-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none font-display"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[2000, 5000, 10000, 20000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMontoFijoCOP(String(val))}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  >
                    +{formatCOP(val)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tipo === 'cortesia_100' && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-start gap-3">
              <Gift className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-emerald-300">Cortesía de la Casa (100% de descuento)</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  El cliente no pagará los consumos de comida/bebida ({formatCOP(subtotal)}). Si se otorga propina voluntaria, esta seguirá reflejada.
                </p>
              </div>
            </div>
          )}

          {/* Motivo del Descuento */}
          <div className="space-y-2">
            <label htmlFor="select-motivo-descuento" className="text-xs font-semibold text-neutral-300">
              Motivo o Justificación
            </label>
            <select
              id="select-motivo-descuento"
              value={motivoId}
              onChange={(e) => setMotivoId(e.target.value as MotivoDescuentoId)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-2.5 px-3 text-xs text-white focus:border-amber-400 focus:outline-none"
            >
              {MOTIVOS_DESCUENTO_PREDEFINIDOS.map((motivo) => (
                <option key={motivo.id} value={motivo.id}>
                  {motivo.label}
                </option>
              ))}
            </select>

            {motivoId === 'otro' && (
              <input
                type="text"
                placeholder="Especifica el motivo del descuento..."
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-900 py-2 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            )}
          </div>

          {/* Tarjeta de Previsualización en Vivo */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Consumo subtotal:</span>
              <span className="font-semibold text-neutral-200">{formatCOP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-amber-400 font-bold">
              <span>Descuento aplicado:</span>
              <span>-{formatCOP(totales.descuentoCOP)}</span>
            </div>
            <div className="border-t border-neutral-800 pt-2 flex justify-between items-baseline">
              <span className="text-xs font-bold text-white">Nuevo subtotal a pagar:</span>
              <span className="font-display text-lg font-black text-gold-400">
                {formatCOP(totales.subtotalConDescuento)}
              </span>
            </div>
          </div>
        </div>

        {/* Pie con acciones */}
        <div className="border-t border-neutral-800 pt-3 flex items-center justify-between gap-3">
          {descuentoActual ? (
            <button
              type="button"
              onClick={handleRemover}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-900/50 transition-colors"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Quitar Descuento
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="min-h-[44px] text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmar}
              className="min-h-[44px] text-xs font-bold"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Aplicar Descuento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
