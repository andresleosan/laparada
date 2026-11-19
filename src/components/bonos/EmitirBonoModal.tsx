import { useState, useEffect, useId } from 'react';
import {
  Banknote,
  CreditCard,
  Gift,
  Landmark,
  Ticket,
  X,
} from 'lucide-react';
import type {
  Cliente,
  EmitirBonoInput,
  MetodoPago,
  TipoBonoPrepago,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  MONTOS_RAPIDOS_BONO_COP,
  VIGENCIAS_RAPIDAS_BONO_DIAS,
} from '@/utils/bonosUtils';

interface EmitirBonoModalProps {
  isOpen: boolean;
  clientes?: Cliente[];
  guardando?: boolean;
  onClose: () => void;
  onEmitir: (input: EmitirBonoInput) => Promise<void>;
}

export function EmitirBonoModal({
  isOpen,
  clientes = [],
  guardando = false,
  onClose,
  onEmitir,
}: EmitirBonoModalProps) {
  const titleId = `modal-emitir-bono-${useId().replace(/:/g, '')}`;
  const [tipo, setTipo] = useState<TipoBonoPrepago>('bono_regalo');
  const [clienteId, setClienteId] = useState('');
  const [titularNombre, setTitularNombre] = useState('');
  const [titularTelefono, setTitularTelefono] = useState('');
  const [compradorNombre, setCompradorNombre] = useState('');
  const [mensajeRegalo, setMensajeRegalo] = useState('');
  const [montoInicial, setMontoInicial] = useState('50000');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('');
  const [vigenciaDias, setVigenciaDias] = useState<string>('90');
  const [recargable, setRecargable] = useState(true);
  const [codigoPersonalizado, setCodigoPersonalizado] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTipo('bono_regalo');
    setClienteId('');
    setTitularNombre('');
    setTitularTelefono('');
    setCompradorNombre('');
    setMensajeRegalo('');
    setMontoInicial('50000');
    setMetodoPago('efectivo');
    setReferenciaTransferencia('');
    setVigenciaDias('90');
    setRecargable(true);
    setCodigoPersonalizado('');
    setNotas('');
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSeleccionarCliente = (id: string) => {
    setClienteId(id);
    const cli = clientes.find((c) => c.id === id);
    if (cli) {
      setTitularNombre(cli.nombre);
      setTitularTelefono(cli.telefono || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Number(montoInicial);
    if (!titularNombre.trim()) {
      setError('Ingresa el nombre del titular o beneficiario del bono.');
      return;
    }
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto de carga válido mayor a $0 COP.');
      return;
    }

    const vigNum = vigenciaDias === '' ? null : Number(vigenciaDias);
    try {
      setError('');
      await onEmitir({
        tipo,
        codigoPersonalizado: codigoPersonalizado.trim() || undefined,
        titularNombre: titularNombre.trim(),
        titularTelefono: titularTelefono.trim() || undefined,
        compradorNombre: compradorNombre.trim() || undefined,
        clienteId: clienteId || undefined,
        mensajeRegalo: mensajeRegalo.trim() || undefined,
        montoInicial: Math.round(montoNum),
        metodoPago,
        referenciaTransferencia:
          metodoPago === 'transferencia'
            ? referenciaTransferencia.trim() || undefined
            : undefined,
        vigenciaDias:
          vigNum !== null && Number.isFinite(vigNum) && vigNum > 0
            ? Math.round(vigNum)
            : null,
        recargable,
        notas: notas.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo emitir el bono');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400">
              <Gift className="h-3 w-3" aria-hidden="true" />
              Emisión 100% Offline con QR
            </span>
            <h2 id={titleId} className="font-display text-xl font-black text-white mt-1">
              Emitir Bono, Tarjeta Prepago o Vale
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de emisión de bono"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Modalidad */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Tipo de Instrumento
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'bono_regalo', label: 'Bono Regalo', icon: Gift },
                  { id: 'tarjeta_prepago', label: 'Prepago', icon: CreditCard },
                  { id: 'vale_consumo', label: 'Vale Consumo', icon: Ticket },
                ] as const
              ).map((opt) => {
                const Icon = opt.icon;
                const active = tipo === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setTipo(opt.id);
                      setRecargable(opt.id !== 'vale_consumo');
                    }}
                    className={`min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-colors ${
                      active
                        ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cliente frecuente opcional */}
          {clientes.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Vincular a Cliente Registrado (Opcional)
              </label>
              <select
                value={clienteId}
                onChange={(e) => handleSeleccionarCliente(e.target.value)}
                disabled={guardando}
                aria-label="Vincular cliente existente"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="">Ingresar datos manualmente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.telefono})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Titular y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Titular / Beneficiario *
              </label>
              <input
                type="text"
                required
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                disabled={guardando}
                placeholder="Ej: Laura Martínez"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                WhatsApp del Titular (Opcional)
              </label>
              <input
                type="tel"
                value={titularTelefono}
                onChange={(e) => setTitularTelefono(e.target.value)}
                disabled={guardando}
                placeholder="Ej: 3105551234"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Comprador / Dedicatoria */}
          {tipo === 'bono_regalo' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Quien Regala (Opcional)
                </label>
                <input
                  type="text"
                  value={compradorNombre}
                  onChange={(e) => setCompradorNombre(e.target.value)}
                  disabled={guardando}
                  placeholder="Ej: Andrés Gómez"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Mensaje / Dedicatoria
                </label>
                <input
                  type="text"
                  value={mensajeRegalo}
                  onChange={(e) => setMensajeRegalo(e.target.value)}
                  disabled={guardando}
                  placeholder="Ej: ¡Feliz cumpleaños!"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Monto inicial */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Carga de Saldo Inicial (COP) *
            </label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              disabled={guardando}
              aria-label="Monto inicial en COP"
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 font-display text-xl font-black text-gold-400 focus:border-gold-400 focus:outline-none"
            />
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {MONTOS_RAPIDOS_BONO_COP.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  onClick={() => setMontoInicial(String(monto))}
                  className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-2 text-xs font-bold text-neutral-300 hover:border-gold-400/60 hover:text-gold-400 transition-colors"
                >
                  {formatCOP(monto)}
                </button>
              ))}
            </div>
          </div>

          {/* Método de recaudo offline */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Medio de Pago Offline de la Carga
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
                Referencia de Transferencia (Nequi / Bancolombia / Daviplata)
              </label>
              <input
                type="text"
                value={referenciaTransferencia}
                onChange={(e) => setReferenciaTransferencia(e.target.value)}
                disabled={guardando}
                placeholder="Ej: Nequi #884210"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          )}

          {/* Control de Vigencia */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Vigencia del Bono (Días)
            </span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VIGENCIAS_RAPIDAS_BONO_DIAS.map((dias) => (
                <button
                  key={dias}
                  type="button"
                  aria-pressed={vigenciaDias === String(dias)}
                  onClick={() => setVigenciaDias(String(dias))}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                    vigenciaDias === String(dias)
                      ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                  }`}
                >
                  {dias}d
                </button>
              ))}
              <button
                type="button"
                aria-pressed={vigenciaDias === ''}
                onClick={() => setVigenciaDias('')}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                  vigenciaDias === ''
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                }`}
              >
                Sin Vencimiento
              </button>
            </div>
          </div>

          {/* Opciones avanzadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Código Personalizado (Opcional)
              </label>
              <input
                type="text"
                value={codigoPersonalizado}
                onChange={(e) => setCodigoPersonalizado(e.target.value)}
                disabled={guardando}
                placeholder="Auto-generado si se deja vacío"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 font-mono text-xs uppercase text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <label className="min-h-[44px] flex items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 text-xs font-bold text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={recargable}
                onChange={(e) => setRecargable(e.target.checked)}
                disabled={guardando}
                className="h-4 w-4 rounded border-neutral-700 text-gold-400"
              />
              <span>Permitir recargas posteriores</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Notas Administrativas (Opcional)
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={guardando}
              placeholder="Ej: Convenio empresa o premio cliente frecuente"
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
              {guardando ? 'Emitiendo...' : 'Emitir Bono y Generar QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
