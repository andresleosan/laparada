import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Download,
  Flame,
  Layers,
} from 'lucide-react';
import type { AnaliticaTandasConsolidada, SaludMermaVitrina, TandaVitrina } from '@/types/tanda';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCOP } from '@/utils/formatCOP';

interface AnaliticaTandasReporteCardProps {
  analitica: AnaliticaTandasConsolidada;
  tandas: TandaVitrina[];
  etiquetaPeriodo: string;
  onExportarCsv: () => void;
}

const SALUD_MERMA_ETIQUETAS: Record<
  SaludMermaVitrina,
  { label: string; badgeClass: string }
> = {
  optima: {
    label: 'Óptima',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  atencion: {
    label: 'Atención',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  critica: {
    label: 'Crítica',
    badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
};

export function AnaliticaTandasReporteCard({
  analitica,
  tandas,
  etiquetaPeriodo,
  onExportarCsv,
}: AnaliticaTandasReporteCardProps) {
  const tandasCerradasCount = tandas.filter((t) => t.estado === 'cerrada').length;
  const salud = SALUD_MERMA_ETIQUETAS[analitica.saludMerma];

  return (
    <Card className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Desempeño de Tandas de Vitrina & Rentabilidad
            </h3>
            <p className="text-xs text-neutral-400">
              Rotación de horneados/fritos, control de merma y top productos en {etiquetaPeriodo}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onExportarCsv}
            disabled={tandasCerradasCount === 0}
            aria-label="Exportar analítica de tandas de vitrina a formato CSV"
            className="min-h-[44px] gap-1.5 text-xs font-semibold text-neutral-200 hover:border-emerald-400 hover:text-white"
          >
            <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>Exportar Tandas (.csv)</span>
          </Button>

          <Link
            to="/tandas"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-gold-400 hover:text-gold-300"
          >
            <span>Ir a Vitrina</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {analitica.cantidadTandasCerradas === 0 ? (
        <div className="py-4">
          <EmptyState
            icon={Layers}
            title="Sin tandas de vitrina cerradas en este período"
            description="Abre y cierra tandas desde el módulo de Vitrina (/tandas) para medir rotación, mermas y rentabilidad por producto."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 4 KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                Tandas Cerradas
              </span>
              <span className="text-base sm:text-lg font-bold text-white font-display block mt-0.5">
                {analitica.cantidadTandasCerradas}
              </span>
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Promedio: {formatCOP(analitica.ticketPromedioPorTanda)}/tanda
              </span>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
              <span className="text-[11px] text-amber-400 uppercase tracking-wider block">
                Venta de Vitrina
              </span>
              <span className="text-base sm:text-lg font-bold text-amber-400 font-display block mt-0.5">
                {formatCOP(analitica.ingresosTotalesVitrina)}
              </span>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Efec: {formatCOP(analitica.totalEfectivoVitrina)} · Transf:{' '}
                {formatCOP(analitica.totalTransferenciasVitrina)}
              </span>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
              <span className="text-[11px] text-emerald-400 uppercase tracking-wider block">
                Rotación Vitrina
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-400 font-display block mt-0.5">
                {analitica.tasaRotacionGlobalPct}%
              </span>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                {analitica.totalUnidadesVendidas}/{analitica.totalUnidadesPuestas} unds vendidas
              </span>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                  Merma Vitrina
                </span>
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${salud.badgeClass}`}
                >
                  {salud.label}
                </span>
              </div>
              <span className="text-base sm:text-lg font-bold text-red-400 font-display block mt-0.5">
                {analitica.tasaMermaGlobalPct}%
              </span>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                {analitica.totalUnidadesMerma} unds ({formatCOP(analitica.valorComercialMerma)})
              </span>
            </div>
          </div>

          {/* Top Productos y Alerta de Mermas */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                    Top Productos de Vitrina por Rentabilidad
                  </h4>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Top {analitica.topProductosRentables.length}
                </span>
              </div>

              {analitica.topProductosRentables.length === 0 ? (
                <p className="text-xs text-neutral-500 py-3">
                  Sin ventas registradas en las tandas del período.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {analitica.topProductosRentables.map((prod) => (
                    <div key={prod.productoId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-white truncate">{prod.nombre}</span>
                          <span className="text-[11px] text-neutral-400 shrink-0">
                            {prod.totalVendidos} unds ({prod.tasaRotacionPct}% rot.)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-display font-bold text-amber-400">
                            {formatCOP(prod.ingresosBrutos)}
                          </span>
                          <span className="w-11 text-right font-mono text-[11px] text-neutral-400">
                            {prod.participacionIngresosPct}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400"
                          style={{
                            width: `${Math.min(100, Math.max(4, prod.participacionIngresosPct))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3">
              <div className="flex items-center gap-2">
                {analitica.productosMayorMerma.length > 0 ? (
                  <AlertTriangle className="h-4 w-4 text-red-400" aria-hidden="true" />
                ) : (
                  <Flame className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                )}
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Control de Mermas en Vitrina
                </h4>
              </div>

              {analitica.productosMayorMerma.length === 0 ? (
                <p className="text-xs text-emerald-400 py-3">
                  Operación impecable: 0 unidades mermadas en las tandas del período.
                </p>
              ) : (
                <div className="space-y-2">
                  {analitica.productosMayorMerma.slice(0, 4).map((prod) => (
                    <div
                      key={prod.productoId}
                      className="flex items-center justify-between rounded-lg border border-red-900/30 bg-red-950/15 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="block font-semibold text-white truncate">
                          {prod.nombre}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {prod.totalMermas} unds ({prod.tasaMermaPct}% merma)
                        </span>
                      </div>
                      <span className="font-mono font-bold text-red-300 shrink-0">
                        -{formatCOP(prod.costoMermaEstimado)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
