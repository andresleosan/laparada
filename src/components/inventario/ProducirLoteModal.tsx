import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Scale,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import type {
  Insumo,
  MovimientoKardex,
  RegistrarProduccionLoteInput,
  ResultadoProduccionLote,
} from '@/types';
import { parseFiniteNumber } from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import { construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';
import { simularProduccionLoteSubReceta } from '@/utils/produccionCocinaUtils';

export interface ProducirLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  subReceta: Insumo | null;
  insumos: Insumo[];
  movimientosKardex?: MovimientoKardex[];
  onConfirmarProduccion: (
    input: RegistrarProduccionLoteInput
  ) => Promise<ResultadoProduccionLote>;
  onSuccess?: () => void;
}

const MULTIPLICADORES_RAPIDOS = [0.5, 1, 2, 3] as const;

export function ProducirLoteModal({
  isOpen,
  onClose,
  subReceta,
  insumos,
  movimientosKardex = [],
  onConfirmarProduccion,
  onSuccess,
}: ProducirLoteModalProps) {
  const generatedId = useId();
  const titleId = `producir-lote-modal-${generatedId.replace(/:/g, '')}-title`;

  let responsableDefault = 'Cocina / Administrador';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Cocina / Administrador';
  } catch {
    // Fallback seguro en pruebas unitarias sin AuthProvider
  }

  const [multiplicadorStr, setMultiplicadorStr] = useState('1');
  const [cantidadRealStr, setCantidadRealStr] = useState('');
  const [cantidadRealEditadaManual, setCantidadRealEditadaManual] = useState(false);
  const [responsable, setResponsable] = useState(responsableDefault);
  const [notas, setNotas] = useState('');
  const [permitirStockParcial, setPermitirStockParcial] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const multiplicadorNum = useMemo(() => {
    const parsed = parseFiniteNumber(multiplicadorStr);
    return parsed !== null && parsed > 0 ? parsed : 1;
  }, [multiplicadorStr]);

  const rendimientoBase =
    subReceta && typeof subReceta.rendimientoLote === 'number' && subReceta.rendimientoLote > 0
      ? subReceta.rendimientoLote
      : 1;

  useEffect(() => {
    if (!isOpen || !subReceta) return;
    setMultiplicadorStr('1');
    setCantidadRealStr(String(rendimientoBase));
    setCantidadRealEditadaManual(false);
    setResponsable(responsableDefault);
    setNotas('');
    setPermitirStockParcial(false);
    setErrorForm(null);
  }, [isOpen, subReceta, rendimientoBase, responsableDefault]);

  useEffect(() => {
    if (!cantidadRealEditadaManual && subReceta) {
      const esperado = Number((rendimientoBase * multiplicadorNum).toFixed(4));
      setCantidadRealStr(String(esperado));
    }
  }, [multiplicadorNum, rendimientoBase, cantidadRealEditadaManual, subReceta]);

  const simulacion = useMemo(() => {
    if (!subReceta) return null;
    const realParsed = parseFiniteNumber(cantidadRealStr);
    return simularProduccionLoteSubReceta({
      subReceta,
      insumos,
      movimientosKardex,
      multiplicadorLotes: multiplicadorNum,
      cantidadProducidaReal: realParsed !== null && realParsed > 0 ? realParsed : undefined,
    });
  }, [subReceta, insumos, movimientosKardex, multiplicadorNum, cantidadRealStr]);

  const costosUnitariosPorInsumo = useMemo(() => {
    const mapa = construirMapaCostosInsumos(insumos, movimientosKardex);
    const record: Record<string, number> = {};
    for (const [id, info] of mapa.entries()) {
      if (info.costoUnitario > 0) {
        record[id] = info.costoUnitario;
      }
    }
    return record;
  }, [insumos, movimientosKardex]);

  if (!isOpen || !subReceta || !simulacion) return null;

  const puedeConfirmar =
    !procesando &&
    simulacion.desgloseInsumos.length > 0 &&
    simulacion.cantidadProducidaReal > 0 &&
    (simulacion.todosInsumosDisponibles || permitirStockParcial);

  const handleSeleccionarMultiplicador = (mult: number) => {
    setMultiplicadorStr(String(mult));
    setCantidadRealEditadaManual(false);
    setErrorForm(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const realParsed = parseFiniteNumber(cantidadRealStr);
    if (realParsed === null || realParsed <= 0) {
      setErrorForm('La cantidad real obtenida debe ser mayor a 0.');
      return;
    }

    if (!simulacion.todosInsumosDisponibles && !permitirStockParcial) {
      setErrorForm(
        'Faltan insumos primarios en bodega. Reduce el multiplicador o autoriza stock parcial.'
      );
      return;
    }

    setProcesando(true);
    setErrorForm(null);
    try {
      const res = await onConfirmarProduccion({
        subRecetaId: subReceta.id,
        multiplicadorLotes: multiplicadorNum,
        cantidadProducidaReal: realParsed,
        responsable: responsable.trim() || 'Cocina / Administrador',
        notas: notas.trim() || undefined,
        permitirStockParcial,
        costosUnitariosPorInsumo,
      });

      createToast(
        `Lote producido: +${res.cantidadProducida} ${res.unidadSalida} de ${res.subRecetaNombre}`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No pudimos registrar la producción del lote';
      setErrorForm(msg);
    } finally {
      setProcesando(false);
    }
  };

  const stockActualSub = subReceta.stockActual || 0;
  const stockProyectadoSub = Number(
    (stockActualSub + simulacion.cantidadProducidaReal).toFixed(4)
  );

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={() => {
        if (!procesando) onClose();
      }}
      onBackdropClick={() => {
        if (!procesando) onClose();
      }}
      canClose={!procesando}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="my-auto w-full max-w-2xl rounded-2xl border border-neutral-800 bg-[#0A0A0A] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/90 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-bold text-white truncate">
                Producir Lote: {subReceta.nombre}
              </h2>
              <p className="text-xs text-neutral-400">
                1 lote estándar = {rendimientoBase} {simulacion.unidadSalida} · Stock actual:{' '}
                <strong className="text-white">
                  {stockActualSub} {simulacion.unidadSalida}
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            aria-label="Cerrar modal de producción de lote"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-5 space-y-5">
          {/* Selector táctil de multiplicador */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Escala de Tanda / Multiplicador de Lotes
              </span>
              {simulacion.lotesMaximosPosibles > 0 && (
                <button
                  type="button"
                  onClick={() => handleSeleccionarMultiplicador(simulacion.lotesMaximosPosibles)}
                  className="text-xs font-semibold text-[#E5C158] hover:underline"
                >
                  Máximo en bodega: {simulacion.lotesMaximosPosibles}x
                </button>
              )}
            </div>

            <div
              className="grid grid-cols-5 gap-2"
              role="group"
              aria-label="Seleccionar multiplicador de lotes"
            >
              {MULTIPLICADORES_RAPIDOS.map((mult) => {
                const activo = Math.abs(multiplicadorNum - mult) < 0.001;
                return (
                  <button
                    key={mult}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => handleSeleccionarMultiplicador(mult)}
                    className={`min-h-[44px] rounded-xl border text-sm font-bold transition-all ${
                      activo
                        ? 'border-[#C9A84C] bg-[#C9A84C] text-neutral-950 shadow'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-200 hover:border-neutral-500'
                    }`}
                  >
                    {mult}x
                  </button>
                );
              })}

              <input
                type="number"
                step="any"
                min="0.05"
                aria-label="Multiplicador personalizado de lotes"
                value={multiplicadorStr}
                onChange={(e) => {
                  setMultiplicadorStr(e.target.value);
                  setCantidadRealEditadaManual(false);
                }}
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-2.5 text-center text-sm font-mono font-bold text-white focus:border-[#C9A84C] focus:outline-none"
              />
            </div>
          </div>

          {/* Cantidad real obtenida + Merma de cocción */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
            <Input
              label={`Cantidad Real Obtenida (${simulacion.unidadSalida})`}
              type="number"
              step="any"
              min="0.01"
              value={cantidadRealStr}
              onChange={(e) => {
                setCantidadRealStr(e.target.value);
                setCantidadRealEditadaManual(true);
              }}
            />

            <div className="flex flex-col justify-center space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Scale className="h-3.5 w-3.5 text-[#C9A84C]" aria-hidden="true" />
                <span>Rendimiento esperado: {simulacion.rendimientoEsperado} {simulacion.unidadSalida}</span>
              </div>
              <div className="text-xs font-semibold">
                {simulacion.mermaCoccionCantidad > 0 ? (
                  <span className="text-amber-300">
                    Merma por cocción/reducción: -{simulacion.mermaCoccionCantidad}{' '}
                    {simulacion.unidadSalida} ({simulacion.mermaCoccionPct}%)
                  </span>
                ) : simulacion.mermaCoccionCantidad < 0 ? (
                  <span className="text-emerald-400">
                    Sobre-rendimiento: +{Math.abs(simulacion.mermaCoccionCantidad)}{' '}
                    {simulacion.unidadSalida}
                  </span>
                ) : (
                  <span className="text-emerald-400">Rendimiento estándar 100%</span>
                )}
              </div>
            </div>
          </div>

          {/* Tabla de conversión de insumos primarios */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Insumos Primarios a Descontar Automáticamente ({simulacion.desgloseInsumos.length})
            </h3>
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
              <ul className="divide-y divide-neutral-800">
                {simulacion.desgloseInsumos.map((item) => (
                  <li
                    key={item.insumoId}
                    className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.alcanzaStock ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <AlertTriangle
                            className="h-4 w-4 shrink-0 text-red-400"
                            aria-hidden="true"
                          />
                        )}
                        <span className="font-semibold text-white truncate">{item.nombre}</span>
                      </div>
                      <p className="ml-6 text-[11px] text-neutral-400">
                        Bodega: {item.stockActual} ➔{' '}
                        <strong className={item.alcanzaStock ? 'text-neutral-200' : 'text-red-400'}>
                          {item.stockPosterior} {item.unidad}
                        </strong>
                        {!item.alcanzaStock && (
                          <span className="ml-1.5 font-semibold text-red-400">
                            (Faltan {item.faltante} {item.unidad})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <div className="font-bold text-orange-300">
                        -{item.cantidadRequerida} {item.unidad}
                      </div>
                      {item.subtotalCostoCOP > 0 && (
                        <div className="text-[11px] text-neutral-400">
                          {formatCOP(item.subtotalCostoCOP)}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Resumen financiero y proyección de stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <span className="text-[11px] text-neutral-400">Costo Total del Lote</span>
              <div className="mt-0.5 font-display text-lg font-bold text-white">
                {formatCOP(simulacion.costoTotalLoteCOP)}
              </div>
            </div>
            <div className="rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 p-3">
              <span className="text-[11px] text-[#E5C158]">Costo Unitario Resultante</span>
              <div className="mt-0.5 font-display text-lg font-bold text-[#E5C158]">
                {formatCOP(simulacion.costoUnitarioResultanteCOP)} / {simulacion.unidadSalida}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <span className="text-[11px] text-emerald-300">Stock Preparado Final</span>
              <div className="mt-0.5 font-display text-lg font-bold text-emerald-400">
                {stockActualSub} ➔ {stockProyectadoSub} {simulacion.unidadSalida}
              </div>
            </div>
          </div>

          {/* Alerta de déficit en bodega */}
          {!simulacion.todosInsumosDisponibles && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 space-y-2">
              <div className="flex items-start gap-2 text-xs text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
                <span>
                  Algunos insumos primarios no tienen saldo completo registrado en el sistema para
                  este lote.
                </span>
              </div>
              <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer select-none min-h-[36px]">
                <input
                  type="checkbox"
                  checked={permitirStockParcial}
                  onChange={(e) => setPermitirStockParcial(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-gold-400 focus:ring-gold-400"
                />
                <span>Autorizar producción llevando insumos faltantes a 0 en sistema</span>
              </label>
            </div>
          )}

          {/* Responsable y notas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Responsable de Cocina"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Ej: Chef Carlos"
            />
            <Input
              label="Notas del Lote (Opcional)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Lote turno tarde, empacado al vacío"
            />
          </div>

          {errorForm && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-300"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorForm}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-neutral-800 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={procesando}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={procesando}
              disabled={!puedeConfirmar}
              className="min-h-[44px] font-bold"
            >
              <Flame className="h-4 w-4" aria-hidden="true" />
              <span>
                Confirmar Producción (+{simulacion.cantidadProducidaReal} {simulacion.unidadSalida})
              </span>
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
