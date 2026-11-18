import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileSpreadsheet,
  Flame,
  Package,
  RotateCcw,
  ShieldAlert,
  TrendingDown,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { Insumo, MovimientoKardex } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularAnaliticaMermasOperativas,
  descargarMermasOperativasCsv,
} from '@/utils/mermasOperativasUtils';

export interface AlertaUmbralMermasCardProps {
  movimientosKardex: MovimientoKardex[];
  insumos: Insumo[];
  ventasNetas: number;
  cmvInsumos: number;
  nombreNegocio: string;
  etiquetaPeriodo: string;
}

export function AlertaUmbralMermasCard({
  movimientosKardex,
  insumos,
  ventasNetas,
  cmvInsumos,
  nombreNegocio,
  etiquetaPeriodo,
}: AlertaUmbralMermasCardProps) {
  const analitica = useMemo(
    () =>
      calcularAnaliticaMermasOperativas({
        movimientosKardex,
        insumos,
        ventasNetas,
        cmvInsumos,
      }),
    [movimientosKardex, insumos, ventasNetas, cmvInsumos]
  );

  const semaforo = useMemo(() => {
    switch (analitica.estadoUmbral) {
      case 'critico':
        return {
          border: 'border-red-500/40',
          badge: 'border-red-500/50 bg-red-500/15 text-red-300',
          bar: 'bg-red-500',
          label: 'Umbral Crítico Superado',
          Icon: ShieldAlert,
        };
      case 'alerta':
        return {
          border: 'border-amber-500/40',
          badge: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
          bar: 'bg-amber-500',
          label: 'En Zona de Alerta',
          Icon: AlertTriangle,
        };
      case 'preventivo':
        return {
          border: 'border-sky-500/35',
          badge: 'border-sky-500/45 bg-sky-500/15 text-sky-300',
          bar: 'bg-sky-400',
          label: 'Monitoreo Preventivo',
          Icon: TrendingDown,
        };
      case 'optimo':
      default:
        return {
          border: 'border-emerald-500/35',
          badge: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-300',
          bar: 'bg-emerald-500',
          label: 'Bajo Control (Óptimo)',
          Icon: CheckCircle2,
        };
    }
  }, [analitica.estadoUmbral]);

  const porcentajeBarra = useMemo(() => {
    if (analitica.presupuestoMaximoMermaCOP <= 0) return 0;
    return Math.min(
      100,
      Math.round((analitica.totalMermasCOP / analitica.presupuestoMaximoMermaCOP) * 100)
    );
  }, [analitica.totalMermasCOP, analitica.presupuestoMaximoMermaCOP]);

  const IconEstado = semaforo.Icon;

  return (
    <Card className={`p-4 sm:p-6 bg-neutral-900/90 ${semaforo.border} space-y-5`}>
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <IconEstado className="h-5 w-5 text-red-400" aria-hidden="true" />
              <span>Control de Umbral de Mermas, Desperdicios de Cocina y Devoluciones en P&amp;L</span>
            </h2>
            <Badge variant="outline" className={`border font-bold ${semaforo.badge}`}>
              {semaforo.label}
            </Badge>
          </div>
          <p className="text-xs text-neutral-400">
            Período: <strong className="text-neutral-200">{etiquetaPeriodo}</strong> · Meta máxima
            gastronómica: <strong className="text-gold-400">{analitica.umbralMaximoPct}%</strong> sobre
            ventas netas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              descargarMermasOperativasCsv(movimientosKardex, insumos, nombreNegocio)
            }
            disabled={analitica.cantidadRegistrosMerma === 0}
            className="min-h-[44px] gap-2 text-xs font-bold text-neutral-200 hover:border-emerald-400 hover:text-white"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            <span>Exportar Mermas (.csv)</span>
          </Button>

          <a
            href="/inventario?tab=mermas"
            className="min-h-[44px] px-3.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Gestionar en Bodega</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
          </a>

          <a
            href="/auditoria"
            className="min-h-[44px] px-3.5 rounded-xl border border-gold-400/35 bg-gold-400/10 hover:bg-gold-400/20 text-xs font-bold text-gold-400 inline-flex items-center gap-1.5 transition-colors"
          >
            <span>Ver Bitácora Forense</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Alerta y Barra de Umbral */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-neutral-200 font-medium">{analitica.mensajeAlertaUmbral}</span>
          <span className="font-mono font-bold text-white shrink-0">
            {analitica.porcentajeSobreVentasNetas}% / {analitica.umbralMaximoPct}% meta
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full transition-all ${semaforo.bar}`}
            style={{ width: `${porcentajeBarra}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400">
          <span>
            Pérdida acumulada:{' '}
            <strong className="text-red-400">{formatCOP(analitica.totalMermasCOP)}</strong> (
            {analitica.porcentajeSobreCMV}% del CMV)
          </span>
          <span>
            Presupuesto límite ({analitica.umbralMaximoPct}%):{' '}
            <strong className="text-neutral-200">
              {formatCOP(analitica.presupuestoMaximoMermaCOP)}
            </strong>
            {analitica.excesoSobreUmbralCOP > 0 && (
              <span className="ml-2 font-bold text-red-400">
                (Exceso: +{formatCOP(analitica.excesoSobreUmbralCOP)})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Desglose por Origen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Desperdicio en Cocina</span>
            <strong className="font-display text-lg text-orange-400">
              {formatCOP(analitica.mermasCocinaCOP)}
            </strong>
          </div>
          <Flame className="h-5 w-5 text-orange-400 opacity-80" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Devoluciones de Cliente</span>
            <strong className="font-display text-lg text-rose-400">
              {formatCOP(analitica.mermasDevolucionesCOP)}
            </strong>
          </div>
          <RotateCcw className="h-5 w-5 text-rose-400 opacity-80" aria-hidden="true" />
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 block">Merma en Bodega</span>
            <strong className="font-display text-lg text-amber-400">
              {formatCOP(analitica.mermasBodegaCOP)}
            </strong>
          </div>
          <Package className="h-5 w-5 text-amber-400 opacity-80" aria-hidden="true" />
        </div>
      </div>

      {/* Top Insumos y Causas Raíz */}
      {analitica.cantidadRegistrosMerma > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Top Insumos con Pérdida en el Período
            </h3>
            <div className="space-y-1.5">
              {analitica.topInsumosMerma.slice(0, 4).map((item) => (
                <div
                  key={item.insumoId}
                  className="flex items-center justify-between text-xs py-1 border-b border-neutral-800/70 last:border-0"
                >
                  <span className="text-neutral-200 truncate pr-2">
                    {item.insumoNombre}{' '}
                    <span className="text-neutral-500">
                      (-{item.cantidadTotal} {item.unidad})
                    </span>
                  </span>
                  <span className="font-mono font-bold text-red-400 shrink-0">
                    -{formatCOP(item.costoTotalCOP)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Motivos Principales de Merma
            </h3>
            <div className="space-y-1.5">
              {analitica.desglosePorMotivo.slice(0, 4).map((mot) => (
                <div
                  key={mot.motivo}
                  className="flex items-center justify-between text-xs py-1 border-b border-neutral-800/70 last:border-0"
                >
                  <span className="text-neutral-200 truncate pr-2">
                    {mot.label}{' '}
                    <span className="text-neutral-500">({mot.cantidadRegistros} reg.)</span>
                  </span>
                  <span className="font-mono font-bold text-red-300 shrink-0">
                    -{formatCOP(mot.costoTotalCOP)} ({mot.porcentajeCosto}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
