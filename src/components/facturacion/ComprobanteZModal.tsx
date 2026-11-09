import { X, Printer, MessageCircle, FileSpreadsheet } from 'lucide-react';
import type { ComprobanteZ, ConfiguracionFiscal } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import {
  descargarComprobanteZCsv,
  generarComprobanteZTextoWhatsApp,
} from '@/utils/facturacionUtils';

interface ComprobanteZModalProps {
  comprobante: ComprobanteZ | null;
  configuracion: ConfiguracionFiscal;
  isOpen: boolean;
  onClose: () => void;
}

export function ComprobanteZModal({
  comprobante,
  configuracion,
  isOpen,
  onClose,
}: ComprobanteZModalProps) {
  if (!isOpen || !comprobante) return null;

  const handleImprimir = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const texto = generarComprobanteZTextoWhatsApp(comprobante, configuracion);
    const encoded = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleDescargarCsv = () => {
    descargarComprobanteZCsv(comprobante, configuracion);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-comprobante-z-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h2 id="modal-comprobante-z-title" className="font-display text-base font-bold text-white">
              Comprobante Z Diario de Corte POS
            </h2>
            <p className="text-xs text-neutral-400">
              Corte tributario oficial conforme al art. 616-1 del E.T.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante Z"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Visualización del ticket térmico */}
        <div className="my-4 overflow-y-auto px-1 py-1">
          <div
            id="comprobante-z-impresion"
            className="rounded-lg border border-neutral-300 bg-[#FBFBFA] p-5 font-mono text-xs text-neutral-900 shadow-sm"
          >
            <div className="text-center">
              <h3 className="font-bold text-sm tracking-wider uppercase text-black">
                {configuracion.razonSocial}
              </h3>
              {configuracion.nombreComercial && (
                <p className="text-[11px] text-neutral-700 font-sans">
                  {configuracion.nombreComercial}
                </p>
              )}
              <p className="text-[11px] text-neutral-600">
                {configuracion.tipoDocumentoIdentidad}: {configuracion.nit}-{configuracion.dv || '0'}
              </p>
              <p className="text-[10px] text-neutral-600">{configuracion.responsabilidad}</p>
              <p className="text-[10px] text-neutral-600">
                {configuracion.direccionFiscal}, {configuracion.municipio}
              </p>
              <p className="text-[10px] text-neutral-600">Tel: {configuracion.telefonoContacto}</p>
              <div className="my-2 border-b border-dashed border-neutral-400" />
              <p className="font-bold text-xs uppercase text-black">INFORME DIARIO DE CORTE Z</p>
              <p className="text-[11px] font-semibold text-neutral-800">No. {comprobante.numeroZ}</p>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            <div className="space-y-0.5 text-[11px] text-neutral-700">
              <div className="flex justify-between">
                <span>Fecha de Corte:</span>
                <span className="font-semibold">{comprobante.fechaCorte}</span>
              </div>
              <div className="flex justify-between">
                <span>Hora Generación:</span>
                <span>{comprobante.horaGeneracion}</span>
              </div>
              <div className="flex justify-between">
                <span>Resolución DIAN:</span>
                <span>No. {comprobante.resolucionNumero}</span>
              </div>
              <div className="flex justify-between">
                <span>Prefijo y Rango:</span>
                <span className="font-semibold">
                  {comprobante.consecutivoInicialTexto} a {comprobante.consecutivoFinalTexto}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Documentos Emitidos:</span>
                <span className="font-semibold">{comprobante.totalDocumentosEmitidos}</span>
              </div>
              {comprobante.totalDocumentosAnulados > 0 && (
                <div className="flex justify-between text-red-700 font-semibold">
                  <span>Documentos Anulados:</span>
                  <span>{comprobante.totalDocumentosAnulados}</span>
                </div>
              )}
            </div>

            <div className="my-2 border-b-2 border-dashed border-neutral-600" />

            {/* Operaciones */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Ventas Brutas:</span>
                <span>{formatCOP(comprobante.totalVentasBrutas)}</span>
              </div>
              {comprobante.totalDescuentos > 0 && (
                <div className="flex justify-between text-amber-800">
                  <span>Descuentos:</span>
                  <span>-{formatCOP(comprobante.totalDescuentos)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-black border-t border-dotted border-neutral-400 pt-0.5">
                <span>VENTAS NETAS:</span>
                <span>{formatCOP(comprobante.totalVentasNetas)}</span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Discriminación impositiva */}
            <div className="space-y-1 text-[11px]">
              <p className="font-bold text-[10px] uppercase text-neutral-500">
                Discriminación Impositiva
              </p>
              {comprobante.baseGravableInc8 > 0 && (
                <>
                  <div className="flex justify-between text-neutral-700">
                    <span>Base Gravable INC (8%):</span>
                    <span>{formatCOP(comprobante.baseGravableInc8)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-neutral-800">
                    <span>Impuesto Consumo (8%):</span>
                    <span>+{formatCOP(comprobante.impuestoInc8)}</span>
                  </div>
                </>
              )}
              {comprobante.baseGravableIva19 > 0 && (
                <>
                  <div className="flex justify-between text-neutral-700">
                    <span>Base Gravable IVA (19%):</span>
                    <span>{formatCOP(comprobante.baseGravableIva19)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-neutral-800">
                    <span>Impuesto IVA (19%):</span>
                    <span>+{formatCOP(comprobante.impuestoIva19)}</span>
                  </div>
                </>
              )}
              {comprobante.baseExenta > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Base Exenta / Tarifa 0%:</span>
                  <span>{formatCOP(comprobante.baseExenta)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-neutral-300 pt-0.5">
                <span>Total Impuestos:</span>
                <span>{formatCOP(comprobante.totalImpuestos)}</span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Propinas y Medios de Pago */}
            <div className="space-y-1 text-[11px]">
              {comprobante.totalPropinas > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Propinas del Personal:</span>
                  <span>+{formatCOP(comprobante.totalPropinas)}</span>
                </div>
              )}
              <p className="font-bold text-[10px] uppercase text-neutral-500 pt-1">
                Formas de Pago
              </p>
              <div className="flex justify-between text-neutral-700">
                <span>Efectivo:</span>
                <span>{formatCOP(comprobante.totalEfectivo)}</span>
              </div>
              <div className="flex justify-between text-neutral-700">
                <span>Transferencia / Bancos:</span>
                <span>{formatCOP(comprobante.totalTransferencia)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-black border-t-2 border-neutral-800 pt-1">
                <span>TOTAL RECAUDADO:</span>
                <span>{formatCOP(comprobante.totalCobrado)} COP</span>
              </div>
            </div>

            <div className="mt-4 border-t border-dashed border-neutral-400 pt-3 text-center text-[10px] text-neutral-600">
              <p>Operador: {comprobante.generadoPor}</p>
              <p className="mt-0.5 font-sans italic">
                Software POS La Parada · Conforme requisitos de Documento Equivalente POS
              </p>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t border-neutral-800 pt-3">
          <Button
            variant="secondary"
            onClick={handleImprimir}
            className="min-h-[44px] gap-2 flex items-center justify-center font-semibold"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Imprimir
          </Button>

          <Button
            variant="secondary"
            onClick={handleDescargarCsv}
            className="min-h-[44px] gap-2 flex items-center justify-center font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Excel (CSV)
          </Button>

          <Button
            variant="primary"
            onClick={handleWhatsApp}
            className="min-h-[44px] gap-2 flex items-center justify-center font-bold"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
}
