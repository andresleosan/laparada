import { useState, useId, useEffect, useRef, type FormEvent } from 'react';
import {
  Banknote,
  Building,
  FileText,
  UserCheck,
  X,
} from 'lucide-react';
import type { DesempenoMesero, CrearLiquidacionMeseroInput } from '@/types/mesero';
import { formatCOP } from '@/utils/formatCOP';

export interface LiquidarMeseroModalProps {
  isOpen: boolean;
  desempeno: DesempenoMesero | null;
  periodoTexto: string;
  onClose: () => void;
  onConfirmarLiquidacion: (input: CrearLiquidacionMeseroInput) => Promise<void>;
  cargando?: boolean;
}

export function LiquidarMeseroModal({
  isOpen,
  desempeno,
  periodoTexto,
  onClose,
  onConfirmarLiquidacion,
  cargando = false,
}: LiquidarMeseroModalProps) {
  const generatedId = useId();
  const titleId = `modal-liquidar-mesero-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [notas, setNotas] = useState('');
  const [registrarGastoCaja, setRegistrarGastoCaja] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !desempeno) return null;

  const hoyStr = new Date().toISOString().slice(0, 10);
  const totalAPagar = desempeno.totalIncentivos;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (totalAPagar <= 0) {
      setErrorLocal('El monto a liquidar debe ser mayor a cero.');
      return;
    }

    try {
      await onConfirmarLiquidacion({
        meseroId: desempeno.meseroId,
        meseroNombre: desempeno.meseroNombre,
        periodoDesde: hoyStr,
        periodoHasta: hoyStr,
        totalVentas: desempeno.totalVentas,
        totalPropinas: desempeno.totalPropinas,
        totalComisiones: desempeno.comisionVentas,
        totalLiquidado: totalAPagar,
        metodoPago,
        referenciaPago: referenciaPago.trim() || undefined,
        notas: notas.trim() || undefined,
        registrarGastoCaja,
      });
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al registrar liquidación.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Liquidar Incentivos
              </h2>
              <p className="text-xs text-neutral-400">
                {desempeno.meseroNombre} · {periodoTexto}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorLocal && (
          <div className="mt-4 rounded-xl bg-red-950/50 border border-red-500/50 p-3 text-xs text-red-300">
            {errorLocal}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Desglose de Liquidación */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Ventas Atendidas ({desempeno.cantidadVentas} cuentas)</span>
              <span className="font-medium text-white">{formatCOP(desempeno.totalVentas)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Propinas Directas ({desempeno.propinaDirecta === desempeno.totalPropinas ? '100%' : 'Directa'})</span>
              <span className="font-medium text-emerald-400">+{formatCOP(desempeno.propinaDirecta)}</span>
            </div>

            {desempeno.comisionVentas > 0 && (
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Comisión de Ventas ({desempeno.porcentajeComision}%)</span>
                <span className="font-medium text-amber-400">+{formatCOP(desempeno.comisionVentas)}</span>
              </div>
            )}

            <div className="border-t border-neutral-800 pt-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Total a Entregar</span>
                <p className="text-[10px] text-neutral-500">Incentivos netos de salón</p>
              </div>
              <span className="font-display text-2xl font-black text-amber-300">
                {formatCOP(totalAPagar)}
              </span>
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                aria-pressed={metodoPago === 'efectivo'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
                  metodoPago === 'efectivo'
                    ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                    : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                aria-pressed={metodoPago === 'transferencia'}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
                  metodoPago === 'transferencia'
                    ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                    : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                <Building className="h-4 w-4" />
                <span>Transferencia</span>
              </button>
            </div>
          </div>

          {/* Referencia de Pago (si es transferencia) */}
          {metodoPago === 'transferencia' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
                Referencia / Comprobante de Transferencia
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  placeholder="Ej. Nequi # 829141"
                />
              </div>
            </div>
          )}

          {/* Salida de Caja / Egreso Contable */}
          <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3 cursor-pointer hover:border-neutral-700 transition-colors">
            <input
              type="checkbox"
              checked={registrarGastoCaja}
              onChange={(e) => setRegistrarGastoCaja(e.target.checked)}
              className="h-5 w-5 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500"
            />
            <div className="text-xs">
              <span className="font-bold text-white block">Registrar salida contable de caja</span>
              <span className="text-neutral-400">Emite egreso en la categoría 'salarios' para cuadre de caja</span>
            </div>
          </label>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1">
              Notas u observaciones (opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              placeholder="Ej. Liquidación turno tarde salón principal"
            />
          </div>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || totalAPagar <= 0}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {cargando ? 'Procesando...' : 'Confirmar y Pagar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
