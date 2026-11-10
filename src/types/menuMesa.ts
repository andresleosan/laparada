import type { MetodoPago, ItemVenta } from './index';

/**
 * Motivos típicos de llamado o asistencia en salón para agilizar la atención del mesero
 */
export type MotivoLlamadoMesero =
  | 'asistencia'
  | 'servilletas'
  | 'bebidas_hielo'
  | 'limpieza'
  | 'cuenta'
  | 'otro';

/**
 * Metadatos descriptivos de cada motivo de llamado
 */
export interface MotivoLlamadoMeta {
  id: MotivoLlamadoMesero;
  label: string;
  descripcion: string;
  icono: string;
}

/**
 * Registro de alerta de comensal activo en la mesa
 */
export interface LlamadoPendienteMesa {
  id?: string;
  tipo: 'llamado' | 'cuenta' | 'autopedido';
  motivo: string;
  hora: string; // ISO 8601
  atendido?: boolean;
  clienteNombre?: string;
  notas?: string;
}

/**
 * Entrada para solicitar llamado al mesero desde el menú en mesa
 */
export interface SolicitudLlamadoMeseroInput {
  negocioId: string;
  mesaId: string;
  mesaNumero: number;
  mesaNombre: string;
  motivo: MotivoLlamadoMesero;
  notas?: string;
  clienteNombre?: string;
}

/**
 * Entrada para solicitar la pre-cuenta desde el móvil del comensal
 */
export interface SolicitudPrecuentaMesaInput {
  negocioId: string;
  mesaId: string;
  mesaNumero: number;
  mesaNombre: string;
  cuentaId: string;
  metodoPagoPreferido: MetodoPago;
  necesitaFactura?: boolean;
  datosFactura?: {
    nit: string;
    razonSocial: string;
  };
  notas?: string;
  clienteNombre?: string;
}

/**
 * Entrada para autopedido directo del comensal a la comanda de la mesa
 */
export interface AutopedidoMesaInput {
  negocioId: string;
  mesaId: string;
  mesaNumero: number;
  mesaNombre: string;
  cuentaId?: string | null;
  items: ItemVenta[];
  clienteNombre?: string;
  notas?: string;
}

/**
 * Resumen financiero de la cuenta activa visible para el comensal en su teléfono
 */
export interface ResumenCuentaMesaComensal {
  subtotal: number;
  propinaSugerida: number;
  total: number;
  totalPagado: number;
  saldoRestante: number;
  itemsCount: number;
  rondasCount: number;
}
