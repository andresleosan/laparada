import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  Copy,
  Flame,
  Scale,
  Save,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import type {
  CategoriaGasto,
  ConfiguracionMetasPresupuesto,
  GuardarMetasPresupuestoInput,
  MapaPresupuestoCategorias,
  TipoCostoOperativo,
} from '@/types';
import {
  CATEGORIAS_PRESUPUESTO_META,
  calcularPreviewConfiguracionMetas,
  clampPercentage,
  construirPlantillaRapidaPresupuesto,
  getMapaPresupuestosDefault,
  safeCurrencyInt,
  type PlantillaPresupuestoTipo,
} from '@/utils/metasPresupuestoUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface ConfigurarMetasPresupuestoModalProps {
  isOpen: boolean;
  onClose: () => void;
  etiquetaMes: string;
  configuracionActual: ConfiguracionMetasPresupuesto;
  tieneMesAnteriorParaCopiar: boolean;
  guardando: boolean;
  onGuardar: (input: GuardarMetasPresupuestoInput) => Promise<void>;
  onCopiarMesAnterior: () => Promise<void>;
}

interface DraftPresupuestoCategoria {
  montoStr: string;
  tipoCosto: TipoCostoOperativo;
}

type DraftCategoriasMap = Record<CategoriaGasto, DraftPresupuestoCategoria>;

function buildDraftFromConfig(cfg: ConfiguracionMetasPresupuesto): {
  metaVentasStr: string;
  metaUtilidadStr: string;
  costosFijosBaseStr: string;
  foodCostPctStr: string;
  umbralAlertaPctStr: string;
  notas: string;
  categorias: DraftCategoriasMap;
} {
  const categorias = {} as DraftCategoriasMap;
  const mapa = cfg.presupuestosPorCategoria || getMapaPresupuestosDefault();

  for (const meta of CATEGORIAS_PRESUPUESTO_META) {
    const item = mapa[meta.categoria] || {
      presupuestoCOP: 0,
      tipoCosto: meta.tipoCostoDefault,
    };
    categorias[meta.categoria] = {
      montoStr: item.presupuestoCOP > 0 ? String(item.presupuestoCOP) : '',
      tipoCosto: item.tipoCosto,
    };
  }

  return {
    metaVentasStr: cfg.metaVentasMensualCOP > 0 ? String(cfg.metaVentasMensualCOP) : '',
    metaUtilidadStr:
      cfg.metaUtilidadNetaMensualCOP > 0 ? String(cfg.metaUtilidadNetaMensualCOP) : '',
    costosFijosBaseStr: cfg.costosFijosBaseCOP > 0 ? String(cfg.costosFijosBaseCOP) : '',
    foodCostPctStr: String(cfg.foodCostObjetivoPct ?? 35),
    umbralAlertaPctStr: String(cfg.umbralAlertaGastoPct ?? 80),
    notas: cfg.notas || '',
    categorias,
  };
}

