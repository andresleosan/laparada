// src/pages/ReportesPage.tsx
import React from 'react';
import { useReportes } from '@/hooks/useReportes';
import { formatCOP } from '@/utils/formatCOP';
import { StatsCard } from '@/components/reportes/StatsCard';
import { BarChart } from '@/components/reportes/BarChart';
import { PieChart } from '@/components/reportes/PieChart';
import { Card } from '@/components/ui/Card';

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

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Reportes</h1>
          <p className="mt-2 text-neutral-400">Resumen de ventas, gastos y métricas clave</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">Cargando...</Card>
            <Card className="p-4">Cargando...</Card>
            <Card className="p-4">Cargando...</Card>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <StatsCard title="Total Ventas" value={formatCOP(resumen.totalVentas)} subtitle={`Ventas: ${resumen.cantidadVentas}`} />
              <StatsCard title="Total Gastos" value={formatCOP(resumen.totalGastos)} subtitle={`Por categoría`} />
              <StatsCard title="Ganancia Neta" value={formatCOP(resumen.gananciaNeta)} subtitle={`Promedio: ${formatCOP(resumen.ventaPromedio)}`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm text-neutral-400">Productos más vendidos</h3>
                {ventasPorProducto.length === 0 ? (
                  <p className="mt-3 text-neutral-500">No hay datos</p>
                ) : (
                  <BarChart data={ventasPorProducto} />
                )}
              </Card>

              <Card className="p-4">
                <h3 className="text-sm text-neutral-400">Gastos por categoría</h3>
                {gastosByCategory.length === 0 ? (
                  <p className="mt-3 text-neutral-500">No hay datos</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <PieChart data={gastosByCategory.map((d, i) => ({ ...d, color: undefined }))} size={160} />
                    <div>
                      {gastosByCategory.map((g) => (
                        <div key={g.label} className="flex items-center gap-2 text-sm text-neutral-300">
                          <div className="w-3 h-3 bg-neutral-500 rounded-sm" />
                          <span className="capitalize">{g.label}</span>
                          <span className="font-medium ml-2">{formatCOP(g.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
