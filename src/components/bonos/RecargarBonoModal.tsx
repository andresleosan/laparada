import { useState, useEffect, useId } from 'react';
import {
  Banknote,
  CheckCircle2,
  Landmark,
  MessageCircle,
  PlusCircle,
  X,
} from 'lucide-react';
import type {
  BonoPrepago,
  MetodoPago,
  MovimientoBono,
  RecargarBonoInput,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  generarMensajeRecargaBonoWhatsApp,
  generarUrlWhatsAppBono,
  MONTOS_RAPIDOS_BONO_COP,
} from '@/utils/bonosUtils';

interface RecargarBonoModalProps {
  isOpen: boolean;
  bono: BonoPrepago | null;
  negocioNombre: string;
  guardando?: boolean;
  onClose: () => void;
  onConfirmarRecarga: (
    input: RecargarBonoInput
  ) => Promise<{ bono: BonoPrepago; movimiento: MovimientoBono }>;
}

export function RecargarBonoModal({
  isOpen,
  bono,
  negocioNombre,
  guardando = false,
  onClose,
  onConfirmarRecarga,
}: RecargarBonoModalProps) {
  const titleId = `modal-recargar-bono-${useId().replace(/:/g, '')}`;
  const [monto, setMonto] = useState('50000');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [extenderVigenciaDias, setExtenderVigenciaDias] = useState('30');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');
  const [comprobante, setComprobante] = useState<{
    bono: BonoPrepago;
    movimiento: MovimientoBono;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !bono) return;
    setMonto('50000');
    setMetodoPago('efectivo');
    setReferenciaTransferencia('');
    setExtenderVigenciaDias(bono.fechaVencimiento ? '30' : '');
    setNotas('');
    setError('');
    setComprobante(null);
  }, [isOpen, bono]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !bono) return null;

  const montoNum = Number(monto) || 0;
  const nuevoSaldoProyectado = bono.saldoActual + Math.max(0, Math.round(montoNum));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto de recarga válido mayor a $0.');
      return;
    }

    try {
      setError('');
      const diasExtra =
        extenderVigenciaDias && Number(extenderVigenciaDias) > 0
          ? Math.round(Number(extenderVigenciaDias))
          : null;

      const res = await onConfirmarRecarga({
        bonoId: bono.id,
        monto: Math.round(montoNum),
        metodoPago,
        referenciaTransferencia:
          metodoPago === 'transferencia'
            ? referenciaTransferencia.trim() || undefined
            : undefined,
        extenderVigenciaDias: diasExtra,
        notas: notas.trim() || undefined,
      });
      setComprobante(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo recargar el bono');
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
              <PlusCircle className="h-3 w-3" aria-hidden="true" />
              Recarga Offline
            </span>
            <h2 id={titleId} className="font-display text-xl font-black text-white mt-1">
              {comprobante ? 'Recarga Confirmada' : 'Recargar Saldo'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {bono.titularNombre} · <span className="font-mono text-gold-400">{bono.codigo}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de recarga"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {comprobante ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-center space-y-1.5">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Comprobante {comprobante.movimiento.codigoComprobante}
              </p>
              <p className="font-display text-2xl font-black text-white">
                +{formatCOP(comprobante.movimiento.monto)}
              </p>
              <p className="text-xs text-neutral-300">
                Nuevo saldo disponible:{' '}
                <strong className="text-gold-400">
                  {formatCOP(comprobante.bono.saldoActual)}
                </strong>
              </p>
            </div>

            <a
              href={generarUrlWhatsAppBono(
                comprobante.bono.titularTelefono,
                generarMensajeRecargaBonoWhatsApp(
                  comprobante.bono,
                  comprobante.movimiento,
                  negocioNombre
                )
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-xs font-black text-neutral-950 hover:bg-emerald-400 transition-colors"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Enviar Comprobante de Recarga por WhatsApp
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
            <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 p-3.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Saldo Actual
                </p>
                <p className="font-display text-xl font-black text-white">
                  {formatCOP(bono.saldoActual)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Saldo Proyectado
                </p>
                <p className="font-display text-xl font-black text-emerald-400">
                  {formatCOP(nuevoSaldoProyectado)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Monto a Recargar (COP)
              </label>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {MONTOS_RAPIDOS_BONO_COP.slice(0, 3).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonto(String(m))}
                    className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 text-xs font-bold text-neutral-300 hover:border-gold-400/50 hover:text-gold-400"
                  >
                    +{formatCOP(m)}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1000"
                step="1000"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={guardando}
                aria-label="Monto a recargar en COP"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 font-display text-xl font-black text-gold-400 focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Medio de Recaudo Offline
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
                  Referencia de Transferencia
                </label>
                <input
                  type="text"
                  value={referenciaTransferencia}
                  onChange={(e) => setReferenciaTransferencia(e.target.value)}
                  disabled={guardando}
                  placeholder="Ej: Nequi #551290"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Extender Vigencia (Días adicionales, opcional)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={extenderVigenciaDias}
                onChange={(e) => setExtenderVigenciaDias(e.target.value)}
                disabled={guardando}
                placeholder="0 para mantener fecha actual"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Notas (Opcional)
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                disabled={guardando}
                placeholder="Ej: Recarga en caja turno noche"
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
                {guardando ? 'Recargando...' : 'Confirmar Recarga'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
