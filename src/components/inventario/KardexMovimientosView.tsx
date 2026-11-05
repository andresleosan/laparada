// src/components/inventario/KardexMovimientosView.tsx
import { useMemo } from 'react';
import type { EntradaInventario, FiltrosKardex, Insumo, TipoMovimientoKardex, RangoFechaKardex } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  determinarTipoMovimiento,
  getBadgeInfoTipoMovimiento,
  calcularMetricasKardex,
} from '@/utils/kardexInventarioUtils';
import type { ModoAjuste } from './AjusteStockModal';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Coins,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Calendar,
} from 'lucide-react';

export interface KardexMovimientosViewProps {
  movimientos: EntradaInventario[];
  insumos: Insumo[];
  loading?: boolean;
  error?: string | null;
  filtros: FiltrosKardex;
  setFiltros: React.Dispatch<React.SetStateAction<FiltrosKardex>>;
  resetFiltros: () => void;
  onExportarCsv: () => void;
  onAbrirNuevoMovimiento: (insumoId?: string, modo?: ModoAjuste) => void;
}

export function KardexMovimientosView({
  movimientos,
  insumos,
  loading = false,
  error = null,
  filtros,
  setFiltros,
  resetFiltros,
  onExportarCsv,
  onAbrirNuevoMovimiento,
}: KardexMovimientosViewProps) {
  // Métricas reactivas basadas en los movimientos filtrados
  const metricas = useMemo(() => {
    return calcularMetricasKardex(movimientos, insumos);
  }, [movimientos, insumos]);

  const TIPOS_FILTRO: Array<{ id: TipoMovimientoKardex | 'todos'; label: string }> = [
    { id: 'todos', label: 'Todos' },
    { id: 'entrada', label: 'Entradas / Compras' },
    { id: 'salida_venta', label: 'Salidas por Venta' },
    { id: 'merma', label: 'Mermas' },
    { id: 'ajuste', label: 'Ajustes' },
    { id: 'reversion', label: 'Reversiones' },
  ];

  const RANGOS_FECHA: Array<{ id: RangoFechaKardex; label: string }> = [
    { id: 'hoy', label: 'Hoy' },
    { id: '7dias', label: '7 días' },
    { id: 'mes', label: 'Este mes' },
    { id: 'todos', label: 'Histórico' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-neutral-900 border-neutral-800 text-center">
        <EmptyState
          icon={AlertTriangle}
          title="Error al consultar Kardex"
          description={error}
          action={{ label: 'Reintentar', onClick: resetFiltros }}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* 4 KPIs Contables de Kardex */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Valuación Bodega</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-gold-400 truncate">
              {formatCOP(metricas.valorTotalBodegaCOP)}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500">Estimado costo compras</p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-400/10 text-gold-400">
            <Coins className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Compras / Entradas</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-emerald-400 truncate">
              +{metricas.totalEntradasCantidad}
            </div>
            <p className="mt-0.5 text-[11px] text-emerald-400/80 truncate">
              {formatCOP(metricas.totalEntradasCostoCOP)} invertidos
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Salidas por Venta</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-sky-400 truncate">
              -{metricas.totalSalidasVentaCantidad}
            </div>
            <p className="mt-0.5 text-[11px] text-neutral-500">Deducidas por recetas</p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-400">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-800 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-neutral-400">Mermas & Bajas</span>
            <div className="mt-1 font-display text-xl sm:text-2xl font-bold text-red-400 truncate">
              -{metricas.totalMermasCantidad}
            </div>
            <p className="mt-0.5 text-[11px] text-red-400/80 truncate">
              {metricas.totalMermasValorCOP > 0 ? `${formatCOP(metricas.totalMermasValorCOP)} perdidos` : 'Desperdicios'}
            </p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </Card>
      </div>

      {/* Barra de Filtros y Acciones */}
      <Card className="p-4 bg-neutral-900 border-neutral-800 space-y-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Búsqueda y Selector de Insumo */}
          <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 pointer-events-none" />
              <Input
                placeholder="Buscar por insumo, proveedor, motivo o notas..."
                value={filtros.busqueda || ''}
                onChange={(e) => setFiltros((prev) => ({ ...prev, busqueda: e.target.value }))}
                className="pl-10 min-h-[44px]"
              />
            </div>

            <div className="w-full sm:w-64">
              <select
                aria-label="Filtrar por insumo específico"
                value={filtros.insumoId || 'todos'}
                onChange={(e) => setFiltros((prev) => ({ ...prev, insumoId: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="todos">Todos los insumos ({insumos.length})</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} (Stock: {i.stockActual || 0} {i.unidad})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onExportarCsv}
              className="min-h-[44px] flex items-center gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
              title="Descargar archivo Excel CSV de Kardex"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <span>Exportar Excel (CSV)</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={() => onAbrirNuevoMovimiento()}
              className="min-h-[44px] flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Movimiento</span>
            </Button>
          </div>
        </div>

        {/* Filtros secundarios: Tipo y Fechas */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800 text-xs">
          {/* Tipos de movimiento */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por tipo de movimiento">
            {TIPOS_FILTRO.map((t) => {
              const activo = (filtros.tipoMovimiento || 'todos') === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltros((prev) => ({ ...prev, tipoMovimiento: t.id }))}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 font-medium transition-all ${
                    activo
                      ? 'bg-gold-400 text-black font-semibold shadow-sm'
                      : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Rango de Fechas */}
          <div className="flex items-center gap-1 bg-neutral-800/60 p-1 rounded-lg border border-neutral-800">
            <Calendar className="h-3.5 w-3.5 text-neutral-500 ml-1.5" aria-hidden="true" />
            {RANGOS_FECHA.map((r) => {
              const activo = (filtros.rangoFecha || 'todos') === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setFiltros((prev) => ({ ...prev, rangoFecha: r.id }))}
                  className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    activo
                      ? 'bg-neutral-700 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Resultados: Listado / Tabla */}
      {movimientos.length === 0 ? (
        <Card className="p-8 bg-neutral-900 border-neutral-800 text-center">
          <EmptyState
            icon={BookOpen}
            title="Sin movimientos en el Kardex"
            description="No se encontraron registros de inventario con los filtros seleccionados."
            action={{ label: 'Limpiar filtros', onClick: resetFiltros }}
          />
        </Card>
      ) : (
        <>
          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-950/80 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th scope="col" className="px-4 py-3">Fecha & Hora</th>
                    <th scope="col" className="px-4 py-3">Insumo</th>
                    <th scope="col" className="px-4 py-3">Tipo Movimiento</th>
                    <th scope="col" className="px-4 py-3 text-right">Cantidad</th>
                    <th scope="col" className="px-4 py-3 text-center">Stock (Prev ➔ Post)</th>
                    <th scope="col" className="px-4 py-3 text-right">Costo Total / Unit</th>
                    <th scope="col" className="px-4 py-3">Referencia / Motivo</th>
                    <th scope="col" className="px-4 py-3">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {movimientos.map((mov) => {
                    const tipo = determinarTipoMovimiento(mov);
                    const badge = getBadgeInfoTipoMovimiento(tipo);
                    const date = toValidAdminDate(mov.fecha) || new Date();
                    const fechaStr = date.toLocaleDateString('es-CO');
                    const horaStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                    const cantidadNum = Number.isFinite(mov.cantidad) ? mov.cantidad : 0;
                    const stockPrevio = typeof mov.stockPrevio === 'number' ? mov.stockPrevio : '-';
                    const stockPost = typeof mov.stockResultante === 'number' ? mov.stockResultante : '-';
                    const costoNum = Number.isFinite(mov.costo) ? mov.costo : 0;

                    return (
                      <tr key={mov.id} className="hover:bg-neutral-800/40 transition-colors">
                        {/* Fecha */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium text-white">{fechaStr}</div>
                          <div className="text-[11px] text-neutral-500">{horaStr}</div>
                        </td>

                        {/* Insumo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-white">{mov.insumoNombre}</span>
                          <span className="ml-1 text-[11px] text-neutral-400">({mov.unidadMedida || 'unid'})</span>
                        </td>

                        {/* Tipo Movimiento */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge variant="outline" className={`border ${badge.badgeClasses}`}>
                            {badge.label}
                          </Badge>
                        </td>

                        {/* Cantidad */}
                        <td className="px-4 py-3 whitespace-nowrap text-right font-display font-bold">
                          <span
                            className={
                              cantidadNum > 0
                                ? 'text-emerald-400'
                                : cantidadNum < 0
                                ? 'text-red-400'
                                : 'text-neutral-400'
                            }
                          >
                            {cantidadNum > 0 ? `+${cantidadNum}` : cantidadNum}
                          </span>
                        </td>

                        {/* Stock Previo -> Post */}
                        <td className="px-4 py-3 whitespace-nowrap text-center text-xs">
                          <span className="text-neutral-500">{stockPrevio}</span>
                          <span className="mx-1.5 text-neutral-600">➔</span>
                          <span className="font-semibold text-white">{stockPost}</span>
                        </td>

                        {/* Costos */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          {costoNum > 0 ? (
                            <>
                              <div className="font-medium text-white">{formatCOP(costoNum)}</div>
                              {mov.costoUnitario && mov.costoUnitario > 0 && (
                                <div className="text-[11px] text-neutral-500">
                                  {formatCOP(mov.costoUnitario)}/u
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-neutral-600">-</span>
                          )}
                        </td>

                        {/* Referencia / Motivo */}
                        <td className="px-4 py-3 max-w-xs truncate">
                          <div className="truncate text-white" title={mov.proveedor || ''}>
                            {mov.proveedor || '-'}
                          </div>
                          {(mov.motivo || mov.notas) && (
                            <div className="truncate text-[11px] text-neutral-400" title={`${mov.motivo ? `[${mov.motivo}] ` : ''}${mov.notas || ''}`}>
                              {mov.motivo && <span className="text-gold-400 font-medium">[{mov.motivo}] </span>}
                              {mov.notas}
                            </div>
                          )}
                        </td>

                        {/* Responsable */}
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-neutral-400">
                          {mov.responsable || 'Sistema'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista Mobile (Tarjetas accesibles) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {movimientos.map((mov) => {
              const tipo = determinarTipoMovimiento(mov);
              const badge = getBadgeInfoTipoMovimiento(tipo);
              const date = toValidAdminDate(mov.fecha) || new Date();
              const fechaStr = date.toLocaleDateString('es-CO');
              const horaStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
              const cantidadNum = Number.isFinite(mov.cantidad) ? mov.cantidad : 0;
              const stockPrevio = typeof mov.stockPrevio === 'number' ? mov.stockPrevio : '-';
              const stockPost = typeof mov.stockResultante === 'number' ? mov.stockResultante : '-';
              const costoNum = Number.isFinite(mov.costo) ? mov.costo : 0;

              return (
                <Card key={mov.id} className="p-3.5 bg-neutral-900 border-neutral-800 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{mov.insumoNombre}</h4>
                      <div className="text-[11px] text-neutral-400">
                        {fechaStr} · {horaStr}
                      </div>
                    </div>
                    <Badge variant="outline" className={`border ${badge.badgeClasses}`}>
                      {badge.shortLabel}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-neutral-950/60 p-2 text-xs">
                    <div>
                      <span className="text-neutral-400">Stock: </span>
                      <span className="text-neutral-400">{stockPrevio}</span>
                      <span className="mx-1 text-neutral-600">➔</span>
                      <strong className="text-white">{stockPost} {mov.unidadMedida || 'u'}</strong>
                    </div>

                    <div className="font-display text-sm font-bold">
                      <span
                        className={
                          cantidadNum > 0
                            ? 'text-emerald-400'
                            : cantidadNum < 0
                            ? 'text-red-400'
                            : 'text-neutral-400'
                        }
                      >
                        {cantidadNum > 0 ? `+${cantidadNum}` : cantidadNum} {mov.unidadMedida || 'u'}
                      </span>
                    </div>
                  </div>

                  {(costoNum > 0 || mov.proveedor || mov.motivo || mov.notas) && (
                    <div className="text-xs text-neutral-300 space-y-1 pt-1 border-t border-neutral-800/80">
                      {costoNum > 0 && (
                        <div className="flex justify-between text-neutral-400">
                          <span>Costo registrado:</span>
                          <strong className="text-white">{formatCOP(costoNum)}</strong>
                        </div>
                      )}
                      {mov.proveedor && (
                        <div className="truncate text-neutral-400">
                          Ref: <span className="text-neutral-300">{mov.proveedor}</span>
                        </div>
                      )}
                      {(mov.motivo || mov.notas) && (
                        <div className="text-[11px] text-neutral-400">
                          {mov.motivo && <span className="text-gold-400 font-medium">[{mov.motivo}] </span>}
                          {mov.notas}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
                    <span>Responsable: {mov.responsable || 'Sistema'}</span>
                    <button
                      type="button"
                      onClick={() => onAbrirNuevoMovimiento(mov.insumoId)}
                      className="text-gold-400 hover:underline min-h-[32px] px-2"
                    >
                      Ajustar este insumo
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Pie con contador total */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <span>Mostrando {movimientos.length} movimiento(s) de inventario</span>
        <button
          type="button"
          onClick={resetFiltros}
          className="flex items-center gap-1 text-neutral-400 hover:text-white min-h-[36px] px-2"
        >
          <RotateCcw className="h-3 w-3" /> Restablecer filtros
        </button>
      </div>
    </div>
  );
}

