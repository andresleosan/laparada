import { useState, useEffect, useId, type FormEvent } from 'react';
import { X, Users, Check, Sparkles } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  EmpleadoPersonal,
  CargoPersonal,
  ModalidadPagoPersonal,
} from '@/types/personal';
import {
  CARGOS_PERSONAL_CONFIG,
  MODALIDADES_PAGO_CONFIG,
} from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';

interface NuevoEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<EmpleadoPersonal, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>
  ) => Promise<unknown>;
  empleadoAEditar?: EmpleadoPersonal | null;
}

export function NuevoEmpleadoModal({
  isOpen,
  onClose,
  onSubmit,
  empleadoAEditar,
}: NuevoEmpleadoModalProps) {
  const generatedId = useId();
  const titleId = `modal-empleado-${generatedId.replace(/:/g, '')}-title`;

  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState<CargoPersonal>('cocinero');
  const [modalidadPago, setModalidadPago] = useState<ModalidadPagoPersonal>('semanal');
  const [tarifaTurno, setTarifaTurno] = useState<number>(65000);
  const [sueldoBase, setSueldoBase] = useState<number>(0);
  const [participaPropinas, setParticipaPropinas] = useState(true);
  const [activo, setActivo] = useState(true);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (empleadoAEditar) {
      setNombre(empleadoAEditar.nombre || '');
      setDocumento(empleadoAEditar.documento || '');
      setTelefono(empleadoAEditar.telefono || '');
      setEmail(empleadoAEditar.email || '');
      setCargo(empleadoAEditar.cargo || 'cocinero');
      setModalidadPago(empleadoAEditar.modalidadPago || 'semanal');
      setTarifaTurno(empleadoAEditar.tarifaTurno || 0);
      setSueldoBase(empleadoAEditar.sueldoBase || 0);
      setParticipaPropinas(empleadoAEditar.participaPropinas ?? true);
      setActivo(empleadoAEditar.activo ?? true);
      setNotas(empleadoAEditar.notas || '');
    } else {
      setNombre('');
      setDocumento('');
      setTelefono('');
      setEmail('');
      setCargo('cocinero');
      setModalidadPago('semanal');
      setTarifaTurno(CARGOS_PERSONAL_CONFIG.cocinero.tarifaSugerida);
      setSueldoBase(0);
      setParticipaPropinas(true);
      setActivo(true);
      setNotas('');
    }
    setErrorLocal(null);
  }, [empleadoAEditar, isOpen]);

  if (!isOpen) return null;

  const handleCambiarCargo = (nuevoCargo: CargoPersonal) => {
    setCargo(nuevoCargo);
    if (!empleadoAEditar) {
      setTarifaTurno(CARGOS_PERSONAL_CONFIG[nuevoCargo].tarifaSugerida);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorLocal('Ingresa el nombre completo del colaborador (mínimo 2 caracteres).');
      return;
    }

    const telLimpio = telefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
      setErrorLocal('Ingresa un número de WhatsApp / celular válido (mínimo 7 dígitos).');
      return;
    }

    const tarifaFinal = Math.max(0, Math.round(Number(tarifaTurno) || 0));
    if (tarifaFinal <= 0) {
      setErrorLocal('La tarifa por turno debe ser mayor a $ 0 COP.');
      return;
    }

    setGuardando(true);
    try {
      await onSubmit({
        nombre: nombreLimpio,
        documento: documento.trim() || undefined,
        telefono: telLimpio,
        email: email.trim() || undefined,
        cargo,
        modalidadPago,
        tarifaTurno: tarifaFinal,
        sueldoBase: Math.max(0, Math.round(Number(sueldoBase) || 0)),
        participaPropinas,
        activo,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'No se pudo guardar el colaborador.'
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display font-bold text-lg text-white">
                {empleadoAEditar ? 'Editar Colaborador' : 'Nuevo Colaborador Operativo'}
              </h2>
              <p className="text-xs text-neutral-400">
                Configura cargo, tarifa por turno y participación en propinas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de colaborador"
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

          {/* Nombre y Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Nombre Completo *
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Carlos Mendoza"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Cédula / Documento
              </label>
              <input
                type="text"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="Ej: 1090456789"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Teléfono y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 3001234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@laparada.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Selector Táctil de Cargo */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Cargo en el Restaurante *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.entries(CARGOS_PERSONAL_CONFIG) as [CargoPersonal, typeof CARGOS_PERSONAL_CONFIG.cocinero][]).map(
                ([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={cargo === key}
                    onClick={() => handleCambiarCargo(key)}
                    className={`h-11 px-3 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-all ${
                      cargo === key
                        ? 'bg-gold-400/15 border-gold-400 text-gold-400 shadow'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="truncate">{cfg.label}</span>
                    {cargo === key && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Modalidad de Pago y Tarifa de Turno */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Frecuencia de Liquidación
              </label>
              <select
                value={modalidadPago}
                onChange={(e) => setModalidadPago(e.target.value as ModalidadPagoPersonal)}
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              >
                {Object.entries(MODALIDADES_PAGO_CONFIG).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Tarifa por Turno (COP) *
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                required
                value={tarifaTurno || ''}
                onChange={(e) => setTarifaTurno(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-gold-400 font-display font-bold text-sm focus:border-gold-400 focus:outline-none"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block">
                Equivale a {formatCOP(Number(tarifaTurno) || 0)} por turno
              </span>
            </div>
          </div>

          {/* Toggles: Participa en Propinas y Estado Activo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              aria-pressed={participaPropinas}
              onClick={() => setParticipaPropinas((prev) => !prev)}
              className={`min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                participaPropinas
                  ? 'bg-gold-400/10 border-gold-400/40 text-gold-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold block">Participa en Propinas</span>
                  <span className="text-[11px] opacity-80">
                    {participaPropinas ? 'Incluido en el reparto' : 'Excluido de propinas'}
                  </span>
                </div>
              </div>
              <span className="text-xs font-black uppercase">
                {participaPropinas ? 'SÍ' : 'NO'}
              </span>
            </button>

            <button
              type="button"
              aria-pressed={activo}
              onClick={() => setActivo((prev) => !prev)}
              className={`min-h-[48px] p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                activo
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              <div>
                <span className="text-xs font-bold block">Estado en el Equipo</span>
                <span className="text-[11px] opacity-80">
                  {activo ? 'Activo para turnos' : 'Retirado / Inactivo'}
                </span>
              </div>
              <span className="text-xs font-black uppercase">
                {activo ? 'ACTIVO' : 'INACTIVO'}
              </span>
            </button>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Notas u Observaciones (EPS, ARL, talla uniforme, cuenta Nequi/Bancolombia)
            </label>
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Nequi 3001234567 - Turno habitual de martes a domingo"
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
            />
          </div>

          {/* Botones de Acción */}
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
              <span>
                {guardando
                  ? 'Guardando...'
                  : empleadoAEditar
                  ? 'Guardar Cambios'
                  : 'Registrar Colaborador'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
