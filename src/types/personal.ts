import { Timestamp } from 'firebase/firestore';

/**
 * Cargos operativos del personal en el restaurante
 */
export type CargoPersonal =
  | 'cocinero'
  | 'auxiliar_cocina'
  | 'cajero'
  | 'mesero'
  | 'domiciliario'
  | 'administrador';

/**
 * Frecuencia o modalidad de liquidación de pago
 */
export type ModalidadPagoPersonal =
  | 'por_turno'
  | 'semanal'
  | 'quincenal'
  | 'mensual';

/**
 * Tipos de jornada / turno de trabajo
 */
export type TipoTurnoPersonal =
  | 'diurno'
  | 'nocturno'
  | 'completo'
  | 'horas_extra';

/**
 * Estado administrativo de un turno registrado
 */
export type EstadoTurnoPersonal =
  | 'en_curso'
  | 'completado'
  | 'liquidado'
  | 'anulado';

/**
 * Motivo del vale o adelanto de nómina
 */
export type MotivoValePersonal =
  | 'adelanto_sueldo'
  | 'consumo_personal'
  | 'prestamo'
  | 'descuento_faltante'
  | 'otro';

/**
 * Estado del vale o adelanto frente a la liquidación
 */
export type EstadoValePersonal =
  | 'pendiente_descuento'
  | 'descontado'
  | 'anulado';

/**
 * Criterio para repartir el fondo de propinas entre el equipo
 */
export type ModoDistribucionPropinas =
  | 'partes_iguales'
  | 'proporcional_turnos';

/**
 * Colaborador / Integrante del equipo operativo del restaurante
 */
export interface EmpleadoPersonal {
  id: string;
  negocioId: string;
  nombre: string;
  documento?: string;
  telefono: string;
  email?: string;
  cargo: CargoPersonal;
  modalidadPago: ModalidadPagoPersonal;
  tarifaTurno: number;          // Valor base por turno trabajado en COP
  sueldoBase?: number;          // Sueldo fijo de referencia si aplica en COP
  participaPropinas: boolean;   // Si recibe cuota en la repartición de propinas
  activo: boolean;
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Registro de asistencia y turno trabajado por un colaborador
 */
export interface TurnoPersonal {
  id: string;
  negocioId: string;
  empleadoId: string;
  empleadoNombre: string;
  cargo: CargoPersonal;
  fecha: Timestamp;
  horaEntrada: string;          // Formato "HH:mm", ej: "16:00"
  horaSalida?: string;          // Formato "HH:mm", ej: "23:30"
  horasTrabajadas: number;      // Calculado o ajustado, ej: 7.5
  tipoTurno: TipoTurnoPersonal;
  valorTurno: number;           // En COP, valor base del turno
  bonoTurno?: number;           // En COP, bonificación extra por festivo o meta
  totalDevengado: number;       // En COP, valorTurno + (bonoTurno || 0)
  estado: EstadoTurnoPersonal;
  liquidacionId?: string;       // ID de la liquidación donde fue pagado
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Vale de caja, adelanto de sueldo o consumo de personal a descontar en nómina
 */
export interface ValePersonal {
  id: string;
  negocioId: string;
  empleadoId: string;
  empleadoNombre: string;
  fecha: Timestamp;
  monto: number;                // En COP, valor entero > 0
  motivo: MotivoValePersonal;
  metodoEntrega: 'efectivo' | 'transferencia';
  estado: EstadoValePersonal;
  autorizadoPor?: string;
  gastoId?: string;             // Si generó egreso inmediato en la colección 'gastos'
  liquidacionId?: string;       // ID de la liquidación donde se descontó
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Liquidación y pago de nómina operativa a un colaborador
 */
export interface LiquidacionNomina {
  id: string;
  negocioId: string;
  empleadoId: string;
  empleadoNombre: string;
  cargo: CargoPersonal;
  fechaLiquidacion: Timestamp;
  periodoDesde: string;         // YYYY-MM-DD
  periodoHasta: string;         // YYYY-MM-DD
  cantidadTurnos: number;
  turnosIds: string[];
  valesIds: string[];
  totalTurnosValor: number;     // Suma de valorTurno en COP
  totalBonos: number;           // Suma de bonoTurno en COP
  totalPropinas: number;        // Propina asignada en COP
  totalValesDescontados: number;// Suma de vales descontados en COP
  netoPagado: number;           // En COP: Math.max(0, totalTurnosValor + totalBonos + totalPropinas - totalValesDescontados)
  metodoPago: 'efectivo' | 'transferencia';
  referenciaPago?: string;
  pagadoPor?: string;
  gastoId?: string;             // Egreso contable en 'gastos' (categoría 'salarios')
  notas?: string;
  creadoEn: Timestamp;
}

/**
 * Pre-cálculo en vivo del estado de cuenta de un colaborador antes de liquidar
 */
export interface ResumenPreLiquidacionEmpleado {
  empleadoId: string;
  empleadoNombre: string;
  cargo: CargoPersonal;
  turnosPendientes: TurnoPersonal[];
  valesPendientes: ValePersonal[];
  cantidadTurnos: number;
  horasAcumuladas: number;
  subtotalTurnos: number;
  subtotalBonos: number;
  totalDevengadoTurnos: number;
  totalValesPendientes: number;
  propinaSugerida: number;
  netoAPagar: number;
}

/**
 * Resultado individual en el reparto de propinas del equipo
 */
export interface DistribucionPropinaItem {
  empleadoId: string;
  empleadoNombre: string;
  cargo: CargoPersonal;
  turnosCompletados: number;
  horasTrabajadas: number;
  porcentajeParticipacion: number;
  montoPropina: number;
}

/**
 * Métricas ejecutivas del módulo de Personal y Nómina
 */
export interface MetricasPersonal {
  empleadosActivos: number;
  turnosEnCurso: number;
  turnosPendientesLiquidar: number;
  totalDevengadoPendiente: number;
  totalValesPendientes: number;
  cantidadValesPendientes: number;
  netoPendientePorPagar: number;
  totalPagadoNominaMes: number;
  propinasRecaudadasPeriodo: number;
}

/**
 * Entrada para registrar un turno de trabajo
 */
export interface CrearTurnoInput {
  empleadoId: string;
  empleadoNombre: string;
  cargo: CargoPersonal;
  fecha: Timestamp;
  horaEntrada: string;
  horaSalida?: string;
  horasTrabajadas?: number;
  tipoTurno: TipoTurnoPersonal;
  valorTurno: number;
  bonoTurno?: number;
  estado?: EstadoTurnoPersonal;
  notas?: string;
}

/**
 * Entrada para registrar un vale o adelanto
 */
export interface CrearValeInput {
  empleadoId: string;
  empleadoNombre: string;
  fecha: Timestamp;
  monto: number;
  motivo: MotivoValePersonal;
  metodoEntrega: 'efectivo' | 'transferencia';
  autorizadoPor?: string;
  notas?: string;
  crearGastoCaja?: boolean;
}

/**
 * Entrada para ejecutar la liquidación de nómina de un colaborador
 */
export interface CrearLiquidacionInput {
  empleadoId: string;
  empleadoNombre: string;
  cargo: CargoPersonal;
  periodoDesde: string;
  periodoHasta: string;
  turnosIds: string[];
  valesIds: string[];
  totalTurnosValor: number;
  totalBonos: number;
  totalPropinas: number;
  totalValesDescontados: number;
  netoPagado: number;
  metodoPago: 'efectivo' | 'transferencia';
  referenciaPago?: string;
  pagadoPor?: string;
  notas?: string;
  registrarGastoSalarios?: boolean;
}
