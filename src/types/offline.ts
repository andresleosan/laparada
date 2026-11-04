// src/types/offline.ts
import type { ItemVenta, MetodoPago, TipoEntrega, Producto, Combo } from './index';

export type EstadoSyncVenta = 'pendiente' | 'sincronizando' | 'error';

export interface VentaPendienteOffline {
  id: string;
  negocioId: string;
  items: ItemVenta[];
  total: number;
  metodoPago: MetodoPago;
  tipoEntrega: TipoEntrega;
  direccion?: string;
  barrio?: string;
  clienteTelefono?: string;
  clienteNombre?: string;
  fechaCreacion: string; // ISO
  estadoSync: EstadoSyncVenta;
  errorDetalle?: string;
  intentos: number;
}

export interface CatalogoCacheOffline {
  negocioId: string;
  productos: Producto[];
  combos: Combo[];
  actualizadoEn: string; // ISO
}

export interface SyncResult {
  exitosas: number;
  fallidas: number;
  errores: Array<{ id: string; error: string }>;
}
