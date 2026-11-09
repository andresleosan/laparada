// src/pages/ReportesPage.tsx
import React from 'react';
import { useReportes } from '@/hooks/useReportes';
import { formatCOP } from '@/utils/formatCOP';
import { formatFechaLarga, formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { BarChart } from '@/components/reportes/BarChart';
import { PieChart } from '@/components/reportes/PieChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertCircle, CalendarCheck, Download, ShoppingBag, Wallet, Receipt, FileSpreadsheet } from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { ResumenDiarioEmailCard } from '@/components/dashboard/ResumenDiarioEmailCard';
import { descargarVentasCsv } from '@/utils/exportVentasCsv';
import { Badge } from '@/components/ui/Badge';
import { ActaCierreModal } from '@/components/cierre/ActaCierreModal';
import { SelectorPeriodoReportes } from '@/components/reportes/SelectorPeriodoReportes';
import { EstadoResultadosCard } from '@/components/reportes/EstadoResultadosCard';
import { TopInsumosCostoCard } from '@/components/reportes/TopInsumosCostoCard';
import { ResumenTributarioReporteCard } from '@/components/contabilidad/ResumenTributarioReporteCard';
import {
  calcularLiquidacionFormulario310,
  descargarArchivoCsv,
  exportarFormulario310CSV,
  exportarLibroFiscalCSV,
  generarLibroFiscalDiario,
} from '@/utils/contabilidadUtils';
import type { RangoFechaContable } from '@/types/contabilidad';
import type { CierreCaja } from '@/types/cierreCaja';

export function ReportesPage() {
  const { negocioActual } = useNegocio();
  const {
    resumen,
    ventas,
    gastos,
    cierres,
    estadoResultados,
    tipoPeriodo,
    rangoPeriodo,
    loading,
    error,
    cambiarPeriodo,
    exportarPLCSV,
    refresh,
  } = useReportes();

  const [cierreSeleccionado, setCierreSeleccionado] = React.useState<CierreCaja | null>(null);

  const ventasPorProducto = React.useMemo(() => {
    const counts: Record<string, number> = {};
    ventas
      .filter((v) => v.estado !== 'anulada')
      .forEach((v) => v.items?.forEach((it) => (counts[it.nombre] = (counts[it.nombre] || 0) + it.cantidad)));
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

  const { libroFiscal, formulario310 } = React.useMemo(() => {
    const rangoContable: RangoFechaContable = {
      tipo: 'personalizado',
      inicio: rangoPeriodo.inicio,
      fin: rangoPeriodo.fin,
      etiqueta: rangoPeriodo.etiqueta,
      ano: rangoPeriodo.inicio.getFullYear(),
    };
    const libro = generarLibroFiscalDiario(ventas, gastos, rangoContable);
    const bimNum = Math.floor(rangoPeriodo.inicio.getMonth() / 2) + 1;
    const f310 = calcularLiquidacionFormulario310(ventas, rangoContable.ano, bimNum);
    return { libroFiscal: libro, formulario310: f310 };
  }, [ventas, gastos, rangoPeriodo]);

  const handleExportarLibroFiscalCsv = React.useCallback(() => {
    const nit = '222222222222';
    const csv = exportarLibroFiscalCSV(libroFiscal, negocioActual.nombre, nit);
    descargarArchivoCsv(csv, `libro_fiscal_${negocioActual.id}_${new Date().toISOString().slice(0, 10)}.csv`);
  }, [libroFiscal, negocioActual]);

  const handleExportar310Csv = React.useCallback(() => {
    const nit = '222222222222';
    const csv = exportarFormulario310CSV(formulario310, negocioActual.nombre, nit);
    descargarArchivoCsv(
      csv,
      `formulario_310_${formulario310.bimestre}_${formulario310.anoGravable}.csv`
    );
  }, [formulario310, negocioActual]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="border-b border-neutral-800 pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Centro de Analítica Financiera & P&L
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Cargando balance operacional y estado de resultados...
            </p>
          </div>

          <div className="h-16 w-full rounded-xl bg-neutral-900 animate-pulse" />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>

          <Skeleton className="h-80 w-full rounded-xl" />

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
        {/* Encabezado Principal y Acciones de Exportación */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Centro de Analítica Financiera & P&L
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Estado de Resultados, Food Cost (CMV), Mermas, OPEX y Margen de Utilidad
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={exportarPLCSV}
              aria-label="Exportar Estado de Resultados completo a formato Excel CSV"
              className="min-h-11 gap-2 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white"
            >
              <FileSpreadsheet className="h-4 w-4 text-gold-400" aria-hidden="true" />
              <span>Exportar P&L (.csv)</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => descargarVentasCsv(ventas, negocioActual.nombre || 'La Parada')}
              disabled={ventas.length === 0}
              aria-label="Descargar ventas del período en formato Excel CSV"
              className="min-h-11 gap-2 text-xs font-semibold text-neutral-200 hover:border-emerald-400 hover:text-white"
            >
              <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <span>Exportar Ventas (.csv)</span>
            </Button>
          </div>
        </div>

        {/* Selector Táctil de Período Temporal */}
        <SelectorPeriodoReportes
          periodoActual={tipoPeriodo}
          etiquetaPeriodo={rangoPeriodo.etiqueta}
          onCambiarPeriodo={cambiarPeriodo}
          disabled={loading}
        />

        {/* Tarjeta Principal: Estado de Resultados (P&L Gastronómico) */}
        <EstadoResultadosCard
          pl={estadoResultados}
          onExportarCSV={exportarPLCSV}
        />

        {/* Grilla Analítica: Gráficos y Costos de Insumos */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Top Insumos con Mayor Impacto en Costo (Food Cost) */}
          <div className="lg:col-span-1">
            <TopInsumosCostoCard
              insumos={estadoResultados.insumosClaveCMV}
              totalCMV={estadoResultados.cmvInsumos}
            />
          </div>

          {/* Gráfico de Productos Más Vendidos */}
          <div className="lg:col-span-1">
            <Card className="p-4 sm:p-5 h-full bg-neutral-900 border-neutral-800">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-semibold text-neutral-200">Productos Más Vendidos</h3>
                <ShoppingBag size={14} className="text-gold-400 opacity-60" />
              </div>
              {ventasPorProducto.length === 0 ? (
                <div className="mt-8 flex h-40 items-center justify-center">
                  <p className="text-xs text-neutral-500">Sin datos de ventas en este período</p>
                </div>
              ) : (
                <div className="mt-4">
                  <BarChart data={ventasPorProducto} />
                </div>
              )}
            </Card>
          </div>

          {/* Gráfico de Gastos por Categoría */}
          <div className="lg:col-span-1">
            <Card className="p-4 sm:p-5 h-full bg-neutral-900 border-neutral-800">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <h3 className="text-sm font-semibold text-neutral-200">Gastos por Categoría (OPEX)</h3>
                <Wallet size={14} className="text-red-400 opacity-60" />
              </div>
              {gastosByCategory.length === 0 ? (
                <div className="mt-8 flex h-40 items-center justify-center">
                  <p className="text-xs text-neutral-500">Sin gastos registrados en este período</p>
                </div>
              ) : (
                <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
                  <PieChart data={gastosByCategory.map((d) => ({ ...d, color: undefined }))} size={130} />
                  <div className="flex-1 space-y-1.5 w-full">
                    {gastosByCategory.map((g, idx) => (
                      <div key={g.label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: ['#C9A84C', '#E5A823', '#8BC34A', '#FF7043', '#90CAF9', '#4DD0E1', '#FFB74D'][idx % 7],
                            }}
                          />
                          <span className="text-neutral-300 capitalize">{g.label}</span>
                        </div>
                        <span className="font-semibold text-neutral-200 font-mono">{formatCOP(g.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Resumen Footer de Eficiencia */}
        <Card className="p-4 bg-neutral-900/80 border-neutral-800">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xs text-neutral-400">Ticket Promedio</p>
              <p className="mt-1 text-base sm:text-lg font-bold text-gold-400 font-display">
                {formatCOP(estadoResultados.ticketPromedio)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Gasto Promedio por Registro</p>
              <p className="mt-1 text-base sm:text-lg font-bold text-red-400 font-display">
                {gastos.length > 0
                  ? formatCOP(estadoResultados.totalGastosOperativos / gastos.length)
                  : formatCOP(0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Total Transacciones Operadas</p>
              <p className="mt-1 text-base sm:text-lg font-bold text-white font-display">
                {estadoResultados.cantidadVentasValidas + gastos.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Margen Neto Operativo</p>
              <p className={`mt-1 text-base sm:text-lg font-bold font-display ${estadoResultados.utilidadNeta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {estadoResultados.margenNeto}%
              </p>
            </div>
          </div>
        </Card>

        {/* Tarjeta de Resumen Ejecutivo Diario por Correo */}
        <ResumenDiarioEmailCard negocio={negocioActual} />

        {/* Consolidado Tributario & Libro Fiscal DIAN */}
        <ResumenTributarioReporteCard
          libroFiscal={libroFiscal}
          formulario310={formulario310}
          onExportarLibroCsv={handleExportarLibroFiscalCsv}
          onExportar310Csv={handleExportar310Csv}
        />

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
                        {cierre.cajeroNombre && (
                          <span>Cajero: <strong className="text-neutral-300">{cierre.cajeroNombre}</strong></span>
                        )}
                        {cierre.arqueo && (
                          <span className="flex items-center gap-1.5">
                            Arqueo:
                            <Badge
                              className="py-0.5 px-2 text-[10px]"
                              variant={
                                cierre.arqueo.estadoCuadre === 'cuadrado'
                                  ? 'entregado'
                                  : cierre.arqueo.estadoCuadre === 'sobrante'
                                  ? 'en_camino'
                                  : 'no-disponible'
                              }
                            >
                              {cierre.arqueo.estadoCuadre === 'cuadrado' && 'Cuadrado ($0)'}
                              {cierre.arqueo.estadoCuadre === 'sobrante' && `+${formatCOP(cierre.arqueo.diferencia)} Sobrante`}
                              {cierre.arqueo.estadoCuadre === 'faltante' && `-${formatCOP(Math.abs(cierre.arqueo.diferencia))} Faltante`}
                            </Badge>
                          </span>
                        )}
                      </div>
                      {cierre.notas && (
                        <p className="text-xs text-neutral-300 italic pt-0.5">
                          "{cierre.notas}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:self-center">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
                          Utilidad Neta
                        </span>
                        <span className={`text-base font-bold font-display ${esPositivo ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCOP(cierre.utilidadNeta)}
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setCierreSeleccionado(cierre)}
                        className="text-xs min-h-[38px] flex items-center gap-1.5"
                      >
                        <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ver Acta</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Modal para visualizar e imprimir el acta de cierre térmica */}
        <ActaCierreModal
          isOpen={!!cierreSeleccionado}
          onClose={() => setCierreSeleccionado(null)}
          cierre={cierreSeleccionado}
          negocio={negocioActual}
        />
      </div>
    </div>
  );
}
