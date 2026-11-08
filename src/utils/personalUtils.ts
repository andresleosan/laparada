import type {
  CargoPersonal,
  ModalidadPagoPersonal,
  TipoTurnoPersonal,
  MotivoValePersonal,
  ModoDistribucionPropinas,
  EmpleadoPersonal,
  TurnoPersonal,
  ValePersonal,
  LiquidacionNomina,
  ResumenPreLiquidacionEmpleado,
  DistribucionPropinaItem,
  MetricasPersonal,
} from '@/types/personal';
import type { Venta } from '@/types';
import { formatCOP } from './formatCOP';

/**
 * Configuración visual y semántica de los cargos operativos
 */
export const CARGOS_PERSONAL_CONFIG: Record<
  CargoPersonal,
  { label: string; color: string; badgeBg: string; tarifaSugerida: number }
> = {
  cocinero: {
    label: 'Cocinero Principal',
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    tarifaSugerida: 65000,
  },
  auxiliar_cocina: {
    label: 'Auxiliar de Cocina',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    tarifaSugerida: 50000,
  },
  cajero: {
    label: 'Cajero / Mostrador',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    tarifaSugerida: 55000,
  },
  mesero: {
    label: 'Mesero de Salón',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    tarifaSugerida: 48000,
  },
  domiciliario: {
    label: 'Domiciliario / Repartidor',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    tarifaSugerida: 45000,
  },
  administrador: {
    label: 'Administrador / Jefe Turno',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    tarifaSugerida: 75000,
  },
};

/**
 * Etiquetas de modalidades de pago
 */
export const MODALIDADES_PAGO_CONFIG: Record<ModalidadPagoPersonal, string> = {
  por_turno: 'Por Turno / Día',
  semanal: 'Semanal (7 días)',
  quincenal: 'Quincenal (15 días)',
  mensual: 'Mensual (30 días)',
};

/**
 * Configuración de tipos de turno
 */
export const TIPOS_TURNO_CONFIG: Record<
  TipoTurnoPersonal,
  { label: string; badgeBg: string; horasBase: number }
> = {
  nocturno: {
    label: 'Turno Nocturno',
    badgeBg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    horasBase: 7,
  },
  diurno: {
    label: 'Turno Diurno',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    horasBase: 8,
  },
  completo: {
    label: 'Jornada Completa',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    horasBase: 10,
  },
  horas_extra: {
    label: 'Refuerzo / Horas Extra',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    horasBase: 4,
  },
};

/**
 * Configuración de motivos de vales y adelantos
 */
export const MOTIVOS_VALE_CONFIG: Record<
  MotivoValePersonal,
  { label: string; badgeBg: string }
