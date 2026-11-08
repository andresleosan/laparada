import { useState, useEffect, useId, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { X, Wallet, Check, Banknote, CreditCard } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  EmpleadoPersonal,
  MotivoValePersonal,
  CrearValeInput,
} from '@/types/personal';
import { MOTIVOS_VALE_CONFIG } from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';

interface RegistrarValeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CrearValeInput) => Promise<unknown>;
  empleados: EmpleadoPersonal[];
  empleadoPreseleccionado?: EmpleadoPersonal | null;
}

export function RegistrarValeModal({
  isOpen,
  onClose,
  onSubmit,
  empleados,
  empleadoPreseleccionado,
}: RegistrarValeModalProps) {
  const generatedId = useId();
  const titleId = `modal-vale-${generatedId.replace(/:/g, '')}-title`;

  const [empleadoId, setEmpleadoId] = useState('');
  const [monto, setMonto] = useState<number>(20000);
  const [motivo, setMotivo] = useState<MotivoValePersonal>('adelanto_sueldo');
  const [metodoEntrega, setMetodoEntrega] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [crearGastoCaja, setCrearGastoCaja] = useState(true);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const empInicial = empleadoPreseleccionado || empleados[0] || null;
    setEmpleadoId(empInicial?.id || '');
    setMonto(20000);
    setMotivo('adelanto_sueldo');
    setMetodoEntrega('efectivo');
    setCrearGastoCaja(true);
    setNotas('');
    setErrorLocal(null);
  }, [isOpen, empleadoPreseleccionado, empleados]);

  if (!isOpen) return null;

  const empleadoSeleccionado = empleados.find((e) => e.id === empleadoId);

  const montosRapidos = [10000, 20000, 30000, 50000];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!empleadoSeleccionado) {
      setErrorLocal('Selecciona el colaborador que recibe el vale o adelanto.');
      return;
    }

    const montoLimpio = Math.max(0, Math.round(Number(monto) || 0));
    if (montoLimpio <= 0) {
      setErrorLocal('El monto del vale debe ser mayor a $ 0 COP.');
      return;
    }

    setGuardando(true);
    try {
      await onSubmit({
        empleadoId: empleadoSeleccionado.id,
        empleadoNombre: empleadoSeleccionado.nombre,
        fecha: Timestamp.now(),
        monto: montoLimpio,
        motivo,
        metodoEntrega,
        crearGastoCaja,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'No se pudo registrar el vale.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display font-bold text-lg text-white">
                Registrar Vale / Adelanto de Nómina
              </h2>
              <p className="text-xs text-neutral-400">
                Se descontará automáticamente en la próxima liquidación
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de vale"
            className="h-11 w-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorLocal && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
              {errorLocal}
            </div>
          )}

          {/* Colaborador */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Colaborador *
            </label>
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              required
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
            >
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Motivo del Vale */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Concepto del Vale / Descuento *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                Object.entries(MOTIVOS_VALE_CONFIG) as [
                  MotivoValePersonal,
                  { label: string; badgeBg: string }
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={motivo === key}
                  onClick={() => setMotivo(key)}
                  className={`h-11 px-3 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-all ${
                    motivo === key
                      ? 'bg-gold-400/15 border-gold-400 text-gold-400 shadow'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="truncate">{cfg.label}</span>
                  {motivo === key && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Monto + Botones Rápidos */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Valor del Vale en COP *
            </label>
            <input
              type="number"
              min={1000}
              step={1000}
              required
              value={monto || ''}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400 font-display font-black text-base focus:border-gold-400 focus:outline-none"
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {montosRapidos.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMonto(val)}
                  className={`h-11 rounded-xl text-xs font-bold border transition-all ${
                    monto === val
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  {formatCOP(val)}
                </button>
              ))}
            </div>
          </div>

          {/* Medio de Entrega */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Medio de Entrega
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={metodoEntrega === 'efectivo'}
                onClick={() => setMetodoEntrega('efectivo')}
                className={`h-11 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  metodoEntrega === 'efectivo'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Efectivo de Caja</span>
              </button>

              <button
                type="button"
                aria-pressed={metodoEntrega === 'transferencia'}
                onClick={() => setMetodoEntrega('transferencia')}
                className={`h-11 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  metodoEntrega === 'transferencia'
                    ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Transferencia Manual</span>
              </button>
            </div>
          </div>

          {/* Toggle Egreso en Caja */}
          <button
            type="button"
            aria-pressed={crearGastoCaja}
            onClick={() => setCrearGastoCaja((prev) => !prev)}
            className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
              crearGastoCaja
                ? 'bg-gold-400/10 border-gold-400/40 text-gold-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <div>
              <span className="text-xs font-bold block">
                Registrar salida inmediata en Gastos / Caja
              </span>
              <span className="text-[11px] opacity-80">
                {crearGastoCaja
                  ? 'Se descuenta hoy del efectivo esperado en caja'
                  : 'Solo descontar en nómina (ej. consumo interno)'}
              </span>
            </div>
            <span className="text-xs font-black uppercase">
              {crearGastoCaja ? 'SÍ' : 'NO'}
            </span>
          </button>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Detalle / Justificación
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Adelanto autorizado para transporte / Cena de turno"
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs sm:text-sm transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{guardando ? 'Registrando...' : 'Confirmar Vale'}</span>
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
