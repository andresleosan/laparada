import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  ChefHat,
  Download,
  History,
  MessageSquare,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCOP } from '@/utils/formatCOP';
import {
  generarResumenInflacionWhatsApp,
  SEVERIDAD_ALZA_META,
} from '@/utils/preciosProveedoresUtils';
import type {
  ComparativaInsumoProveedores,
  FiltrosComparadorPrecios,
  OfertaProveedorInsumo,
  OrdenComparadorPrecios,
  RangoPeriodoPrecios,
  ResumenInflacionBodega,
} from '@/types';

interface ComparadorPreciosViewProps {
  comparativasFiltradas: ComparativaInsumoProveedores[];
  resumenInflacion: ResumenInflacionBodega;
  filtros: FiltrosComparadorPrecios;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosComparadorPrecios>>;
  resetFiltros: () => void;
  nombreNegocio?: string;
  loading?: boolean;
  onAbrirCotizacion: (insumoId?: string) => void;
  onVerDetalleHistorico: (comparativa: ComparativaInsumoProveedores) => void;
  onPedirMejorProveedor: (
    comparativa: ComparativaInsumoProveedores,
    oferta: OfertaProveedorInsumo
  ) => void;
  onExportarCsv: () => void;
}

const PERIODOS: Array<{ id: RangoPeriodoPrecios; label: string }> = [
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
  { id: '180d', label: '180 días' },
  { id: 'todo', label: 'Todo el histórico' },
];