> = {
  adelanto_sueldo: {
    label: 'Adelanto de Sueldo / Turno',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  consumo_personal: {
    label: 'Consumo de Alimentos / Bebidas',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  },
  prestamo: {
    label: 'Préstamo Personal',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
  descuento_faltante: {
    label: 'Descuento por Faltante / Daño',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  otro: {
    label: 'Otro Concepto',
    badgeBg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  },
};

/**
 * Calcula las horas trabajadas entre horaEntrada ("HH:mm") y horaSalida ("HH:mm").
 * Soporta turnos nocturnos que cruzan la medianoche (ej: 17:00 a 01:30 = 8.5 h).
 */
export function calcularHorasTrabajadas(horaEntrada: string, horaSalida?: string): number {
  if (!horaEntrada || !horaSalida) return 0;

  const matchIn = /^(\d{1,2}):(\d{2})$/.exec(horaEntrada.trim());
  const matchOut = /^(\d{1,2}):(\d{2})$/.exec(horaSalida.trim());
  if (!matchIn || !matchOut) return 0;

  const hIn = Number(matchIn[1]);
  const mIn = Number(matchIn[2]);
  const hOut = Number(matchOut[1]);
  const mOut = Number(matchOut[2]);

  if (
    hIn < 0 || hIn > 23 || mIn < 0 || mIn > 59 ||
    hOut < 0 || hOut > 23 || mOut < 0 || mOut > 59
  ) {
    return 0;
  }

  const minutosEntrada = hIn * 60 + mIn;
  let minutosSalida = hOut * 60 + mOut;

  if (minutosSalida < minutosEntrada) {
    // Cruzó medianoche
    minutosSalida += 24 * 60;
  }

  const diffHoras = (minutosSalida - minutosEntrada) / 60;
  return Math.round(diffHoras * 10) / 10;
}

/**
 * Calcula el total devengado de un turno (valorTurno + bonoTurno) garantizando enteros >= 0
 */
export function calcularTotalDevengadoTurno(valorTurno: number, bonoTurno: number = 0): number {
  const base = Math.max(0, Math.round(Number(valorTurno) || 0));
  const bono = Math.max(0, Math.round(Number(bonoTurno) || 0));
  return base + bono;
}

/**
 * Calcula la pre-liquidación detallada de un colaborador a partir de sus turnos completados
 * (no liquidados ni anulados), vales pendientes de descuento y propina sugerida.
 */
export function calcularPreLiquidacionEmpleado(
  empleado: EmpleadoPersonal,
  turnos: TurnoPersonal[],
  vales: ValePersonal[],
  propinaSugerida: number = 0
): ResumenPreLiquidacionEmpleado {
  const turnosPendientes = turnos.filter(
    (t) => t.empleadoId === empleado.id && t.estado === 'completado'
  );

  const valesPendientes = vales.filter(
    (v) => v.empleadoId === empleado.id && v.estado === 'pendiente_descuento'
  );

  let horasAcumuladas = 0;
  let subtotalTurnos = 0;
  let subtotalBonos = 0;

  for (const t of turnosPendientes) {
    horasAcumuladas += Math.max(0, Number(t.horasTrabajadas) || 0);
    subtotalTurnos += Math.max(0, Math.round(Number(t.valorTurno) || 0));
    subtotalBonos += Math.max(0, Math.round(Number(t.bonoTurno) || 0));
  }

  const totalDevengadoTurnos = subtotalTurnos + subtotalBonos;
  const totalValesPendientes = valesPendientes.reduce(
    (acc, v) => acc + Math.max(0, Math.round(Number(v.monto) || 0)),
    0
  );

  const propinaSegura = Math.max(0, Math.round(Number(propinaSugerida) || 0));
  const netoAPagar = Math.max(
    0,
    totalDevengadoTurnos + propinaSegura - totalValesPendientes
  );

  return {
    empleadoId: empleado.id,
    empleadoNombre: empleado.nombre,
    cargo: empleado.cargo,
    turnosPendientes,
    valesPendientes,
    cantidadTurnos: turnosPendientes.length,
    horasAcumuladas: Math.round(horasAcumuladas * 10) / 10,
    subtotalTurnos,
    subtotalBonos,
    totalDevengadoTurnos,
    totalValesPendientes,
    propinaSugerida: propinaSegura,
    netoAPagar,
  };
}

/**
 * Distribuye un fondo total de propinas en COP entre los colaboradores activos que participan en propinas.
 * Soporta reparto en partes iguales o proporcional a la cantidad de turnos trabajados.
 */
export function distribuirPropinasEquipo(
  montoTotalPropinas: number,
  empleados: EmpleadoPersonal[],
  turnos: TurnoPersonal[],
  modo: ModoDistribucionPropinas = 'partes_iguales'
): DistribucionPropinaItem[] {
  const fondo = Math.max(0, Math.round(Number(montoTotalPropinas) || 0));
  const participantes = empleados.filter((e) => e.activo && e.participaPropinas);

  if (participantes.length === 0) {
    return [];
  }

  const statsPorEmpleado = participantes.map((emp) => {
    const turnosEmp = turnos.filter(
      (t) =>
        t.empleadoId === emp.id &&
        (t.estado === 'completado' || t.estado === 'en_curso')
    );
    const turnosCompletados = turnosEmp.length;
    const horasTrabajadas =
      Math.round(
        turnosEmp.reduce((acc, t) => acc + Math.max(0, Number(t.horasTrabajadas) || 0), 0) * 10
      ) / 10;

    return {
      empleado: emp,
      turnosCompletados,
      horasTrabajadas,
    };
  });

  const totalTurnosEquipo = statsPorEmpleado.reduce((acc, s) => acc + s.turnosCompletados, 0);

  // Si es proporcional pero nadie tiene turnos registrados aún, hacemos fallback a partes iguales
  const usarProporcional = modo === 'proporcional_turnos' && totalTurnosEquipo > 0;

  return statsPorEmpleado.map((item) => {
    const peso = usarProporcional
      ? item.turnosCompletados / totalTurnosEquipo
      : 1 / participantes.length;

    const montoPropina = Math.floor(fondo * peso);
    const porcentajeParticipacion = Math.round(peso * 1000) / 10;

    return {
      empleadoId: item.empleado.id,
      empleadoNombre: item.empleado.nombre,
      cargo: item.empleado.cargo,
      turnosCompletados: item.turnosCompletados,
      horasTrabajadas: item.horasTrabajadas,
      porcentajeParticipacion,
      montoPropina,
    };
  });
}

/**
 * Suma las propinas recaudadas en ventas válidas (no anuladas) dentro de un rango opcional de fechas
 */
export function calcularPropinasRecaudadasVentas(
  ventas: Venta[],
  fechaInicio?: Date,
  fechaFin?: Date
): number {
  let total = 0;
  const minTime = fechaInicio ? fechaInicio.getTime() : null;
  const maxTime = fechaFin ? fechaFin.getTime() : null;

  for (const venta of ventas) {
    if (venta.estado === 'anulada') continue;
    const propina = Math.max(0, Math.round(Number(venta.propina) || 0));
    if (propina <= 0) continue;

    if (minTime !== null || maxTime !== null) {
      const fechaVenta =
        venta.fecha && typeof venta.fecha.toDate === 'function'
          ? venta.fecha.toDate().getTime()
          : new Date(venta.fecha as unknown as string).getTime();

      if (minTime !== null && fechaVenta < minTime) continue;
      if (maxTime !== null && fechaVenta > maxTime) continue;
    }

    total += propina;
  }

  return total;
}

/**
 * Calcula las métricas globales del módulo de Personal y Nómina
 */
export function calcularMetricasPersonal(
  empleados: EmpleadoPersonal[],
  turnos: TurnoPersonal[],
  vales: ValePersonal[],
  liquidaciones: LiquidacionNomina[],
  propinasRecaudadasPeriodo: number = 0,
  fechaReferencia: Date = new Date()
): MetricasPersonal {
  const empleadosActivos = empleados.filter((e) => e.activo).length;
  const turnosEnCurso = turnos.filter((t) => t.estado === 'en_curso').length;

  const turnosCompletados = turnos.filter((t) => t.estado === 'completado');
  const turnosPendientesLiquidar = turnosCompletados.length;
  const totalDevengadoPendiente = turnosCompletados.reduce(
    (acc, t) => acc + Math.max(0, Math.round(Number(t.totalDevengado) || 0)),
    0
  );

  const valesPendientes = vales.filter((v) => v.estado === 'pendiente_descuento');
  const cantidadValesPendientes = valesPendientes.length;
  const totalValesPendientes = valesPendientes.reduce(
    (acc, v) => acc + Math.max(0, Math.round(Number(v.monto) || 0)),
    0
  );

  const netoPendientePorPagar = Math.max(0, totalDevengadoPendiente - totalValesPendientes);

  const inicioMes = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), 1).getTime();
  const finMes = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth() + 1,
    0,
    23,
    59,
    59
  ).getTime();

  let totalPagadoNominaMes = 0;
  for (const liq of liquidaciones) {
    const fechaLiq =
      liq.fechaLiquidacion && typeof liq.fechaLiquidacion.toDate === 'function'
        ? liq.fechaLiquidacion.toDate().getTime()
        : new Date(liq.fechaLiquidacion as unknown as string).getTime();

    if (fechaLiq >= inicioMes && fechaLiq <= finMes) {
      totalPagadoNominaMes += Math.max(0, Math.round(Number(liq.netoPagado) || 0));
    }
  }

  return {
    empleadosActivos,
    turnosEnCurso,
    turnosPendientesLiquidar,
    totalDevengadoPendiente,
    totalValesPendientes,
    cantidadValesPendientes,
    netoPendientePorPagar,
    totalPagadoNominaMes,
    propinasRecaudadasPeriodo: Math.max(0, Math.round(Number(propinasRecaudadasPeriodo) || 0)),
  };
}

