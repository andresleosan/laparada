import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  ChefHat,
  Download,
  Filter,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import type {
  ComparativaInsumoProveedores,
  CuadranteBCG,
  ItemIngenieriaMenu,
  RedondeoPrecioCOP,
  TipoItemMenuIngenieria,
} from '@/types';
import { CostosInsumosTab } from '@/components/ingenieriaMenu/CostosInsumosTab';
import { MatrizBCGChart } from '@/components/ingenieriaMenu/MatrizBCGChart';
import { SimuladorPreciosModal } from '@/components/ingenieriaMenu/SimuladorPreciosModal';
import { DetalleHistoricoPrecioModal } from '@/components/proveedores/DetalleHistoricoPrecioModal';
import { SelectorPeriodoReportes } from '@/components/reportes/SelectorPeriodoReportes';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { useNegocio } from '@/context/NegocioContext';
import { useIngenieriaMenu } from '@/hooks/useIngenieriaMenu';
import { usePreciosProveedores } from '@/hooks/usePreciosProveedores';
import { formatCOP } from '@/utils/formatCOP';
import {
  generarResumenWhatsAppIngenieriaMenu,
  METAS_CUADRANTES_BCG,
  PRESETS_FOOD_COST_PCT,
} from '@/utils/ingenieriaMenuUtils';

type TabIngenieria = 'matriz' | 'insumos';
type OrdenTabla =
  | 'contribucion_desc'
  | 'unidades_desc'
  | 'food_cost_desc'
  | 'margen_desc'
  | 'nombre_asc';

const ORDEN_CUADRANTES: CuadranteBCG[] = [
  'estrella',
  'caballo_batalla',
  'rompecabezas',
  'perro',
  'sin_costeo',
];

const OPCIONES_REDONDEO: Array<{ id: RedondeoPrecioCOP; label: string }> = [
  { id: '500', label: '$500' },
  { id: '100', label: '$100' },
  { id: '1000', label: '$1.000' },
  { id: 'exacto', label: 'Exacto' },
];