export function ComparadorPreciosView({
  comparativasFiltradas,
  resumenInflacion,
  filtros,
  setFiltros,
  resetFiltros,
  nombreNegocio = 'La Parada',
  loading = false,
  onAbrirCotizacion,
  onVerDetalleHistorico,
  onPedirMejorProveedor,
  onExportarCsv,
}: ComparadorPreciosViewProps) {
  const [chartMounted, setChartMounted] = useState(false);

  useEffect(() => {
    setChartMounted(true);
  }, []);

  const handleCompartirWhatsApp = () => {
    if (typeof window === 'undefined') return;
    const encoded = generarResumenInflacionWhatsApp(nombreNegocio, resumenInflacion);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const indicePct = resumenInflacion.indiceInflacionPromedioPct;
  const esInflacionCritica = resumenInflacion.estadoGlobal === 'alerta_inflacion';

  return (
    <div className="space-y-6">
      {/* 1. Cabecera Ejecutiva + Acciones */}
      <section
        aria-label="Comparador de precios entre proveedores e índice de inflación"
        className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-4 sm:p-6 shadow-lg space-y-5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                esInflacionCritica
                  ? 'bg-red-500/15 border-red-500/40 text-red-400'
                  : 'bg-gold-400/15 border-gold-400/40 text-gold-400'
              }`}
            >
              {indicePct < 0 ? (
                <TrendingDown className="w-5 h-5" aria-hidden="true" />
              ) : (
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl text-white flex items-center gap-2 flex-wrap">
                <span>Comparador de Proveedores &amp; Índice de Inflación de Bodega</span>
                {resumenInflacion.alertasAlzaCriticaCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-bold">
                    {resumenInflacion.alertasAlzaCriticaCount}{' '}
                    {resumenInflacion.alertasAlzaCriticaCount === 1
                      ? 'alza > 10%'
                      : 'alzas > 10%'}
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Trazabilidad automática de compras en Órdenes, Facturas y Kardex con recomendación del mejor proveedor e impacto en Food Cost.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportarCsv}
              disabled={comparativasFiltradas.length === 0}
              className="h-11 px-3.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <Download className="w-4 h-4 text-gold-400" aria-hidden="true" />
              <span>CSV Inflación</span>
            </button>

            <button
              type="button"
              onClick={handleCompartirWhatsApp}
              disabled={resumenInflacion.totalInsumosMonitoreados === 0}
              className="h-11 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <MessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => onAbrirCotizacion()}
              className="h-11 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm inline-flex items-center gap-2 transition-colors shadow"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>+ Registrar Cotización</span>
            </button>
          </div>
        </div>

        {/* 4 KPIs de Inflación y Ahorro */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            className={`rounded-xl border p-4 ${
              esInflacionCritica
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-neutral-800 bg-neutral-950'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
              Índice Inflación Bodega
            </span>
            <p
              className={`mt-1.5 font-display font-black text-2xl tabular-nums ${
                indicePct > 10
                  ? 'text-red-400'
                  : indicePct > 0
                    ? 'text-amber-300'
                    : indicePct < 0
                      ? 'text-emerald-400'
                      : 'text-white'
              }`}
            >
              {indicePct > 0 ? `+${indicePct}%` : `${indicePct}%`}
            </p>
            <span className="text-[11px] text-neutral-400">
              Último salto prom.:{' '}
              {resumenInflacion.indiceInflacionUltimoSaltoPct > 0 ? '+' : ''}
              {resumenInflacion.indiceInflacionUltimoSaltoPct}%
            </span>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              resumenInflacion.alertasAlzaCriticaCount > 0
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-neutral-800 bg-neutral-950'
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
              Alertas Alza &gt; 10%
            </span>
            <p className="mt-1.5 font-display font-black text-2xl text-white tabular-nums">
              {resumenInflacion.alertasAlzaCriticaCount}
            </p>
            <span className="text-[11px] text-neutral-400">
              {resumenInflacion.recetasImpactadasCount} plato(s) con presión de Food Cost
            </span>
          </div>

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300 block">
              Ahorro Potencial / Unidad
            </span>
            <p className="mt-1.5 font-display font-black text-2xl text-emerald-400 tabular-nums">
              {formatCOP(resumenInflacion.ahorroPotencialUnitarioTotalCOP)}
            </p>
            <span className="text-[11px] text-neutral-400">
              Eligiendo al mejor proveedor en {resumenInflacion.insumosComparablesMultiProveedor} insumo(s)
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
              Insumos Monitoreados
            </span>
            <p className="mt-1.5 font-display font-black text-2xl text-white tabular-nums">
              {resumenInflacion.totalInsumosMonitoreados}
            </p>
            <span className="text-[11px] text-neutral-400">
              {resumenInflacion.totalRegistrosPrecios} compras/cotizaciones analizadas
            </span>
          </div>
        </div>

        {/* Gráfica de Evolución Mensual Base 100 */}
        {resumenInflacion.evolucionMensualIndice.length >= 1 && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Evolución Mensual del Índice de Costos de Bodega (Base 100)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  100 pts = precio inicial del período · &gt;110 pts indica inflación superior al 10%
                </p>
              </div>
              <span className="text-xs font-mono text-gold-400">
                {resumenInflacion.evolucionMensualIndice.length}{' '}
                {resumenInflacion.evolucionMensualIndice.length === 1 ? 'mes' : 'meses'}
              </span>
            </div>

            {chartMounted ? (
              <div
                className="h-48 w-full"
                role="img"
                aria-label="Evolución mensual del índice de inflación de bodega Base 100"
              >
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart
                    data={resumenInflacion.evolucionMensualIndice}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="inflacionGoldFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis dataKey="mesLabel" stroke="#737373" fontSize={11} />
                    <YAxis stroke="#737373" fontSize={11} domain={['auto', 'auto']} />
                    <ReferenceLine y={100} stroke="#525252" strokeDasharray="4 4" />
                    <ReferenceLine y={110} stroke="#ef4444" strokeDasharray="3 3" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121212',
                        border: '1px solid #333',
                        borderRadius: 12,
                        color: '#fff',
                      }}
                      formatter={(value: unknown) => [
                        `${Number(value) || 100} pts`,
                        'Índice Bodega',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="indiceBase100"
                      stroke="#C9A84C"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#inflacionGoldFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-neutral-500">
                Preparando serie de inflación...
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Barra de Filtros y Ordenación */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search
            className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) =>
              setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))
            }
            placeholder="Buscar insumo, proveedor o plato afectado..."
            aria-label="Buscar en comparador de precios"
            className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 pl-10 pr-3 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Período de precios">
            {PERIODOS.map((p) => {
              const active = filtros.periodo === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFiltros((prev) => ({ ...prev, periodo: p.id }))}
                  className={`min-h-[44px] px-3 rounded-lg border text-xs font-semibold transition-colors ${
                    active
                      ? 'border-gold-400 bg-gold-400 text-neutral-950'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-pressed={filtros.soloAlzasCriticas}
            onClick={() =>
              setFiltros((prev) => ({
                ...prev,
                soloAlzasCriticas: !prev.soloAlzasCriticas,
              }))
            }
            className={`min-h-[44px] px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              filtros.soloAlzasCriticas
                ? 'border-red-500/60 bg-red-500/20 text-red-200'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Solo alzas &gt; 10%</span>
          </button>

          <button
            type="button"
            aria-pressed={filtros.soloMultiProveedor}
            onClick={() =>
              setFiltros((prev) => ({
                ...prev,
                soloMultiProveedor: !prev.soloMultiProveedor,
              }))
            }
            className={`min-h-[44px] px-3 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              filtros.soloMultiProveedor
                ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Multi-proveedor</span>
          </button>

          <select
            value={filtros.orden}
            onChange={(e) =>
              setFiltros((prev) => ({
                ...prev,
                orden: e.target.value as OrdenComparadorPrecios,
              }))
            }
            aria-label="Ordenar comparador de precios"
            className="min-h-[44px] rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-gold-400 focus:outline-none"
          >
            <option value="alza_desc">Mayor alza %</option>
            <option value="ahorro_desc">Mayor ahorro potencial</option>
            <option value="impacto_foodcost_desc">Mayor impacto Food Cost</option>
            <option value="nombre_asc">Nombre (A–Z)</option>
          </select>
        </div>
      </div>

      {/* 3. Tarjetas Comparativas por Insumo */}
      {loading && comparativasFiltradas.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-neutral-800 bg-neutral-900 text-xs text-neutral-400">
          Analizando histórico de compras y precios de proveedores...
        </div>
      ) : comparativasFiltradas.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-neutral-800 bg-neutral-900/70 space-y-3">
          <TrendingUp className="w-11 h-11 text-neutral-600 mx-auto" aria-hidden="true" />
          <h3 className="font-display font-bold text-lg text-white">
            {resumenInflacion.totalInsumosMonitoreados === 0
              ? 'Aún no hay histórico de precios registrado'
              : 'Ningún insumo coincide con los filtros'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            {resumenInflacion.totalInsumosMonitoreados === 0
              ? 'Recibe una Orden de Compra, registra una factura con costo unitario o carga una cotización manual para empezar a comparar proveedores.'
              : 'Ajusta el período o los filtros activos para ver la evolución de costos de tus insumos.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {resumenInflacion.totalInsumosMonitoreados > 0 ? (
              <button
                type="button"
                onClick={resetFiltros}
                className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
              >
                Restablecer filtros
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onAbrirCotizacion()}
                className="h-11 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Registrar Primera Cotización
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {comparativasFiltradas.map((comp) => {
            const sevMeta = SEVERIDAD_ALZA_META[comp.severidad];
            const mejor = comp.mejorProveedor;

            return (
              <article
                key={comp.insumoId}
                aria-label={`Comparativa de ${comp.insumoNombre}`}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all ${
                  comp.tieneAlertaAlzaCritica
                    ? 'border-red-500/45 bg-gradient-to-b from-red-950/20 via-neutral-900 to-neutral-900'
                    : 'border-neutral-800 bg-neutral-900 hover:border-gold-400/35'
                }`}
              >
                <div className="space-y-3.5">
                  {/* Encabezado de tarjeta */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-bold text-base sm:text-lg text-white truncate">
                          {comp.insumoNombre}
                        </h3>
                        <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] font-mono text-neutral-300">
                          {comp.unidad}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Último: <strong className="text-neutral-200">{comp.ultimoProveedorNombre}</strong> ·{' '}
                        {comp.ultimaFechaIso} ({comp.totalRegistros} reg.)
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${sevMeta.badgeClass}`}
                      >
                        {comp.tieneAlertaAlzaCritica && (
                          <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {comp.variacionUltimoSaltoPct > 0
                          ? `+${comp.variacionUltimoSaltoPct}%`
                          : `${comp.variacionUltimoSaltoPct}%`}
                      </span>
                      <div className="mt-1 font-display font-black text-lg text-gold-400 font-mono">
                        {formatCOP(comp.ultimoCostoCOP)}
                      </div>
                    </div>
                  </div>

                  {/* Recomendación de Mejor Proveedor */}
                  {mejor && (
                    <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Award
                          className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                            Mejor Proveedor Recomendado
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-white truncate">
                            {mejor.proveedorNombre} · {formatCOP(mejor.ultimoCostoCOP)}/{comp.unidad}
                          </p>
                          {comp.ahorroPotencialUnitarioCOP > 0 && (
                            <p className="text-[11px] text-emerald-300 font-semibold">
                              Ahorra {formatCOP(comp.ahorroPotencialUnitarioCOP)}/{comp.unidad} ({comp.ahorroPotencialPct}%)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabla rápida de proveedores comparados */}
                  <div className="space-y-1.5">
                    {comp.ofertasProveedores.slice(0, 4).map((of) => (
                      <div
                        key={of.proveedorKey}
                        className="flex items-center justify-between rounded-lg border border-neutral-800/80 bg-neutral-950 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              of.esMejorPrecio
                                ? 'bg-emerald-400'
                                : of.esMasCaro
                                  ? 'bg-red-400'
                                  : 'bg-neutral-500'
                            }`}
                          />
                          <span className="font-semibold text-neutral-200 truncate">
                            {of.proveedorNombre}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {of.ultimaFechaIso}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 font-mono">
                          <span className="font-bold text-white">
                            {formatCOP(of.ultimoCostoCOP)}
                          </span>
                          {of.diferenciaVsMejorCOP > 0 && (
                            <span className="text-[11px] text-rose-400">
                              +{of.diferenciaVsMejorPct}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Impacto en Food Cost de Recetas */}
                  {comp.recetasAfectadas.length > 0 && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                        <span className="inline-flex items-center gap-1.5">
                          <ChefHat className="w-3.5 h-3.5 text-gold-400" aria-hidden="true" />
                          Impacto en Escandallos ({comp.recetasAfectadas.length})
                        </span>
                        {comp.maxDeltaFoodCostPts > 0 && (
                          <span className="text-red-400 font-bold">
                            +{comp.maxDeltaFoodCostPts} pp Food Cost
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {comp.recetasAfectadas.slice(0, 3).map((rec) => (
                          <span
                            key={`${rec.itemTipo}-${rec.itemId}`}
                            className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300"
                          >
                            {rec.itemNombre}:{' '}
                            <strong
                              className={
                                rec.impactoCostoUnitarioCOP > 0
                                  ? 'text-red-400'
                                  : rec.impactoCostoUnitarioCOP < 0
                                    ? 'text-emerald-400'
                                    : 'text-neutral-200'
                              }
                            >
                              {rec.foodCostNuevoPct}% FC
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones táctiles >= 44px */}
                <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onVerDetalleHistorico(comp)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <History className="w-4 h-4 text-gold-400" aria-hidden="true" />
                    <span>Ver Histórico &amp; Recetas</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAbrirCotizacion(comp.insumoId)}
                      aria-label={`Cotizar ${comp.insumoNombre}`}
                      className="min-h-[44px] px-3 rounded-xl border border-neutral-700 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-semibold text-xs inline-flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Cotizar</span>
                    </button>

                    {mejor && (
                      <button
                        type="button"
                        onClick={() => onPedirMejorProveedor(comp, mejor)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs inline-flex items-center gap-1.5 transition-colors shadow"
                      >
                        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                        <span>Pedir al Mejor</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
