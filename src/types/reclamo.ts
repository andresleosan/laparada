import type { Timestamp } from 'firebase/firestore';
import type { ItemVenta } from './index';

/**
 * Tipos de PQRS y garantías operativas en La Parada
 */
export type TipoPqrs =
  | 'reclamo'
  | 'queja'
  | 'peticion'
  | 'sugerencia'
  | 'garantia_pedido';

/**
 * Canal donde se originó o reportó el incidente
 */
export type CanalIncidenteReclamo =
  | 'domicilio'
  | 'salon'
  | 'mostrador'
  | 'whatsapp'
  | 'web'
  | 'kiosco';

/**
 * Causa raíz operativa clasificada para analítica de mejora continua
 */
export type CausaRaizReclamo =
  | 'demora_entrega'
  | 'pedido_incompleto'
  | 'producto_equivocado'
  | 'calidad_temperatura'
  | 'empaque_derrame'
  | 'cobro_vueltas'
  | 'atencion_servicio'
  | 'otro';

/**
 * Nivel de prioridad y compromiso SLA de respuesta
 */
export type PrioridadReclamo = 'critica' | 'alta' | 'media' | 'baja';

/**
 * Ciclo de vida del reclamo o garantía
 */
export type EstadoReclamo =
  | 'abierto'
  | 'en_gestion'
  | 'resuelto'
  | 'cerrado'
  | 'descartado';

/**
 * Modalidades de resolución 100% offline soportadas en La Parada
 */
export type TipoResolucionReclamo =
  | 'reenvio_domicilio'
  | 'bono_cortesia'
  | 'devolucion_caja'
  | 'reposicion_salon'
  | 'disculpa_seguimiento';

/**
 * Semáforo SLA calculado en tiempo real según tiempo transcurrido vs objetivo
 */
export type EstadoSemaforoSlaReclamo =
  | 'en_tiempo'
  | 'por_vencer'
  | 'vencido'
  | 'cumplido'
  | 'incumplido';

/**
 * Estado global de salud de PQRS para widgets y reportes
 */
export type EstadoGlobalReclamos = 'al_dia' | 'atencion' | 'critico';

/**
 * Documento multi-tenant de reclamo, PQRS o garantía en Firestore (`reclamos_pqrs`)
 */
export interface ReclamoPqrs {
  id: string;
  negocioId: string;
  codigoRadicado: string; // Ej: "PQR-20261124-001"
  tipo: TipoPqrs;
  canal: CanalIncidenteReclamo;
  causaRaiz: CausaRaizReclamo;
  prioridad: PrioridadReclamo;
  estado: EstadoReclamo;
  slaObjetivoMin: number; // Minutos objetivo de resolución
  clienteNombre: string;
  clienteTelefono?: string;
  direccionEntrega?: string;
  barrioEntrega?: string;
  domicilioId?: string;
  ventaId?: string;
  mesaNombre?: string;
  repartidorNombre?: string;
  itemsAfectados?: ItemVenta[];
  montoPedidoCOP: number; // En COP, entero >= 0
  descripcion: string;
  fechaIso: string; // YYYY-MM-DD (America/Bogota)
  creadoEn: Timestamp | Date;
  actualizadoEn: Timestamp | Date;
  registradoPor: string;
  registradoRol?: string;
  tipoResolucion?: TipoResolucionReclamo;
  montoCompensacionCOP?: number;
  resolucionNotas?: string;
  resueltoEn?: Timestamp | Date;
  resueltoPor?: string;
  tiempoResolucionMin?: number;
  cumplioSla?: boolean;
  bonoCortesiaId?: string;
  bonoCortesiaCodigo?: string;
  movimientoCajaId?: string;
  movimientoCajaCodigo?: string;
  reenvioDomicilioId?: string;
  whatsappEnviadoEn?: Timestamp | Date;
}

/**
 * Input para radicar un nuevo reclamo, PQRS o garantía de pedido
 */
export interface RegistrarReclamoInput {
  negocioId: string;
  tipo: TipoPqrs;
  canal: CanalIncidenteReclamo;
  causaRaiz: CausaRaizReclamo;
  prioridad: PrioridadReclamo;
  slaObjetivoMin?: number;
  clienteNombre: string;
  clienteTelefono?: string;
  direccionEntrega?: string;
  barrioEntrega?: string;
  domicilioId?: string;
  ventaId?: string;
  mesaNombre?: string;
  repartidorNombre?: string;
  itemsAfectados?: ItemVenta[];
  montoPedidoCOP: number;
  descripcion: string;
  fechaIso?: string;
  registradoPor: string;
  registradoRol?: string;
}

/**
 * Input para actualizar estado operativo o prioridad antes del cierre
 */
export interface ActualizarEstadoReclamoInput {
  estado?: EstadoReclamo;
  prioridad?: PrioridadReclamo;
  slaObjetivoMin?: number;
  causaRaiz?: CausaRaizReclamo;
}

/**
 * Input para resolver formalmente un reclamo con acción offline trazable
 */
export interface ResolverReclamoInput {
  tipoResolucion: TipoResolucionReclamo;
  montoCompensacionCOP?: number;
  resolucionNotas: string;
  resueltoPor: string;
  resueltoRol?: string;
  autorizadoPor?: string;
  vigenciaBonoDias?: number;
  direccionReenvio?: string;
  barrioReenvio?: string;
  itemsReenvio?: ItemVenta[];
}

/**
 * Proyección de reclamo enriquecida con métricas SLA en vivo
 */
export interface ReclamoEvaluado {
  reclamo: ReclamoPqrs;
  semaforoSla: EstadoSemaforoSlaReclamo;
  minutosTranscurridos: number;
  minutosRestantes: number; // Negativo si superó el SLA
  porcentajeSlaConsumido: number;
  esActivo: boolean;
}

/**
 * Conteo e impacto financiero agrupado por causa raíz
 */
export interface DesgloseCausaRaizReclamo {
  causaRaiz: CausaRaizReclamo;
  label: string;
  cantidad: number;
  porcentaje: number;
  compensacionCOP: number;
}

/**
 * KPIs consolidados del módulo de Reclamos, PQRS y Garantías
 */
export interface ResumenReclamos {
  totalReclamos: number;
  abiertosCount: number;
  enGestionCount: number;
  activosCount: number;
  resueltosCount: number;
  descartadosCount: number;
  criticosAbiertosCount: number;
  slaVencidosCount: number;
  slaPorVencerCount: number;
  tasaCumplimientoSlaPct: number;
  tiempoPromedioResolucionMin: number;
  tasaReclamosSobrePedidosPct: number;
  totalPedidosReferencia: number;
  costoCompensacionesMesCOP: number;
  costoCompensacionesTotalCOP: number;
  bonosCortesiaEmitidosCount: number;
  devolucionesCajaCount: number;
  reenviosGarantiaCount: number;
  topCausasRaiz: DesgloseCausaRaizReclamo[];
  causaRaizPrincipal: DesgloseCausaRaizReclamo | null;
  porCanal: Record<CanalIncidenteReclamo, number>;
  estadoGlobal: EstadoGlobalReclamos;
}

/**
 * Estado de filtros del panel `/reclamos`
 */
export interface FiltrosReclamos {
  busqueda: string;
  tipo: TipoPqrs | 'todos';
  canal: CanalIncidenteReclamo | 'todos';
  causaRaiz: CausaRaizReclamo | 'todos';
  prioridad: PrioridadReclamo | 'todos';
  estado: EstadoReclamo | 'todos' | 'activos';
  semaforoSla: EstadoSemaforoSlaReclamo | 'todos';
}
