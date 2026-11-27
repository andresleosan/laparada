import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  ChefHat,
  History,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { formatCOP } from '@/utils/formatCOP';
import {
  ORIGEN_PRECIO_META,
  SEVERIDAD_ALZA_META,
} from '@/utils/preciosProveedoresUtils';
import type {
  ComparativaInsumoProveedores,
  OfertaProveedorInsumo,
} from '@/types';

interface DetalleHistoricoPrecioModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparativa: ComparativaInsumoProveedores | null;
  onPedirAProveedor?: (
    comparativa: ComparativaInsumoProveedores,
    oferta: OfertaProveedorInsumo
  ) => void;
  onEliminarRegistroManual?: (registroId: string) => Promise<void>;
}

export function DetalleHistoricoPrecioModal({
  isOpen,
  onClose,
  comparativa,
  onPedirAProveedor,
  onEliminarRegistroManual,
}: DetalleHistoricoPrecioModalProps) {
  const generatedId = useId();
  const titleId = `modal-detalle-precio-${generatedId.replace(/:/g, '')}-title`;
  const [chartMounted, setChartMounted] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  useEffect(() => {
    setChartMounted(true);
  }, []);

  if (!isOpen || !comparativa) return null;

  const sevMeta = SEVERIDAD_ALZA_META[comparativa.severidad];

  const handleEliminar = async (registroId: string) => {
    if (!onEliminarRegistroManual) return;
    if (!window.confirm('¿Eliminar este registro del histórico de precios?')) return;
    try {
      setEliminandoId(registroId);
      await onEliminarRegistroManual(registroId);
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <StorefrontDialog
      onClose={onClose}
      onBackdropClick={onClose}
      labelledBy={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 bg-neutral-950/70 p-4 sm:p-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gold-400/15 border border-gold-400/40 flex items-center justify-center text-gold-400 shrink-0">
              <History className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id={titleId}
                  className="font-display font-bold text-lg sm:text-xl text-white truncate"
                >
                  Histórico de Costos: {comparativa.insumoNombre}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${sevMeta.badgeClass}`}
                >
                  {sevMeta.label}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Unidad: <strong className="text-neutral-200">{comparativa.unidad}</strong> ·{' '}
                Último precio:{' '}
                <strong className="text-gold-400 font-mono">
                  {formatCOP(comparativa.ultimoCostoCOP)}
                </strong>{' '}
                · Variación último salto:{' '}
                <strong
                  className={
                    comparativa.variacionUltimoSaltoPct > 0
                      ? 'text-red-400'
                      : comparativa.variacionUltimoSaltoPct < 0
                        ? 'text-emerald-400'
                        : 'text-neutral-300'
                  }
                >
                  {comparativa.variacionUltimoSaltoPct > 0 ? '+' : ''}
                  {comparativa.variacionUltimoSaltoPct}%
                </strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={`Cerrar histórico de ${comparativa.insumoNombre}`}
            className="w-11 h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* 1. Gráfica de Evolución Histórica */}
          <section aria-label="Gráfica de evolución de costos">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Evolución del Costo Unitario ({comparativa.serieHistorica.length} puntos)
            </h3>
            {comparativa.serieHistorica.length === 0 ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 text-center text-xs text-neutral-500">
                Sin suficientes registros temporales para graficar.
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:p-4">
                {chartMounted ? (
                  <div className="h-56 w-full" role="img" aria-label={`Serie de precios de ${comparativa.insumoNombre}`}>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart
                        data={comparativa.serieHistorica}
                        margin={{ top: 8, right: 16, left: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                        <XAxis
                          dataKey="fechaLabel"
                          stroke="#737373"
                          fontSize={11}
                        />
                        <YAxis
                          stroke="#737373"
                          fontSize={11}
                          tickFormatter={(val: number) => `$${Math.round(val / 1000)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#121212',
                            border: '1px solid #333',
                            borderRadius: 12,
                            color: '#fff',
                          }}
                          formatter={(value: unknown) => [
                            formatCOP(Number(value) || 0),
                            `Costo / ${comparativa.unidad}`,
                          ]}
                          labelFormatter={(label, payload) => {
                            const p = payload?.[0]?.payload as
                              | { proveedorNombre?: string; fechaIso?: string }
                              | undefined;
                            return p
                              ? `${p.fechaIso || label} · ${p.proveedorNombre || ''}`
                              : String(label);
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="costoUnitarioCOP"
                          stroke="#C9A84C"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#C9A84C', stroke: '#0A0A0A', strokeWidth: 2 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center text-xs text-neutral-500">
                    Cargando gráfica de evolución...
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 2. Comparativa entre Proveedores */}
          <section aria-label="Comparativa por proveedor">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Ranking de Proveedores ({comparativa.ofertasProveedores.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {comparativa.ofertasProveedores.map((oferta) => (
                <div
                  key={oferta.proveedorKey}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                    oferta.esMejorPrecio
                      ? 'border-emerald-500/45 bg-emerald-500/10'
                      : oferta.esMasCaro
                        ? 'border-red-500/35 bg-red-500/5'
                        : 'border-neutral-800 bg-neutral-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-bold text-sm text-white truncate">
                          {oferta.proveedorNombre}
                        </span>
                        {oferta.esMejorPrecio && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            <Award className="w-3 h-3" aria-hidden="true" />
                            Mejor Proveedor
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Último registro: {oferta.ultimaFechaIso} · {oferta.cantidadRegistros}{' '}
                        {oferta.cantidadRegistros === 1 ? 'compra/cotiz.' : 'compras/cotiz.'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-display font-black text-base text-gold-400 font-mono">
                        {formatCOP(oferta.ultimoCostoCOP)}
                      </span>
                      <span className="block text-[10px] text-neutral-400">
                        Prom: {formatCOP(oferta.costoPromedioCOP)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                    {oferta.diferenciaVsMejorCOP > 0 ? (
                      <span className="text-rose-300 font-semibold">
                        +{formatCOP(oferta.diferenciaVsMejorCOP)} (+{oferta.diferenciaVsMejorPct}%) sobre el mejor
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-semibold">
                        Precio más competitivo disponible
                      </span>
                    )}

                    {onPedirAProveedor && (
                      <button
                        type="button"
                        onClick={() => onPedirAProveedor(comparativa, oferta)}
                        className="h-10 px-3 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-xs inline-flex items-center gap-1.5 transition-colors shrink-0"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                        Pedir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Impacto en Food Cost de Recetas y Escandallos */}
          <section aria-label="Impacto en Food Cost de recetas">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-gold-400" aria-hidden="true" />
                Impacto en Food Cost de Recetas &amp; Escandallos ({comparativa.recetasAfectadas.length})
              </h3>
              <Link
                to="/ingenieria-menu"
                onClick={onClose}
                className="text-xs font-semibold text-gold-400 hover:underline"
              >
                Abrir Ingeniería de Menú ➔
              </Link>
            </div>

            {comparativa.recetasAfectadas.length === 0 ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-400">
                Este insumo aún no está vinculado al escandallo de ningún plato o combo del menú.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-neutral-800 text-[11px] uppercase text-neutral-400 bg-neutral-900/80">
                    <tr>
                      <th className="px-3.5 py-2.5">Plato / Combo</th>
                      <th className="px-3.5 py-2.5 text-right">Uso Receta</th>
                      <th className="px-3.5 py-2.5 text-right">Impacto Costo</th>
                      <th className="px-3.5 py-2.5 text-right">Food Cost</th>
                      <th className="px-3.5 py-2.5 text-right">Margen Nuevo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/80">
                    {comparativa.recetasAfectadas.map((rec) => (
                      <tr key={`${rec.itemTipo}-${rec.itemId}`}>
                        <td className="px-3.5 py-2.5">
                          <span className="font-semibold text-white block">
                            {rec.itemNombre}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {rec.itemTipo === 'combo' ? 'Combo' : 'Plato'} · PV:{' '}
                            {formatCOP(rec.precioVentaCOP)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-neutral-300">
                          {rec.cantidadInsumoEnReceta} {rec.unidad}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold">
                          <span
                            className={
                              rec.impactoCostoUnitarioCOP > 0
                                ? 'text-red-400'
                                : rec.impactoCostoUnitarioCOP < 0
                                  ? 'text-emerald-400'
                                  : 'text-neutral-300'
                            }
                          >
                            {rec.impactoCostoUnitarioCOP > 0 ? '+' : ''}
                            {formatCOP(rec.impactoCostoUnitarioCOP)}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono">
                          <span className="text-neutral-400">{rec.foodCostAnteriorPct}% ➔ </span>
                          <span
                            className={`font-bold ${
                              rec.deltaFoodCostPts > 0
                                ? 'text-red-400'
                                : rec.deltaFoodCostPts < 0
                                  ? 'text-emerald-400'
                                  : 'text-white'
                            }`}
                          >
                            {rec.foodCostNuevoPct}%
                          </span>
                          {rec.deltaFoodCostPts !== 0 && (
                            <span className="block text-[10px] text-neutral-400">
                              ({rec.deltaFoodCostPts > 0 ? '+' : ''}
                              {rec.deltaFoodCostPts} pp)
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-neutral-200">
                          {formatCOP(rec.margenNuevoCOP)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 4. Bitácora Cronológica de Compras y Cotizaciones */}
          <section aria-label="Bitácora histórica de precios">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Bitácora Cronológica ({comparativa.registros.length})
            </h3>
            <div className="space-y-2">
              {comparativa.registros.map((reg) => {
                const origenMeta = ORIGEN_PRECIO_META[reg.origen];
                const puedeEliminar =
                  Boolean(onEliminarRegistroManual) &&
                  !reg.id.startsWith('fac_') &&
                  !reg.id.startsWith('kar_');

                return (
                  <div
                    key={reg.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-neutral-400">{reg.fechaIso}</span>
                        <span className="font-bold text-white">{reg.proveedorNombre}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${origenMeta.badgeClass}`}
                        >
                          {origenMeta.shortLabel}
                          {reg.referenciaCodigo ? ` · ${reg.referenciaCodigo}` : ''}
                        </span>
                        {reg.esAlzaCritica && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            Alza &gt; 10%
                          </span>
                        )}
                      </div>
                      {reg.notas && (
                        <p className="text-[11px] text-neutral-400 truncate">{reg.notas}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="font-display font-bold text-sm text-gold-400 font-mono">
                          {formatCOP(reg.costoUnitarioCOP)}
                        </span>
                        {typeof reg.variacionPct === 'number' && reg.variacionPct !== 0 && (
                          <span
                            className={`flex items-center justify-end gap-0.5 text-[11px] font-semibold ${
                              reg.variacionPct > 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {reg.variacionPct > 0 ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {reg.variacionPct > 0 ? '+' : ''}
                            {reg.variacionPct}%
                          </span>
                        )}
                      </div>

                      {puedeEliminar && (
                        <button
                          type="button"
                          disabled={eliminandoId === reg.id}
                          onClick={() => handleEliminar(reg.id)}
                          aria-label={`Eliminar registro de precio ${reg.fechaIso} de ${reg.proveedorNombre}`}
                          className="w-10 h-10 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </StorefrontDialog>
  );
}
