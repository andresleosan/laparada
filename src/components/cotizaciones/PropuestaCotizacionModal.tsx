import { useId, useState } from 'react';
import { Check, Copy, MessageCircle, Printer, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { createToast } from '@/components/ui/Toast';
import type { CotizacionComercial } from '@/types';
import {
  construirMensajeCotizacionWhatsApp,
  formatearModalidadEntrega,
  formatearTipoEvento,
  generarUrlWhatsAppCotizacion,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface PropuestaCotizacionModalProps {
  cotizacion: CotizacionComercial | null;
  isOpen: boolean;
  negocio: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
  };
  onClose: () => void;
  onEnviadaWhatsApp?: (cotizacion: CotizacionComercial) => void;
}

export function PropuestaCotizacionModal({
  cotizacion,
  isOpen,
  negocio,
  onClose,
  onEnviadaWhatsApp,
}: PropuestaCotizacionModalProps) {
  const titleId = `propuesta-cot-${useId().replace(/:/g, '')}`;
  const [copiado, setCopiado] = useState(false);

  if (!isOpen || !cotizacion) return null;

  const tipoEvento = formatearTipoEvento(cotizacion.tipoEvento);
  const inversionPorInvitado =
    cotizacion.invitados > 0 ? Math.round(cotizacion.totalCotizado / cotizacion.invitados) : 0;

  const handleImprimir = () => {
    window.print();
  };

  const handleCopiar = async () => {
    const texto = construirMensajeCotizacionWhatsApp(cotizacion, negocio);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      createToast('Propuesta comercial copiada al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      createToast('No se pudo copiar la propuesta al portapapeles', 'error');
    }
  };

  const handleWhatsApp = () => {
    const url = generarUrlWhatsAppCotizacion(cotizacion, negocio);
    window.open(url, '_blank', 'noopener,noreferrer');
    onEnviadaWhatsApp?.(cotizacion);
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-[#0A0A0A] p-5 text-white shadow-2xl">
        {/* Cabecera modal */}
        <header className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h2 id={titleId} className="font-display text-lg font-black text-white">
              Propuesta Comercial Formal · {cotizacion.codigo}
            </h2>
            <p className="text-xs text-neutral-400">
              Documento listo para cliente (sin costos ni márgenes internos). Imprime en PDF o envía por WhatsApp.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa de propuesta"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* Documento imprimible */}
        <div className="my-4 flex-1 overflow-y-auto pr-1">
          <div
            id="cotizacion-propuesta-impresion"
            className="rounded-2xl border border-neutral-300 bg-[#FBFBFA] p-6 text-neutral-900 shadow-sm space-y-5"
          >
            {/* Encabezado comercial */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">
                  Propuesta Comercial & Catering
                </p>
                <h3 className="font-display text-2xl font-black uppercase text-neutral-950">
                  {negocio.nombre || 'La Parada'}
                </h3>
                {negocio.direccion && (
                  <p className="text-xs text-neutral-600">{negocio.direccion}</p>
                )}
                {negocio.telefono && (
                  <p className="text-xs text-neutral-600">WhatsApp / Tel: {negocio.telefono}</p>
                )}
              </div>

              <div className="text-right">
                <p className="font-mono text-lg font-black text-neutral-950">
                  {cotizacion.codigo}
                </p>
                <p className="text-xs text-neutral-600">
                  Fecha Evento: <strong>{cotizacion.fechaEvento}</strong>
                  {cotizacion.horaEvento ? ` · ${cotizacion.horaEvento}` : ''}
                </p>
                <p className="text-xs text-neutral-600">
                  Válida hasta: <strong>{cotizacion.fechaVencimiento}</strong>
                </p>
              </div>
            </div>

            {/* Datos del cliente / evento */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs sm:grid-cols-2">
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider text-neutral-500">
                  Datos del Cliente
                </p>
                <p className="font-bold text-neutral-900">{cotizacion.clienteNombre}</p>
                {cotizacion.empresa && (
                  <p className="text-neutral-700">
                    {cotizacion.empresa}
                    {cotizacion.nitEmpresa ? ` · NIT ${cotizacion.nitEmpresa}` : ''}
                  </p>
                )}
                <p className="text-neutral-600">Tel: {cotizacion.clienteTelefono}</p>
              </div>

              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider text-neutral-500">
                  Logística del Evento
                </p>
                <p className="font-bold text-neutral-900">
                  {tipoEvento.emoji} {tipoEvento.label} ({cotizacion.invitados} invitados)
                </p>
                <p className="text-neutral-700">
                  {formatearModalidadEntrega(cotizacion.modalidadEntrega)}
                </p>
                {cotizacion.direccionEvento && (
                  <p className="text-neutral-600">
                    {cotizacion.direccionEvento}
                    {cotizacion.barrioEvento ? ` (${cotizacion.barrioEvento})` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Tabla de ítems */}
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-white">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Concepto / Menú</th>
                    <th className="px-3 py-2.5 text-center font-bold">Cant.</th>
                    <th className="px-3 py-2.5 text-right font-bold">Vr. Unitario</th>
                    <th className="px-3 py-2.5 text-right font-bold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {cotizacion.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2.5">
                        <p className="font-bold text-neutral-900">{item.nombre}</p>
                        {item.notas && (
                          <p className="text-[11px] italic text-neutral-500">{item.notas}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold">
                        {item.cantidad}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-neutral-700">
                        {formatCOP(item.precioUnitario)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-neutral-950">
                        {formatCOP(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales comerciales */}
            <div className="ml-auto max-w-xs space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold">{formatCOP(cotizacion.subtotal)}</span>
              </div>
              {cotizacion.descuento > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Descuento{cotizacion.descuentoMotivo ? ` (${cotizacion.descuentoMotivo})` : ''}:
                  </span>
                  <span className="font-mono font-semibold">
                    -{formatCOP(cotizacion.descuento)}
                  </span>
                </div>
              )}
              {cotizacion.costoLogistica > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Logística / Servicio:</span>
                  <span className="font-mono font-semibold">
                    {formatCOP(cotizacion.costoLogistica)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-neutral-900 pt-2 text-base font-black text-neutral-950">
                <span>TOTAL PROPUESTA:</span>
                <span className="font-display">{formatCOP(cotizacion.totalCotizado)}</span>
              </div>
              {inversionPorInvitado > 0 && (
                <p className="text-right text-[11px] text-neutral-500">
                  Inversión por invitado: {formatCOP(inversionPorInvitado)} COP
                </p>
              )}

              {cotizacion.anticipoMonto > 0 && (
                <div className="mt-2 rounded-lg border border-emerald-300 bg-emerald-50 p-2.5 space-y-1">
                  <div className="flex justify-between text-emerald-900 font-semibold">
                    <span>
                      Anticipo ({cotizacion.anticipoEstado === 'verificado' ? 'Verificado' : 'Pendiente'}):
                    </span>
                    <span className="font-mono">{formatCOP(cotizacion.anticipoMonto)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-900 font-black">
                    <span>Saldo pendiente:</span>
                    <span className="font-mono">{formatCOP(cotizacion.saldoPendiente)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Condiciones comerciales y notas */}
            <div className="border-t border-neutral-200 pt-3 space-y-1.5 text-[11px] text-neutral-600">
              {cotizacion.notasEvento && (
                <p>
                  <strong className="text-neutral-900">Observaciones del evento:</strong>{' '}
                  {cotizacion.notasEvento}
                </p>
              )}
              {cotizacion.condicionesComerciales && (
                <p>
                  <strong className="text-neutral-900">Condiciones comerciales:</strong>{' '}
                  {cotizacion.condicionesComerciales}
                </p>
              )}
              <p className="pt-1 font-semibold text-neutral-800">
                Medios de pago autorizados: Transferencia bancaria (Bancolombia / Nequi / Daviplata) o Efectivo.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <footer className="flex flex-wrap gap-2 border-t border-neutral-800 pt-3">
          <button
            type="button"
            onClick={handleImprimir}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold text-white hover:border-gold-400"
          >
            <Printer className="h-4 w-4 text-gold-400" aria-hidden="true" />
            <span>Imprimir / PDF</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopiar()}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold text-white hover:border-gold-400"
          >
            {copiado ? (
              <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 text-neutral-300" aria-hidden="true" />
            )}
            <span>{copiado ? '¡Copiada!' : 'Copiar Texto'}</span>
          </button>

          <button
            type="button"
            onClick={handleWhatsApp}
            className="inline-flex min-h-[44px] flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-black hover:bg-emerald-400"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>Enviar Propuesta por WhatsApp</span>
          </button>
        </footer>
      </div>
    </StorefrontDialog>
  );
}
