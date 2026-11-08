import type { Timestamp } from 'firebase/firestore';

/**
 * Niveles de fidelización VIP según el historial de compras del cliente
 */
export type NivelFidelizacion = 'bronce' | 'plata' | 'oro' | 'diamante';

/**
 * Estado de retención / riesgo de abandono del cliente según la recencia de su última compra
 */
export type EstadoRiesgoCliente = 'nuevo' | 'activo' | 'en_riesgo' | 'inactivo';

/**
 * Tipos de campañas de mensajes directos por WhatsApp
 */
export type CampanaWhatsAppTipo =
  | 'reactivacion_riesgo'
  | 'recompensa_lista'
  | 'sellos_progreso'
  | 'agradecimiento_vip'
  | 'recordar_lo_de_siempre'
  | 'personalizado';

/**
 * Registro de auditoría para movimientos de sellos en la tarjeta digital
 */
export interface MovimientoSello {
  id: string;
  tipo: 'ganado_compra' | 'canje_recompensa' | 'ajuste_manual' | 'reversion_anulacion';
  cantidad: number;
  saldoSellos: number;
  saldoRecompensas: number;
  motivo?: string;
  responsable?: string;
  fecha: Timestamp | Date;
}

/**
 * Resumen del progreso de sellos y recompensas de un cliente
 */
export interface ProgresoTarjetaSellos {
  sellosActuales: number;
  metaSellos: number;
  faltantesParaRecompensa: number;
  porcentajeProgreso: number;
  tarjetaCompletada: boolean;
  recompensasDisponibles: number;
  recompensasRedimidas: number;
}

/**
 * KPIs globales de fidelización y retención para el negocio
 */
export interface KpisFidelizacion {
  totalClientes: number;
  clientesActivos: number;
  clientesEnRiesgo: number;
  clientesInactivos: number;
  clientesNuevos: number;
  clientesVip: number;
  recompensasDisponiblesTotal: number;
  recompensasRedimidasTotal: number;
  tasaRetencion: number;
}
