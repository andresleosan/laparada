import { useState, useEffect, useId } from 'react';
import { Banknote, CheckCircle2, Landmark, MessageCircle, Wallet, X } from 'lucide-react';
import type { CuentaCorriente, MetodoPago, MovimientoCartera, RegistrarAbonoCarteraInput } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  generarMensajeReciboAbonoWhatsApp,
  generarUrlWhatsAppCartera,
} from '@/utils/carteraUtils';

interface RegistrarAbonoModalProps {
  isOpen: boolean;
  cuenta: CuentaCorriente | null;
  negocioNombre: string;
  guardando?: boolean;
  onClose: () => void;
  onConfirmarAbono: (
    input: RegistrarAbonoCarteraInput
  ) => Promise<{ cuenta: CuentaCorriente; movimiento: MovimientoCartera }>;
}

export function RegistrarAbonoModal({
  isOpen,
  cuenta,
  negocioNombre,
  guardando = false,
  onClose,
  onConfirmarAbono,
}: RegistrarAbonoModalProps) {
  const titleId = `modal-abono-${useId().replace(/:/g, '')}`;
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [reciboConfirmado, setReciboConfirmado] = useState<{
    cuenta: CuentaCorriente;
    movimiento: MovimientoCartera;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !cuenta) return;
    setMonto(String(cuenta.saldoActual));
    setMetodoPago('efectivo');
    setReferenciaTransferencia('');
    setNotas('');
    setError('');
    setReciboConfirmado(null);
  }, [isOpen, cuenta]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cuenta) return null;

  const montoNum = Number(monto) || 0;
  const saldoRestante = Math.max(0, cuenta.saldoActual - montoNum);

  const aplicarPorcentaje = (porcentaje: number) => {
    const calculado = Math.max(1000, Math.round((cuenta.saldoActual * porcentaje) / 100));
    setMonto(String(Math.min(cuenta.saldoActual, calculado)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto de abono válido mayor a $0.');
      return;
    }
    if (montoNum > cuenta.saldoActual) {
      setError(`El abono no puede superar el saldo pendiente (${formatCOP(cuenta.saldoActual)}).`);
      return;
    }

    try {
      setError('');
      const res = await onConfirmarAbono({
        cuentaCorrienteId: cuenta.id,
        monto: Math.round(montoNum),
        metodoPago,
        referenciaTransferencia:
          metodoPago === 'transferencia' ? referenciaTransferencia.trim() || undefined : undefined,
        notas: notas.trim() || undefined,
      });
      setReciboConfirmado(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el abono');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
              <Wallet className="h-3 w-3" aria-hidden="true" />
              Recaudo 100% Offline
            </span>
            <h2 id={titleId} className="font-display text-xl font-black text-white mt-1">
              {reciboConfirmado ? 'Abono Confirmado' : 'Registrar Abono a Cartera'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">{cuenta.clienteNombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de abono"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {reciboConfirmado ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center space-y-1.5">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Comprobante {reciboConfirmado.movimiento.codigoComprobante}
              </p>
              <p className="font-display text-2xl font-black text-white">
                {formatCOP(reciboConfirmado.movimiento.monto)}
              </p>
              <p className="text-xs text-neutral-300">
                Nuevo saldo pendiente:{' '}
                <strong className="text-gold-400">
                  {formatCOP(reciboConfirmado.cuenta.saldoActual)}
                </strong>
              </p>
            </div>

            <a
              href={generarUrlWhatsAppCartera(
                reciboConfirmado.cuenta.clienteTelefono,
                generarMensajeReciboAbonoWhatsApp(
                  reciboConfirmado.cuenta,
                  reciboConfirmado.movimiento,
                  negocioNombre
                )
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-neutral-950 hover:bg-emerald-400 transition-colors"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Enviar Recibo de Abono por WhatsApp
            </a>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-800 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Resumen de saldo actual */}
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-3.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Saldo Pendiente Actual
                </p>
                <p className="font-display text-2xl font-black text-gold-400">
                  {formatCOP(cuenta.saldoActual)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Saldo Tras Abono
                </p>
                <p className="font-display text-lg font-bold text-emerald-400">
                  {formatCOP(saldoRestante)}
                </p>
              </div>
            </div>

            {/* Botones rápidos de monto */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Monto del Abono (COP)
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => aplicarPorcentaje(25)}
                  className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 text-xs font-bold text-neutral-300 hover:border-gold-400/50 hover:text-gold-400"
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => aplicarPorcentaje(50)}
                  className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 text-xs font-bold text-neutral-300 hover:border-gold-400/50 hover:text-gold-400"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={() => setMonto(String(cuenta.saldoActual))}
                  className="min-h-[44px] rounded-xl border border-gold-400/40 bg-gold-400/10 text-xs font-black text-gold-300 hover:bg-gold-400/20"
                >
                  100% Total
                </button>
              </div>
              <input
                type="number"
                min="1"
                max={cuenta.saldoActual}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={guardando}
                aria-label="Monto del abono en COP"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 font-display text-xl font-black text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            {/* Método de pago 100% offline */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Medio de Recaudo (Offline)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={metodoPago === 'efectivo'}
                  onClick={() => setMetodoPago('efectivo')}
                  className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                    metodoPago === 'efectivo'
                      ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                  }`}
                >
                  <Banknote className="h-4 w-4" aria-hidden="true" />
                  Efectivo
                </button>
                <button
                  type="button"
                  aria-pressed={metodoPago === 'transferencia'}
                  onClick={() => setMetodoPago('transferencia')}
                  className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                    metodoPago === 'transferencia'
                      ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                  }`}
                >
                  <Landmark className="h-4 w-4" aria-hidden="true" />
                  Transferencia
                </button>
              </div>
            </div>

            {metodoPago === 'transferencia' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Referencia / Comprobante (Nequi, Bancolombia, Daviplata)
                </label>
                <input
                  type="text"
                  value={referenciaTransferencia}
                  onChange={(e) => setReferenciaTransferencia(e.target.value)}
                  disabled={guardando}
                  placeholder="Ej: Nequi #847291"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Observaciones (Opcional)
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={guardando}
                placeholder="Ej: Abono quincena"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-300"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={guardando}
                className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="min-h-[44px] rounded-xl bg-gold-400 px-5 text-xs font-black text-base-dark hover:bg-gold-500 disabled:opacity-50"
              >
                {guardando ? 'Registrando...' : 'Confirmar Abono'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
