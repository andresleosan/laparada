import { useMemo } from 'react';
import {
  Download,
  Info,
  MessageCircle,
  Receipt,
  Scale,
} from 'lucide-react';
import type { LiquidacionFormulario310 } from '@/types/contabilidad';
import type { ConfiguracionFiscal } from '@/types/facturacion';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import { getBimestresAno } from '@/utils/contabilidadUtils';

interface Formulario310CardProps {
  liquidacion: LiquidacionFormulario310;
  configuracionFiscal?: ConfiguracionFiscal | null;
  anoSeleccionado: number;
  bimestreSeleccionado: number;
  onCambiarBimestre: (bimestre: number) => void;
  onExportarCsv: () => void;
  onEnviarWhatsApp: () => void;
  nombreNegocio: string;
}

export function Formulario310Card({
  liquidacion,
  configuracionFiscal,
  anoSeleccionado,
  bimestreSeleccionado,
  onCambiarBimestre,
  onExportarCsv,
  onEnviarWhatsApp,
  nombreNegocio,
}: Formulario310CardProps) {
  const bimestres = useMemo(() => getBimestresAno(anoSeleccionado), [anoSeleccionado]);

  return (
    <div className="space-y-4">
      {/* Selector de bimestres estilo botones táctiles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Scale className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white font-display">
              Declaración de Impoconsumo — Formulario 310 DIAN
            </h2>
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Consolidado bimestral de bases gravables (8%), devoluciones y liquidación de impuesto a pagar ante la DIAN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onEnviarWhatsApp}
            variant="secondary"
            className="flex items-center gap-2 text-xs min-h-[44px] px-3 font-semibold text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/30"
            aria-label="Enviar informe contable por WhatsApp al contador"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>Enviar a Contador</span>
          </Button>

          <Button
            type="button"
            onClick={onExportarCsv}
            variant="primary"
            className="flex items-center gap-2 text-xs min-h-[44px] px-3 font-semibold"
            aria-label="Descargar liquidación de Formulario 310 en formato Excel CSV"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>Descargar CSV Formulario 310</span>
          </Button>
        </div>
      </div>

      {/* Selector de pestañas de bimestres */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {bimestres.map((bim) => {
          const esActivo = bim.numero === bimestreSeleccionado;
          return (
            <button
              key={bim.numero}
              type="button"
              onClick={() => onCambiarBimestre(bim.numero)}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs min-h-[52px] transition-all ${
                esActivo
                  ? 'border-gold-400 bg-gold-400/10 text-gold-300 font-bold shadow-sm'
                  : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
              aria-pressed={esActivo}
            >
              <span className="font-semibold">{`Bimestre ${bim.numero}`}</span>
              <span className="text-[10px] opacity-75 mt-0.5">
                {bim.numero === 1 && 'Ene - Feb'}
                {bim.numero === 2 && 'Mar - Abr'}
                {bim.numero === 3 && 'May - Jun'}
                {bim.numero === 4 && 'Jul - Ago'}
                {bim.numero === 5 && 'Sep - Oct'}
                {bim.numero === 6 && 'Nov - Dic'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta de Formulario Oficial DIAN 310 */}
      <div className="rounded-2xl border-2 border-neutral-700 bg-neutral-950 p-5 sm:p-6 shadow-md space-y-6">
        {/* Cabecera del formulario */}
        <div className="border-b border-neutral-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-mono font-bold text-amber-400">
                DIAN 310
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">
                Declaración del Impuesto Nacional al Consumo
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Año Gravable: <strong>{liquidacion.anoGravable}</strong> | Período: <strong>{liquidacion.bimestreNombre}</strong>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-neutral-400 block">Contribuyente / Razón Social:</span>
            <span className="text-xs font-bold text-neutral-200 block">
              {configuracionFiscal?.razonSocial || nombreNegocio}
            </span>
            <span className="text-[11px] font-mono text-neutral-400 block">
              NIT: {configuracionFiscal?.nit || '222222222222'}-{configuracionFiscal?.dv || '0'}
            </span>
          </div>
        </div>

        {/* Resumen clave: Total Saldo a Pagar */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400/20 text-amber-400">
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-amber-300/90 block">
                Total Saldo a Pagar en Bancos (Renglón 52)
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                {formatCOP(liquidacion.saldoAPagar)}
              </span>
            </div>
          </div>

          <div className="text-xs text-neutral-300 sm:text-right">
            <span>Operaciones en el bimestre: <strong>{liquidacion.totalOperacionesPos} ventas</strong></span>
            <br />
            <span className="text-neutral-400">Tarifa fija de ley: <strong>8% (INC)</strong></span>
          </div>
        </div>

        {/* Tabla de Renglones Oficiales */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Discriminación de Renglones Tributarios
          </h4>

          <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden text-xs">
            {liquidacion.renglones.map((renglon) => (
              <div
                key={renglon.numeroRenglon}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 hover:bg-neutral-800/30 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono font-bold text-neutral-300 text-[11px]">
                    R{renglon.numeroRenglon}
                  </span>
                  <div>
                    <span className="font-semibold text-neutral-200 block">
                      {renglon.concepto}
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      {renglon.explicacion}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right pl-8 sm:pl-0">
                  <span
                    className={`font-mono font-bold text-sm ${
                      renglon.numeroRenglon === 52
                        ? 'text-amber-400 text-base'
                        : renglon.numeroRenglon === 31
                        ? 'text-white'
                        : 'text-neutral-300'
                    }`}
                  >
                    {formatCOP(renglon.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota explicativa de Propinas y Exclusiones */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 flex items-start gap-2.5 text-xs text-neutral-400">
          <Info className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
          <p>
            <strong>Nota para la Revisoría Fiscal / Contador:</strong> Las propinas voluntarias recaudadas (
            <strong className="text-neutral-200">{formatCOP(liquidacion.propinasInformativas)}</strong>) no constituyen ingreso operacional gravado de acuerdo con la Ley 1935 de 2019 y se reportan en renglones informativos sin afectar la base gravable del 8%.
          </p>
        </div>
      </div>
    </div>
  );
}
