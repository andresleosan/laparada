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
  comensales?: number;
  mesero?: string;
  apertura?: Timestamp | { seconds: number; nanoseconds: number } | null;
  negocioId: string;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
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
