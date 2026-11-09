import { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ConsolidadoLibroFiscal } from '@/types/contabilidad';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';

interface LibroFiscalDiarioTableProps {
  consolidado: ConsolidadoLibroFiscal;
  onExportarCsv: () => void;
  nombreNegocio: string;
  nit: string;
}

export function LibroFiscalDiarioTable({
  consolidado,
  onExportarCsv,
  nombreNegocio,
  nit,
}: LibroFiscalDiarioTableProps) {
  const [busqueda, setBusqueda] = useState('');

  const entradasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return consolidado.entradas;
    const q = busqueda.toLowerCase().trim();
    return consolidado.entradas.filter(
      (e) =>
        e.fecha.includes(q) ||
        e.consecutivoInicial.toLowerCase().includes(q) ||
        e.consecutivoFinal.toLowerCase().includes(q)
    );
  }, [consolidado.entradas, busqueda]);

  return (
    <div className="space-y-4">
      {/* Encabezado oficial y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/20">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Libro Fiscal de Operaciones Diarias
            </h2>
            <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-300">
              Art. 616 E.T.
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Registro diario inmutable de ingresos brutos, discriminación de Impoconsumo (INC 8%), egresos de compras y saldo neto operacional.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            onClick={onExportarCsv}
            variant="primary"
            className="flex items-center gap-2 text-xs min-h-[44px] px-4 font-semibold"
            aria-label="Descargar Libro Fiscal de Operaciones Diarias en formato Excel CSV"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Descargar CSV Oficial</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas KPI de resumen acumulado */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">
            Ventas Netas
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-display block mt-0.5">
            {formatCOP(consolidado.acumuladoVentasNetas)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            {consolidado.totalDocumentosEmitidos} docs POS emitidos
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <span className="text-[11px] text-amber-400 uppercase tracking-wider font-semibold block">
            Base INC (8%)
          </span>
          <span className="text-lg sm:text-xl font-bold text-amber-400 font-display block mt-0.5">
            {formatCOP(consolidado.acumuladoBaseInc8)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Impuesto: {formatCOP(consolidado.acumuladoImpuestoInc8)}
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <span className="text-[11px] text-red-400 uppercase tracking-wider font-semibold block">
            Egresos / Compras
          </span>
          <span className="text-lg sm:text-xl font-bold text-red-400 font-display block mt-0.5">
            -{formatCOP(consolidado.acumuladoEgresosGastos)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 block">
            Insumos y servicios del día
          </span>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3">
          <span className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold block">
            Saldo Neto Operacional
          </span>
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-display block mt-0.5">
            {formatCOP(consolidado.acumuladoSaldoNeto)}
          </span>
          <span className="text-[11px] text-neutral-400 mt-1 block flex items-center gap-1">
            {consolidado.acumuladoSaldoNeto >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400" />
            )}
            Resultado neto del período
          </span>
        </div>
      </div>

      {/* Buscador de fecha o consecutivo */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <Input
            type="text"
            placeholder="Buscar por fecha (YYYY-MM-DD) o prefijo POS..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-9 h-10 text-xs bg-neutral-900 border-neutral-800"
          />
        </div>
        <span className="text-xs text-neutral-400 hidden sm:inline">
          Mostrando {entradasFiltradas.length} de {consolidado.entradas.length} días
        </span>
      </div>

      {/* Tabla con scroll horizontal optimizado */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-semibold">
              <th className="py-3 px-3">Fecha</th>
              <th className="py-3 px-3">Comprobantes POS</th>
              <th className="py-3 px-3 text-right">Ventas Brutas</th>
              <th className="py-3 px-3 text-right">Descuentos</th>
              <th className="py-3 px-3 text-right">Ventas Netas</th>
              <th className="py-3 px-3 text-right text-amber-300">Base INC (8%)</th>
              <th className="py-3 px-3 text-right text-amber-300">Impuesto (8%)</th>
              <th className="py-3 px-3 text-right">Excluidos</th>
              <th className="py-3 px-3 text-right text-red-400">Egresos</th>
              <th className="py-3 px-3 text-right text-emerald-400">Saldo Neto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-mono">
            {entradasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-neutral-500">
                  No se encontraron operaciones registradas en el período seleccionado.
                </td>
              </tr>
            ) : (
              entradasFiltradas.map((e) => (
                <tr key={e.fecha} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-white font-sans font-medium whitespace-nowrap">
                    {e.fecha}
                  </td>
                  <td className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">
                    {e.consecutivoInicial !== 'N/A' ? (
                      <span className="text-[11px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">
                        {e.consecutivoInicial} al {e.consecutivoFinal}
                      </span>
                    ) : (
                      <span className="text-neutral-500">Sin folios</span>
                    )}
                    {e.totalAnulados > 0 && (
                      <span className="ml-1 text-[10px] text-red-400 bg-red-950/60 px-1 py-0.5 rounded">
                        {e.totalAnulados} anl
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-300">
                    {formatCOP(e.totalVentasBrutas)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-400">
                    {e.totalDescuentos > 0 ? `-${formatCOP(e.totalDescuentos)}` : '$ 0'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">
                    {formatCOP(e.totalVentasNetas)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-300">
                    {formatCOP(e.ingresosGravadosInc8)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">
                    {formatCOP(e.impuestoInc8)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-400">
                    {formatCOP(e.ingresosExcluidos)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-red-400">
                    {e.totalEgresosGastos > 0 ? `-${formatCOP(e.totalEgresosGastos)}` : '$ 0'}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      e.saldoNetoOperacional >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatCOP(e.saldoNetoOperacional)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {entradasFiltradas.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-neutral-700 bg-neutral-950 font-bold text-white">
                <td className="py-3 px-3 uppercase tracking-wider text-[11px] font-sans">
                  Totales Acumulados
                </td>
                <td className="py-3 px-3 text-[11px] text-neutral-400">
                  {consolidado.totalDocumentosEmitidos} emitidos / {consolidado.totalDocumentosAnulados} anulados
                </td>
                <td className="py-3 px-3 text-right font-mono">
                  {formatCOP(consolidado.acumuladoVentasBrutas)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-neutral-400">
                  {consolidado.acumuladoDescuentos > 0 ? `-${formatCOP(consolidado.acumuladoDescuentos)}` : '$ 0'}
                </td>
                <td className="py-3 px-3 text-right font-mono text-gold-400 text-sm">
                  {formatCOP(consolidado.acumuladoVentasNetas)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-300">
                  {formatCOP(consolidado.acumuladoBaseInc8)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-amber-400">
                  {formatCOP(consolidado.acumuladoImpuestoInc8)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-neutral-400">
                  {formatCOP(consolidado.acumuladoExcluidos)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-red-400">
                  -{formatCOP(consolidado.acumuladoEgresosGastos)}
                </td>
                <td className="py-3 px-3 text-right font-mono text-emerald-400 text-sm">
                  {formatCOP(consolidado.acumuladoSaldoNeto)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-500 gap-2 px-1">
        <span>
          Establecimiento: <strong>{nombreNegocio}</strong> — NIT: <strong>{nit}</strong>
        </span>
        <span>
          Cumplimiento oficial Art. 616 del Estatuto Tributario para Documento Equivalente POS.
        </span>
      </div>
    </div>
  );
}
