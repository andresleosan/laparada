import { useState, useEffect, useId } from 'react';
import { X, Receipt, Calendar, Clock, DollarSign, Package, Banknote, CreditCard, Ban } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { FacturaCompra, PagoFacturaCompra } from '@/types/proveedor';
import { getPagosPorFactura } from '@/services/proveedoresService';
import { determinarEstadoVencimiento } from '@/utils/proveedoresUtils';
import { formatCOP } from '@/utils/formatCOP';

interface DetalleFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura: FacturaCompra | null;
  negocioId: string;
  onAbrirAbono?: (factura: FacturaCompra) => void;
}

export function DetalleFacturaModal({
  isOpen,
  onClose,
  factura,
  negocioId,
  onAbrirAbono,
}: DetalleFacturaModalProps) {
  const generatedId = useId();
  const titleId = `modal-detalle-factura-${generatedId.replace(/:/g, '')}-title`;

  const [pagos, setPagos] = useState<PagoFacturaCompra[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);

  useEffect(() => {
    if (isOpen && factura && negocioId) {
      setCargandoPagos(true);
      getPagosPorFactura(negocioId, factura.id)
        .then((data) => setPagos(data))
        .catch((err) => console.error('Error cargando abonos de factura:', err))
        .finally(() => setCargandoPagos(false));
    } else {
      setPagos([]);
    }
  }, [isOpen, factura, negocioId]);

  if (!isOpen || !factura) return null;

  const semaforo = determinarEstadoVencimiento(factura);
  const esAnulada = factura.estado === 'anulada';
  const esPagada = factura.estado === 'pagada' || factura.saldoPendiente <= 0;

  const emisionStr = factura.fechaEmision && typeof factura.fechaEmision.toDate === 'function'
    ? factura.fechaEmision.toDate().toLocaleDateString('es-CO')
    : new Date(factura.fechaEmision as unknown as string).toLocaleDateString('es-CO');

  const vencimientoStr = factura.fechaVencimiento && typeof factura.fechaVencimiento.toDate === 'function'
    ? factura.fechaVencimiento.toDate().toLocaleDateString('es-CO')
    : new Date(factura.fechaVencimiento as unknown as string).toLocaleDateString('es-CO');

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden my-6 mx-auto p-0"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 id={titleId} className="font-display font-bold text-lg text-white">
                Factura {factura.numeroFactura}
              </h2>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
                {factura.condicionPago === 'contado' ? 'Contado' : 'Crédito'}
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Proveedor: <strong className="text-neutral-300 font-medium">{factura.proveedorNombre}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle de factura"
          className="w-10 h-10 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Banner si está anulada */}
        {esAnulada && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <Ban className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <strong className="block font-semibold">FACTURA ANULADA</strong>
              <span>Motivo: {factura.motivoAnulacion || 'Sin motivo especificado'}</span>
            </div>
          </div>
        )}

        {/* Resumen de Valores COP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Total Factura
            </span>
            <span className="font-display font-bold text-base text-neutral-200">
              {formatCOP(factura.total)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Abonado
            </span>
            <span className="font-display font-bold text-base text-emerald-400">
              {formatCOP(factura.montoPagado)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Saldo Pendiente
            </span>
            <span
              className={`font-display font-bold text-base ${
                factura.saldoPendiente > 0 ? 'text-amber-400' : 'text-neutral-400'
              }`}
            >
              {formatCOP(factura.saldoPendiente)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Estado Vencimiento
            </span>
            <span
              className={`text-xs font-semibold inline-block mt-0.5 px-2 py-0.5 rounded ${
                esPagada
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : semaforo === 'vencida'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : semaforo === 'por_vencer'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
              }`}
            >
              {esPagada ? 'Saldada' : semaforo === 'vencida' ? 'Vencida' : semaforo === 'por_vencer' ? 'Por Vencer' : 'Al Día'}
            </span>
          </div>
        </div>

        {/* Fechas */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/80">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            Emisión: <strong className="text-neutral-200 font-medium">{emisionStr}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            Vencimiento: <strong className={`font-medium ${semaforo === 'vencida' && !esAnulada ? 'text-rose-400' : 'text-neutral-200'}`}>{vencimientoStr}</strong>
          </span>
          {factura.afectaInventario && (
            <span className="flex items-center gap-1.5 text-emerald-400/90 ml-auto">
              <Package className="w-3.5 h-3.5" />
              Ingresado a Kardex de bodega
            </span>
          )}
        </div>

        {/* Tabla de Conceptos / Ítems */}
        <div>
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-gold-400" />
            <span>Ítems / Conceptos Facturados</span>
          </h3>

          <div className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-900 border-b border-neutral-800 text-neutral-400 uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Descripción</th>
                  <th className="py-2.5 px-3 text-center">Cantidad</th>
                  <th className="py-2.5 px-3 text-right">Costo Unitario</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70 text-neutral-300">
                {factura.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-900/50">
                    <td className="py-2 px-3 font-medium text-white">
                      {item.descripcion}
                    </td>
                    <td className="py-2 px-3 text-center font-mono">
                      {item.cantidad} {item.unidad || ''}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatCOP(item.costoUnitario)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-neutral-200">
                      {formatCOP(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Pagos / Abonos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Historial de Abonos y Pagos</span>
            </h3>

            {!esPagada && !esAnulada && onAbrirAbono && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAbrirAbono(factura);
                }}
                className="text-xs font-bold text-gold-400 hover:text-gold-300 flex items-center gap-1 transition-colors"
              >
                <span>+ Registrar Abono</span>
              </button>
            )}
          </div>

          {cargandoPagos ? (
            <div className="p-4 text-center text-xs text-neutral-400 bg-neutral-950 rounded-xl border border-neutral-800">
              Cargando historial de pagos...
            </div>
          ) : pagos.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-950 rounded-xl border border-neutral-800">
              Aún no se han registrado abonos para esta factura.
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 overflow-hidden bg-neutral-950 divide-y divide-neutral-800/70">
              {pagos.map((pago) => {
                const pagoDateStr = pago.fechaPago && typeof pago.fechaPago.toDate === 'function'
                  ? pago.fechaPago.toDate().toLocaleString('es-CO')
                  : new Date(pago.fechaPago as unknown as string).toLocaleString('es-CO');

                return (
                  <div key={pago.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400">
                        {pago.metodoPago === 'efectivo' ? (
                          <Banknote className="w-4 h-4" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-neutral-200">
                          {formatCOP(pago.monto)} ·{' '}
                          <span className="capitalize font-normal text-neutral-400">
                            {pago.metodoPago}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-500">
                          {pagoDateStr}
                          {pago.referenciaComprobante ? ` · Ref: ${pago.referenciaComprobante}` : ''}
                        </span>
                      </div>
                    </div>

                    {pago.registradoPor && (
                      <span className="text-[11px] text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                        Por: {pago.registradoPor}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {factura.notas && (
          <div className="text-xs text-neutral-400 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
            <strong>Observaciones:</strong> {factura.notas}
          </div>
        )}

        {/* Botón cerrar */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </StorefrontDialog>
  );
}
