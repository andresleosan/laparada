import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Printer, X, Check, Copy } from 'lucide-react';
import type { TicketVentaData } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import {
  buildWhatsAppReceiptText,
  buildWhatsAppReceiptUrl,
  formatearFechaTicket,
} from '@/utils/ticketWhatsApp';
import { formatearModificadoresYNotas } from '@/utils/propinasYModificadores';
import { createToast } from '@/components/ui/Toast';

interface TicketVentaModalProps {
  ticket: TicketVentaData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TicketVentaModal({ ticket, isOpen, onClose }: TicketVentaModalProps) {
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [copiado, setCopiado] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ticket?.clienteTelefono) {
      setTelefonoWhatsApp(ticket.clienteTelefono);
    } else {
      setTelefonoWhatsApp('');
    }
  }, [ticket]);

  // Manejo de Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ticket) return null;

  const { fechaTexto, horaTexto } = formatearFechaTicket(ticket.fecha);

  const handleImprimir = () => {
    window.print();
  };

  const handleEnviarWhatsApp = () => {
    const url = buildWhatsAppReceiptUrl(ticket, telefonoWhatsApp);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopiarTexto = async () => {
    const texto = buildWhatsAppReceiptText(ticket);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      createToast('Comprobante copiado al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      createToast('No se pudo copiar el texto', 'error');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h2 id="ticket-modal-title" className="font-display text-lg font-bold text-white">
              Comprobante de Venta
            </h2>
            <p className="text-xs text-neutral-400">
              Ticket térmico listo para imprimir o enviar por WhatsApp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Visualización del ticket tipo papel térmico (scrollable) */}
        <div className="my-4 overflow-y-auto px-1 py-1">
          <div
            id="pos-ticket-impresion"
            className="rounded-lg border border-neutral-300 bg-[#FBFBFA] p-5 font-mono text-xs text-neutral-900 shadow-sm"
          >
            {/* Encabezado del negocio */}
            <div className="text-center">
              {ticket.estado === 'anulada' && (
                <div className="mb-2 rounded border-2 border-dashed border-red-600 bg-red-100 p-1.5 text-center text-xs font-black uppercase tracking-wider text-red-700">
                  ⚠️ VENTA ANULADA ⚠️
                  <div className="text-[10px] font-normal lowercase tracking-normal text-red-800">
                    sin valor fiscal ({ticket.motivoAnulacion || 'anulada'})
                  </div>
                </div>
              )}
              {ticket.datosFiscales ? (
                <>
                  <h3 className="font-bold text-sm tracking-wider uppercase text-black">
                    {ticket.datosFiscales.razonSocial}
                  </h3>
                  {ticket.datosFiscales.nombreComercial && (
                    <p className="text-[11px] text-neutral-700 font-sans font-medium">
                      {ticket.datosFiscales.nombreComercial}
                    </p>
                  )}
                  <p className="text-[10px] text-neutral-700">
                    NIT: {ticket.datosFiscales.nit}-{ticket.datosFiscales.dv || '0'}
                  </p>
                  <p className="text-[9px] text-neutral-600 font-sans">
                    {ticket.datosFiscales.responsabilidad}
                  </p>
                </>
              ) : (
                <h3 className="font-bold text-sm tracking-wider uppercase text-black">
                  {(ticket.negocioNombre || 'LA PARADA').toUpperCase()}
                </h3>
              )}

              {ticket.negocioDireccion && (
                <p className="text-[10px] text-neutral-600">{ticket.negocioDireccion}</p>
              )}
              {ticket.negocioTelefono && (
                <p className="text-[10px] text-neutral-600">Tel: {ticket.negocioTelefono}</p>
              )}

              {ticket.datosFiscales && (
                <div className="mt-1.5 rounded border border-neutral-300 bg-white/60 p-1 text-center">
                  <p className="font-bold text-[11px] text-black">
                    DOC. EQUIVALENTE POS No. {ticket.datosFiscales.consecutivoFiscal}
                  </p>
                  <p className="text-[9px] text-neutral-600">
                    Res. DIAN No. {ticket.datosFiscales.numeroResolucion}
                  </p>
                  <p className="text-[8px] text-neutral-500">
                    Prefijo {ticket.datosFiscales.prefijo} {ticket.datosFiscales.rangoTexto}
                  </p>
                </div>
              )}
            </div>

            {/* Separador punteado */}
            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Metadatos de la venta */}
            <div className="space-y-0.5 text-[11px] text-neutral-700">
              <div className="flex justify-between">
                <span>Fecha: {fechaTexto}</span>
                <span>{horaTexto}</span>
              </div>
              <div className="flex justify-between">
                <span>Ticket: #{ticket.ventaId.slice(-6).toUpperCase()}</span>
                <span className="font-semibold uppercase">
                  {ticket.mesaNombre ? `🍽️ ${ticket.mesaNombre}` : ticket.tipoEntrega === 'domicilio' ? '🛵 Domicilio' : '🏪 Mostrador'}
                </span>
              </div>
              {ticket.mesaNombre && (
                <div className="flex justify-between font-bold text-neutral-800">
                  <span>Mesa / Salón:</span>
                  <span>{ticket.mesaNombre}</span>
                </div>
              )}
              {ticket.clienteNombre && (
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-medium truncate max-w-[160px]">{ticket.clienteNombre}</span>
                </div>
              )}
              {ticket.direccionEntrega && (
                <div className="text-[10px] text-neutral-600">
                  Dir: {ticket.direccionEntrega}
                  {ticket.barrioEntrega ? ` (${ticket.barrioEntrega})` : ''}
                </div>
              )}
            </div>

            {/* Separador punteado */}
            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Desglose de ítems */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between font-bold text-[10px] text-neutral-500 uppercase">
                <span>Cant. / Descripción</span>
                <span>Subtotal</span>
              </div>
              {ticket.items.map((item, idx) => {
                const modsStr = formatearModificadoresYNotas(item);
                return (
                  <div key={`${item.referenciaId}-${idx}`} className="border-b border-neutral-200/60 pb-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="truncate font-medium">
                        {item.cantidad}× {item.nombre}
                      </span>
                      <span className="shrink-0 font-medium">{formatCOP(item.subtotal)}</span>
                    </div>
                    {modsStr && (
                      <p className="text-[10px] text-neutral-600 font-sans italic pl-3">
                        {modsStr}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Separador doble */}
            <div className="my-2 border-b-2 border-dashed border-neutral-600" />

            {/* Totales y Pago */}
            <div className="space-y-1 text-xs">
              {typeof ticket.subtotal === 'number' && (
                <div className="flex justify-between text-[11px] text-neutral-700">
                  <span>Subtotal:</span>
                  <span>{formatCOP(ticket.subtotal)}</span>
                </div>
              )}
              {typeof ticket.descuento === 'number' && ticket.descuento > 0 && (
                <div className="flex justify-between text-[11px] text-amber-800 font-bold">
                  <span>Descuento ({ticket.descuentoMotivo || 'Promoción'}):</span>
                  <span>-{formatCOP(ticket.descuento)}</span>
                </div>
              )}
              {typeof ticket.propina === 'number' && ticket.propina > 0 && (
                <div className="flex justify-between text-[11px] text-amber-800 font-medium">
                  <span>Propina voluntaria (10% sugerida):</span>
                  <span>+{formatCOP(ticket.propina)}</span>
                </div>
              )}
              {ticket.datosFiscales && typeof ticket.datosFiscales.baseGravable === 'number' && (
                <>
                  <div className="flex justify-between text-[10px] text-neutral-600 border-t border-dotted border-neutral-300 pt-0.5">
                    <span>
                      Base Gravable ({ticket.datosFiscales.tipoImpuesto === 'iva' ? 'IVA 19%' : 'INC 8%'}):
                    </span>
                    <span>{formatCOP(ticket.datosFiscales.baseGravable)}</span>
                  </div>
                  {typeof ticket.datosFiscales.impuesto === 'number' && (
                    <div className="flex justify-between text-[10px] text-neutral-600">
                      <span>
                        Impuesto liquidado ({ticket.datosFiscales.tarifa ?? 8}%):
                      </span>
                      <span>+{formatCOP(ticket.datosFiscales.impuesto)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between text-sm font-bold text-black">
                <span>TOTAL:</span>
                <span>{formatCOP(ticket.total)} COP</span>
              </div>
              {ticket.esPagoParcial && typeof ticket.saldoPendiente === 'number' && (
                <div className="flex justify-between text-[11px] font-bold text-amber-900 bg-amber-100 rounded px-1.5 py-0.5">
                  <span>Saldo pendiente de la mesa:</span>
                  <span>{formatCOP(ticket.saldoPendiente)} COP</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-neutral-700">
                <span>Método de pago:</span>
                <span className="capitalize font-medium">
                  {ticket.metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                </span>
              </div>
              {ticket.metodoPago === 'efectivo' &&
                typeof ticket.montoRecibido === 'number' &&
                ticket.montoRecibido > 0 && (
                  <>
                    <div className="flex justify-between text-[11px] text-neutral-600">
                      <span>Recibido:</span>
                      <span>{formatCOP(ticket.montoRecibido)}</span>
                    </div>
                    {typeof ticket.cambio === 'number' && ticket.cambio >= 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                        <span>Cambio / Vueltas:</span>
                        <span>{formatCOP(ticket.cambio)}</span>
                      </div>
                    )}
                  </>
                )}
            </div>

            {/* Pie de ticket */}
            <div className="mt-4 border-t border-dashed border-neutral-400 pt-3 text-center text-[10px] text-neutral-600">
              <p className="font-bold">¡GRACIAS POR SU COMPRA!</p>
              <p>Esperamos atenderle de nuevo pronto.</p>
              {ticket.datosFiscales?.leyenda && (
                <p className="mt-1 font-sans text-[9px] text-neutral-500 italic">
                  {ticket.datosFiscales.leyenda}
                </p>
              )}
              {ticket.esOffline && (
                <p className="mt-1 font-semibold text-amber-700">[Registrado Offline]</p>
              )}
            </div>
          </div>
        </div>

        {/* Sección de acciones */}
        <div className="space-y-3 border-t border-neutral-800 pt-3">
          {/* Campo de WhatsApp */}
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <Input
                label="WhatsApp del cliente (opcional)"
                placeholder="Ej: 300 123 4567"
                value={telefonoWhatsApp}
                onChange={(e) => setTelefonoWhatsApp(e.target.value)}
              />
            </div>
            <div className="pt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopiarTexto}
                aria-label="Copiar texto del ticket"
                className="h-11 w-11 p-0 flex items-center justify-center"
              >
                {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              onClick={handleEnviarWhatsApp}
              className="min-h-11 gap-2 flex items-center justify-center font-bold"
              aria-label="Enviar comprobante por WhatsApp"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </Button>
            <Button
              variant="secondary"
              onClick={handleImprimir}
              className="min-h-11 gap-2 flex items-center justify-center font-bold"
              aria-label="Imprimir ticket térmico"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimir
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={onClose}
            fullWidth
            className="min-h-11 text-neutral-300 hover:text-white"
          >
            Nueva Venta / Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}

