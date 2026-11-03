// src/pages/ReportesPage.tsx
import React from 'react';
import { useReportes } from '@/hooks/useReportes';
import { formatCOP } from '@/utils/formatCOP';
import { formatFechaLarga, formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { StatsCard } from '@/components/reportes/StatsCard';
import { BarChart } from '@/components/reportes/BarChart';
import { PieChart } from '@/components/reportes/PieChart';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle, TrendingUp, Wallet, ShoppingBag, CalendarCheck } from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { ResumenDiarioEmailCard } from '@/components/dashboard/ResumenDiarioEmailCard';

export function ReportesPage() {
  const { negocioActual } = useNegocio();
  const { resumen, ventas, gastos, cierres, loading, error, refresh } = useReportes();

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
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="border-b border-neutral-800 pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Reportes y Balance</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">Resumen de los últimos 30 días</p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 sm:gap-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
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
            title="No pudimos cargar el balance"
            description="Los datos financieros no se reemplazaron por ceros. Reintenta para consultar el período."
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="border-b border-neutral-800 pb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Reportes y Balance</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">Ventas, gastos y resultado de los últimos 30 días</p>
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
            title="Resultado Neto"
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
              <p className="text-xs text-neutral-500">Gasto por registro</p>
              <p className="mt-1 text-lg font-bold text-red-400">
                {gastos.length > 0 ? formatCOP(resumen.totalGastos / gastos.length) : formatCOP(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Total Transacciones</p>
              <p className="mt-1 text-lg font-bold text-white">{resumen.cantidadVentas + gastos.length}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Margen neto</p>
              <p className="mt-1 text-lg font-bold text-green-400">{margenGanancia}%</p>
            </div>
          </div>
        </Card>

        {/* Tarjeta de Resumen Ejecutivo Diario por Correo */}
        <ResumenDiarioEmailCard negocio={negocioActual} />

        {/* Historial de Cierres de Caja */}
        <Card className="mt-6 p-5 bg-neutral-900/90 border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-gold-400" />
              <div>
                <h2 className="text-base font-bold text-white font-display">Historial de Cierres de Caja</h2>
                <p className="text-xs text-neutral-400">Auditoría inmutable de cierres de jornada y turno</p>
              </div>
            </div>
            <span className="text-xs text-neutral-400">
              {cierres.length} cierre{cierres.length !== 1 ? 's' : ''} registrado{cierres.length !== 1 ? 's' : ''}
            </span>
          </div>

          {cierres.length === 0 ? (
            <div className="py-6">
              <EmptyState
                icon={CalendarCheck}
                title="Aún no hay cierres de caja archivados"
                description="Los balances consolidados al final del turno desde el Dashboard se registrarán aquí para auditoría contable."
              />
            </div>
          ) : (
            <div className="mt-4 divide-y divide-neutral-800/80">
              {cierres.map((cierre) => {
                const fechaDate = toValidAdminDate(cierre.fecha) || new Date();
                const esPositivo = (cierre.utilidadNeta || 0) >= 0;
                return (
                  <div
                    key={cierre.id}
                    className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-800/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {formatFechaLarga(fechaDate)}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {formatHora(fechaDate)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400">
                        <span>Ingresos: <strong className="text-neutral-200">{formatCOP(cierre.totalIngresos)}</strong></span>
                        <span>POS: <strong className="text-neutral-300">{formatCOP(cierre.ventasPos || 0)}</strong></span>
                        <span>WhatsApp / Web: <strong className="text-neutral-300">{formatCOP(cierre.ventasWhatsapp || 0)}</strong></span>
                        <span>Gastos: <strong className="text-red-400">-{formatCOP(cierre.totalGastos)}</strong></span>
                      </div>
                      {cierre.notas && (
                        <p className="text-xs text-neutral-300 italic pt-0.5">
                          "{cierre.notas}"
                        </p>
                      )}
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                        Utilidad Neta
                      </span>
                      <span className={`text-base font-bold font-display ${esPositivo ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCOP(cierre.utilidadNeta)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
