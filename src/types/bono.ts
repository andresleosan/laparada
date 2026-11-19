import type { Timestamp } from 'firebase/firestore';
import type { ItemVenta, MetodoPago } from './index';

/**
 * Modalidades de instrumentos prepago y vales offline en La Parada
 */
export type TipoBonoPrepago = 'bono_regalo' | 'tarjeta_prepago' | 'vale_consumo';

/**
 * Estado administrativo almacenado del bono en Firestore
 */
export type EstadoBonoPrepago = 'activo' | 'agotado' | 'bloqueado' | 'anulado';

/**
 * Estado operativo efectivo evaluado en tiempo real según saldo y fecha de vencimiento
 */
export type EstadoEfectivoBono =
  | 'activo'
  | 'por_vencer'
  | 'agotado'
  | 'vencido'
  | 'bloqueado'
  | 'anulado';

/**
 * Tipos de movimiento en el libro inmutable `movimientos_bonos`
 */
export type TipoMovimientoBono =
  | 'emision'
  | 'recarga'
  | 'redencion'
  | 'ajuste_saldo'
  | 'bloqueo'
  | 'desbloqueo'
  | 'anulacion';

/**
 * Canal donde se redimió el saldo del bono
 */
export type OrigenRedencionBono = 'pos' | 'mesas' | 'manual';

/**
 * Documento de bono de regalo, tarjeta prepago o vale de consumo multi-tenant
 */
export interface BonoPrepago {
  id: string;
  negocioId: string;
  codigo: string;
  tipo: TipoBonoPrepago;
  titularNombre: string;
  titularTelefono?: string;
  compradorNombre?: string;
  clienteId?: string;
  mensajeRegalo?: string;
  montoInicial: number; // En COP, entero > 0
  saldoActual: number; // En COP, entero >= 0
  totalCargadoHistorico: number; // En COP, entero >= montoInicial
  totalRedimidoHistorico: number; // En COP, entero >= 0
  cantidadRecargas: number;
  cantidadRedenciones: number;
  recargable: boolean;
  estado: EstadoBonoPrepago;
  motivoBloqueo?: string;
  metodoPagoEmision: MetodoPago;
  referenciaTransferenciaEmision?: string;
  fechaEmision: Timestamp | Date;
  fechaVencimiento?: Timestamp | Date | null;
  ultimaRecargaEn?: Timestamp | Date;
  ultimaRedencionEn?: Timestamp | Date;
  notas?: string;
  creadoPor?: string;
  creadoEn: Timestamp | Date;
  actualizadoEn: Timestamp | Date;
}

/**
 * Registro inmutable en el libro contable de bonos (`movimientos_bonos`)
 */
export interface MovimientoBono {
  id: string;
  negocioId: string;
  bonoId: string;
  bonoCodigo: string;
  titularNombre: string;
  tipo: TipoMovimientoBono;
  monto: number; // En COP, entero >= 0 (> 0 en emisión, recarga y redención)
  saldoPrevio: number; // En COP, entero >= 0
  saldoResultante: number; // En COP, entero >= 0
  codigoComprobante: string;
  metodoPago?: MetodoPago;
  referenciaTransferencia?: string;
  origen?: OrigenRedencionBono;
  ventaId?: string;
  mesaNombre?: string;
  cuentaMesaId?: string;
  items?: ItemVenta[];
  fecha: Timestamp | Date;
  notas?: string;
  responsableNombre?: string;
}

/**
 * Input para emitir un nuevo bono de regalo, tarjeta prepago o vale de consumo
 */
export interface EmitirBonoInput {
  tipo: TipoBonoPrepago;
  codigoPersonalizado?: string;
  titularNombre: string;
  titularTelefono?: string;
  compradorNombre?: string;
  clienteId?: string;
  mensajeRegalo?: string;
  montoInicial: number;
  metodoPago: MetodoPago;
  referenciaTransferencia?: string;
  vigenciaDias?: number | null; // null o <= 0 => sin fecha de vencimiento
  recargable?: boolean;
  notas?: string;
  responsableNombre?: string;
}

/**
 * Input para recargar saldo a una tarjeta prepago o bono recargable (100% offline)
 */
export interface RecargarBonoInput {
  bonoId: string;
  monto: number;
  metodoPago: MetodoPago;
  referenciaTransferencia?: string;
  extenderVigenciaDias?: number | null;
  notas?: string;
  responsableNombre?: string;
}

/**
 * Input para redimir parcial o totalmente el saldo de un bono
 */
export interface RedimirBonoInput {
  bonoId: string;
  montoARedimir: number;
  origen: OrigenRedencionBono;
  ventaId?: string;
  mesaNombre?: string;
  cuentaMesaId?: string;
  items?: ItemVenta[];
  notas?: string;
  responsableNombre?: string;
}

/**
 * Input para bloquear, desbloquear, anular o extender vigencia de un bono
 */
export interface CambiarEstadoBonoInput {
  bonoId: string;
  accion: 'bloquear' | 'desbloquear' | 'anular' | 'extender_vigencia';
  motivo?: string;
  nuevaVigenciaDias?: number;
  responsableNombre?: string;
}

/**
 * Evaluación de estado, vigencia y capacidades de un bono
 */
export interface EvaluacionEstadoBono {
  estadoEfectivo: EstadoEfectivoBono;
  estaVencido: boolean;
  diasParaVencer: number | null;
  diasVencido: number;
  fechaVencimiento: Date | null;
  porcentajeConsumido: number;
  porcentajeDisponible: number;
  puedeRedimir: boolean;
  puedeRecargar: boolean;
  motivoInhabilitacion?: string;
}

/**
 * Evaluación previa al aplicar un bono a un ticket o cuenta de mesa
 */
export interface EvaluacionRedencionBono {
  valido: boolean;
  saldoDisponible: number;
  montoAplicable: number;
  saldoRestanteBono: number;
  excedentePorPagar: number;
  cubreTotal: boolean;
  motivoRechazo?: string;
}

/**
 * Fila combinada para auditoría y renderizado de `/bonos`
 */
export interface FilaAuditoriaBono {
  bono: BonoPrepago;
  evaluacion: EvaluacionEstadoBono;
}

/**
 * Métricas ejecutivas consolidadas de bonos y tarjetas prepago
 */
export interface MetricasBonos {
  totalBonosEmitidos: number;
  bonosActivosConSaldo: number;
  bonosPorVencer: number;
  bonosVencidosConSaldo: number;
  bonosAgotados: number;
  bonosBloqueadosOAnulados: number;
  saldoCirculanteActivo: number;
  saldoVencidoNoRedimido: number;
  saldoBloqueadoOAnulado: number;
  totalCargadoHistorico: number;
  totalRedimidoHistorico: number;
  recaudadoMesTotal: number;
  recaudadoMesEfectivo: number;
  recaudadoMesTransferencia: number;
  redimidoMesTotal: number;
  tasaRedencionPorcentaje: number;
}

/**
 * Filtros del panel `/bonos`
 */
export interface FiltrosBonos {
  busqueda: string;
  tipo: TipoBonoPrepago | 'todos';
  estado: EstadoEfectivoBono | 'todos' | 'con_saldo';
}
