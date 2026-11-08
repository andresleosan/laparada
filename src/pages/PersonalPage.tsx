import { useState } from 'react';
import {
  Users,
  Clock,
  Wallet,
  Banknote,
  Sparkles,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MessageCircle,
  UserPlus,
} from 'lucide-react';
import { usePersonal } from '@/hooks/usePersonal';
import { useNegocio } from '@/context/NegocioContext';
import { EmpleadoCard } from '@/components/personal/EmpleadoCard';
import { NuevoEmpleadoModal } from '@/components/personal/NuevoEmpleadoModal';
import { RegistrarTurnoModal } from '@/components/personal/RegistrarTurnoModal';
import { RegistrarValeModal } from '@/components/personal/RegistrarValeModal';
import { DistribuirPropinasCard } from '@/components/personal/DistribuirPropinasCard';
import { LiquidarNominaModal } from '@/components/personal/LiquidarNominaModal';
import {
  CARGOS_PERSONAL_CONFIG,
  TIPOS_TURNO_CONFIG,
  MOTIVOS_VALE_CONFIG,
  generarMensajeWhatsAppLiquidacion,
} from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';
import type {
  EmpleadoPersonal,
  CargoPersonal,
  EstadoTurnoPersonal,
  EstadoValePersonal,
  TurnoPersonal,
  ValePersonal,
  LiquidacionNomina,
} from '@/types/personal';

type PestanaPersonal = 'equipo' | 'turnos' | 'vales' | 'propinas_historial';