/**
 * Genera el comprobante de pago de nómina formateado para compartir por WhatsApp al colaborador
 */
export function generarMensajeWhatsAppLiquidacion(
  liquidacion: LiquidacionNomina,
  nombreNegocio: string = 'La Parada'
): string {
  const cargoLabel =
    CARGOS_PERSONAL_CONFIG[liquidacion.cargo]?.label || liquidacion.cargo;

  return `Hola *${liquidacion.empleadoNombre}*, te compartimos tu comprobante de liquidación de nómina en *${nombreNegocio}* 📋✨:

• *Cargo:* ${cargoLabel}
• *Periodo:* ${liquidacion.periodoDesde} al ${liquidacion.periodoHasta}
• *Turnos liquidados:* ${liquidacion.cantidadTurnos}
• *(+) Valor Turnos:* ${formatCOP(liquidacion.totalTurnosValor)}
• *(+) Bonos Extras:* ${formatCOP(liquidacion.totalBonos)}
• *(+) Propinas Equipo:* ${formatCOP(liquidacion.totalPropinas)}
• *(-) Vales / Adelantos:* -${formatCOP(liquidacion.totalValesDescontados)}
────────────────────
💰 *NETO PAGADO:* *${formatCOP(liquidacion.netoPagado)}*
• *Medio de pago:* ${liquidacion.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'}${
    liquidacion.referenciaPago ? ` (Ref: ${liquidacion.referenciaPago})` : ''
  }

¡Muchas gracias por tu compromiso y excelente trabajo en el equipo! 🙌🔥`;
}

