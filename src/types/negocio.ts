// src/types/negocio.ts
import { Timestamp } from 'firebase/firestore';

export type EstadoNegocio = 'pendiente' | 'activo' | 'suspendido' | 'rechazado';
export type RolUsuarioNegocio = 'superadmin' | 'admin' | 'cajero';

export interface Negocio {
  id: string;
  nombre: string;
  slug: string;
  propietarioEmail: string;
  propietarioNombre: string;
  telefono: string;
  direccion?: string;
  ciudad?: string;
  logoUrl?: string | null;
  estado: EstadoNegocio;
  plan?: 'basico' | 'pro' | 'enterprise';
  creadoEn: Timestamp;
  aprobadoEn?: Timestamp;
  notasAdmin?: string;
}

export interface UsuarioNegocio {
  uid: string;
  email: string;
  nombre: string;
  negocioId: string;
  rol: RolUsuarioNegocio;
  activo: boolean;
  creadoEn: Timestamp;
}

export const SUPER_ADMIN_EMAIL = 'andres.san1404@gmail.com';
export const DEFAULT_NEGOCIO_ID = 'laparada';