export function ConfigurarMetasPresupuestoModal({
  isOpen,
  onClose,
  etiquetaMes,
  configuracionActual,
  tieneMesAnteriorParaCopiar,
  guardando,
  onGuardar,
  onCopiarMesAnterior,
}: ConfigurarMetasPresupuestoModalProps) {
  const titleId = useId();
  const [metaVentasStr, setMetaVentasStr] = useState('');
  const [metaUtilidadStr, setMetaUtilidadStr] = useState('');
  const [costosFijosBaseStr, setCostosFijosBaseStr] = useState('');
  const [foodCostPctStr, setFoodCostPctStr] = useState('35');
  const [umbralAlertaPctStr, setUmbralAlertaPctStr] = useState('80');
  const [notas, setNotas] = useState('');
  const [categoriasDraft, setCategoriasDraft] = useState<DraftCategoriasMap>(() =>
    buildDraftFromConfig(configuracionActual).categorias
  );

  useEffect(() => {
    if (!isOpen) return;
    const inicial = buildDraftFromConfig(configuracionActual);
    setMetaVentasStr(inicial.metaVentasStr);
    setMetaUtilidadStr(inicial.metaUtilidadStr);
    setCostosFijosBaseStr(inicial.costosFijosBaseStr);
    setFoodCostPctStr(inicial.foodCostPctStr);
    setUmbralAlertaPctStr(inicial.umbralAlertaPctStr);
    setNotas(inicial.notas);
    setCategoriasDraft(inicial.categorias);
  }, [isOpen, configuracionActual]);

  const inputNormalizado = useMemo<GuardarMetasPresupuestoInput>(() => {
    const mapa = {} as MapaPresupuestoCategorias;
    for (const meta of CATEGORIAS_PRESUPUESTO_META) {
      const draft = categoriasDraft[meta.categoria];
      mapa[meta.categoria] = {
        presupuestoCOP: safeCurrencyInt(draft?.montoStr, 0),
        tipoCosto: draft?.tipoCosto || meta.tipoCostoDefault,
      };
    }

    return {
      metaVentasMensualCOP: safeCurrencyInt(metaVentasStr, 0),
      metaUtilidadNetaMensualCOP: safeCurrencyInt(metaUtilidadStr, 0),
      costosFijosBaseCOP: safeCurrencyInt(costosFijosBaseStr, 0),
      foodCostObjetivoPct: clampPercentage(foodCostPctStr, 5, 85, 35),
      umbralAlertaGastoPct: clampPercentage(umbralAlertaPctStr, 50, 99, 80),
      presupuestosPorCategoria: mapa,
      notas,
    };
  }, [
    metaVentasStr,
    metaUtilidadStr,
    costosFijosBaseStr,
    foodCostPctStr,
    umbralAlertaPctStr,
    notas,
    categoriasDraft,
  ]);

  const preview = useMemo(
    () => calcularPreviewConfiguracionMetas(inputNormalizado),
    [inputNormalizado]
  );

  if (!isOpen) return null;

  const aplicarPlantilla = (tipo: PlantillaPresupuestoTipo) => {
    const plantilla = construirPlantillaRapidaPresupuesto(tipo);
    setMetaVentasStr(String(plantilla.metaVentasMensualCOP));
    setMetaUtilidadStr(String(plantilla.metaUtilidadNetaMensualCOP));
    setCostosFijosBaseStr(String(plantilla.costosFijosBaseCOP));
    setFoodCostPctStr(String(plantilla.foodCostObjetivoPct));
    setUmbralAlertaPctStr(String(plantilla.umbralAlertaGastoPct));
    setNotas(plantilla.notas || '');

    const nuevasCats = {} as DraftCategoriasMap;
    for (const meta of CATEGORIAS_PRESUPUESTO_META) {
      const item = plantilla.presupuestosPorCategoria[meta.categoria];
      nuevasCats[meta.categoria] = {
        montoStr: item.presupuestoCOP > 0 ? String(item.presupuestoCOP) : '',
        tipoCosto: item.tipoCosto,
      };
    }
    setCategoriasDraft(nuevasCats);
    createToast('Plantilla cargada. Ajusta los montos a tu realidad local.', 'info');
  };

  const sugerirMetaDesdeEquilibrio = () => {
    if (preview.puntoEquilibrioMensualCOP <= 0) {
      createToast(
        'Ingresa primero tus costos fijos (arriendo, salarios, servicios) para calcular la meta sugerida.',
        'info'
      );
      return;
    }
    const sugerida = Math.ceil((preview.puntoEquilibrioMensualCOP * 1.3) / 100000) * 100000;
    setMetaVentasStr(String(sugerida));
    createToast(
      `Meta sugerida en ${formatCOP(sugerida)} (30% por encima del Punto de Equilibrio).`,
      'success'
    );
  };

  const handleToggleTipoCosto = (categoria: CategoriaGasto, tipo: TipoCostoOperativo) => {
    setCategoriasDraft((prev) => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        tipoCosto: tipo,
      },
    }));
  };

  const handleChangeMontoCat = (categoria: CategoriaGasto, valor: string) => {
    setCategoriasDraft((prev) => ({
      ...prev,
      [categoria]: {
        ...prev[categoria],
        montoStr: valor,
      },
    }));
  };

  const handleCopiarMesAnterior = async () => {
    try {
      await onCopiarMesAnterior();
      createToast(`Presupuesto del mes anterior copiado a ${etiquetaMes}`, 'success');
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo copiar el mes anterior';
      createToast(msg, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      inputNormalizado.metaVentasMensualCOP <= 0 &&
      preview.totalPresupuestoOpexCOP <= 0 &&
      inputNormalizado.costosFijosBaseCOP <= 0
    ) {
      createToast('Ingresa al menos una meta de ventas o un presupuesto de costos.', 'error');
      return;
    }

    try {
      await onGuardar(inputNormalizado);
      createToast(`Metas y presupuesto de ${etiquetaMes} guardados`, 'success');
      onClose();
    } catch (err) {
      console.error('Error guardando metas y presupuesto:', err);
      createToast('No pudimos guardar las metas. Verifica tus permisos de administrador.', 'error');
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={() => !guardando && onClose()}
      canClose={!guardando}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 bg-neutral-900/75 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/15 text-gold-400">
                <Target className="h-4 w-4" aria-hidden="true" />
              </span>
              <h2 id={titleId} className="font-display text-lg font-bold text-white sm:text-xl">
                Metas Comerciales & Presupuesto — {etiquetaMes}
              </h2>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              Define tus topes mensuales de gasto, costos fijos y meta de ventas para calcular tu Punto de Equilibrio en vivo.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar configuración de metas y presupuesto"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Atajos didácticos */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                  <Sparkles className="h-4 w-4 text-gold-400" aria-hidden="true" />
                  <span>Asistente Rápido (llena una base y ajusta a tu local):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tieneMesAnteriorParaCopiar && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleCopiarMesAnterior}
                      disabled={guardando}
                      className="min-h-[44px] gap-1.5 border-gold-400/40 bg-gold-400/10 text-xs font-semibold text-gold-300 hover:bg-gold-400/20"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copiar mes anterior</span>
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => aplicarPlantilla('puesto_rapido')}
                    disabled={guardando}
                    className="min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 text-xs font-medium text-neutral-200 transition-colors hover:border-gold-400/60 hover:text-white"
                  >
                    Puesto Rápido
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPlantilla('restaurante_medio')}
                    disabled={guardando}
                    className="min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 text-xs font-medium text-neutral-200 transition-colors hover:border-gold-400/60 hover:text-white"
                  >
                    Restaurante
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPlantilla('alto_volumen')}
                    disabled={guardando}
                    className="min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 text-xs font-medium text-neutral-200 transition-colors hover:border-gold-400/60 hover:text-white"
                  >
                    Alto Volumen
                  </button>
                </div>
              </div>
            </div>

            {/* Bloque 1: Metas y parámetros globales */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="meta-ventas-mensual" className="text-xs font-semibold text-neutral-200">
                    Meta de Ventas Mensual (COP)
                  </label>
                  <button
                    type="button"
                    onClick={sugerirMetaDesdeEquilibrio}
                    className="text-[11px] font-semibold text-gold-400 hover:text-gold-300 underline"
                  >
                    Sugerir (+30% BE)
                  </button>
                </div>
                <input
                  id="meta-ventas-mensual"
                  type="number"
                  min={0}
                  step={50000}
                  value={metaVentasStr}
                  onChange={(e) => setMetaVentasStr(e.target.value)}
                  placeholder="Ej: 22000000"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm font-semibold text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="meta-utilidad-mensual" className="text-xs font-semibold text-neutral-200">
                  Meta de Utilidad Neta (COP)
                </label>
                <input
                  id="meta-utilidad-mensual"
                  type="number"
                  min={0}
                  step={50000}
                  value={metaUtilidadStr}
                  onChange={(e) => setMetaUtilidadStr(e.target.value)}
                  placeholder="Ej: 4500000"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm font-semibold text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="costos-fijos-base" className="text-xs font-semibold text-neutral-200">
                  Arriendo y Fijos Base (COP)
                </label>
                <input
                  id="costos-fijos-base"
                  type="number"
                  min={0}
                  step={50000}
                  value={costosFijosBaseStr}
                  onChange={(e) => setCostosFijosBaseStr(e.target.value)}
                  placeholder="Ej: 2400000"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm font-semibold text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Local, administración o fijos que no pasan por caja menor.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="food-cost-objetivo" className="text-xs font-semibold text-neutral-200">
                  Food Cost / CMV Máximo (%)
                </label>
                <input
                  id="food-cost-objetivo"
                  type="number"
                  min={5}
                  max={85}
                  step={0.5}
                  value={foodCostPctStr}
                  onChange={(e) => setFoodCostPctStr(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm font-semibold text-white focus:border-gold-400 focus:outline-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Estándar gastronómico: 28% - 38% sobre ventas netas.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="umbral-alerta-gasto" className="text-xs font-semibold text-neutral-200">
                  Alerta Preventiva de Gasto (%)
                </label>
                <input
                  id="umbral-alerta-gasto"
                  type="number"
                  min={50}
                  max={99}
                  step={5}
                  value={umbralAlertaPctStr}
                  onChange={(e) => setUmbralAlertaPctStr(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm font-semibold text-white focus:border-gold-400 focus:outline-none"
                />
                <p className="text-[11px] text-neutral-500">
                  Avisa en ámbar al alcanzar este % del tope de categoría.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="notas-presupuesto" className="text-xs font-semibold text-neutral-200">
                  Notas de Planeación (opcional)
                </label>
                <input
                  id="notas-presupuesto"
                  type="text"
                  maxLength={200}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Temporada navideña, refuerzo fines de semana"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Bloque 2: Presupuesto Operativo por Categoría */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scale className="h-4 w-4 text-gold-400" aria-hidden="true" />
                    <span>Presupuesto Operativo (OPEX) por Categoría de Gasto</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Marca si cada partida es <strong className="text-sky-300">Fijo</strong> (suma al Punto de Equilibrio) o{' '}
                    <strong className="text-amber-300">Variable</strong> (depende del volumen de ventas).
                  </p>
                </div>
                <span className="text-xs font-mono text-neutral-300">
                  Total OPEX: <strong className="text-gold-400">{formatCOP(preview.totalPresupuestoOpexCOP)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {CATEGORIAS_PRESUPUESTO_META.map((meta) => {
                  const draft = categoriasDraft[meta.categoria];
                  const esFijo = draft?.tipoCosto === 'fijo';

                  return (
                    <div
                      key={meta.categoria}
                      className="flex flex-col justify-between gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <label
                            htmlFor={`presupuesto-cat-${meta.categoria}`}
                            className="block text-xs font-bold text-white"
                          >
                            {meta.nombre}
                          </label>
                          <p className="text-[11px] text-neutral-500">{meta.descripcion}</p>
                        </div>

                        <div
                          className="inline-flex shrink-0 rounded-lg border border-neutral-700 bg-neutral-950 p-0.5"
                          role="group"
                          aria-label={`Naturaleza del costo para ${meta.nombre}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleTipoCosto(meta.categoria, 'fijo')}
                            aria-pressed={esFijo}
                            className={`min-h-[36px] rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                              esFijo
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Fijo
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleTipoCosto(meta.categoria, 'variable')}
                            aria-pressed={!esFijo}
                            className={`min-h-[36px] rounded-md px-2.5 text-[11px] font-semibold transition-colors ${
                              !esFijo
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            Variable
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">
                          $
                        </span>
                        <input
                          id={`presupuesto-cat-${meta.categoria}`}
                          type="number"
                          min={0}
                          step={10000}
                          value={draft?.montoStr || ''}
                          onChange={(e) => handleChangeMontoCat(meta.categoria, e.target.value)}
                          placeholder="0"
                          className="min-h-[44px] w-full rounded-lg border border-neutral-700 bg-neutral-950 pl-7 pr-3 text-sm font-semibold text-white placeholder:text-neutral-600 focus:border-gold-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bloque 3: Simulación Live Break-Even */}
            <div className="rounded-xl border border-gold-400/30 bg-gradient-to-br from-gold-500/10 via-neutral-900 to-neutral-950 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-300">
                <Calculator className="h-4 w-4 text-gold-400" aria-hidden="true" />
                <span>Simulación en Vivo de Tu Punto de Equilibrio (Break-Even)</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Costos Fijos Mes</span>
                  <span className="font-display text-base font-bold text-sky-300">
                    {formatCOP(preview.costosFijosTotalesCOP)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 block">Equilibrio Mensual</span>
                  <span className="font-display text-base font-bold text-gold-400">
                    {formatCOP(preview.puntoEquilibrioMensualCOP)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 block">Equilibrio Diario</span>
                  <span className="font-display text-base font-bold text-white">
                    {formatCOP(preview.puntoEquilibrioDiarioCOP)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-neutral-400 block">Utilidad Proyectada en Meta</span>
                  <span
                    className={`font-display text-base font-bold ${
                      preview.utilidadProyectadaEnMetaCOP >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCOP(preview.utilidadProyectadaEnMetaCOP)}
                  </span>
                </div>
              </div>

              {inputNormalizado.metaVentasMensualCOP > 0 &&
                preview.puntoEquilibrioMensualCOP > inputNormalizado.metaVentasMensualCOP && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <span>
                      Tu Meta de Ventas está por debajo del Punto de Equilibrio estimado (
                      {formatCOP(preview.puntoEquilibrioMensualCOP)}). Considera subir la meta o ajustar costos fijos.
                    </span>
                  </div>
                )}

              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-400">
                <Flame className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                <span>
                  Margen de contribución base: <strong>{preview.margenContribucionEstimadoPct}%</strong>{' '}
                  (100% − {inputNormalizado.foodCostObjetivoPct}% Food Cost). Al superar el equilibrio, cada peso adicional genera utilidad real.
                </span>
              </p>
            </div>
          </div>

          {/* Pie del modal */}
          <div className="flex flex-col-reverse gap-2.5 border-t border-neutral-800 bg-neutral-900/75 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] px-4 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando}
              className="min-h-[44px] gap-2 px-5 text-xs font-bold"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>Guardar Metas y Presupuesto</span>
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