/**
 * Genera el contenido CSV con UTF-8 BOM del estado de nómina y liquidaciones para Excel
 */
export function generarPersonalNominaCsv(
  empleados: EmpleadoPersonal[],
  turnos: TurnoPersonal[],
  vales: ValePersonal[],
  liquidaciones: LiquidacionNomina[]
): string {
  const headers = [
    'Colaborador',
    'Documento',
    'Teléfono',
    'Cargo',
    'Modalidad',
    'Tarifa Turno (COP)',
    'Turnos Pendientes',
    'Devengado Pendiente (COP)',
    'Vales Pendientes (COP)',
    'Neto por Liquidar (COP)',
    'Total Liquidado Histórico (COP)',
    'Estado',
  ];

  const rows = empleados.map((emp) => {
    const pre = calcularPreLiquidacionEmpleado(emp, turnos, vales, 0);
    const totalHistorico = liquidaciones
      .filter((l) => l.empleadoId === emp.id)
      .reduce((acc, l) => acc + (l.netoPagado || 0), 0);

    const cargoLabel = CARGOS_PERSONAL_CONFIG[emp.cargo]?.label || emp.cargo;

    return [
      `"${(emp.nombre || '').replace(/"/g, '""')}"`,
      `"${(emp.documento || '').replace(/"/g, '""')}"`,
      `"${(emp.telefono || '').replace(/"/g, '""')}"`,
      `"${cargoLabel}"`,
      MODALIDADES_PAGO_CONFIG[emp.modalidadPago] || emp.modalidadPago,
      emp.tarifaTurno || 0,
      pre.cantidadTurnos,
      pre.totalDevengadoTurnos,
      pre.totalValesPendientes,
      pre.netoAPagar,
      totalHistorico,
      emp.activo ? 'ACTIVO' : 'INACTIVO',
    ].join(';');
  });

  return `\uFEFF${headers.join(';')}\n${rows.join('\n')}`;
}

/**
 * Dispara la descarga del archivo CSV de Personal y Nómina en el navegador
 */
export function exportarPersonalNominaCsv(
  empleados: EmpleadoPersonal[],
  turnos: TurnoPersonal[],
  vales: ValePersonal[],
  liquidaciones: LiquidacionNomina[],
  nombreNegocio: string = 'La Parada'
): void {
  const csvContent = generarPersonalNominaCsv(empleados, turnos, vales, liquidaciones);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fechaStr = new Date().toISOString().split('T')[0];
  const nombreLimpio = nombreNegocio.toLowerCase().replace(/[^a-z0-9]/g, '_');

  link.setAttribute('href', url);
  link.setAttribute('download', `nomina_personal_${nombreLimpio}_${fechaStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
