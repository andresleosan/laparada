import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { ResumenConciliacionContable } from '@/types/contabilidad';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';

interface ConciliacionCajaVentasCardProps {
  conciliacion: ResumenConciliacionContable;
  onExportarCsv: () => void;
  onCerrarConciliacionMensual: (periodoMes: string, notas?: string) => Promise<string | undefined>;
}

export function ConciliacionCajaVentasCard({
  conciliacion,
  onExportarCsv,
  onCerrarConciliacionMensual,
}: ConciliacionCajaVentasCardProps) {
  const [guardando, setGuardando] = useState(false);
  const [notasCierre, setNotasCierre] = useState('');
  const [mostrarModalCierre, setMostrarModalCierre] = useState(false);

  const periodoMesDefault = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [periodoMes, setPeriodoMes] = useState(periodoMesDefault);

  const handleCerrar = async () => {
    try {
      setGuardando(true);
      const docId = await onCerrarConciliacionMensual(periodoMes, notasCierre);
      createToast(`Conciliación ${periodoMes} cerrada y registrada exitosamente (#${docId})`, 'success');
      setMostrarModalCierre(false);
      setNotasCierre('');
    } catch (err) {
      console.error('Error al cerrar conciliación:', err);
      createToast('No fue posible guardar el acta de conciliación.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
              <Wallet className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Conciliación Contable de Ventas vs. Caja y Medios de Pago
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Cruce entre ventas facturadas por el sistema, efectivo arqueado en turnos de caja y transferencias bancarias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onExportarCsv}
            variant="secondary"
            className="flex items-center gap-2 text-xs min-h-[44px] px-3 font-semibold"
            aria-label="Descargar reporte de conciliación en CSV"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Descargar CSV Conciliación</span>
          </Button>

          <Button
            type="button"
            onClick={() => setMostrarModalCierre(true)}
            variant="primary"
            className="flex items-center gap-2 text-xs min-h-[44px] px-4 font-semibold"
            aria-label="Cerrar y certificar conciliación contable del mes"
          >
            <FileCheck className="h-4 w-4" aria-hidden="true" />
            <span>Certificar Cierre Mensual</span>
          </Button>
        </div>
      </div>

      {/* Semáforo de salud y resumen métrico */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Estado global de salud */}
        <div
          className={`rounded-xl border p-4 flex items-center gap-3 ${
            conciliacion.saludConciliacion === 'optima'
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400'
              : conciliacion.saludConciliacion === 'alerta'
              ? 'border-amber-500/30 bg-amber-950/20 text-amber-400'
              : 'border-red-500/30 bg-red-950/20 text-red-400'
          }`}
        >
          {conciliacion.saludConciliacion === 'optima' && (
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-400" />
          )}
          {conciliacion.saludConciliacion === 'alerta' && (
            <AlertTriangle className="h-8 w-8 shrink-0 text-amber-400" />
          )}
          {conciliacion.saludConciliacion === 'critica' && (
            <ShieldAlert className="h-8 w-8 shrink-0 text-red-400" />
          )}

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
              Estado de Conciliación
            </span>
            <span className="text-base font-bold font-display block">
              {conciliacion.saludConciliacion === 'optima' && 'Conciliación Óptima'}
              {conciliacion.saludConciliacion === 'alerta' && 'Diferencias Menores'}
              {conciliacion.saludConciliacion === 'critica' && 'Requiere Revisión Urgente'}
            </span>
            <span className="text-[11px] opacity-75 mt-0.5 block">
              {conciliacion.diasCuadrados} de {conciliacion.items.length} días cuadrados
            </span>
          </div>
        </div>

        {/* Efectivo vs Transferencias */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">
            Medios de Pago Recaudados
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-neutral-300 font-semibold">
              Efectivo ({conciliacion.porcentajeEfectivo}%):
            </span>
            <span className="font-mono text-xs font-bold text-white">
              {formatCOP(conciliacion.totalCobradoEfectivo)}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-neutral-300 font-semibold">
              Transferencia ({conciliacion.porcentajeTransferencia}%):
            </span>
            <span className="font-mono text-xs font-bold text-white">
              {formatCOP(conciliacion.totalCobradoTransferencia)}
            </span>
          </div>
        </div>

        {/* Arqueo físico total vs Esperado */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">
            Efectivo Físico Arqueado
          </span>
          <span className="text-lg font-bold text-white font-display block mt-0.5">
            {formatCOP(conciliacion.totalArqueadoFisico)}
          </span>
          <span className="text-[11px] text-neutral-400 block mt-1">
            Egresos deducidos: -{formatCOP(conciliacion.totalEgresosPeriodo)}
          </span>
        </div>

        {/* Diferencia Neta Total */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-3.5">
          <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold block">
            Diferencia Neta de Caja
          </span>
          <span
            className={`text-lg font-bold font-display block mt-0.5 ${
              conciliacion.diferenciaTotalNeta === 0
                ? 'text-emerald-400'
                : conciliacion.diferenciaTotalNeta > 0
                ? 'text-sky-400'
                : 'text-red-400'
            }`}
          >
            {conciliacion.diferenciaTotalNeta > 0 && '+'}
            {formatCOP(conciliacion.diferenciaTotalNeta)}
          </span>
          <span className="text-[11px] text-neutral-400 block mt-1">
            {conciliacion.diasConDiferencia} días con descuadre / {conciliacion.diasSinCierre} sin cierre
          </span>
        </div>
      </div>

      {/* Tabla detallada de conciliación por día */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 font-semibold">
              <th className="py-3 px-3">Fecha</th>
              <th className="py-3 px-3 text-right">Ventas Totales</th>
              <th className="py-3 px-3 text-right">Efectivo Sistema</th>
              <th className="py-3 px-3 text-right">Transferencias</th>
              <th className="py-3 px-3 text-right text-red-400">Egresos Caja</th>
              <th className="py-3 px-3 text-right">Esperado Caja</th>
              <th className="py-3 px-3 text-right">Arqueo Físico</th>
              <th className="py-3 px-3 text-right">Diferencia</th>
              <th className="py-3 px-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-mono">
            {conciliacion.items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-neutral-500">
                  No hay operaciones registradas en el período para conciliar.
                </td>
              </tr>
            ) : (
              conciliacion.items.map((it) => (
                <tr key={it.fecha} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-white font-sans font-medium whitespace-nowrap">
                    {it.fecha}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-200">
                    {formatCOP(it.totalVentasSistema)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-300">
                    {formatCOP(it.ventasEfectivoSistema)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-300">
                    {formatCOP(it.ventasTransferenciaSistema)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-red-400">
                    {it.totalEgresosCaja > 0 ? `-${formatCOP(it.totalEgresosCaja)}` : '$ 0'}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-400">
                    {formatCOP(it.efectivoEsperadoCaja)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-white">
                    {formatCOP(it.efectivoRealArqueado)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      it.diferenciaEfectivo === 0
                        ? 'text-emerald-400'
                        : it.diferenciaEfectivo > 0
                        ? 'text-sky-400'
                        : 'text-red-400'
                    }`}
                  >
                    {it.diferenciaEfectivo > 0 && '+'}
                    {formatCOP(it.diferenciaEfectivo)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {it.estado === 'cuadrado' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Cuadrado
                      </span>
                    )}
                    {it.estado === 'sobrante' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-950/60 px-2 py-0.5 text-[10px] font-semibold text-sky-400 border border-sky-500/30">
                        Sobrante
                      </span>
                    )}
                    {it.estado === 'faltante' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-950/60 px-2 py-0.5 text-[10px] font-semibold text-red-400 border border-red-500/30">
                        <XCircle className="h-3 w-3" /> Faltante
                      </span>
                    )}
                    {it.estado === 'sin_cierre' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 border border-neutral-700">
                        Sin cierre
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Diálogo para certificar cierre mensual */}
      {mostrarModalCierre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/10 text-gold-400">
                <FileCheck className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-white font-display">
                Certificar Cierre de Conciliación Mensual
              </h3>
            </div>

            <p className="text-xs text-neutral-400">
              Genera un registro oficial de auditoría con el resumen de ventas, recaudos, gastos e inconsistencias para el libro mayor contable.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Período Mensual (YYYY-MM):</label>
                <Input
                  type="month"
                  value={periodoMes}
                  onChange={(e) => setPeriodoMes(e.target.value)}
                  className="bg-neutral-950 border-neutral-800 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Notas u Observaciones del Auditor / Revisor:</label>
                <textarea
                  value={notasCierre}
                  onChange={(e) => setNotasCierre(e.target.value)}
                  rows={3}
                  placeholder="Ej: Conciliación conforme, se verificó extracto bancario de Daviplata y Nequi..."
                  className="w-full rounded-xl bg-neutral-950 border border-neutral-800 p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold-400"
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Total Ventas Período:</span>
                  <span className="text-white font-bold">{formatCOP(conciliacion.totalVentasSistema)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Diferencia Neta de Caja:</span>
                  <span className={conciliacion.diferenciaTotalNeta === 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCOP(conciliacion.diferenciaTotalNeta)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setMostrarModalCierre(false)}
                className="text-xs min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCerrar}
                disabled={guardando}
                className="text-xs min-h-[44px] px-4 font-semibold"
              >
                {guardando ? 'Guardando Acta...' : 'Confirmar y Guardar Acta'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
