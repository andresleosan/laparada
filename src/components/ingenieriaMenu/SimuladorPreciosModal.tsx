import { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChefHat,
  DollarSign,
  Minus,
  Plus,
  Save,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import type {
  ItemIngenieriaMenu,
  RedondeoPrecioCOP,
} from '@/types';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularPrecioSugeridoFoodCost,
  METAS_CUADRANTES_BCG,
  PRESETS_FOOD_COST_PCT,
  simularPrecioYCostoItem,
} from '@/utils/ingenieriaMenuUtils';

export interface SimuladorPreciosModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemIngenieriaMenu | null;
  foodCostObjetivoInicial: number;
  redondeo: RedondeoPrecioCOP;
  tasaImpuestoPct: number;
  umbralPopularidadUnidades: number;
  umbralMargenContribucionCOP: number;
  onAplicarPrecio: (item: ItemIngenieriaMenu, nuevoPrecioCOP: number) => Promise<void>;
  onGuardarCostoReferencia: (
    item: ItemIngenieriaMenu,
    costoReferenciaCOP: number
  ) => Promise<void>;
  onGuardarCostoInsumo: (insumoId: string, costoUnitarioCOP: number) => Promise<void>;
}

function obtenerPrecioInicialSimulador(
  item: ItemIngenieriaMenu | null,
  foodCostObjetivoInicial: number,
  redondeo: RedondeoPrecioCOP,
  tasaImpuestoPct: number
): string {
  if (!item) return '';
  const sugerido = calcularPrecioSugeridoFoodCost(
    item.costoUnitarioCOP,
    foodCostObjetivoInicial,
    redondeo,
    tasaImpuestoPct
  );
  return String(sugerido > 0 ? sugerido : item.precioVenta);
}

function obtenerDraftsInsumoInicial(item: ItemIngenieriaMenu | null): Record<string, string> {
  if (!item) return {};
  const drafts: Record<string, string> = {};
  for (const ing of item.desgloseIngredientes) {
    if (!ing.insumoId.startsWith('prod-ref:')) {
      drafts[ing.insumoId] =
        ing.costoUnitarioInsumo > 0 ? String(ing.costoUnitarioInsumo) : '';
    }
  }
  return drafts;
}

