import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  CalendarDays,
  Clock,
  DollarSign,
  RefreshCw,
  ShoppingBag,
  Sunrise,
  Moon,
} from 'lucide-react';
import { useReportes } from '@/hooks/useReportes';
import {
  buildChannelMix,
  buildHourlySales,
  buildProductPerformance,
  type AnalyticsShift,
} from '@/utils/adminAnalytics';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatsCard } from '@/components/reportes/StatsCard';

const shiftOptions: Array<{
  value: AnalyticsShift;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { value: 'todas', label: 'Todas', icon: CalendarDays },
  { value: 'mañana', label: 'Mañana/Tarde', icon: Sunrise },
  { value: 'noche', label: 'Noche', icon: Moon },
];

export default function AnalyticsPage() {
  const { ventas, loading, error, refresh } = useReportes();
  const [jornadaFiltro, setJornadaFiltro] = useState<AnalyticsShift>('todas');

  const ventasFiltradas = useMemo(
    () => jornadaFiltro === 'todas'
      ? ventas
      : ventas.filter((venta) => venta.jornada === jornadaFiltro),
    [jornadaFiltro, ventas]
  );
  const demandaHoraria = useMemo(
    () => buildHourlySales(ventas, jornadaFiltro),
    [jornadaFiltro, ventas]
  );
  const productos = useMemo(
    () => buildProductPerformance(ventasFiltradas).slice(0, 6),
    [ventasFiltradas]
  );
  const canales = useMemo(
    () => buildChannelMix(ventasFiltradas),
    [ventasFiltradas]
  );
  const totalIngresos = ventasFiltradas.reduce((sum, venta) => sum + (venta.total || 0), 0);
  const ticketPromedio = ventasFiltradas.length > 0 ? totalIngresos / ventasFiltradas.length : 0;
  const horaPico = demandaHoraria.reduce<(typeof demandaHoraria)[number] | null>(
    (peak, row) => (!peak || row.ordenes > peak.ordenes ? row : peak),
    null
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-5">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-28 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertCircle}
            title="No pudimos cargar Analytics"
            description="Los datos no se reemplazaron por estimaciones. Intenta cargar nuevamente."
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-neutral-800 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
              <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
              Datos registrados
            </div>
            <h1 className="font-display text-2xl font-black text-white sm:text-3xl">Analytics operativo</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-400">
              Ventas reales de los últimos 30 días. No incluye pronósticos ni márgenes sin respaldo de costos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-neutral-800 bg-neutral-900 p-1" aria-label="Filtrar analytics por jornada">
              {shiftOptions.map((option) => {
                const Icon = option.icon;
                const active = jornadaFiltro === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setJornadaFiltro(option.value)}
                    aria-pressed={active}
                    className={`flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${
                      active ? 'bg-gold-400 text-base-dark' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{option.label}</span>
                    <span className="sm:hidden">{option.value === 'todas' ? 'Todas' : option.value === 'mañana' ? 'Día' : 'Noche'}</span>
                  </button>
                );
              })}
            </div>
            <Button variant="secondary" size="sm" onClick={refresh} aria-label="Actualizar analytics">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Ingresos observados"
            value={formatCOP(totalIngresos)}
            subtitle={`${ventasFiltradas.length} venta${ventasFiltradas.length === 1 ? '' : 's'}`}
            icon={<DollarSign className="h-4 w-4" aria-hidden="true" />}
          />
          <StatsCard
            title="Ticket promedio"
            value={formatCOP(ticketPromedio)}
            subtitle="Promedio del conjunto filtrado"
            icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />}
          />
          <StatsCard
            title="Hora con más pedidos"
            value={horaPico?.hora || 'Sin datos'}
            subtitle={horaPico ? `${horaPico.ordenes} pedido${horaPico.ordenes === 1 ? '' : 's'}` : 'Aún no hay ventas fechadas'}
            icon={<Clock className="h-4 w-4" aria-hidden="true" />}
          />
          <StatsCard
            title="Producto líder"
            value={productos[0]?.producto || 'Sin datos'}
            subtitle={productos[0] ? `${productos[0].unidades} unidades` : 'Aún no hay productos vendidos'}
            icon={<ShoppingBag className="h-4 w-4" aria-hidden="true" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <Card className="rounded-2xl p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white">Pedidos por hora</h2>
              <p className="text-xs text-neutral-400">Distribución de órdenes con fecha válida.</p>
            </div>
            {demandaHoraria.length === 0 ? (
              <EmptyState title="Sin actividad para esta jornada" description="Cuando registres ventas aparecerá la distribución horaria." />
            ) : (
              <div role="img" aria-label="Gráfico de pedidos reales agrupados por hora">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={demandaHoraria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ded8cc" vertical={false} />
                    <XAxis dataKey="hora" stroke="#6f695f" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#6f695f" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fffdf8', border: '1px solid #ded8cc', borderRadius: 12 }}
                      labelStyle={{ color: '#201f1b', fontWeight: 700 }}
                    />
                    <Bar dataKey="ordenes" name="Pedidos" fill="#c9a84c" radius={[7, 7, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="rounded-2xl p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-base font-bold text-white">Mezcla de canales</h2>
              <p className="text-xs text-neutral-400">Origen conservado al registrar cada venta.</p>
            </div>
            {canales.length === 0 ? (
              <EmptyState title="Sin canales registrados" description="No hay ventas en el conjunto filtrado." />
            ) : (
              <div className="space-y-4">
                {canales.map((channel) => (
                  <div key={channel.canal}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-neutral-300">{channel.canal}</span>
                      <span className="font-bold text-white">{channel.porcentaje}% · {channel.ordenes}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-neutral-800">
                      <div className="h-full rounded-full bg-gold-400" style={{ width: `${channel.porcentaje}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Productos por rotación</h2>
              <p className="text-xs text-neutral-400">Unidades e ingresos calculados desde los ítems vendidos.</p>
            </div>
            <span className="text-xs font-semibold text-neutral-500">Máximo 6 productos</span>
          </div>
          {productos.length === 0 ? (
            <EmptyState title="Sin productos vendidos" description="Los productos aparecerán cuando existan ventas registradas." />
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
              <div role="img" aria-label="Gráfico de unidades vendidas por producto">
                <ResponsiveContainer width="100%" height={Math.max(240, productos.length * 48)}>
                  <BarChart data={productos} layout="vertical" margin={{ left: 8, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ded8cc" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} stroke="#6f695f" fontSize={11} />
                    <YAxis type="category" dataKey="producto" width={105} stroke="#6f695f" fontSize={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fffdf8', border: '1px solid #ded8cc', borderRadius: 12 }}
                    />
                    <Bar dataKey="unidades" name="Unidades" fill="#201f1b" radius={[0, 7, 7, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-800">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-neutral-800 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  <span>Producto</span><span>Uds.</span><span>Ingresos</span>
                </div>
                {productos.map((product) => (
                  <div key={product.referenciaId || product.producto} className="grid grid-cols-[1fr_auto_auto] gap-3 border-t border-neutral-800 px-3 py-3 text-xs">
                    <span className="truncate font-semibold text-neutral-300">{product.producto}</span>
                    <span className="font-bold text-white">{product.unidades}</span>
                    <span className="font-bold text-gold-400">{formatCOP(product.ingresos)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
