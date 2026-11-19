import { useState, useEffect, useId } from 'react';
import { Building2, CreditCard, Lock, ShieldCheck, X } from 'lucide-react';
import type { Cliente, ConfigurarCuentaCorrienteInput, CuentaCorriente } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

interface ConfigurarCupoModalProps {
  isOpen: boolean;
  clientes: Cliente[];
  cuentaEditar?: CuentaCorriente | null;
  clientePreseleccionado?: Cliente | null;
  guardando?: boolean;
  onClose: () => void;
  onGuardar: (input: ConfigurarCuentaCorrienteInput) => Promise<void>;
}

const CUPOS_SUGERIDOS = [100000, 200000, 500000, 1000000];
const PLAZOS_SUGERIDOS = [7, 15, 30, 45];

export function ConfigurarCupoModal({
  isOpen,
  clientes,
  cuentaEditar = null,
  clientePreseleccionado = null,
  guardando = false,
  onClose,
  onGuardar,
}: ConfigurarCupoModalProps) {
  const titleId = `modal-cupo-${useId().replace(/:/g, '')}`;
  const [clienteId, setClienteId] = useState('');
  const [cupoCredito, setCupoCredito] = useState('200000');
  const [plazoDias, setPlazoDias] = useState('15');
  const [empresa, setEmpresa] = useState('');
  const [nit, setNit] = useState('');
  const [estado, setEstado] = useState<'activa' | 'bloqueada'>('activa');
  const [bloqueoMotivo, setBloqueoMotivo] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (cuentaEditar) {
      setClienteId(cuentaEditar.clienteId);
      setCupoCredito(String(cuentaEditar.cupoCredito));
      setPlazoDias(String(cuentaEditar.plazoDias));
      setEmpresa(cuentaEditar.empresa || '');
      setNit(cuentaEditar.nit || '');
      setEstado(cuentaEditar.estado);
      setBloqueoMotivo(cuentaEditar.bloqueoMotivo || '');
      setNotas(cuentaEditar.notas || '');
    } else if (clientePreseleccionado) {
      setClienteId(clientePreseleccionado.id);
      setCupoCredito(String(clientePreseleccionado.cupoCredito || 200000));
      setPlazoDias(String(clientePreseleccionado.plazoDiasCredito || 15));
      setEmpresa(clientePreseleccionado.empresa || '');
      setNit(clientePreseleccionado.nit || '');
      setEstado(clientePreseleccionado.creditoBloqueado ? 'bloqueada' : 'activa');
      setBloqueoMotivo('');
      setNotas('');
    } else {
      setClienteId(clientes[0]?.id || '');
      setCupoCredito('200000');
      setPlazoDias('15');
      setEmpresa('');
      setNit('');
      setEstado('activa');
      setBloqueoMotivo('');
      setNotas('');
    }
    setError('');
  }, [isOpen, cuentaEditar, clientePreseleccionado, clientes]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const clienteActual =
    clientes.find((c) => c.id === clienteId) ||
    (cuentaEditar
      ? {
          id: cuentaEditar.clienteId,
          nombre: cuentaEditar.clienteNombre,
          telefono: cuentaEditar.clienteTelefono,
        }
      : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteActual) {
      setError('Selecciona un cliente del directorio para habilitar su cuenta corriente.');
      return;
    }
    const cupoNum = Number(cupoCredito);
    const plazoNum = Number(plazoDias);
    if (!Number.isFinite(cupoNum) || cupoNum < 0) {
      setError('Ingresa un cupo de crédito válido en COP.');
      return;
    }
    if (!Number.isFinite(plazoNum) || plazoNum < 1 || plazoNum > 180) {
      setError('El plazo debe estar entre 1 y 180 días.');
      return;
    }

    try {
      setError('');
      await onGuardar({
        clienteId: clienteActual.id,
        clienteNombre: clienteActual.nombre,
        clienteTelefono: clienteActual.telefono,
        cupoCredito: Math.round(cupoNum),
        plazoDias: Math.round(plazoNum),
        empresa: empresa.trim() || undefined,
        nit: nit.trim() || undefined,
        estado,
        bloqueoMotivo: estado === 'bloqueada' ? bloqueoMotivo.trim() || undefined : undefined,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cuenta corriente');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400">
              <CreditCard className="h-3 w-3" aria-hidden="true" />
              Fiado Controlado Offline
            </span>
            <h2 id={titleId} className="font-display text-xl font-black text-white mt-1">
              {cuentaEditar ? 'Configurar Cupo de Crédito' : 'Habilitar Cuenta Corriente'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de cupo de crédito"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Selector de Cliente */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Cliente del Directorio
            </label>
            {cuentaEditar ? (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm font-bold text-white">
                {cuentaEditar.clienteNombre} · {cuentaEditar.clienteTelefono}
              </div>
            ) : (
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                disabled={guardando}
                aria-label="Seleccionar cliente"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} ({c.telefono})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cupo de Crédito */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Cupo Máximo Autorizado (COP)
            </label>
            <input
              type="number"
              min="0"
              step="10000"
              value={cupoCredito}
              onChange={(e) => setCupoCredito(e.target.value)}
              disabled={guardando}
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 font-display text-lg font-bold text-gold-400 focus:border-gold-400 focus:outline-none"
              placeholder="200000"
            />
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {CUPOS_SUGERIDOS.map((monto) => (
                <button
                  key={monto}
                  type="button"
                  onClick={() => setCupoCredito(String(monto))}
                  className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 text-xs font-bold text-neutral-300 hover:border-gold-400/60 hover:text-gold-400 transition-colors"
                >
                  {formatCOP(monto)}
                </button>
              ))}
            </div>
          </div>

          {/* Plazo en días */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Plazo de Pago (Días)
            </label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {PLAZOS_SUGERIDOS.map((dias) => (
                <button
                  key={dias}
                  type="button"
                  aria-pressed={Number(plazoDias) === dias}
                  onClick={() => setPlazoDias(String(dias))}
                  className={`min-h-[44px] rounded-xl border text-xs font-bold transition-colors ${
                    Number(plazoDias) === dias
                      ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {dias} días
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="180"
              value={plazoDias}
              onChange={(e) => setPlazoDias(e.target.value)}
              disabled={guardando}
              aria-label="Días de plazo personalizados"
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

          {/* Datos Corporativos opcionales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                <Building2 className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                Empresa / Convenio (Opcional)
              </label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                disabled={guardando}
                placeholder="Ej: Clínica Norte SAS"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                NIT / Cédula (Opcional)
              </label>
              <input
                type="text"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                disabled={guardando}
                placeholder="Ej: 900123456-1"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Estado de la cuenta */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Estado Operativo del Cupo
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={estado === 'activa'}
                onClick={() => setEstado('activa')}
                className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                  estado === 'activa'
                    ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                }`}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Activa (Autorizada)
              </button>
              <button
                type="button"
                aria-pressed={estado === 'bloqueada'}
                onClick={() => setEstado('bloqueada')}
                className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border text-xs font-bold transition-colors ${
                  estado === 'bloqueada'
                    ? 'border-red-500/60 bg-red-950/40 text-red-300'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                }`}
              >
                <Lock className="h-4 w-4" aria-hidden="true" />
                Bloqueada (Sin Fiado)
              </button>
            </div>
          </div>

          {estado === 'bloqueada' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-red-300 mb-1.5">
                Motivo del bloqueo
              </label>
              <input
                type="text"
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                disabled={guardando}
                placeholder="Ej: Mora superior a 15 días"
                className="min-h-[44px] w-full rounded-xl border border-red-500/40 bg-neutral-950 px-3.5 text-sm text-white focus:border-red-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
              Notas Internas (Opcional)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={guardando}
              placeholder="Ej: Facturación quincenal los días 15 y 30..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none"
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
              {guardando ? 'Guardando...' : cuentaEditar ? 'Guardar Cambios' : 'Habilitar Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
