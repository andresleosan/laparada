import { Timestamp } from 'firebase/firestore';
import type { ItemVenta, MetodoPago } from './index';

/**
 * Estados posibles de una mesa en el salón
 */
export type EstadoMesa = 'libre' | 'ocupada' | 'por_cobrar';

/**
 * Zonas físicas configurables en el local
 */
export type ZonaMesa = 'Salón Principal' | 'Terraza' | 'Barra' | 'VIP' | 'Exterior' | string;

/**
 * Entidad Mesa en Firestore
 */
export interface Mesa {
  id: string;
  numero: number;
  nombre: string;
  capacidad: number;
  zona: ZonaMesa;
  estado: EstadoMesa;
  cuentaActivaId?: string | null;
  totalActual?: number;
  saldoPendiente?: number;
  comensales?: number;
  mesero?: string;
  apertura?: Timestamp | { seconds: number; nanoseconds: number } | null;
  negocioId: string;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
}

/**
 * Registro de un pago parcial o abono realizado a una cuenta abierta de salón
 */
export interface PagoParcialMesa {
  id: string;
  monto: number;            // En COP, valor neto abonado a la cuenta
  metodoPago: MetodoPago;
  fecha: Timestamp | { seconds: number; nanoseconds: number };
  propina?: number;         // En COP, propina voluntaria incluida en este pago
  clienteNombre?: string;   // Nombre o referencia del comensal que paga
  notas?: string;
  ventaId?: string;         // ID de la venta contable registrada en Firestore
  cajeroNombre?: string;
}

/**
 * Ronda de comanda enviada a preparación o agregada a la cuenta
 */
export interface RondaComanda {
  id: string;
  numero: number;
  enviadoEn: Timestamp | { seconds: number; nanoseconds: number };
  items: ItemVenta[];
  total: number;
  notas?: string;
  comandaId?: string; // ID en domicilios / KDS si fue enviada a cocina
  enviadoCocina: boolean;
}

/**
 * Registro de auditoría de un traslado o cambio de mesa
 */
export interface TrasladoMesaEvento {
  id: string;
  mesaOrigenId: string;
  mesaOrigenNumero: number;
  mesaOrigenNombre: string;
  mesaDestinoId: string;
  mesaDestinoNumero: number;
  mesaDestinoNombre: string;
  fecha: Timestamp | { seconds: number; nanoseconds: number } | Date;
  motivo?: string;
  operador?: string;
}

/**
 * Registro de auditoría de una unión o fusión de mesas
 */
export interface FusionMesasEvento {
  id: string;
  mesaSecundariaId: string;
  mesaSecundariaNumero: number;
  mesaSecundariaNombre: string;
  cuentaSecundariaId: string;
  itemsFusionadosCount: number;
  totalFusionado: number;
  fecha: Timestamp | { seconds: number; nanoseconds: number } | Date;
  motivo?: string;
  operador?: string;
}

/**
 * Cuenta abierta acumulativa vinculada a una mesa
 */
export interface CuentaMesa {
  id: string;
  mesaId: string;
  mesaNumero: number;
  mesaNombre: string;
  negocioId: string;
  estado: 'abierta' | 'por_cobrar' | 'cobrada' | 'cancelada' | 'fusionada';
  comensales: number;
  mesero?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  rondas: RondaComanda[];
  items: ItemVenta[]; // Consolidado de todos los ítems consumidos
  subtotal?: number;  // Subtotal bruto antes de descuento y propina
  descuento?: number; // Descuento aplicado a la cuenta
  descuentoMotivo?: string; // Motivo del descuento o cortesía
  total: number;
  propina?: number;   // Propina voluntaria asignada a la cuenta
  pagosParciales?: PagoParcialMesa[]; // Historial de abonos parciales
  totalPagado?: number; // Monto total ya recaudado
  saldoPendiente?: number; // Saldo restante por cancelar
  notas?: string;
  traslados?: TrasladoMesaEvento[]; // Historial de traslados entre mesas
  fusiones?: FusionMesasEvento[]; // Historial de mesas fusionadas en esta cuenta
  fusionadaConCuentaId?: string; // ID de la cuenta principal si fue fusionada
  fusionadaConMesaNombre?: string; // Nombre de la mesa principal receptora
  apertura: Timestamp | { seconds: number; nanoseconds: number };
  cierre?: Timestamp | { seconds: number; nanoseconds: number } | null;
  ventaId?: string;
  metodoPago?: MetodoPago;
}

/**
 * Resultado de dividir una cuenta entre comensales
 */
export interface DivisionCuentaResultado {
  comensales: number;
  totalOriginal: number;
  montoPorPersona: number;
  residuo: number;
}

