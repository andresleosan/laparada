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
 * Cuenta abierta acumulativa vinculada a una mesa
 */
export interface CuentaMesa {
  id: string;
  mesaId: string;
  mesaNumero: number;
  mesaNombre: string;
  negocioId: string;
  estado: 'abierta' | 'por_cobrar' | 'cobrada' | 'cancelada';
  comensales: number;
  mesero?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  rondas: RondaComanda[];
  items: ItemVenta[]; // Consolidado de todos los ítems consumidos
  total: number;
  propina?: number;   // Propina voluntaria asignada a la cuenta
  pagosParciales?: PagoParcialMesa[]; // Historial de abonos parciales
  totalPagado?: number; // Monto total ya recaudado
  saldoPendiente?: number; // Saldo restante por cancelar
  notas?: string;
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

