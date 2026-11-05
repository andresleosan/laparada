// src/components/reportes/EstadoResultadosCard.tsx
import type { EstadoResultadosPL } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCOP } from '@/utils/formatCOP';
import {
  DollarSign,
  Download,
  Flame,
  PieChart,
  Scale,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface EstadoResultadosCardProps {
  pl: EstadoResultadosPL;
  onExportarCSV: () => void;
}

export function EstadoResultadosCard({ pl, onExportarCSV }: EstadoResultadosCardProps) {
  const esPositivo = pl.utilidadNeta >= 0;

  const getBadgeSalud = () => {
    switch (pl.saludFinanciera) {
      case 'excelente':
        return {
          label: 'Excelente Rentabilidad',
          variant: 'entregado' as const,
          icon: CheckCircle2,
        };
      case 'saludable':
        return {
          label: 'Margen Saludable',
          variant: 'en_camino' as const,
          icon: TrendingUp,
        };
      case 'atencion':
        return {
          label: 'Margen Ajustado',
          variant: 'pendiente' as const,
          icon: Scale,
        };
      case 'critica':
        return {
          label: 'Déficit Operativo',
          variant: 'no-disponible' as const,
          icon: AlertTriangle,
        };
    }
  };

  const badgeInfo = getBadgeSalud();
  const IconSalud = badgeInfo.icon;

  return (
    <Card className="p-4 sm:p-6 bg-neutral-900/90 border-neutral-800 shadow-xl space-y-6">
      {/* Encabezado y Acción de Descarga */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2">
              <Scale className="h-5 w-5 text-gold-400" aria-hidden="true" />
              <span>Estado de Resultados (P&L Gastronómico)</span>
            </h2>
            <Badge variant={badgeInfo.variant} className="px-2.5 py-1 text-xs gap-1.5 font-bold">
              <IconSalud className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{badgeInfo.label}</span>
            </Badge>
          </div>
          <p className="text-xs text-neutral-400">
            Período: <strong className="text-neutral-200">{pl.periodo.etiqueta}</strong> · Aislamiento multi-tenant oficial
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onExportarCSV}
          className="min-h-[44px] gap-2 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white self-start lg:self-center"
          aria-label="Descargar Estado de Resultados completo en archivo Excel CSV"
        >
          <Download className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span>Exportar P&L Contable (.csv)</span>
        </Button>
      </div>

      {/* Diagnóstico Operativo */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 flex items-start gap-3 text-xs">
        <PieChart className="h-4 w-4 text-gold-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="space-y-0.5">
          <span className="font-semibold text-neutral-200 block">Diagnóstico de Rendimiento:</span>
          <p className="text-neutral-400 leading-relaxed">{pl.recomendacionOperativa}</p>
        </div>
      </div>

      {/* 4 KPIs de Alto Nivel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* KPI 1: Ventas Netas */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Ventas Netas</span>
            <DollarSign className="h-4 w-4 text-gold-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-display">
            {formatCOP(pl.ventasNetas)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
            <span>{pl.cantidadVentasValidas} ventas</span>
            {pl.descuentosConcedidos > 0 && (
              <span className="text-amber-400">-{formatCOP(pl.descuentosConcedidos)} desc.</span>
            )}
          </div>
        </div>

        {/* KPI 2: CMV Food Cost */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Costo Insumos (CMV)</span>
            <UtensilsCrossed className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-400 font-display">
            {formatCOP(pl.cmvInsumos)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
            <span>Ratio Food Cost</span>
            <span className={`font-bold ${pl.porcentajeCMV > 40 ? 'text-amber-400' : 'text-neutral-200'}`}>
              {pl.porcentajeCMV}%
            </span>
          </div>
        </div>

        {/* KPI 3: Utilidad Bruta */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Utilidad Bruta</span>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-display">
            {formatCOP(pl.utilidadBruta)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
            <span>Margen Bruto</span>
            <span className="font-bold text-neutral-200">{pl.margenBruto}%</span>
          </div>
        </div>

        {/* KPI 4: Utilidad Neta */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/90 p-4 space-y-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Utilidad Neta</span>
            {esPositivo ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </div>
          <div className={`text-xl sm:text-2xl font-black font-display ${esPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCOP(pl.utilidadNeta)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between pt-0.5">
            <span>Margen Neto</span>
            <span className={`font-bold ${esPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
              {pl.margenNeto}%
            </span>
          </div>
        </div>
      </div>

      {/* Cascada Contable Detallada (P&L) */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 overflow-hidden">
        <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs font-bold text-neutral-300">
          <span>CONCEPTO FINANCIERO</span>
          <span>VALOR COP (% VENTAS)</span>
        </div>

        <div className="divide-y divide-neutral-800/80 text-xs">
          {/* 1. Ingresos */}
          <div className="p-3 sm:px-4 flex items-center justify-between hover:bg-neutral-900/40">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-mono">(+)</span>
              <span className="text-neutral-300">Ventas Brutas Totales</span>
            </div>
            <span className="font-medium text-white">{formatCOP(pl.ventasBrutas)}</span>
          </div>

          {pl.descuentosConcedidos > 0 && (
            <div className="p-3 sm:px-4 flex items-center justify-between hover:bg-neutral-900/40">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-mono">(-)</span>
                <span className="text-amber-300/90">Descuentos y Cortesías Concedidas</span>
              </div>
              <span className="font-medium text-amber-400">-{formatCOP(pl.descuentosConcedidos)}</span>
            </div>
          )}

          {/* Subtotal Ventas Netas */}
          <div className="p-3.5 sm:px-4 bg-neutral-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-2 border-gold-400">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-gold-400 font-mono">(=)</span>
                <span className="font-bold text-white text-sm">Ventas Netas Operacionales</span>
              </div>
              {/* Canales */}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-neutral-400" /> POS: {formatCOP(pl.canales.pos)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3 text-neutral-400" /> Domicilios: {formatCOP(pl.canales.domicilios)}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <UtensilsCrossed className="h-3 w-3 text-neutral-400" /> Mesas: {formatCOP(pl.canales.mesas)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white font-display">{formatCOP(pl.ventasNetas)}</span>
              <span className="text-[10px] text-neutral-400 block">100% de la base</span>
            </div>
          </div>

          {/* 2. Costo Insumos CMV */}
          <div className="p-3 sm:px-4 flex items-center justify-between hover:bg-neutral-900/40">
            <div className="flex items-center gap-2">
              <span className="text-sky-400 font-mono">(-)</span>
              <div>
                <span className="text-neutral-300">Costo de Insumos y Recetas (CMV / Food Cost)</span>
                <span className="text-[10px] text-neutral-500 block">
                  Materias primas consumidas según escandallo de platos vendidos
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium text-sky-400">-{formatCOP(pl.cmvInsumos)}</span>
              <span className="text-[10px] text-neutral-400 block">{pl.porcentajeCMV}%</span>
            </div>
          </div>

          {/* Subtotal Utilidad Bruta */}
          <div className="p-3.5 sm:px-4 bg-neutral-900/60 flex items-center justify-between border-l-2 border-emerald-400">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-mono">(=)</span>
                <span className="font-bold text-white text-sm">Utilidad Bruta</span>
              </div>
              <span className="text-[10px] text-neutral-400 block">Ventas Netas menos Food Cost</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-emerald-400 font-display">
                {formatCOP(pl.utilidadBruta)}
              </span>
              <span className="text-[10px] text-neutral-400 block">{pl.margenBruto}% margen bruto</span>
            </div>
          </div>

          {/* 3. Mermas y Desperdicios */}
          <div className="p-3 sm:px-4 flex items-center justify-between hover:bg-neutral-900/40">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-mono">(-)</span>
              <div>
                <span className="text-neutral-300">Mermas y Desperdicios de Bodega / Cocina</span>
                <span className="text-[10px] text-neutral-500 block">
                  {pl.cantidadMermas} registro{pl.cantidadMermas !== 1 ? 's' : ''} de pérdida en inventario
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium text-red-400">-{formatCOP(pl.totalMermasCOP)}</span>
              <span className="text-[10px] text-neutral-400 block">{pl.porcentajeMermas}%</span>
            </div>
          </div>

          {/* 4. Gastos Operativos (OPEX) */}
          <div className="p-3 sm:px-4 flex items-center justify-between hover:bg-neutral-900/40">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-mono">(-)</span>
              <div>
                <span className="text-neutral-300">Gastos Operativos (OPEX)</span>
                <span className="text-[10px] text-neutral-500 block">
                  {pl.cantidadGastos} registro{pl.cantidadGastos !== 1 ? 's' : ''} ({Object.keys(pl.gastosPorCategoria).length} categorías)
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-medium text-red-400">-{formatCOP(pl.totalGastosOperativos)}</span>
              <span className="text-[10px] text-neutral-400 block">{pl.porcentajeGastos}%</span>
            </div>
          </div>

          {/* Total Utilidad Neta */}
          <div className={`p-4 ${esPositivo ? 'bg-emerald-950/20 border-l-4 border-emerald-500' : 'bg-red-950/20 border-l-4 border-red-500'} flex items-center justify-between`}>
            <div>
              <div className="flex items-center gap-2">
                <span className={`${esPositivo ? 'text-emerald-400' : 'text-red-400'} font-mono font-bold text-base`}>
                  (=)
                </span>
                <span className="font-black text-white text-base font-display">
                  UTILIDAD NETA DEL PERÍODO
                </span>
              </div>
              <span className="text-[11px] text-neutral-400 block">
                Resultado final libre de costos de materias primas, mermas y operación
              </span>
            </div>
            <div className="text-right">
              <span className={`text-xl font-black font-display ${esPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCOP(pl.utilidadNeta)}
              </span>
              <span className={`text-xs font-bold block ${esPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
                {pl.margenNeto}% margen neto
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auditoría de Fondos de Staff y Ventas Anuladas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-amber-400" />
            <div>
              <span className="font-semibold text-white block">Propinas Recaudadas</span>
              <span className="text-[11px] text-neutral-400">Fondo voluntario exclusivo de meseros</span>
            </div>
          </div>
          <span className="font-bold text-amber-400 font-display text-sm">
            {formatCOP(pl.propinasRecaudadas)}
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <Flame className="h-4 w-4 text-red-400" />
            <div>
              <span className="font-semibold text-white block">Ventas Anuladas</span>
              <span className="text-[11px] text-neutral-400">
                {pl.cantidadVentasAnuladas} operación{pl.cantidadVentasAnuladas !== 1 ? 'es' : ''} cancelada{pl.cantidadVentasAnuladas !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <span className="font-bold text-neutral-400 font-display text-sm">
            {formatCOP(pl.ventasAnuladasMonto)}
          </span>
        </div>
      </div>
    </Card>
  );
}