export function IngenieriaMenuPage() {
  const { negocioActual } = useNegocio();
  const {
    resumen,
    insumos,
    movimientosKardex,
    categoriasDisponibles,
    tipoPeriodo,
    foodCostObjetivoPct,
    setFoodCostObjetivoPct,
    redondeo,
    setRedondeo,
    considerarImpuesto,
    setConsiderarImpuesto,
    tarifaImpuestoDetectada,
    etiquetaImpuestoDetectado,
    tipoFiltro,
    setTipoFiltro,
    categoriaFiltro,
    setCategoriaFiltro,
    incluirNoDisponibles,
    setIncluirNoDisponibles,
    loading,
    error,
    cambiarPeriodo,
    aplicarNuevoPrecio,
    guardarCostoReferencia,
    guardarCostoUnitarioInsumo,
    alternarDestacadoItem,
    exportarCsv,
    refresh,
  } = useIngenieriaMenu();

  const [tabActiva, setTabActiva] = useState<TabIngenieria>('matriz');
  const [cuadranteFiltro, setCuadranteFiltro] = useState<CuadranteBCG | 'todos'>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ordenTabla, setOrdenTabla] = useState<OrdenTabla>('contribucion_desc');
  const [itemSimuladorRef, setItemSimuladorRef] = useState<{
    id: string;
    tipo: TipoItemMenuIngenieria;
  } | null>(null);
  const [accionEnCursoId, setAccionEnCursoId] = useState<string | null>(null);
  const [comparativaHistoricoModal, setComparativaHistoricoModal] =
    useState<ComparativaInsumoProveedores | null>(null);

  const {
    comparativasPorInsumo,
    resumenInflacion,
  } = usePreciosProveedores({
    insumos,
    movimientosKardex,
  });

  const platosPresionadosCount = useMemo(
    () =>
      resumen.items.filter((item) =>
        item.desgloseIngredientes.some(
          (ing) => comparativasPorInsumo[ing.insumoId]?.tieneAlertaAlzaCritica
        )
      ).length,
    [resumen.items, comparativasPorInsumo]
  );

  const itemSimuladorActual = useMemo<ItemIngenieriaMenu | null>(() => {
    if (!itemSimuladorRef) return null;
    return (
      resumen.items.find(
        (i) => i.id === itemSimuladorRef.id && i.tipo === itemSimuladorRef.tipo
      ) || null
    );
  }, [resumen.items, itemSimuladorRef]);

  const itemsVisibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtrados = resumen.items.filter((item) => {
      if (cuadranteFiltro !== 'todos' && item.cuadrante !== cuadranteFiltro) {
        return false;
      }
      if (!q) return true;
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
      );
    });

    return [...filtrados].sort((a, b) => {
      switch (ordenTabla) {
        case 'unidades_desc':
          return b.unidadesVendidas - a.unidadesVendidas || b.contribucionTotalCOP - a.contribucionTotalCOP;
        case 'food_cost_desc':
          return b.foodCostPct - a.foodCostPct || b.unidadesVendidas - a.unidadesVendidas;
        case 'margen_desc':
          return b.margenContribucionUnitario - a.margenContribucionUnitario;
        case 'nombre_asc':
          return a.nombre.localeCompare(b.nombre, 'es-CO');
        case 'contribucion_desc':
        default:
          return b.contribucionTotalCOP - a.contribucionTotalCOP || b.unidadesVendidas - a.unidadesVendidas;
      }
    });
  }, [resumen.items, cuadranteFiltro, busqueda, ordenTabla]);

  const handleSeleccionarItem = (item: ItemIngenieriaMenu) => {
    setItemSimuladorRef({ id: item.id, tipo: item.tipo });
  };

  const handleAplicarPrecioSugeridoRapido = async (item: ItemIngenieriaMenu) => {
    if (item.precioSugeridoObjetivoCOP <= 0) return;
    const key = `${item.tipo}:${item.id}`;
    setAccionEnCursoId(key);
    try {
      await aplicarNuevoPrecio(item, item.precioSugeridoObjetivoCOP);
      createToast({
        title: `Precio de ${item.nombre} actualizado a ${formatCOP(item.precioSugeridoObjetivoCOP)}`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error actualizando precio';
      createToast({
        title: `No se pudo actualizar el precio: ${msg}`,
        type: 'error',
      });
    } finally {
      setAccionEnCursoId(null);
    }
  };

  const handleToggleDestacado = async (item: ItemIngenieriaMenu) => {
    const key = `star:${item.tipo}:${item.id}`;
    setAccionEnCursoId(key);
    try {
      await alternarDestacadoItem(item);
      createToast({
        title: item.destacado
          ? `${item.nombre} retirado de destacados`
          : `${item.nombre} marcado como destacado en tienda`,
        type: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error cambiando destacado';
      createToast({
        title: `No se pudo actualizar el destacado: ${msg}`,
        type: 'error',
      });
    } finally {
      setAccionEnCursoId(null);
    }
  };

  const handleCompartirWhatsApp = async () => {
    const texto = generarResumenWhatsAppIngenieriaMenu(
      resumen,
      negocioActual.nombre || 'La Parada'
    );
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      }
      if (typeof window !== 'undefined') {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(texto)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      }
      createToast({
        title: 'Resumen copiado y listo para enviar por WhatsApp',
        type: 'success',
      });
    } catch {
      createToast({
        title: 'No se pudo copiar al portapapeles',
        type: 'info',
      });
    }
  };

  const estadoFoodCostGlobal =
    resumen.foodCostPromedioPonderadoPct === 0
      ? 'neutral'
      : resumen.foodCostPromedioPonderadoPct <= foodCostObjetivoPct
        ? 'optimo'
        : resumen.foodCostPromedioPonderadoPct <= foodCostObjetivoPct + 5
          ? 'alerta'
          : 'critico';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-neutral-100 px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Encabezado Principal */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
              <Target className="h-4 w-4" aria-hidden="true" />
              <span>Rentabilidad &amp; Escandallos</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-white font-display">
              Ingeniería de Menú &amp; Matriz BCG
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400 max-w-2xl">
              Cruza costos reales de escandallos y Kardex contra ventas por plato para clasificar Estrellas, Caballos de Batalla, Rompecabezas y Perros, y simular precios según Food Cost objetivo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={exportarCsv}
              disabled={loading || resumen.totalItemsCatalogo === 0}
              className="min-h-[44px]"
            >
              <Download className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Exportar CSV
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCompartirWhatsApp}
              disabled={loading || resumen.totalItemsCatalogo === 0}
              className="min-h-[44px]"
            >
              <Share2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
              WhatsApp
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void refresh()}
              disabled={loading}
              className="min-h-[44px]"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              Actualizar
            </Button>
          </div>
        </header>

        {/* Estado de error visible con reintento */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-red-200">
                  No se pudieron cargar todos los datos de ingeniería de menú
                </p>
                <p className="text-xs text-red-300/90 mt-0.5">{error}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void refresh()}
              className="min-h-[44px] shrink-0"
            >
              Reintentar
            </Button>
          </div>
        )}

        {/* Alerta de Inflación de Bodega (> 10%) impactando Escandallos */}
        {resumenInflacion.alertasAlzaCriticaCount > 0 && (
          <div
            role="status"
            className="rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-white">
                  Presión de Costos por Alzas &gt; 10% en Bodega ({resumenInflacion.alertasAlzaCriticaCount} insumo(s))
                </p>
                <p className="text-xs text-neutral-300 mt-0.5">
                  Índice de inflación:{' '}
                  <strong className="text-red-300">
                    {resumenInflacion.indiceInflacionPromedioPct > 0 ? '+' : ''}
                    {resumenInflacion.indiceInflacionPromedioPct}%
                  </strong>
                  {platosPresionadosCount > 0
                    ? ` · ${platosPresionadosCount} plato(s)/combo(s) del menú utilizan ingredientes con alza crítica.`
                    : '.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setTabActiva('insumos')}
                className="min-h-[44px]"
              >
                Revisar Insumos
              </Button>
              <Link
                to="/proveedores?tab=comparador"
                className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-400 px-3.5 py-2 text-xs font-bold text-white transition-colors"
              >
                Comparar Proveedores
              </Link>
            </div>
          </div>
        )}

        {/* Controles de período, Food Cost objetivo y filtros globales */}
        <section aria-label="Configuración de período y estrategia de Food Cost" className="space-y-4">
          <SelectorPeriodoReportes
            periodoActual={tipoPeriodo}
            etiquetaPeriodo={resumen.periodo.etiqueta}
            onCambiarPeriodo={(tipo, ini, fin) => void cambiarPeriodo(tipo, ini, fin)}
            disabled={loading}
          />

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 rounded-xl border border-neutral-800 bg-neutral-900/70 p-4">
            {/* Food Cost Objetivo */}
            <div className="xl:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="global-food-cost-slider"
                  className="text-xs font-semibold uppercase tracking-wider text-neutral-400"
                >
                  Food Cost Objetivo Global
                </label>
                <span className="rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/15 px-2.5 py-0.5 text-xs font-bold text-[#E5C158] tabular-nums">
                  {foodCostObjetivoPct}%
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Presets de Food Cost Objetivo">
                {PRESETS_FOOD_COST_PCT.map((pct) => {
                  const active = foodCostObjetivoPct === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFoodCostObjetivoPct(pct)}
                      className={`min-h-[44px] flex-1 min-w-[60px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-[#C9A84C] bg-[#C9A84C] text-[#0A0A0A]'
                          : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>

              <input
                id="global-food-cost-slider"
                type="range"
                min={15}
                max={60}
                step={1}
                value={foodCostObjetivoPct}
                onChange={(e) => setFoodCostObjetivoPct(Number(e.target.value))}
                className="w-full accent-[#C9A84C] cursor-pointer"
              />
            </div>

            {/* Redondeo comercial COP + Base fiscal */}
            <div className="xl:col-span-3 space-y-2.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Redondeo Precios Sugeridos
              </span>
              <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Redondeo comercial COP">
                {OPCIONES_REDONDEO.map((op) => {
                  const active = redondeo === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setRedondeo(op.id)}
                      className={`min-h-[44px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#C9A84C] bg-[#C9A84C]/20 text-[#E5C158]'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>

              {tarifaImpuestoDetectada > 0 ? (
                <button
                  type="button"
                  aria-pressed={considerarImpuesto}
                  onClick={() => setConsiderarImpuesto(!considerarImpuesto)}
                  className={`w-full min-h-[44px] rounded-lg border px-3 py-1.5 text-xs font-medium text-left flex items-center justify-between gap-2 transition-colors ${
                    considerarImpuesto
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span>Descontar {etiquetaImpuestoDetectado} incluido</span>
                  <span className="font-bold">{considerarImpuesto ? 'Sí' : 'No'}</span>
                </button>
              ) : (
                <p className="text-[11px] text-neutral-500 pt-1">
                  Régimen fiscal detectado: {etiquetaImpuestoDetectado} (sin descuento INC/IVA).
                </p>
              )}
            </div>

            {/* Filtros de Catálogo */}
            <div className="xl:col-span-4 space-y-2.5">
              <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Alcance del Catálogo
              </span>
              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Tipo de ítem del menú">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'producto', label: 'Platos' },
                    { id: 'combo', label: 'Combos' },
                  ] as Array<{ id: 'todos' | TipoItemMenuIngenieria; label: string }>
                ).map((t) => {
                  const active = tipoFiltro === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setTipoFiltro(t.id)}
                      className={`min-h-[44px] rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? 'border-[#C9A84C] bg-[#C9A84C]/20 text-[#E5C158]'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                  aria-label="Filtrar por categoría"
                  className="flex-1 min-h-[44px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                >
                  <option value="todas">Todas las categorías</option>
                  {categoriasDisponibles.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  aria-pressed={incluirNoDisponibles}
                  onClick={() => setIncluirNoDisponibles(!incluirNoDisponibles)}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                    incluirNoDisponibles
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {incluirNoDisponibles ? 'Incluye pausados' : 'Solo disponibles'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tarjetas KPI Ejecutivas */}
        <section aria-label="Indicadores clave de costos y rentabilidad" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Food Cost Ponderado</span>
              <Target className="h-4 w-4 text-[#C9A84C]" aria-hidden="true" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
                estadoFoodCostGlobal === 'optimo'
                  ? 'text-emerald-400'
                  : estadoFoodCostGlobal === 'alerta'
                    ? 'text-amber-300'
                    : estadoFoodCostGlobal === 'critico'
                      ? 'text-red-400'
                      : 'text-neutral-300'
              }`}
            >
              {resumen.foodCostPromedioPonderadoPct}%
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Objetivo: {foodCostObjetivoPct}% · Costo período: {formatCOP(resumen.costoTotalPeriodoCOP)}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Margen Contribución Prom.</span>
              <TrendingUp className="h-4 w-4 text-sky-400" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
              {formatCOP(resumen.margenContribucionPromedioPonderadoCOP)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Umbral popularidad BCG: ≥ {resumen.umbralPopularidadUnidades} und ({resumen.umbralMenuMixPct}%)
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Cobertura de Costeo</span>
              <ChefHat className="h-4 w-4 text-amber-400" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold text-white font-mono tabular-nums">
              {resumen.itemsCosteados} / {resumen.totalItemsCatalogo}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {resumen.itemsSinCosteo > 0
                ? `${resumen.itemsSinCosteo} sin costeo · ${resumen.itemsCosteoIncompleto} parciales`
                : resumen.itemsCosteoIncompleto > 0
                  ? `${resumen.itemsCosteoIncompleto} con algún insumo en $0`
                  : '100% del menú filtrado costeado'}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Contribución Bruta Período</span>
              <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {formatCOP(resumen.contribucionTotalPeriodoCOP)}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {resumen.totalUnidadesVendidas} und vendidas · Ingresos: {formatCOP(resumen.ingresosTotalesCOP)}
            </p>
          </div>
        </section>

        {/* Tabs principales */}
        <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-3" role="tablist" aria-label="Vistas del centro de costos">
          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === 'matriz'}
            aria-pressed={tabActiva === 'matriz'}
            onClick={() => setTabActiva('matriz')}
            className={`min-h-[44px] inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              tabActiva === 'matriz'
                ? 'border-[#C9A84C] bg-[#C9A84C] text-[#0A0A0A]'
                : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            Matriz BCG y Análisis ({resumen.totalItemsCatalogo})
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tabActiva === 'insumos'}
            aria-pressed={tabActiva === 'insumos'}
            onClick={() => setTabActiva('insumos')}
            className={`min-h-[44px] inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              tabActiva === 'insumos'
                ? 'border-[#C9A84C] bg-[#C9A84C] text-[#0A0A0A]'
                : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" aria-hidden="true" />
            Control de Costos de Insumos ({insumos.length})
          </button>
        </div>

        {/* Contenido según Tab */}
        {loading && resumen.totalItemsCatalogo === 0 && insumos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 py-16 text-neutral-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C] mb-3" aria-hidden="true" />
            <p className="text-sm font-medium">Calculando escandallos y matriz BCG del menú…</p>
          </div>
        ) : tabActiva === 'insumos' ? (
          <CostosInsumosTab
            insumos={insumos}
            movimientosKardex={movimientosKardex}
            items={resumen.items}
            comparativasPorInsumo={comparativasPorInsumo}
            onVerHistoricoInsumo={(comp) => setComparativaHistoricoModal(comp)}
            onGuardarCostoInsumo={guardarCostoUnitarioInsumo}
          />
        ) : resumen.totalItemsCatalogo === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-6">
            <EmptyState
              icon={ChefHat}
              title="No hay productos o combos para analizar"
              description={
                error
                  ? 'Ocurrió un error cargando el catálogo o las ventas del período.'
                  : 'Ajusta los filtros de categoría/tipo o crea productos en el catálogo.'
              }
              action={
                error
                  ? { label: 'Reintentar carga', onClick: () => void refresh() }
                  : {
                      label: 'Restablecer filtros',
                      onClick: () => {
                        setTipoFiltro('todos');
                        setCategoriaFiltro('todas');
                        setIncluirNoDisponibles(true);
                        setCuadranteFiltro('todos');
                      },
                    }
              }
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tarjetas filtro por Cuadrante BCG */}
            <section aria-label="Resumen por cuadrante BCG" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {ORDEN_CUADRANTES.map((c) => {
                const meta = METAS_CUADRANTES_BCG[c];
                const count = resumen.conteoCuadrantes[c];
                const active = cuadranteFiltro === c;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setCuadranteFiltro((prev) => (prev === c ? 'todos' : c))
                    }
                    className={`min-h-[44px] rounded-xl border p-3.5 text-left transition-all ${
                      active
                        ? `${meta.borderClasses} ${meta.bgClasses} ring-1 ring-inset ring-white/20`
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg" aria-hidden="true">
                        {meta.emoji}
                      </span>
                      <span className={`text-xl font-bold font-mono tabular-nums ${meta.textClasses}`}>
                        {count}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-white">{meta.titulo}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-400 line-clamp-2">
                      {meta.subtitulo}
                    </p>
                  </button>
                );
              })}
            </section>

            {/* Estrategia del cuadrante seleccionado */}
            {cuadranteFiltro !== 'todos' && (
              <div
                className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${METAS_CUADRANTES_BCG[cuadranteFiltro].borderClasses} ${METAS_CUADRANTES_BCG[cuadranteFiltro].bgClasses}`}
              >
                <div className="text-xs sm:text-sm text-neutral-200">
                  <strong className={METAS_CUADRANTES_BCG[cuadranteFiltro].textClasses}>
                    {METAS_CUADRANTES_BCG[cuadranteFiltro].emoji} Estrategia para{' '}
                    {METAS_CUADRANTES_BCG[cuadranteFiltro].titulo}:
                  </strong>{' '}
                  {METAS_CUADRANTES_BCG[cuadranteFiltro].estrategia}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCuadranteFiltro('todos')}
                  className="min-h-[44px] shrink-0"
                >
                  Ver todos ({resumen.totalItemsCatalogo})
                </Button>
              </div>
            )}

            {/* Gráfico Scatter BCG */}
            <MatrizBCGChart
              items={resumen.items}
              umbralPopularidadUnidades={resumen.umbralPopularidadUnidades}
              umbralMargenContribucionCOP={resumen.umbralMargenContribucionCOP}
              onSelectItem={handleSeleccionarItem}
            />

            {/* Buscador + Ordenación de la lista */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3.5">
              <div className="relative flex-1 max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar plato, combo o categoría..."
                  aria-label="Buscar ítem en la tabla de ingeniería de menú"
                  className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 pl-9 pr-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-neutral-500 shrink-0" aria-hidden="true" />
                <select
                  value={ordenTabla}
                  onChange={(e) => setOrdenTabla(e.target.value as OrdenTabla)}
                  aria-label="Ordenar platos de la matriz"
                  className="min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                >
                  <option value="contribucion_desc">Mayor contribución bruta</option>
                  <option value="unidades_desc">Más unidades vendidas</option>
                  <option value="food_cost_desc">Mayor Food Cost %</option>
                  <option value="margen_desc">Mayor margen unitario</option>
                  <option value="nombre_asc">Nombre (A–Z)</option>
                </select>
              </div>
            </div>

            {/* Lista / Tarjetas de Análisis por Ítem */}
            {itemsVisibles.length === 0 ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 text-center text-sm text-neutral-400">
                Ningún ítem coincide con el filtro actual.
              </div>
            ) : (
              <div className="space-y-3">
                {itemsVisibles.map((item) => {
                  const meta = METAS_CUADRANTES_BCG[item.cuadrante];
                  const precioKey = `${item.tipo}:${item.id}`;
                  const starKey = `star:${item.tipo}:${item.id}`;
                  const aplicaPrecioDif =
                    item.tieneCosteo &&
                    item.precioSugeridoObjetivoCOP > 0 &&
                    item.precioSugeridoObjetivoCOP !== item.precioVenta;

                  return (
                    <article
                      key={`${item.tipo}-${item.id}`}
                      className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Identidad & Estado */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClasses}`}
                            >
                              <span aria-hidden="true">{meta.emoji}</span>
                              {meta.tituloCorto}
                            </span>

                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] font-medium text-neutral-300">
                              {item.tipo === 'combo' ? 'Combo' : 'Plato'} · {item.categoria}
                            </span>

                            {!item.disponible && (
                              <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-400">
                                No disponible
                              </span>
                            )}

                            {item.destacado && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#C9A84C]/20 border border-[#C9A84C]/40 px-2 py-0.5 text-[11px] font-medium text-[#E5C158]">
                                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                                Destacado
                              </span>
                            )}

                            {item.costeoIncompleto && (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-300">
                                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                                Incompleto ({item.insumosSinCosto.length} sin costo)
                              </span>
                            )}

                            {item.desgloseIngredientes.some(
                              (ing) => comparativasPorInsumo[ing.insumoId]?.tieneAlertaAlzaCritica
                            ) && (
                              <span className="inline-flex items-center gap-1 rounded bg-red-500/15 border border-red-500/40 px-2 py-0.5 text-[11px] font-semibold text-red-300">
                                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                                Alza insumo &gt; 10%
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-white">
                            {item.nombre}
                          </h3>

                          <p className="text-xs text-neutral-400">
                            {item.recomendacionAccion}
                          </p>
                        </div>

                        {/* Métricas Numéricas */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 rounded-lg border border-neutral-800/80 bg-neutral-950/70 p-3 text-xs shrink-0">
                          <div>
                            <span className="block text-[10px] uppercase text-neutral-500">Precio</span>
                            <span className="font-bold text-white font-mono tabular-nums">
                              {formatCOP(item.precioVenta)}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] uppercase text-neutral-500">Costo</span>
                            <span className="font-semibold text-neutral-200 font-mono tabular-nums">
                              {item.tieneCosteo ? formatCOP(item.costoUnitarioCOP) : 'Sin costeo'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] uppercase text-neutral-500">Food Cost</span>
                            <span
                              className={`font-bold font-mono tabular-nums ${
                                !item.tieneCosteo
                                  ? 'text-neutral-500'
                                  : item.foodCostPct <= foodCostObjetivoPct
                                    ? 'text-emerald-400'
                                    : item.foodCostPct <= foodCostObjetivoPct + 5
                                      ? 'text-amber-300'
                                      : 'text-red-400'
                              }`}
                            >
                              {item.tieneCosteo ? `${item.foodCostPct}%` : '—'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] uppercase text-neutral-500">Margen Unit.</span>
                            <span className="font-bold text-sky-300 font-mono tabular-nums">
                              {item.tieneCosteo ? formatCOP(item.margenContribucionUnitario) : '—'}
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] uppercase text-neutral-500">Ventas</span>
                            <span className="font-semibold text-neutral-200 font-mono tabular-nums">
                              {item.unidadesVendidas} und ({item.menuMixPct}%)
                            </span>
                          </div>

                          <div>
                            <span className="block text-[10px] uppercase text-neutral-500">
                              Sug. ({foodCostObjetivoPct}%)
                            </span>
                            <span className="font-bold text-[#E5C158] font-mono tabular-nums">
                              {item.precioSugeridoObjetivoCOP > 0
                                ? formatCOP(item.precioSugeridoObjetivoCOP)
                                : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleSeleccionarItem(item)}
                            className="min-h-[44px]"
                          >
                            <Calculator className="h-4 w-4 mr-1.5" aria-hidden="true" />
                            {item.tieneCosteo ? 'Simular' : 'Costear'}
                          </Button>

                          {aplicaPrecioDif && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              loading={accionEnCursoId === precioKey}
                              disabled={accionEnCursoId === precioKey}
                              onClick={() => void handleAplicarPrecioSugeridoRapido(item)}
                              title={`Aplicar precio sugerido (${formatCOP(item.precioSugeridoObjetivoCOP)}) al catálogo`}
                              className="min-h-[44px]"
                            >
                              <ArrowUpRight className="h-4 w-4 mr-1" aria-hidden="true" />
                              {formatCOP(item.precioSugeridoObjetivoCOP)}
                            </Button>
                          )}

                          <button
                            type="button"
                            aria-pressed={item.destacado}
                            aria-label={
                              item.destacado
                                ? `Quitar destacado de ${item.nombre}`
                                : `Destacar ${item.nombre} en tienda`
                            }
                            disabled={accionEnCursoId === starKey}
                            onClick={() => void handleToggleDestacado(item)}
                            className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border px-2.5 transition-colors ${
                              item.destacado
                                ? 'border-[#C9A84C] bg-[#C9A84C]/20 text-[#E5C158]'
                                : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:border-neutral-500 hover:text-white'
                            }`}
                          >
                            {item.destacado ? (
                              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Star className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Simulador What-If de Precios y Escandallo */}
      <SimuladorPreciosModal
        isOpen={itemSimuladorActual !== null}
        onClose={() => setItemSimuladorRef(null)}
        item={itemSimuladorActual}
        foodCostObjetivoInicial={foodCostObjetivoPct}
        redondeo={redondeo}
        tasaImpuestoPct={resumen.tasaImpuestoIncluidoPct}
        umbralPopularidadUnidades={resumen.umbralPopularidadUnidades}
        umbralMargenContribucionCOP={resumen.umbralMargenContribucionCOP}
        onAplicarPrecio={aplicarNuevoPrecio}
        onGuardarCostoReferencia={guardarCostoReferencia}
        onGuardarCostoInsumo={guardarCostoUnitarioInsumo}
      />

      <DetalleHistoricoPrecioModal
        isOpen={Boolean(comparativaHistoricoModal)}
        onClose={() => setComparativaHistoricoModal(null)}
        comparativa={comparativaHistoricoModal}
      />
    </div>
  );
}
