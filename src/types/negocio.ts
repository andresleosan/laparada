// src/types/negocio.ts
import { Timestamp } from 'firebase/firestore';

export type EstadoNegocio = 'pendiente' | 'activo' | 'suspendido' | 'rechazado';
export type RolUsuarioNegocio = 'superadmin' | 'admin' | 'cajero' | 'domiciliario' | 'cocinero';

export type TipoPlanSaaS = 'prueba_3d' | 'semanal_7d' | 'quincenal_15d' | 'mensual_30d' | 'enterprise';

export interface PlanSaaSConfig {
  id: TipoPlanSaaS;
  nombre: string;
  precioCOP: number;
  dias: number;
  cuotaRespuestasIA: number;
  badge?: string;
  descripcion: string;
  caracteristicas: string[];
}

export const PLANES_SAAS: Record<TipoPlanSaaS, PlanSaaSConfig> = {
  prueba_3d: {
    id: 'prueba_3d',
    nombre: 'Prueba 3 días',
    precioCOP: 5000,
    dias: 3,
    cuotaRespuestasIA: 300,
    badge: 'Popular para iniciar',
    descripcion: 'Prueba completa para locales y puestos de comida.',
    caracteristicas: [
      '3 días de acceso completo',
      '300 respuestas de Sarin IA en WhatsApp',
      'Agenda y reservas por conversación',
      'Enlace único del negocio y QR descargable',
      'Punto de Venta POS con control de caja',
    ],
  },
  semanal_7d: {
    id: 'semanal_7d',
    nombre: 'Semanal (7 días)',
    precioCOP: 19900,
    dias: 7,
    cuotaRespuestasIA: 700,
    badge: 'Rotación semanal',
    descripcion: 'Control flexible con renovación cada semana.',
    caracteristicas: [
      '7 días de acceso completo',
      '700 respuestas de Sarin IA en WhatsApp',
      'Agenda y reservas por conversación',
      'Enlace único del negocio y QR descargable',
      'Punto de Venta POS con control de caja',
    ],
  },
  quincenal_15d: {
    id: 'quincenal_15d',
    nombre: 'Quincenal (15 días)',
    precioCOP: 34900,
    dias: 15,
    cuotaRespuestasIA: 1500,
    badge: 'Equilibrado',
    descripcion: 'Ideal para ciclos de nómina y abastecimiento quincenal.',
    caracteristicas: [
      '15 días de acceso completo',
      '1.500 respuestas de Sarin IA en WhatsApp',
      'Agenda y reservas por conversación',
      'Enlace único del negocio y QR descargable',
      'Punto de Venta POS con control de caja',
    ],
  },
  mensual_30d: {
    id: 'mensual_30d',
    nombre: 'Mensual (30 días)',
    precioCOP: 59900,
    dias: 30,
    cuotaRespuestasIA: 3000,
    badge: 'Mejor valor por día',
    descripcion: 'Operación continua al costo diario más económico.',
    caracteristicas: [
      '30 días de acceso completo',
      '3.000 respuestas de Sarin IA en WhatsApp',
      'Agenda y reservas por conversación',
      'Enlace único del negocio y QR descargable',
      'Punto de Venta POS con control de caja',
    ],
  },
  enterprise: {
    id: 'enterprise',
    nombre: 'Enterprise Insignia',
    precioCOP: 0,
    dias: 365,
    cuotaRespuestasIA: 100000,
    descripcion: 'Operación insignia permanente La Parada.',
    caracteristicas: [
      'Acceso continuo sin fecha de corte',
      'Cuota ampliada de Sarin IA',
      'Todas las funciones administrativas y operativas',
    ],
  },
};

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
  plan?: TipoPlanSaaS | 'basico' | 'pro' | 'enterprise';
  planId?: TipoPlanSaaS;
  cuotaRespuestasIA?: number;
  respuestasIAUsadas?: number;
  suscripcionVenceEn?: Timestamp | null;
  recibirResumenDiarioEmail?: boolean;
  emailNotificacionesResumen?: string;
  creadoEn: Timestamp;
  aprobadoEn?: Timestamp;
  notasAdmin?: string;
  actualizadoEn?: Timestamp;
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
