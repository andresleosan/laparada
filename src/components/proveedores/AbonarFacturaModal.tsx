import { useState, useId, type FormEvent } from 'react';
import { X, DollarSign, CreditCard, Banknote, CheckCircle } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { FacturaCompra, RegistrarPagoFacturaInput } from '@/types/proveedor';
import { formatCOP } from '@/utils/formatCOP';

interface AbonarFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  factura: FacturaCompra | null;
  onSubmit: (facturaId: string, data: RegistrarPagoFacturaInput) => Promise<unknown>;
  cargando?: boolean;
}

export function AbonarFacturaModal({
  isOpen,
  onClose,
  factura,
  onSubmit,
  cargando = false,
}: AbonarFacturaModalProps) {
  const generatedId = useId();
  const titleId = `modal-abonar-factura-${generatedId.replace(/:/g, '')}-title`;

  const saldoPendiente = factura?.saldoPendiente || 0;

  const [monto, setMonto] = useState<number>(saldoPendiente);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [referenciaComprobante, setReferenciaComprobante] = useState('');
  const [crearGastoCaja, setCrearGastoCaja] = useState(true);
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  if (!isOpen || !factura) return null;

  const handlePagarTotal = () => {
    setMonto(saldoPendiente);
  };

  const nuevoSaldo = Math.max(0, saldoPendiente - (Number(monto) || 0));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const valMonto = Math.round(Number(monto) || 0);
    if (valMonto <= 0) {
      setErrorLocal('Ingresa un monto de pago mayor a $ 0 COP.');
      return;
    }

    if (valMonto > saldoPendiente) {
      setErrorLocal(`El monto ingresado (${formatCOP(valMonto)}) supera el saldo pendiente (${formatCOP(saldoPendiente)}).`);
      return;
    }

    try {
      await onSubmit(factura.id, {
        monto: valMonto,
        metodoPago,
        referenciaComprobante: referenciaComprobante.trim() || undefined,
        crearGastoCaja,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al registrar el pago de la factura.');
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="w-full max-w-md bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden my-6 mx-auto p-0"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="font-display font-bold text-lg text-white">
              Abonar a Factura
            </h2>
            <p className="text-xs text-neutral-400">
              {factura.numeroFactura} · {factura.proveedorNombre}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de abono"
          className="w-10 h-10 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorLocal && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorLocal}
          </div>
        )}

        {/* Resumen actual de la factura */}
        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Total Factura
            </span>
            <span className="font-display font-bold text-sm text-neutral-300">
              {formatCOP(factura.total)}
            </span>
            <span className="text-[11px] text-neutral-500 block">
              Ya abonado: {formatCOP(factura.montoPagado)}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Saldo Pendiente
            </span>
            <span className="font-display font-black text-base text-amber-400">
              {formatCOP(saldoPendiente)}
            </span>
          </div>
        </div>

        {/* Monto a Abonar y Botón Rápido */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="abono-monto" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Monto a Abonar (COP) <span className="text-gold-400">*</span>
            </label>
            <button
              type="button"
              onClick={handlePagarTotal}
              className="text-xs font-bold text-gold-400 hover:text-gold-300 transition-colors"
            >
              Liquidar Saldo Total ({formatCOP(saldoPendiente)})
            </button>
          </div>
          <input
            id="abono-monto"
            type="number"
            min="100"
            max={saldoPendiente}
            step="100"
            required
            value={monto || ''}
            onChange={(e) => setMonto(parseInt(e.target.value, 10) || 0)}
            className="w-full px-4 py-3 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-display font-bold text-xl text-center focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Proyección del Nuevo Saldo */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs">
          <span className="text-neutral-400">Saldo tras este abono:</span>
          <span className={`font-display font-bold text-sm ${nuevoSaldo === 0 ? 'text-emerald-400' : 'text-neutral-200'}`}>
            {formatCOP(nuevoSaldo)} {nuevoSaldo === 0 && '🎉 (Saldada)'}
          </span>
        </div>

        {/* Método de Pago */}
        <div>
          <span className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
            Método de Pago
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMetodoPago('efectivo')}
              className={`h-11 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                metodoPago === 'efectivo'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Efectivo</span>
            </button>

            <button
              type="button"
              onClick={() => setMetodoPago('transferencia')}
              className={`h-11 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                metodoPago === 'transferencia'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Transferencia</span>
            </button>
          </div>
        </div>

        {/* Referencia Comprobante */}
        <div>
          <label htmlFor="abono-ref" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            N° de Comprobante / Recibo
          </label>
          <input
            id="abono-ref"
            type="text"
            value={referenciaComprobante}
            onChange={(e) => setReferenciaComprobante(e.target.value)}
            placeholder="Ej: Nequi # 8912 o Recibo firmado # 045"
            className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Checkbox Gasto de Caja */}
        <label className="flex items-center gap-2 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={crearGastoCaja}
            onChange={(e) => setCrearGastoCaja(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-gold-400 focus:ring-gold-400"
          />
          <span className="text-xs text-neutral-300">
            💰 Registrar de inmediato como egreso en Gastos operativos (Insumos)
          </span>
        </label>

        {/* Notas */}
        <div>
          <label htmlFor="abono-notas" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Notas u Observaciones
          </label>
          <input
            id="abono-notas"
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Abono acordado, entrega parcial, etc."
            className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Botones de acción */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={cargando || (Number(monto) || 0) <= 0}
            className="h-11 px-6 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{cargando ? 'Procesando...' : 'Confirmar Abono'}</span>
          </button>
        </div>
      </form>
    </StorefrontDialog>
  );
}
