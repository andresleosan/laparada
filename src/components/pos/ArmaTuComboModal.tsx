import { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChefHat,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react';
import type { Combo, GrupoEleccionCombo, Insumo, ItemVenta, Producto } from '@/types';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { formatCOP } from '@/utils/formatCOP';
import {
  actualizarSeleccionesEnGrupo,
  construirEleccionesComboSeleccionadas,
  construirItemVentaComboPersonalizado,
  obtenerSeleccionesInicialesCombo,
  validarSeleccionesCombo,
} from '@/utils/combosPersonalizablesUtils';
import {
  calcularConsumoInsumos,
  evaluarEstadoStockCombo,
  evaluarEstadoStockOpcionCombo,
} from '@/utils/recetasEscandallo';

export interface ArmaTuComboModalProps {
  combo: Combo | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (itemPersonalizado: ItemVenta) => void;
  productos?: Producto[];
  insumos?: Insumo[];
  initialItem?: ItemVenta | null;
  modoStorefront?: boolean;
}

function resolverSeleccionesIniciales(
  combo: Combo | null,
  initialItem: ItemVenta | null | undefined,
  productos: Producto[],
  insumos: Insumo[]
): Record<string, string[]> {
  if (!combo) return {};
  if (initialItem?.eleccionesCombo && initialItem.eleccionesCombo.length > 0) {
    const mapa: Record<string, string[]> = {};
    for (const el of initialItem.eleccionesCombo) {
      if (!mapa[el.grupoId]) mapa[el.grupoId] = [];
      if (!mapa[el.grupoId].includes(el.opcionId)) {
        mapa[el.grupoId].push(el.opcionId);
      }
    }
    return mapa;
  }
  return obtenerSeleccionesInicialesCombo(combo, productos, insumos);
}

export function ArmaTuComboModal({
  combo,
  isOpen,
  onClose,
  onConfirm,
  productos = [],
  insumos = [],
  initialItem = null,
  modoStorefront = false,
}: ArmaTuComboModalProps) {
  const generatedId = useId();
  const titleId = `arma-combo-${generatedId.replace(/:/g, '')}-title`;

  const [seleccionesPorGrupo, setSeleccionesPorGrupo] = useState<Record<string, string[]>>(() =>
    resolverSeleccionesIniciales(combo, initialItem, productos, insumos)
  );
  const [cantidad, setCantidad] = useState<number>(() =>
    initialItem?.cantidad ? Math.min(20, Math.max(1, initialItem.cantidad)) : 1
  );
  const [notas, setNotas] = useState<string>(() => initialItem?.notas || '');

  useEffect(() => {
    if (!isOpen || !combo) return;
    setSeleccionesPorGrupo(resolverSeleccionesIniciales(combo, initialItem, productos, insumos));
    setCantidad(initialItem?.cantidad ? Math.min(20, Math.max(1, initialItem.cantidad)) : 1);
    setNotas(initialItem?.notas || '');
  }, [isOpen, combo, initialItem, productos, insumos]);

  const eleccionesActuales = useMemo(
    () => (combo ? construirEleccionesComboSeleccionadas(combo, seleccionesPorGrupo) : []),
    [combo, seleccionesPorGrupo]
  );

  const validacion = useMemo(
    () =>
      combo
        ? validarSeleccionesCombo(combo, seleccionesPorGrupo, productos, insumos)
        : { valido: false, erroresPorGrupo: {}, gruposFaltantes: [] },
    [combo, seleccionesPorGrupo, productos, insumos]
  );

  const itemBorrador = useMemo(() => {
    if (!combo) return null;
    return construirItemVentaComboPersonalizado({
      combo,
      seleccionesPorGrupo,
      cantidad,
      notas,
      initialItem,
      modoStorefront,
    });
  }, [combo, seleccionesPorGrupo, cantidad, notas, initialItem, modoStorefront]);

  const alertaStockCombo = useMemo(() => {
    if (!combo) return { estado: 'disponible' as const };
    return evaluarEstadoStockCombo(combo, productos, insumos, eleccionesActuales);
  }, [combo, productos, insumos, eleccionesActuales]);

  const consumoEscandallo = useMemo(() => {
    if (modoStorefront || !combo || !itemBorrador) return [];
    return calcularConsumoInsumos([itemBorrador], productos, [combo]);
  }, [modoStorefront, combo, itemBorrador, productos]);

  if (!isOpen || !combo || !itemBorrador) return null;

  const handleToggleOpcion = (grupo: GrupoEleccionCombo, opcionId: string) => {
    setSeleccionesPorGrupo((prev) => actualizarSeleccionesEnGrupo(prev, grupo, opcionId));
  };

  const puedeConfirmar =
    validacion.valido && (modoStorefront || alertaStockCombo.estado !== 'agotado');

  const handleConfirmar = () => {
    if (!puedeConfirmar) return;
    onConfirm(itemBorrador);
    onClose();
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl sm:p-6">
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-amber-300">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Arma tu Combo
            </span>
            <h2 id={titleId} className="mt-1.5 font-display text-xl font-black text-white sm:text-2xl">
              {combo.nombre}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-400">
              Precio base:{' '}
              <strong className="font-mono text-amber-400">{formatCOP(combo.precioEspecial)}</strong>
              {combo.descripcion ? ` · ${combo.descripcion}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Cerrar personalización de ${combo.nombre}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Cuerpo scrollable */}
        <div className="my-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-1">
          {/* Componentes base fijos incluidos */}
          {combo.items && combo.items.length > 0 && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3.5">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Incluye en la base del combo:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {combo.items.map((it, idx) => (
                  <span
                    key={`${it.productoId}-${idx}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs font-semibold text-neutral-200"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                    {it.cantidad}× {it.nombreSnapshot}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Grupos de elección */}
          {(combo.gruposEleccion || []).map((grupo) => {
            const seleccionadas = seleccionesPorGrupo[grupo.id] || [];
            const errorGrupo = validacion.erroresPorGrupo[grupo.id];
            const minLabel = grupo.obligatorio
              ? `Obligatorio · Elige ${Math.max(1, grupo.minSelecciones || 1)}`
              : `Opcional · Hasta ${Math.max(1, grupo.maxSelecciones || 1)}`;

            return (
              <section
                key={grupo.id}
                aria-label={grupo.nombre}
                className="space-y-2.5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">{grupo.nombre}</h3>
                    <p className="text-[11px] text-neutral-400">
                      {seleccionadas.length} / {Math.max(1, grupo.maxSelecciones || 1)} seleccionadas
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                      grupo.obligatorio
                        ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                        : 'border-neutral-700 bg-neutral-950 text-neutral-300'
                    }`}
                  >
                    {minLabel}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(grupo.opciones || []).map((opcion) => {
                    const seleccionado = seleccionadas.includes(opcion.id);
                    const stockOpcion = evaluarEstadoStockOpcionCombo(opcion, productos, insumos);
                    const opcionAgotada = stockOpcion.estado === 'agotado';

                    return (
                      <button
                        key={opcion.id}
                        type="button"
                        disabled={opcionAgotada}
                        onClick={() => handleToggleOpcion(grupo, opcion.id)}
                        aria-pressed={seleccionado}
                        className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          opcionAgotada
                            ? 'cursor-not-allowed border-red-900/50 bg-neutral-950/60 opacity-50'
                            : seleccionado
                              ? 'border-amber-400 bg-amber-500/20 text-white shadow-sm ring-1 ring-amber-400/50'
                              : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-600 hover:text-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold">
                            {opcion.nombre}
                          </span>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {!modoStorefront && opcion.recargoCOP > 0 ? (
                              <span className="font-mono font-bold text-amber-300">
                                +{formatCOP(opcion.recargoCOP)}
                              </span>
                            ) : (
                              <span className="text-neutral-400">Incluido</span>
                            )}
                            {opcionAgotada && (
                              <span className="rounded bg-red-950 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                Agotado
                              </span>
                            )}
                            {!modoStorefront &&
                              !opcionAgotada &&
                              stockOpcion.estado === 'bajo_stock' &&
                              typeof stockOpcion.porcionesDisponibles === 'number' && (
                                <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  {stockOpcion.porcionesDisponibles} disp.
                                </span>
                              )}
                          </div>
                        </div>

                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${
                            seleccionado
                              ? 'border-amber-400 bg-amber-400 text-neutral-950'
                              : 'border-neutral-700 bg-neutral-900 text-transparent'
                          }`}
                          aria-hidden="true"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {errorGrupo && (
                  <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{errorGrupo}</span>
                  </p>
                )}
              </section>
            );
          })}

          {/* Recálculo automático de escandallo e inventario en vivo (solo POS) */}
          {!modoStorefront && (
            <section
              aria-label="Recálculo de escandallo en vivo"
              className="space-y-2 rounded-2xl border border-[#C9A84C]/30 bg-neutral-900/70 p-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#E5C158]">
                  <ChefHat className="h-4 w-4" aria-hidden="true" />
                  Recálculo de Escandallo en Vivo
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    alertaStockCombo.estado === 'agotado'
                      ? 'bg-red-950/80 text-red-300 border border-red-700/60'
                      : alertaStockCombo.estado === 'bajo_stock'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                        : 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                  }`}
                >
                  {alertaStockCombo.estado === 'agotado'
                    ? `Agotado (${alertaStockCombo.insumoCritico || 'insumo'})`
                    : alertaStockCombo.estado === 'bajo_stock'
                      ? `Stock bajo (${alertaStockCombo.porcionesDisponibles ?? 0} disp.)`
                      : typeof alertaStockCombo.porcionesDisponibles === 'number'
                        ? `Stock OK (${alertaStockCombo.porcionesDisponibles} disp.)`
                        : 'Stock OK'}
                </span>
              </div>

              {consumoEscandallo.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {consumoEscandallo.map((c) => (
                    <span
                      key={c.insumoId}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1 font-mono text-[11px] text-neutral-300"
                    >
                      {c.nombreSnapshot}: <strong className="text-white">{c.cantidadTotal}</strong>{' '}
                      {c.unidadSnapshot || ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-400">
                  Esta combinación no tiene insumos con receta asignada en bodega.
                </p>
              )}
            </section>
          )}

          {/* Notas para cocina y Cantidad */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
            <div className="sm:col-span-7">
              <label
                htmlFor="arma-combo-notas"
                className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-neutral-400"
              >
                Notas de cocina (Opcional)
              </label>
              <input
                id="arma-combo-notas"
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Bebida sin hielo, papas bien crocantes..."
                className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex items-end justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 sm:col-span-5">
              <span className="text-xs font-bold text-neutral-300">Cantidad</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                  disabled={cantidad <= 1}
                  aria-label="Disminuir cantidad del combo"
                  className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-700 bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:opacity-35"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="w-7 text-center font-display text-lg font-black text-white">
                  {cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => setCantidad((prev) => Math.min(20, prev + 1))}
                  disabled={cantidad >= 20}
                  aria-label="Aumentar cantidad del combo"
                  className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-700 bg-neutral-950 text-white transition-colors hover:bg-neutral-800 disabled:opacity-35"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pie */}
        <footer className="flex items-center justify-between gap-4 border-t border-neutral-800 pt-4">
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Total combo
            </span>
            <span className="font-display text-2xl font-black text-amber-400">
              {formatCOP(itemBorrador.subtotal)}
            </span>
          </div>

          <button
            type="button"
            disabled={!puedeConfirmar}
            onClick={handleConfirmar}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-black text-neutral-950 shadow-xl transition-all hover:bg-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            <span>{initialItem ? 'Actualizar Combo' : 'Agregar Combo'}</span>
          </button>
        </footer>
      </div>
    </StorefrontDialog>
  );
}
