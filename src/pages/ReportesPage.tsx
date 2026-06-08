// src/pages/ReportesPage.tsx
import React from 'react';
import { useReportes } from '@/hooks/useReportes';
import { formatCOP } from '@/utils/formatCOP';
import { StatsCard } from '@/components/reportes/StatsCard';
import { BarChart } from '@/components/reportes/BarChart';
import { PieChart } from '@/components/reportes/PieChart';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrendingUp, Wallet, ShoppingBag } from 'lucide-react';

export function ReportesPage() {
  const { resumen, ventas, gastos, loading } = useReportes();

  const ventasPorProducto = React.useMemo(() => {
    const counts: Record<string, number> = {};
    ventas.forEach((v) => v.items?.forEach((it) => (counts[it.nombre] = (counts[it.nombre] || 0) + it.cantidad)));
    const arr = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return arr;
  }, [ventas]);

  const gastosByCategory = React.useMemo(() => {
    const entries = Object.entries(resumen.gastosPorCategoria || {}).map(([label, value]) => ({ label, value }));
    return entries;
  }, [resumen.gastosPorCategoria]);

  const margenGanancia = resumen.totalVentas > 0 ? ((resumen.gananciaNeta / resumen.totalVentas) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Reportes</h1>
            <p className="mt-2 text-neutral-400">Resumen de ventas, gastos y métricas clave</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Reportes</h1>
          <p className="mt-2 text-neutral-400">Resumen de ventas, gastos y métricas clave</p>
        </div>

        {/* KPI Cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatsCard
            title="Total Ventas"
            value={formatCOP(resumen.totalVentas)}
            subtitle={`${resumen.cantidadVentas} venta${resumen.cantidadVentas !== 1 ? 's' : ''}`}
            icon={<ShoppingBag size={16} />}
            trend="up"
          />
          <StatsCard
            title="Gastos Totales"
            value={formatCOP(resumen.totalGastos)}
            subtitle={`${Object.keys(resumen.gastosPorCategoria).length} categor${Object.keys(resumen.gastosPorCategoria).length !== 1 ? 'ías' : 'ía'}`}
            icon={<Wallet size={16} />}
            trend="down"
          />
          <StatsCard
            title="Ganancia Neta"
            value={formatCOP(resumen.gananciaNeta)}
            subtitle={`${margenGanancia}% margen`}
            icon={<TrendingUp size={16} />}
            trend={resumen.gananciaNeta > 0 ? 'up' : 'down'}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Products Chart */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-300">Productos Más Vendidos</h3>
              <ShoppingBag size={14} className="text-gold opacity-50" />
            </div>
            {ventasPorProducto.length === 0 ? (
              <div className="mt-6 flex h-40 items-center justify-center">
                <p className="text-neutral-500">Sin datos disponibles</p>
              </div>
            ) : (
              <div className="mt-4">
                <BarChart data={ventasPorProducto} />
              </div>
            )}
          </Card>

          {/* Expenses Chart */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-300">Gastos por Categoría</h3>
              <Wallet size={14} className="text-red-400 opacity-50" />
            </div>
            {gastosByCategory.length === 0 ? (
              <div className="mt-6 flex h-40 items-center justify-center">
                <p className="text-neutral-500">Sin datos disponibles</p>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-6">
                <PieChart data={gastosByCategory.map((d) => ({ ...d, color: undefined }))} size={140} />
                <div className="flex-1 space-y-2">
                  {gastosByCategory.map((g, idx) => (
                    <div key={g.label} className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: ['#C9A84C', '#E5A823', '#8BC34A', '#FF7043', '#90CAF9', '#4DD0E1', '#FFB74D'][idx % 7],
                        }}
                      />
                      <span className="text-xs text-neutral-100">{g.label.charAt(0).toUpperCase() + g.label.slice(1)}</span>
                      <span className="ml-auto font-medium text-xs text-gold">{formatCOP(g.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Summary Footer */}
        <Card className="mt-6 p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-500">Venta Promedio</p>
              <p className="mt-1 text-lg font-bold text-gold">{formatCOP(resumen.ventaPromedio)}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Gasto Promedio</p>
              <p className="mt-1 text-lg font-bold text-red-400">
                {resumen.cantidadVentas > 0 ? formatCOP(resumen.totalGastos / resumen.cantidadVentas) : formatCOP(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Total Transacciones</p>
              <p className="mt-1 text-lg font-bold text-white">{resumen.cantidadVentas + gastos.length}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">ROI</p>
              <p className="mt-1 text-lg font-bold text-green-400">{margenGanancia}%</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
