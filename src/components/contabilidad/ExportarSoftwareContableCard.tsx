import { useState } from 'react';
import {
  ArrowDownToLine,
  CheckCircle2,
  Database,
  Settings2,
} from 'lucide-react';
import type {
  AsientoContableExportacion,
  MapeoPlanCuentasPUC,
  SoftwareContableTarget,
} from '@/types/contabilidad';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import { ParametrosPucModal } from './ParametrosPucModal';

interface ExportarSoftwareContableCardProps {
  asientos: AsientoContableExportacion[];
  mapeoPuc: MapeoPlanCuentasPUC;
  onGuardarMapeo: (nuevoMapeo: Partial<MapeoPlanCuentasPUC>) => Promise<void>;
  onExportarSoftware: (software: SoftwareContableTarget) => void;
  nombreNegocio: string;
}

export function ExportarSoftwareContableCard({
  asientos,
  mapeoPuc,
  onGuardarMapeo,
  onExportarSoftware,
  nombreNegocio: _nombreNegocio,
}: ExportarSoftwareContableCardProps) {
  const [modalPucAbierto, setModalPucAbierto] = useState(false);

  const totalDebito = asientos.reduce((acc, a) => acc + a.debito, 0);
  const totalCredito = asientos.reduce((acc, a) => acc + a.credito, 0);
  const diferencia = Math.abs(totalDebito - totalCredito);
  const estaCuadrado = diferencia <= 2; // Tolerancia de redondeo de pesos

  const softwareOpciones: {
    target: SoftwareContableTarget;
    titulo: string;
    descripcion: string;
    etiquetaFormato: string;
    colorBorde: string;
  }[] = [
    {
      target: 'siigo',
      titulo: 'Siigo Nube / Siigo Pyme',
      descripcion: 'Archivo plano delimitado por punto y coma listo para el módulo de importación de comprobantes de ventas y recibos de caja.',
      etiquetaFormato: 'Formato Estándar Siigo',
      colorBorde: 'border-blue-500/30 hover:border-blue-500/60',
    },
    {
      target: 'world_office',
      titulo: 'World Office',
      descripcion: 'Estructura parametrizada con código de documento, centros de costos y cuentas PUC para importación masiva directa.',
      etiquetaFormato: 'Formato World Office ERP',
      colorBorde: 'border-emerald-500/30 hover:border-emerald-500/60',
    },
    {
      target: 'helisa',
      titulo: 'Helisa GW',
      descripcion: 'Captura masiva por renglones con cuenta contable, documento fuente, terceros y asignación de centro de costos.',
      etiquetaFormato: 'Formato Helisa Diario',
      colorBorde: 'border-purple-500/30 hover:border-purple-500/60',
    },
    {
      target: 'generico_puc',
      titulo: 'Libro Diario PUC (Excel / CSV)',
      descripcion: 'Hoja de cálculo universal con partida doble completa (Débito = Crédito), descripción de cuenta y bases gravables para cualquier software.',
      etiquetaFormato: 'Excel Universal PUC',
      colorBorde: 'border-gold-400/30 hover:border-gold-400/60',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cabecera y botón de configuración PUC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400 border border-blue-400/20">
              <Database className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Exportación Parametrizada para Software Contable
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Genera automáticamente los asientos de ventas e ingresos en Partida Doble estructurados para Siigo, World Office, Helisa o Excel.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setModalPucAbierto(true)}
          variant="secondary"
          className="flex items-center gap-2 text-xs min-h-[44px] px-3 font-semibold text-neutral-200 border-neutral-700"
          aria-label="Abrir modal para configurar cuentas del Plan Único de Cuentas (PUC)"
        >
          <Settings2 className="h-4 w-4 text-gold-400" aria-hidden="true" />
          <span>Configurar Cuentas PUC</span>
        </Button>
      </div>

      {/* Tarjeta de verificación de Partida Doble */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              estaCuadrado
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-950/60 text-red-400 border border-red-500/30'
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <span className="font-bold text-white text-sm block">
              {estaCuadrado ? 'Partida Doble Balanceada' : 'Descuadre en Partida Doble'}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5 block">
              {asientos.length} asientos generados para el período contable seleccionado.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 self-end sm:self-auto font-mono text-xs">
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-sans font-semibold">
              Total Débitos:
            </span>
            <span className="font-bold text-white">{formatCOP(totalDebito)}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-sans font-semibold">
              Total Créditos:
            </span>
            <span className="font-bold text-white">{formatCOP(totalCredito)}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase font-sans font-semibold">
              Diferencia:
            </span>
            <span className={estaCuadrado ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {formatCOP(diferencia)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de opciones de software */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {softwareOpciones.map((op) => (
          <div
            key={op.target}
            className={`rounded-2xl border bg-neutral-950/80 p-5 flex flex-col justify-between transition-all ${op.colorBorde}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white font-display">
                  {op.titulo}
                </h3>
                <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300 font-mono">
                  {op.etiquetaFormato}
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                {op.descripcion}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 font-mono">
                {asientos.length} registros listos
              </span>
              <Button
                type="button"
                onClick={() => onExportarSoftware(op.target)}
                variant="primary"
                disabled={asientos.length === 0}
                className="flex items-center gap-2 text-xs min-h-[44px] px-4 font-semibold"
                aria-label={`Exportar interfaz contable para ${op.titulo}`}
              >
                <ArrowDownToLine className="h-4 w-4" />
                <span>Exportar Archivo</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Previsualización de los primeros asientos */}
      {asientos.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
            Previsualización de Asientos (Primeros 5 registros)
          </span>

          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/40">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 text-[11px] font-sans">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Cuenta PUC</th>
                  <th className="py-2.5 px-3">Nombre Cuenta</th>
                  <th className="py-2.5 px-3">Documento</th>
                  <th className="py-2.5 px-3 text-right">Débito</th>
                  <th className="py-2.5 px-3 text-right">Crédito</th>
                  <th className="py-2.5 px-3">Concepto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {asientos.slice(0, 5).map((a, idx) => (
                  <tr key={`${a.consecutivo}-${idx}`} className="hover:bg-neutral-800/30">
                    <td className="py-2 px-3 text-white whitespace-nowrap">{a.fecha}</td>
                    <td className="py-2 px-3 text-gold-400 font-bold whitespace-nowrap">
                      {a.cuentaContable}
                    </td>
                    <td className="py-2 px-3 text-neutral-300 font-sans whitespace-nowrap">
                      {a.nombreCuenta}
                    </td>
                    <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">
                      {a.tipoDocumento}-{a.consecutivo}
                    </td>
                    <td className="py-2 px-3 text-right text-white">
                      {a.debito > 0 ? formatCOP(a.debito) : '-'}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-300">
                      {a.credito > 0 ? formatCOP(a.credito) : '-'}
                    </td>
                    <td className="py-2 px-3 text-neutral-400 font-sans text-[11px] max-w-xs truncate">
                      {a.concepto}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal accesible de parametrización */}
      <ParametrosPucModal
        isOpen={modalPucAbierto}
        onClose={() => setModalPucAbierto(false)}
        mapeoActual={mapeoPuc}
        onGuardar={onGuardarMapeo}
      />
    </div>
  );
}
