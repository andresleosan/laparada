import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Scale,
} from 'lucide-react';
import type { ConsolidadoLibroFiscal, LiquidacionFormulario310 } from '@/types/contabilidad';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatCOP } from '@/utils/formatCOP';

interface ResumenTributarioReporteCardProps {
  libroFiscal: ConsolidadoLibroFiscal;
  formulario310: LiquidacionFormulario310;
  onExportarLibroCsv?: () => void;
  onExportar310Csv?: () => void;
}

export function ResumenTributarioReporteCard({
  libroFiscal,
  formulario310,
  onExportarLibroCsv,
  onExportar310Csv,
}: ResumenTributarioReporteCardProps) {
  return (
    <Card className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/20">
            <Scale className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-white font-display">
              Consolidado Tributario & Libro Fiscal DIAN
            </h3>
            <p className="text-xs text-neutral-400">
              Cumplimiento del Art. 616 del E.T. y liquidación para la Declaración de Impoconsumo (Formulario 310).
            </p>
          </div>
        </div>

        <Link
          to="/contabilidad"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-400 hover:text-gold-300 min-h-[44px] self-start sm:self-auto"
        >
          <span>Ir a Módulo de Contabilidad</span>
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
            Base Gravable INC (8%)
          </span>
          <span className="text-base sm:text-lg font-bold text-white font-mono block mt-0.5">
            {formatCOP(formulario310.ingresosNetosGravados8)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block">
            R31 Formulario 310
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3">
          <span className="text-[11px] text-amber-400 uppercase tracking-wider block">
            Impoconsumo Liquidado
          </span>
          <span className="text-base sm:text-lg font-bold text-amber-400 font-mono block mt-0.5">
            {formatCOP(formulario310.impuestoGenerado8)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block">
            R40 Impuesto a transferir
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
            Docs POS en Libro Fiscal
          </span>
          <span className="text-base sm:text-lg font-bold text-white font-mono block mt-0.5">
            {libroFiscal.totalDocumentosEmitidos} emitidos
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block">
            {libroFiscal.totalDiasConOperacion} días con registro
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3">
          <span className="text-[11px] text-emerald-400 uppercase tracking-wider block">
            Saldo Neto Operacional
          </span>
          <span className="text-base sm:text-lg font-bold text-emerald-400 font-mono block mt-0.5">
            {formatCOP(libroFiscal.acumuladoSaldoNeto)}
          </span>
          <span className="text-[10px] text-neutral-500 mt-1 block">
            Ventas netas menos compras
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Información contable acotada al tenant y lista para software contable.</span>
        </span>

        <div className="flex items-center gap-2">
          {onExportarLibroCsv && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onExportarLibroCsv}
              className="text-xs min-h-[38px] flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Libro Fiscal CSV</span>
            </Button>
          )}

          {onExportar310Csv && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onExportar310Csv}
              className="text-xs min-h-[38px] flex items-center gap-1.5 text-amber-300"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Formulario 310 CSV</span>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