export function PersonalPage() {
  const { negocioActual } = useNegocio();
  const nombreNegocio = negocioActual?.nombre || 'La Parada';

  const {
    empleados,
    turnos,
    vales,
    liquidaciones,
    cargando,
    error,
    busqueda,
    setBusqueda,
    filtroCargo,
    setFiltroCargo,
    filtroEstadoTurno,
    setFiltroEstadoTurno,
    filtroEstadoVale,
    setFiltroEstadoVale,
    modoPropinas,
    setModoPropinas,
    fondoPropinasActivo,
    propinasRecaudadas7Dias,
    setFondoPropinasPersonalizado,
    distribucionPropinas,
    preLiquidacionesPorEmpleado,
    metricas,
    empleadosFiltrados,
    turnosFiltrados,
    valesFiltrados,
    crearEmpleadoAction,
    actualizarEmpleadoAction,
    eliminarEmpleadoAction,
    registrarTurnoAction,
    cerrarTurnoAction,
    anularTurnoAction,
    registrarValeAction,
    anularValeAction,
    liquidarNominaAction,
    exportarCsvAction,
  } = usePersonal();

  const [pestanaActiva, setPestanaActiva] = useState<PestanaPersonal>('equipo');

  // Estados de modales
  const [modalEmpleadoAbierto, setModalEmpleadoAbierto] = useState(false);
  const [empleadoAEditar, setEmpleadoAEditar] = useState<EmpleadoPersonal | null>(null);

  const [modalTurnoAbierto, setModalTurnoAbierto] = useState(false);
  const [empleadoPreseleccionadoTurno, setEmpleadoPreseleccionadoTurno] =
    useState<EmpleadoPersonal | null>(null);

  const [modalValeAbierto, setModalValeAbierto] = useState(false);
  const [empleadoPreseleccionadoVale, setEmpleadoPreseleccionadoVale] =
    useState<EmpleadoPersonal | null>(null);

  const [modalLiquidarAbierto, setModalLiquidarAbierto] = useState(false);
  const [empleadoALiquidar, setEmpleadoALiquidar] = useState<EmpleadoPersonal | null>(null);

  // Handlers de Colaborador
  const handleAbrirNuevoEmpleado = () => {
    setEmpleadoAEditar(null);
    setModalEmpleadoAbierto(true);
  };

  const handleEditarEmpleado = (emp: EmpleadoPersonal) => {
    setEmpleadoAEditar(emp);
    setModalEmpleadoAbierto(true);
  };

  const handleEliminarEmpleado = async (emp: EmpleadoPersonal) => {
    const pre = preLiquidacionesPorEmpleado[emp.id];
    if (pre && (pre.cantidadTurnos > 0 || pre.totalValesPendientes > 0)) {
      alert(
        `No puedes eliminar a "${emp.nombre}" porque tiene turnos o vales pendientes por liquidar.`
      );
      return;
    }

    if (confirm(`¿Estás seguro de eliminar a "${emp.nombre}" del directorio de personal?`)) {
      try {
        await eliminarEmpleadoAction(emp.id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al eliminar colaborador');
      }
    }
  };

  // Handlers de Turnos, Vales y Liquidación
  const handleAbrirTurnoPara = (emp?: EmpleadoPersonal) => {
    setEmpleadoPreseleccionadoTurno(emp || null);
    setModalTurnoAbierto(true);
  };

  const handleAbrirValePara = (emp?: EmpleadoPersonal) => {
    setEmpleadoPreseleccionadoVale(emp || null);
    setModalValeAbierto(true);
  };

  const handleAbrirLiquidar = (emp: EmpleadoPersonal) => {
    setEmpleadoALiquidar(emp);
    setModalLiquidarAbierto(true);
  };

  const handleCerrarTurnoEnCurso = async (turno: TurnoPersonal) => {
    const ahora = new Date();
    const sugerida = `${String(ahora.getHours()).padStart(2, '0')}:${String(
      ahora.getMinutes()
    ).padStart(2, '0')}`;
    const horaSalida = prompt(
      `Ingresa la hora de salida (HH:mm) para finalizar el turno de ${turno.empleadoNombre}:`,
      sugerida
    );
    if (horaSalida && /^\d{1,2}:\d{2}$/.test(horaSalida.trim())) {
      try {
        await cerrarTurnoAction(turno.id, horaSalida.trim());
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al finalizar turno');
      }
    }
  };

  const handleAnularTurno = async (turno: TurnoPersonal) => {
    const motivo = prompt(
      `Indica el motivo para anular el turno de ${turno.empleadoNombre}:`
    );
    if (motivo && motivo.trim().length > 0) {
      try {
        await anularTurnoAction(turno.id, motivo.trim());
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al anular turno');
      }
    }
  };

  const handleAnularVale = async (vale: ValePersonal) => {
    const motivo = prompt(
      `Indica el motivo para anular el vale de ${vale.empleadoNombre} (${formatCOP(vale.monto)}):`
    );
    if (motivo && motivo.trim().length > 0) {
      try {
        await anularValeAction(vale.id, motivo.trim());
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Error al anular vale');
      }
    }
  };

  const formatearFechaCorta = (ts: { toDate?: () => Date } | string | Date) => {
    if (!ts) return '';
    const d =
      typeof ts === 'object' && 'toDate' in ts && typeof ts.toDate === 'function'
        ? ts.toDate()
        : new Date(ts as string);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderContenido = () => {
    if (cargando) {
      return (
        <div className="p-12 text-center text-neutral-400 bg-neutral-900 rounded-2xl border border-neutral-800">
          <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm font-medium">Cargando equipo, turnos y nómina...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center text-rose-300 bg-rose-500/10 rounded-2xl border border-rose-500/30">
          <p className="font-semibold text-sm mb-1">Error al cargar módulo de personal</p>
          <p className="text-xs">{error}</p>
        </div>
      );
    }

    // PESTAÑA 1: EQUIPO Y NÓMINA
    if (pestanaActiva === 'equipo') {
      if (empleadosFiltrados.length === 0) {
        return (
          <div className="p-12 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
            <Users className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-white mb-1">
              No hay colaboradores registrados
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-4">
              {busqueda || filtroCargo !== 'todos'
                ? 'Ningún integrante del equipo coincide con el filtro actual.'
                : 'Agrega a tus cocineros, cajeros, meseros y domiciliarios para controlar sus turnos, propinas, vales y liquidaciones.'}
            </p>
            <button
              type="button"
              onClick={handleAbrirNuevoEmpleado}
              className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow"
            >
              <UserPlus className="w-4 h-4" />
              <span>Registrar Primer Colaborador</span>
            </button>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empleadosFiltrados.map((emp) => (
            <EmpleadoCard
              key={emp.id}
              empleado={emp}
              preLiquidacion={preLiquidacionesPorEmpleado[emp.id]}
              onRegistrarTurno={handleAbrirTurnoPara}
              onRegistrarVale={handleAbrirValePara}
              onLiquidar={handleAbrirLiquidar}
              onEditar={handleEditarEmpleado}
              onEliminar={handleEliminarEmpleado}
            />
          ))}
        </div>
      );
    }

    // PESTAÑA 2: CONTROL DE TURNOS
    if (pestanaActiva === 'turnos') {
      if (turnosFiltrados.length === 0) {
        return (
          <div className="p-12 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
            <Clock className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-white mb-1">
              No hay turnos registrados
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-4">
              Registra los turnos diarios o nocturnos trabajados por tu equipo para calcular su nómina automáticamente.
            </p>
            {empleados.length > 0 && (
              <button
                type="button"
                onClick={() => handleAbrirTurnoPara()}
                className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Turno</span>
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {turnosFiltrados.map((turno) => {
            const tipoCfg =
              TIPOS_TURNO_CONFIG[turno.tipoTurno] || TIPOS_TURNO_CONFIG.nocturno;
            const cargoCfg =
              CARGOS_PERSONAL_CONFIG[turno.cargo] || CARGOS_PERSONAL_CONFIG.cocinero;

            return (
              <div
                key={turno.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${tipoCfg.badgeBg}`}
                    >
                      {tipoCfg.label}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        turno.estado === 'en_curso'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse'
                          : turno.estado === 'completado'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : turno.estado === 'liquidado'
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {turno.estado === 'en_curso'
                        ? '⏱️ EN CURSO'
                        : turno.estado === 'completado'
                        ? 'POR LIQUIDAR'
                        : turno.estado === 'liquidado'
                        ? '✓ LIQUIDADO'
                        : 'ANULADO'}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-white">
                    {turno.empleadoNombre}
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {cargoCfg.label} • {formatearFechaCorta(turno.fecha)}
                  </p>

                  <div className="mt-3 p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Horario:</span>
                      <span className="font-semibold text-white">
                        {turno.horaEntrada} — {turno.horaSalida || 'En curso'} (
                        {turno.horasTrabajadas} h)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Tarifa base:</span>
                      <span className="text-neutral-300">
                        {formatCOP(turno.valorTurno)}
                      </span>
                    </div>
                    {(turno.bonoTurno || 0) > 0 && (
                      <div className="flex justify-between text-gold-400">
                        <span>Bono extra:</span>
                        <span>+{formatCOP(turno.bonoTurno || 0)}</span>
                      </div>
                    )}
                    <div className="pt-1.5 border-t border-neutral-800 flex justify-between font-bold">
                      <span className="text-neutral-300">Total Turno:</span>
                      <span className="text-gold-400 font-display text-sm">
                        {formatCOP(turno.totalDevengado)}
                      </span>
                    </div>
                  </div>

                  {turno.notas && (
                    <p className="text-[11px] text-neutral-400 mt-2 italic">
                      “{turno.notas}”
                    </p>
                  )}
                </div>

                {turno.estado !== 'liquidado' && turno.estado !== 'anulado' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800/60">
                    {turno.estado === 'en_curso' && (
                      <button
                        type="button"
                        onClick={() => handleCerrarTurnoEnCurso(turno)}
                        className="h-11 px-3.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Marcar Salida</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAnularTurno(turno)}
                      className="h-11 px-3 rounded-xl bg-neutral-950 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Anular</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // PESTAÑA 3: VALES Y ADELANTOS
    if (pestanaActiva === 'vales') {
      if (valesFiltrados.length === 0) {
        return (
          <div className="p-12 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800">
            <Wallet className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
            <h3 className="font-display font-bold text-lg text-white mb-1">
              Sin vales ni adelantos registrados
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto mb-4">
              Aquí verás los adelantos de sueldo, préstamos o consumos entregados al personal pendientes por descontar.
            </p>
            {empleados.length > 0 && (
              <button
                type="button"
                onClick={() => handleAbrirValePara()}
                className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm inline-flex items-center gap-2 transition-colors shadow"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Vale</span>
              </button>
            )}
          </div>
        );
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {valesFiltrados.map((vale) => {
            const motivoCfg =
              MOTIVOS_VALE_CONFIG[vale.motivo] || MOTIVOS_VALE_CONFIG.otro;
            return (
              <div
                key={vale.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${motivoCfg.badgeBg}`}
                    >
                      {motivoCfg.label}
                    </span>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        vale.estado === 'pendiente_descuento'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : vale.estado === 'descontado'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {vale.estado === 'pendiente_descuento'
                        ? 'PENDIENTE DESCUENTO'
                        : vale.estado === 'descontado'
                        ? '✓ DESCONTADO'
                        : 'ANULADO'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <h4 className="font-display font-bold text-base text-white">
                        {vale.empleadoNombre}
                      </h4>
                      <span className="text-xs text-neutral-400">
                        {formatearFechaCorta(vale.fecha)} •{' '}
                        {vale.metodoEntrega === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                      </span>
                    </div>

                    <span className="font-display font-black text-lg text-rose-400">
                      -{formatCOP(vale.monto)}
                    </span>
                  </div>

                  {vale.notas && (
                    <p className="text-xs text-neutral-400 mt-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                      {vale.notas}
                    </p>
                  )}
                </div>

                {vale.estado === 'pendiente_descuento' && (
                  <div className="flex items-center justify-end pt-2 border-t border-neutral-800/60">
                    <button
                      type="button"
                      onClick={() => handleAnularVale(vale)}
                      className="h-11 px-3 rounded-xl bg-neutral-950 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-neutral-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Anular Vale</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // PESTAÑA 4: PROPINAS E HISTORIAL DE LIQUIDACIONES
    return (
      <div className="space-y-6">
        <DistribuirPropinasCard
          propinasRecaudadasVentas={propinasRecaudadas7Dias}
          fondoActivo={fondoPropinasActivo}
          modo={modoPropinas}
          onCambiarModo={setModoPropinas}
          onCambiarFondoPersonalizado={setFondoPropinasPersonalizado}
          distribucion={distribucionPropinas}
        />

        {/* Historial de Liquidaciones Emitidas */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                Historial de Liquidaciones y Pagos de Nómina ({liquidaciones.length})
              </h3>
              <p className="text-xs text-neutral-400">
                Registro auditado de pagos realizados al personal con reenvío de comprobante por WhatsApp
              </p>
            </div>
          </div>

          {liquidaciones.length === 0 ? (
            <div className="p-8 text-center bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400">
              Aún no se han registrado liquidaciones de nómina en este negocio.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liquidaciones.map((liq: LiquidacionNomina) => {
                const emp = empleados.find((e) => e.id === liq.empleadoId);
                const telLimpio = emp?.telefono.replace(/\D/g, '') || '';
                const waHref = telLimpio
                  ? `https://wa.me/${
                      telLimpio.startsWith('57') ? telLimpio : `57${telLimpio}`
                    }?text=${encodeURIComponent(
                      generarMensajeWhatsAppLiquidacion(liq, nombreNegocio)
                    )}`
                  : undefined;

                return (
                  <div
                    key={liq.id}
                    className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-display font-bold text-sm text-white">
                            {liq.empleadoNombre}
                          </h4>
                          <span className="text-[11px] text-neutral-400">
                            Periodo: {liq.periodoDesde} al {liq.periodoHasta}
                          </span>
                        </div>
                        <span className="font-display font-black text-base text-emerald-400">
                          {formatCOP(liq.netoPagado)}
                        </span>
                      </div>

                      <div className="text-xs text-neutral-400 space-y-1 pt-2 border-t border-neutral-800/80">
                        <div className="flex justify-between">
                          <span>Turnos ({liq.cantidadTurnos}):</span>
                          <span className="text-neutral-200">
                            +{formatCOP(liq.totalTurnosValor + liq.totalBonos)}
                          </span>
                        </div>
                        {liq.totalPropinas > 0 && (
                          <div className="flex justify-between text-gold-400">
                            <span>Propinas:</span>
                            <span>+{formatCOP(liq.totalPropinas)}</span>
                          </div>
                        )}
                        {liq.totalValesDescontados > 0 && (
                          <div className="flex justify-between text-rose-400">
                            <span>Vales descontados:</span>
                            <span>-{formatCOP(liq.totalValesDescontados)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-400">
                      <span>
                        {liq.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'}{' '}
                        • {formatearFechaCorta(liq.fechaLiquidacion)}
                      </span>

                      {waHref && (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-9 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Recibo WA</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              Personal, Turnos y Nómina Operativa
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400">
              Control de asistencia, reparto de propinas del equipo, vales de caja y liquidación
            </p>
          </div>
        </div>

        {/* Botones de Acción Rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportarCsvAction}
            disabled={empleados.length === 0}
            className="h-11 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4 text-gold-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => handleAbrirValePara()}
            disabled={empleados.length === 0}
            className="h-11 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors border border-neutral-700 disabled:opacity-40"
          >
            <Wallet className="w-4 h-4 text-amber-400" />
            <span>+ Vale</span>
          </button>

          <button
            type="button"
            onClick={() => handleAbrirTurnoPara()}
            disabled={empleados.length === 0}
            className="h-11 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors border border-neutral-700 disabled:opacity-40"
          >
            <Clock className="w-4 h-4 text-gold-400" />
            <span>+ Turno</span>
          </button>

          <button
            type="button"
            onClick={handleAbrirNuevoEmpleado}
            className="h-11 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* 4 KPIs Ejecutivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Equipo Activo */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Equipo Activo
            </span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-white">
            {metricas.empleadosActivos}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            {metricas.turnosEnCurso > 0
              ? `${metricas.turnosEnCurso} en turno ahora mismo`
              : `${empleados.length} registrados en total`}
          </span>
        </div>

        {/* KPI 2: Neto Pendiente por Liquidar */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Nómina por Liquidar
            </span>
            <Banknote className="w-4 h-4 text-gold-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-gold-400">
            {formatCOP(metricas.netoPendientePorPagar)}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            {metricas.turnosPendientesLiquidar} turnos completados pendientes
          </span>
        </div>

        {/* KPI 3: Vales y Adelantos Activos */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Vales por Descontar
            </span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-rose-400">
            {formatCOP(metricas.totalValesPendientes)}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            {metricas.cantidadValesPendientes} adelantos activos
          </span>
        </div>

        {/* KPI 4: Propinas Recaudadas & Pagado Mes */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Propinas (7 días)
            </span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-display font-black text-xl sm:text-2xl text-white">
            {formatCOP(metricas.propinasRecaudadasPeriodo)}
          </div>
          <span className="text-xs text-neutral-400 mt-1 block">
            Pagado este mes: {formatCOP(metricas.totalPagadoNominaMes)}
          </span>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex items-center justify-between border-b border-neutral-800 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-pressed={pestanaActiva === 'equipo'}
            onClick={() => setPestanaActiva('equipo')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestanaActiva === 'equipo'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Equipo & Nómina ({empleados.length})</span>
          </button>

          <button
            type="button"
            aria-pressed={pestanaActiva === 'turnos'}
            onClick={() => setPestanaActiva('turnos')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestanaActiva === 'turnos'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Control de Turnos ({turnos.length})</span>
          </button>

          <button
            type="button"
            aria-pressed={pestanaActiva === 'vales'}
            onClick={() => setPestanaActiva('vales')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestanaActiva === 'vales'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Vales y Adelantos ({vales.length})</span>
          </button>

          <button
            type="button"
            aria-pressed={pestanaActiva === 'propinas_historial'}
            onClick={() => setPestanaActiva('propinas_historial')}
            className={`h-11 px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              pestanaActiva === 'propinas_historial'
                ? 'border-gold-400 text-gold-400 bg-gold-400/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Propinas & Pagos ({liquidaciones.length})</span>
          </button>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      {pestanaActiva !== 'propinas_historial' && (
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre del colaborador, documento, teléfono o nota..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>

          {(pestanaActiva === 'equipo' || pestanaActiva === 'turnos') && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-500 shrink-0" />
              <select
                value={filtroCargo}
                onChange={(e) => setFiltroCargo(e.target.value as CargoPersonal | 'todos')}
                className="h-10 px-3 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
              >
                <option value="todos">Todos los cargos</option>
                {Object.entries(CARGOS_PERSONAL_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {pestanaActiva === 'turnos' && (
            <select
              value={filtroEstadoTurno}
              onChange={(e) =>
                setFiltroEstadoTurno(e.target.value as EstadoTurnoPersonal | 'todos')
              }
              className="h-10 px-3 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="en_curso">En curso</option>
              <option value="completado">Por liquidar</option>
              <option value="liquidado">Liquidados</option>
              <option value="anulado">Anulados</option>
            </select>
          )}

          {pestanaActiva === 'vales' && (
            <select
              value={filtroEstadoVale}
              onChange={(e) =>
                setFiltroEstadoVale(e.target.value as EstadoValePersonal | 'todos')
              }
              className="h-10 px-3 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los vales</option>
              <option value="pendiente_descuento">Pendientes de descuento</option>
              <option value="descontado">Descontados en nómina</option>
              <option value="anulado">Anulados</option>
            </select>
          )}
        </div>
      )}

      {/* Contenido Dinámico */}
      {renderContenido()}

      {/* Modales */}
      <NuevoEmpleadoModal
        isOpen={modalEmpleadoAbierto}
        onClose={() => setModalEmpleadoAbierto(false)}
        empleadoAEditar={empleadoAEditar}
        onSubmit={async (data) => {
          if (empleadoAEditar) {
            await actualizarEmpleadoAction(empleadoAEditar.id, data);
          } else {
            await crearEmpleadoAction(data);
          }
        }}
      />

      <RegistrarTurnoModal
        isOpen={modalTurnoAbierto}
        onClose={() => setModalTurnoAbierto(false)}
        empleados={empleados.filter((e) => e.activo)}
        empleadoPreseleccionado={empleadoPreseleccionadoTurno}
        onSubmit={async (data) => {
          await registrarTurnoAction(data);
        }}
      />

      <RegistrarValeModal
        isOpen={modalValeAbierto}
        onClose={() => setModalValeAbierto(false)}
        empleados={empleados.filter((e) => e.activo)}
        empleadoPreseleccionado={empleadoPreseleccionadoVale}
        onSubmit={async (data) => {
          await registrarValeAction(data);
        }}
      />

      <LiquidarNominaModal
        isOpen={modalLiquidarAbierto}
        onClose={() => setModalLiquidarAbierto(false)}
        empleado={empleadoALiquidar}
        preLiquidacion={
          empleadoALiquidar ? preLiquidacionesPorEmpleado[empleadoALiquidar.id] || null : null
        }
        nombreNegocio={nombreNegocio}
        onSubmit={async (data) => {
          return liquidarNominaAction(data);
        }}
      />
    </div>
  );
}
