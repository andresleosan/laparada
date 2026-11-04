// src/types/tracking.ts
import { Timestamp } from 'firebase/firestore';
import type { EstadoDomicilio, MetodoPago, OrigenVenta } from './index';

export type TrackingStage = EstadoDomicilio;

export interface TrackingItem {
  nombre: string;
  cantidad: number;
}

export interface TrackingNegocio {
  nombre: string;
  telefono?: string;
  slug?: string;
  logoUrl?: string;
}

export interface RastreoPedido {
  id?: string;
  negocioId: string;
  pedidoRef: string;
  codigo: string;
  estado: TrackingStage;
  origen: OrigenVenta;
  clienteNombre: string;
  barrio?: string;
  items: TrackingItem[];
  totalItems: number;
  total: number;
  metodoPago: MetodoPago;
  domiciliarioNombre?: string;
  tiempoEstimadoMin: number;
  negocio: TrackingNegocio;
  historial?: Partial<Record<TrackingStage, Timestamp | { seconds: number; nanoseconds: number }>>;
  creadoEn?: Timestamp | { seconds: number; nanoseconds: number };
  actualizadoEn?: Timestamp | { seconds: number; nanoseconds: number };
  entregadoEn?: Timestamp | { seconds: number; nanoseconds: number };
}