export function SimuladorPreciosModal({
  isOpen,
  onClose,
  item,
  foodCostObjetivoInicial,
  redondeo,
  tasaImpuestoPct,
  umbralPopularidadUnidades,
  umbralMargenContribucionCOP,
  onAplicarPrecio,
  onGuardarCostoReferencia,
  onGuardarCostoInsumo,
}: SimuladorPreciosModalProps) {
  const generatedId = useId();
  const titleId = `simulador-precios-title-${generatedId.replace(/:/g, '')}`;

  const [foodCostObjetivo, setFoodCostObjetivo] = useState(foodCostObjetivoInicial);
  const [precioSimuladoStr, setPrecioSimuladoStr] = useState(() =>
    obtenerPrecioInicialSimulador(item, foodCostObjetivoInicial, redondeo, tasaImpuestoPct)
  );
  const [variacionCostoPct, setVariacionCostoPct] = useState(0);
  const [costoRefStr, setCostoRefStr] = useState(() =>
    item?.costoReferenciaActual ? String(item.costoReferenciaActual) : ''
  );
  const [costosInsumoDraft, setCostosInsumoDraft] = useState<Record<string, string>>(() =>
    obtenerDraftsInsumoInicial(item)
  );
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [guardandoCostoRef, setGuardandoCostoRef] = useState(false);
  const [guardandoInsumoId, setGuardandoInsumoId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    setFoodCostObjetivo(foodCostObjetivoInicial);
    setPrecioSimuladoStr(
      obtenerPrecioInicialSimulador(item, foodCostObjetivoInicial, redondeo, tasaImpuestoPct)
    );
    setVariacionCostoPct(0);
    setCostoRefStr(
      item.costoReferenciaActual ? String(item.costoReferenciaActual) : ''
    );
    setCostosInsumoDraft(obtenerDraftsInsumoInicial(item));
  }, [isOpen, item?.id, item?.tipo]);

  // Mantener actualizado el borrador de costo cuando el ítem se recalcula tras guardar insumo
  useEffect(() => {
    if (!isOpen || !item) return;
    setCostosInsumoDraft((prev) => {
      const next = { ...prev };
      for (const ing of item.desgloseIngredientes) {
        if (!ing.insumoId.startsWith('prod-ref:') && ing.costoUnitarioInsumo > 0) {
          next[ing.insumoId] = String(ing.costoUnitarioInsumo);
        }
      }
      return next;
    });
  }, [isOpen, item]);

  const costoSimuladoCOP = useMemo(() => {
    if (!item) return 0;
    const base = item.costoUnitarioCOP;
    return Math.max(0, Math.round(base * (1 + variacionCostoPct / 100)));
  }, [item, variacionCostoPct]);

  const precioSimuladoNum = useMemo(() => {
    const parsed = Number(precioSimuladoStr);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
  }, [precioSimuladoStr]);

  const simulacion = useMemo(() => {
    if (!item) return null;
    return simularPrecioYCostoItem({
      item,
      precioSimuladoCOP: precioSimuladoNum,
      costoSimuladoCOP,
      foodCostObjetivoPct: foodCostObjetivo,
      redondeo,
      tasaImpuestoIncluidoPct: tasaImpuestoPct,
      umbralPopularidadUnidades,
      umbralMargenContribucionCOP,
    });
  }, [
    item,
    precioSimuladoNum,
    costoSimuladoCOP,
    foodCostObjetivo,
    redondeo,
    tasaImpuestoPct,
    umbralPopularidadUnidades,
    umbralMargenContribucionCOP,
  ]);

  if (!isOpen || !item || !simulacion) return null;

  const metaActual = METAS_CUADRANTES_BCG[item.cuadrante];
  const metaProyectada = METAS_CUADRANTES_BCG[simulacion.nuevoCuadranteProyectado];

  const handleUsarSugerido = (objetivoPct = foodCostObjetivo) => {
    const sug = calcularPrecioSugeridoFoodCost(
      costoSimuladoCOP,
      objetivoPct,
      redondeo,
      tasaImpuestoPct
    );
    if (sug > 0) {
      setPrecioSimuladoStr(String(sug));
    }
  };

  const handleAjustarPasoPrecio = (delta: number) => {
    const next = Math.max(500, precioSimuladoNum + delta);
    setPrecioSimuladoStr(String(next));
  };

  const handleGuardarNuevoPrecio = async () => {
    if (precioSimuladoNum <= 0) {
      createToast('El precio simulado debe ser mayor a $0 COP', 'error');
      return;
    }
    setGuardandoPrecio(true);
    try {
      await onAplicarPrecio(item, precioSimuladoNum);
      createToast(
        `Precio de "${item.nombre}" actualizado a ${formatCOP(precioSimuladoNum)}`,
        'success'
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar precio';
      createToast(msg, 'error');
    } finally {
      setGuardandoPrecio(false);
    }
  };

  const handleGuardarCostoRef = async () => {
    const parsed = Number(costoRefStr);
    if (!Number.isFinite(parsed) || parsed < 0) {
      createToast('Ingresa un costo válido en COP (0 o mayor)', 'error');
      return;
    }
    setGuardandoCostoRef(true);
    try {
      await onGuardarCostoReferencia(item, Math.round(parsed));
      createToast(`Costo de referencia guardado para "${item.nombre}"`, 'success');
    } catch {
      createToast('No se pudo guardar el costo de referencia', 'error');
    } finally {
      setGuardandoCostoRef(false);
    }
  };

  const handleGuardarCostoInsumo = async (insumoId: string, nombreInsumo: string) => {
    const parsed = Number(costosInsumoDraft[insumoId]);
    if (!Number.isFinite(parsed) || parsed < 0) {
      createToast(`Ingresa un costo unitario válido para ${nombreInsumo}`, 'error');
      return;
    }
    setGuardandoInsumoId(insumoId);
    try {
      await onGuardarCostoInsumo(insumoId, Math.round(parsed));
      createToast(`Costo de "${nombreInsumo}" actualizado a ${formatCOP(Math.round(parsed))}`, 'success');
    } catch {
      createToast(`Error actualizando costo de ${nombreInsumo}`, 'error');
    } finally {
      setGuardandoInsumoId(null);
    }
  };

  const estaOcupado = guardandoPrecio || guardandoCostoRef || Boolean(guardandoInsumoId);

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={() => !estaOcupado && onClose()}
      canClose={!estaOcupado}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 bg-neutral-900/70 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${metaActual.badgeClasses}`}
              >
                <span aria-hidden="true">{metaActual.emoji}</span>
                <span>{metaActual.titulo}</span>
              </span>
              <span className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-300">
                {item.tipo === 'combo' ? 'Combo' : 'Producto'} · {item.categoria}
              </span>
            </div>
            <h2 id={titleId} className="mt-1.5 font-display text-xl font-bold text-white truncate">
              Simulador de Precios &amp; Escandallo: {item.nombre}
            </h2>
            <p className="text-xs text-neutral-400">
              {item.unidadesVendidas} unidades vendidas en el período · Ingresos:{' '}
              <strong className="text-neutral-200">{formatCOP(item.ingresosRealesCOP)}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={estaOcupado}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            aria-label="Cerrar simulador de precios"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Bloque 1: Desglose de Costo / Receta y Edición Rápida de Insumos */}
          <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>Estructura de Costo Unitario (Escandallo)</span>
              </h3>
              <span className="font-display text-base font-black text-amber-400">
                {formatCOP(item.costoUnitarioCOP)}
              </span>
            </div>

            {item.desgloseIngredientes.length > 0 ? (
              <div className="space-y-2">
                {item.costeoIncompleto && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
                    <span>
                      Hay ingredientes con costo $0 ({item.insumosSinCosto.join(', ')}). Asígnales su
                      costo unitario aquí mismo para tener el escandallo al 100%.
                    </span>
                  </div>
                )}

                <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-950/70">
                  {item.desgloseIngredientes.map((ing, idx) => {
                    const esEditable = !ing.insumoId.startsWith('prod-ref:');
                    return (
                      <li
                        key={`${ing.insumoId}-${idx}`}
                        className="flex flex-col gap-2 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                ing.tieneCosto ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                              aria-hidden="true"
                            />
                            <span className="font-semibold text-neutral-100 truncate">
                              {ing.nombre}
                            </span>
                            <span className="text-neutral-400">
                              ({ing.cantidad} {ing.unidad})
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 pl-4">
                            <span>
                              Costo ref:{' '}
                              <strong className={ing.tieneCosto ? 'text-neutral-200' : 'text-red-300'}>
                                {formatCOP(ing.costoUnitarioInsumo)}/{ing.unidad}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              Subtotal:{' '}
                              <strong className="text-amber-300">{formatCOP(ing.subtotalCostoCOP)}</strong>
                              {ing.participacionCostoPct > 0 && ` (${ing.participacionCostoPct}%)`}
                            </span>
                          </div>
                        </div>

                        {esEditable && (
                          <div className="flex items-center gap-1.5 pl-4 sm:pl-0">
                            <input
                              type="number"
                              min="0"
                              value={costosInsumoDraft[ing.insumoId] ?? ''}
                              onChange={(e) =>
                                setCostosInsumoDraft((prev) => ({
                                  ...prev,
                                  [ing.insumoId]: e.target.value,
                                }))
                              }
                              aria-label={`Costo unitario de ${ing.nombre}`}
                              placeholder="Costo COP"
                              className="h-9 w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              loading={guardandoInsumoId === ing.insumoId}
                              disabled={estaOcupado}
                              onClick={() => handleGuardarCostoInsumo(ing.insumoId, ing.nombre)}
                              className="min-h-[36px] px-2.5 text-[11px]"
                              aria-label={`Guardar costo de ${ing.nombre}`}
                            >
                              <Save className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                              Fijar
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-950/60 p-3 text-xs text-neutral-400">
                Este ítem aún no tiene receta de escandallo detallada. Puedes asignar un costo
                directo de referencia (ideal para bebidas o productos de reventa) o editar su receta
                en <strong>Productos y Combos</strong>.
              </div>
            )}

            {/* Costo de referencia manual si no usa receta o para productos de reventa */}
            {(!item.desgloseIngredientes.length || item.origenCosteo === 'referencia_manual') && (
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Input
                    label="Costo directo de referencia (COP)"
                    type="number"
                    min="0"
                    step="100"
                    value={costoRefStr}
                    onChange={(e) => setCostoRefStr(e.target.value)}
                    placeholder="Ej: 4500"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  loading={guardandoCostoRef}
                  disabled={estaOcupado}
                  onClick={handleGuardarCostoRef}
                  className="min-h-[44px] text-xs font-semibold border-amber-500/40 text-amber-300"
                >
                  <Save className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Guardar Costo Directo
                </Button>
              </div>
            )}
          </section>

          {/* Bloque 2: Controles del Simulador What-If */}
          <section className="rounded-xl border border-amber-500/30 bg-neutral-900/70 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calculator className="h-4 w-4 text-amber-400" aria-hidden="true" />
                <span>Simulador de Precio Sugerido &amp; Escenarios</span>
              </h3>
              {tasaImpuestoPct > 0 && (
                <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                  Incluye ajuste fiscal {tasaImpuestoPct}%
                </span>
              )}
            </div>

            {/* Objetivo Food Cost */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="sim-food-cost-range" className="font-semibold text-neutral-300">
                  Food Cost Objetivo: <strong className="text-amber-400">{foodCostObjetivo}%</strong>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS_FOOD_COST_PCT.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      aria-pressed={foodCostObjetivo === pct}
                      onClick={() => {
                        setFoodCostObjetivo(pct);
                        handleUsarSugerido(pct);
                      }}
                      className={`min-h-[34px] rounded-lg border px-2.5 text-xs font-bold transition-colors ${
                        foodCostObjetivo === pct
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="sim-food-cost-range"
                type="range"
                min="15"
                max="65"
                step="1"
                value={foodCostObjetivo}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFoodCostObjetivo(val);
                  handleUsarSugerido(val);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Simular variación de costo de insumos */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="sim-variacion-costo" className="font-semibold text-neutral-300">
                  Simular variación en costo de receta:{' '}
                  <strong
                    className={
                      variacionCostoPct > 0
                        ? 'text-red-400'
                        : variacionCostoPct < 0
                        ? 'text-emerald-400'
                        : 'text-neutral-200'
                    }
                  >
                    {variacionCostoPct > 0 ? `+${variacionCostoPct}%` : `${variacionCostoPct}%`} (
                    {formatCOP(costoSimuladoCOP)})
                  </strong>
                </label>
                {variacionCostoPct !== 0 && (
                  <button
                    type="button"
                    onClick={() => setVariacionCostoPct(0)}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Restablecer 0%
                  </button>
                )}
              </div>
              <input
                id="sim-variacion-costo"
                type="range"
                min="-30"
                max="30"
                step="5"
                value={variacionCostoPct}
                onChange={(e) => setVariacionCostoPct(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* Precio Simulado al Público */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-end">
              <div className="sm:col-span-5">
                <Input
                  label="Precio de Venta Simulado (COP)"
                  type="number"
                  min="100"
                  step="500"
                  value={precioSimuladoStr}
                  onChange={(e) => setPrecioSimuladoStr(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAjustarPasoPrecio(-500)}
                  className="min-h-[44px] flex-1"
                  aria-label="Restar 500 pesos al precio simulado"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-1 text-xs">500</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleAjustarPasoPrecio(500)}
                  className="min-h-[44px] flex-1"
                  aria-label="Sumar 500 pesos al precio simulado"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="ml-1 text-xs">500</span>
                </Button>
              </div>
              <div className="sm:col-span-4">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={simulacion.precioSugeridoObjetivoCOP <= 0}
                  onClick={() => handleUsarSugerido()}
                  className="min-h-[44px] w-full border-amber-500/40 bg-amber-500/10 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Sugerido: {formatCOP(simulacion.precioSugeridoObjetivoCOP)}
                </Button>
              </div>
            </div>
          </section>

          {/* Bloque 3: Comparativa Antes vs Después */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                Precio de Venta
              </span>
              <div className="mt-1.5 flex items-center gap-1.5 font-display text-base font-bold">
                <span className="text-neutral-400 line-through text-xs">
                  {formatCOP(simulacion.precioActualCOP)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                <span className="text-white">{formatCOP(simulacion.precioSimuladoCOP)}</span>
              </div>
              <p
                className={`mt-1 text-[11px] font-semibold ${
                  simulacion.deltaPrecioCOP > 0
                    ? 'text-emerald-400'
                    : simulacion.deltaPrecioCOP < 0
                    ? 'text-amber-300'
                    : 'text-neutral-500'
                }`}
              >
                {simulacion.deltaPrecioCOP >= 0 ? '+' : ''}
                {formatCOP(simulacion.deltaPrecioCOP)} ({simulacion.deltaPrecioPct}%)
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
              <span className="text-[11px] text-neutral-400">Food Cost Proyectado</span>
              <div className="mt-1.5 flex items-center gap-1.5 font-display text-base font-bold">
                <span className="text-neutral-400 text-xs">{simulacion.foodCostActualPct}%</span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                <span
                  className={
                    simulacion.cumpleObjetivoFoodCost ? 'text-emerald-400' : 'text-amber-400'
                  }
                >
                  {simulacion.foodCostSimuladoPct}%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-400 flex items-center gap-1">
                {simulacion.cumpleObjetivoFoodCost ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    <span className="text-emerald-300">Cumple objetivo (≤ {foodCostObjetivo}%)</span>
                  </>
                ) : (
                  <span className="text-amber-300">Meta objetivo: {foodCostObjetivo}%</span>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
              <span className="text-[11px] text-neutral-400">Margen Unitario</span>
              <div className="mt-1.5 flex items-center gap-1.5 font-display text-base font-bold">
                <span className="text-neutral-400 text-xs">
                  {formatCOP(simulacion.margenUnitarioActualCOP)}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                <span className="text-emerald-400">
                  {formatCOP(simulacion.margenUnitarioSimuladoCOP)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-400">
                Margen bruto: <strong className="text-neutral-200">{simulacion.margenBrutoSimuladoPct}%</strong>
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                Impacto Período ({item.unidadesVendidas} u)
              </span>
              <p
                className={`mt-1.5 font-display text-lg font-black ${
                  simulacion.deltaUtilidadPeriodoCOP > 0
                    ? 'text-emerald-400'
                    : simulacion.deltaUtilidadPeriodoCOP < 0
                    ? 'text-red-400'
                    : 'text-neutral-200'
                }`}
              >
                {simulacion.deltaUtilidadPeriodoCOP >= 0 ? '+' : ''}
                {formatCOP(simulacion.deltaUtilidadPeriodoCOP)}
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                Cuadrante:{' '}
                <span className={`font-bold ${metaProyectada.textClasses}`}>
                  {metaProyectada.emoji} {metaProyectada.tituloCorto}
                </span>
              </p>
            </div>
          </section>
        </div>

        {/* Footer de acciones */}
        <div className="flex flex-col-reverse gap-2 border-t border-neutral-800 bg-neutral-900/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={estaOcupado}
            className="min-h-[44px]"
          >
            Cerrar
          </Button>

          <Button
            type="button"
            variant="primary"
            loading={guardandoPrecio}
            disabled={estaOcupado || precioSimuladoNum <= 0}
            onClick={handleGuardarNuevoPrecio}
            className="min-h-[44px] bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold"
          >
            Aplicar Precio {formatCOP(precioSimuladoNum)} al Menú
          </Button>
        </div>
      </div>
    </StorefrontDialog>
  );
}
