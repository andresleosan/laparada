import { useState, useEffect, useId, type FormEvent } from 'react';
import { Timestamp } from 'firebase/firestore';
import { X, Clock, Check, Sparkles } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  EmpleadoPersonal,
  TipoTurnoPersonal,
  CrearTurnoInput,
} from '@/types/personal';
import {
  TIPOS_TURNO_CONFIG,
  calcularHorasTrabajadas,
  calcularTotalDevengadoTurno,
} from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';

interface RegistrarTurnoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CrearTurnoInput) => Promise<unknown>;
  empleados: EmpleadoPersonal[];
  empleadoPreseleccionado?: EmpleadoPersonal | null;
}

export function RegistrarTurnoModal({
  isOpen,
  onClose,
  onSubmit,
  empleados,
  empleadoPreseleccionado,
}: RegistrarTurnoModalProps) {
  const generatedId = useId();
  const titleId = `modal-turno-${generatedId.replace(/:/g, '')}-title`;

  const hoyStr = new Date().toISOString().split('T')[0];

  const [empleadoId, setEmpleadoId] = useState('');
  const [fechaStr, setFechaStr] = useState(hoyStr);
  const [tipoTurno, setTipoTurno] = useState<TipoTurnoPersonal>('nocturno');
  const [horaEntrada, setHoraEntrada] = useState('17:00');
  const [horaSalida, setHoraSalida] = useState('23:30');
  const [turnoEnCurso, setTurnoEnCurso] = useState(false);
  const [valorTurno, setValorTurno] = useState<number>(0);
  const [bonoTurno, setBonoTurno] = useState<number>(0);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const empInicial = empleadoPreseleccionado || empleados[0] || null;
    setEmpleadoId(empInicial?.id || '');
    setValorTurno(empInicial?.tarifaTurno || 55000);
    setFechaStr(new Date().toISOString().split('T')[0]);
    setTipoTurno('nocturno');
    setHoraEntrada('17:00');
    setHoraSalida('23:30');
    setTurnoEnCurso(false);
    setBonoTurno(0);
    setNotas('');
    setErrorLocal(null);
  }, [isOpen, empleadoPreseleccionado, empleados]);

  if (!isOpen) return null;

  const empleadoSeleccionado = empleados.find((e) => e.id === empleadoId);
  const horasCalculadas = turnoEnCurso
    ? 0
    : calcularHorasTrabajadas(horaEntrada, horaSalida);
  const totalDevengado = calcularTotalDevengadoTurno(valorTurno, bonoTurno);

  const handleSeleccionarEmpleado = (id: string) => {
    setEmpleadoId(id);
    const emp = empleados.find((e) => e.id === id);
    if (emp) {
      setValorTurno(emp.tarifaTurno);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!empleadoSeleccionado) {
      setErrorLocal('Selecciona un colaborador del equipo.');
      return;
    }

    if (!horaEntrada) {
      setErrorLocal('Ingresa la hora de entrada del turno.');
      return;
    }

    if (!turnoEnCurso && !horaSalida) {
      setErrorLocal('Ingresa la hora de salida o marca el turno como "En curso".');
      return;
    }

    setGuardando(true);
    try {
      const [year, month, day] = fechaStr.split('-').map(Number);
      const fechaDate = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);

      await onSubmit({
        empleadoId: empleadoSeleccionado.id,
        empleadoNombre: empleadoSeleccionado.nombre,
        cargo: empleadoSeleccionado.cargo,
        fecha: Timestamp.fromDate(fechaDate),
        horaEntrada,
        horaSalida: turnoEnCurso ? undefined : horaSalida,
        horasTrabajadas: turnoEnCurso ? 0 : horasCalculadas,
        tipoTurno,
        valorTurno: Math.max(0, Math.round(Number(valorTurno) || 0)),
        bonoTurno: Math.max(0, Math.round(Number(bonoTurno) || 0)),
        estado: turnoEnCurso ? 'en_curso' : 'completado',
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'No se pudo registrar el turno.'
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
            <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display font-bold text-lg text-white">
                Registrar Turno de Trabajo
              </h2>
              <p className="text-xs text-neutral-400">
                Control de asistencia, horas laboradas y tarifa devengada
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de turno"
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

          {/* Colaborador y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Colaborador *
              </label>
              <select
                value={empleadoId}
                onChange={(e) => handleSeleccionarEmpleado(e.target.value)}
                required
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              >
                {empleados.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombre} ({formatCOP(emp.tarifaTurno)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Fecha del Turno *
              </label>
              <input
                type="date"
                required
                value={fechaStr}
                onChange={(e) => setFechaStr(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Tipo de Turno */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              Modalidad de Jornada
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                Object.entries(TIPOS_TURNO_CONFIG) as [
                  TipoTurnoPersonal,
                  typeof TIPOS_TURNO_CONFIG.nocturno
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tipoTurno === key}
                  onClick={() => setTipoTurno(key)}
                  className={`h-11 px-3 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
                    tipoTurno === key
                      ? 'bg-gold-400/15 border-gold-400 text-gold-400 shadow'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span>{cfg.label}</span>
                  {tipoTurno === key && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Turno En Curso vs Completado */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={!turnoEnCurso}
              onClick={() => setTurnoEnCurso(false)}
              className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-all ${
                !turnoEnCurso
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              ✓ Turno Completado
            </button>

            <button
              type="button"
              aria-pressed={turnoEnCurso}
              onClick={() => setTurnoEnCurso(true)}
              className={`flex-1 h-11 rounded-xl text-xs font-bold border transition-all ${
                turnoEnCurso
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              ⏱️ Iniciar Turno en Curso
            </button>
          </div>

          {/* Horas Entrada y Salida */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Hora de Entrada *
              </label>
              <input
                type="time"
                required
                value={horaEntrada}
                onChange={(e) => setHoraEntrada(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>

            {!turnoEnCurso ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Hora de Salida * ({horasCalculadas} h)
                </label>
                <input
                  type="time"
                  required
                  value={horaSalida}
                  onChange={(e) => setHoraSalida(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>
            ) : (
              <div className="flex flex-col justify-end">
                <div className="h-11 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center">
                  Salida pendiente al cerrar turno
                </div>
              </div>
            )}
          </div>

          {/* Valor del Turno y Bono Extra */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Valor Turno Base (COP) *
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                required
                value={valorTurno || ''}
                onChange={(e) => setValorTurno(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-display font-bold text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>Bono Extra / Festivo (COP)</span>
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={bonoTurno || ''}
                placeholder="0"
                onChange={(e) => setBonoTurno(Number(e.target.value))}
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-gold-400 font-display font-bold text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Resumen del Turno */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-neutral-400 block">
                Total devengado en este turno:
              </span>
              <span className="text-[11px] text-neutral-500">
                {turnoEnCurso
                  ? 'En curso activo'
                  : `${horasCalculadas} horas calculadas (${horaEntrada} a ${horaSalida})`}
              </span>
            </div>
            <span className="font-display font-black text-xl text-gold-400">
              {formatCOP(totalDevengado)}
            </span>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Observaciones del Turno
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Reemplazo de domingo / Apoyo en cierre de cocina"
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
            />
          </div>

          {/* Acciones */}
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
              <span>{guardando ? 'Guardando...' : 'Registrar Turno'}</span>
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
