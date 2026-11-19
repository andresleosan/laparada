import type { Timestamp } from 'firebase/firestore';
import type { ItemVenta, MetodoPago } from './index';

/**
 * Estado administrativo de una cuenta corriente de cliente o empresa
 */
export type EstadoCuentaCorriente = 'activa' | 'bloqueada';

/**
 * Estado financiero evaluado de la cartera de un cliente
 */
export type EstadoCarteraCliente =
  | 'sin_deuda'
  | 'al_dia'
  | 'por_vencer'
  | 'vencida'
  | 'bloqueada';

/**
 * Tipo de movimiento inmutable registrado en el libro auxiliar de cartera
 */
export type TipoMovimientoCartera =
  | 'consumo_credito'
  | 'abono'
  | 'ajuste_cargo'
  | 'ajuste_abono';

/**
 * Canal de origen del consumo fiado
 */
export type OrigenConsumoCredito = 'pos' | 'mesas' | 'manual';

/**
 * Rango de antigüedad de cartera vencida
 */
export type BucketMoraCartera = 'al_dia' | '1_7_dias' | '8_15_dias' | '16_30_dias' | 'mas_30_dias';

/**
 * Cuenta corriente multi-tenant de un cliente frecuente o convenio corporativo
 */
export interface CuentaCorriente {
  id: string;
  negocioId: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  empresa?: string;
  nit?: string;
  cupoCredito: number; // En COP, entero >= 0
  saldoActual: number; // En COP, entero >= 0
  plazoDias: number; // Días de plazo para vencimiento (ej: 7, 15, 30)
  estado: EstadoCuentaCorriente;
  bloqueoMotivo?: string;
  notas?: string;
  ultimoConsumoEn?: Timestamp | Date;
  ultimoAbonoEn?: Timestamp | Date;
  fechaVencimientoMasAntiguo?: Timestamp | Date;
  totalConsumosHistorico: number;
  totalAbonosHistorico: number;
  cantidadConsumos: number;
  cantidadAbonos: number;
  creadoEn: Timestamp | Date;
  actualizadoEn: Timestamp | Date;
}

/**
 * Movimiento inmutable en el libro de cartera (`movimientos_cartera`)
 */
export interface MovimientoCartera {
  id: string;
  negocioId: string;
  cuentaCorrienteId: string;
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  tipo: TipoMovimientoCartera;
  monto: number; // En COP, entero > 0
  saldoPrevio: number; // En COP, entero >= 0
  saldoResultante: number; // En COP, entero >= 0
  codigoComprobante: string; // Ej: "FIA-2026-001" o "ABN-2026-001"
  origen?: OrigenConsumoCredito;
  metodoPago?: MetodoPago; // Solo para abonos ('efectivo' | 'transferencia')
  referenciaTransferencia?: string;
  items?: ItemVenta[];
  mesaNombre?: string;
  cuentaMesaId?: string;
  fecha: Timestamp | Date;
  fechaVencimiento?: Timestamp | Date;
  notas?: string;
  responsableNombre?: string;
}

/**
 * Input para habilitar o actualizar una cuenta corriente de cliente
 */
export interface ConfigurarCuentaCorrienteInput {
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  empresa?: string;
  nit?: string;
  cupoCredito: number;
  plazoDias: number;
  estado?: EstadoCuentaCorriente;
  bloqueoMotivo?: string;
  notas?: string;
  responsableNombre?: string;
}

/**
 * Input para registrar un consumo a crédito (fiado controlado)
 */
export interface RegistrarConsumoCreditoInput {
  cuentaCorrienteId: string;
  monto: number;
  origen: OrigenConsumoCredito;
  items?: ItemVenta[];
  mesaNombre?: string;
  cuentaMesaId?: string;
  notas?: string;
  responsableNombre?: string;
  plazoDiasOverride?: number;
}

/**
 * Input para registrar un abono parcial o total en efectivo o transferencia offline
 */
export interface RegistrarAbonoCarteraInput {
  cuentaCorrienteId: string;
  monto: number;
  metodoPago: MetodoPago;
  referenciaTransferencia?: string;
  notas?: string;
  responsableNombre?: string;
}

/**
 * Resultado de la evaluación preventiva de cupo de crédito
 */
export interface EvaluacionCupoResultado {
  puedeFiarse: boolean;
  cupoCredito: number;
  saldoActual: number;
  cupoDisponible: number;
  saldoProyectado: number;
  porcentajeUsoActual: number;
  porcentajeUsoProyectado: number;
  excedente: number;
  motivoRechazo?: string;
}

/**
 * Evaluación de estado y mora de una cuenta corriente
 */
export interface EvaluacionEstadoCartera {
  estadoCartera: EstadoCarteraCliente;
  diasParaVencer: number | null;
  diasMora: number;
  bucketMora: BucketMoraCartera;
  fechaVencimientoReferencia: Date | null;
  cupoDisponible: number;
  porcentajeUso: number;
}

/**
 * Fila estructurada para el reporte de cartera vencida / por cobrar
 */
export interface FilaCarteraVencida {
  cuenta: CuentaCorriente;
  evaluacion: EvaluacionEstadoCartera;
}

/**
 * Métricas ejecutivas consolidadas del módulo de Cartera
 */
export interface MetricasCartera {
  totalCarteraPorCobrar: number;
  totalCarteraVencida: number;
  totalCarteraPorVencer: number;
  totalCarteraAlDia: number;
  cupoTotalAsignado: number;
  cupoTotalDisponible: number;
  porcentajeUtilizacionGlobal: number;
  clientesConCuenta: number;
  clientesConSaldo: number;
  clientesEnMora: number;
  clientesBloqueados: number;
  recaudadoMesTotal: number;
  recaudadoMesEfectivo: number;
  recaudadoMesTransferencia: number;
  consumosMesTotal: number;
}

/**
 * Filtros del panel `/cartera`
 */
export interface FiltrosCartera {
  busqueda: string;
  estado: EstadoCarteraCliente | 'todas' | 'con_saldo';
}
