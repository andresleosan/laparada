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
    descripcion: 'Digitalización express sin riesgo para locales y puestos de comida.',
    caracteristicas: [
      'Menú digital web con código QR descargable',
      'Sarin IA básica: menú, precios y horarios',
      'Recepción de pedidos directo a WhatsApp',
      '1 usuario administrador (el dueño)',
      'Ventas directas sin comisión por pedido',
    ],
  },
  semanal_7d: {
    id: 'semanal_7d',
    nombre: 'Semanal (7 días)',
    precioCOP: 19900,
    dias: 7,
    cuotaRespuestasIA: 700,
    descripcion: 'Control de caja y pedidos para fines de semana y alta rotación.',
    caracteristicas: [
      'Todo lo del plan Prueba, más:',
      'Control de caja diaria y arqueo por turnos',
      'Sarin IA Atendedora: pedidos guiados paso a paso',
      '2 accesos de staff (Admin + Cajero)',
      'Alertas sonoras de nuevos pedidos en pantalla',
    ],
  },
  quincenal_15d: {
    id: 'quincenal_15d',
    nombre: 'Quincenal (15 días)',
    precioCOP: 34900,
    dias: 15,
    cuotaRespuestasIA: 1500,
    descripcion: 'Operación completa para locales con cocina y domicilios.',
    caracteristicas: [
      'Todo lo del plan Semanal, más:',
      'Pantalla KDS de cocina en tiempo real (adiós comandas)',
      'Portal móvil de repartidores (/repartidor) con Waze y liquidación',
      'Sarin IA Omnicanal: atiende en WhatsApp y Chat Web',
      'Hasta 4 accesos de staff (Admin, Cajero, Cocinero, Repartidor)',
    ],
  },
  mensual_30d: {
    id: 'mensual_30d',
    nombre: 'Mensual (30 días)',
    precioCOP: 59900,
    dias: 30,
    cuotaRespuestasIA: 3000,
    badge: 'Recomendado · Mejor ROI',
    descripcion: 'Restaurante inteligente: máxima rentabilidad, control y automatización.',
    caracteristicas: [
      'Todo lo del plan Quincenal, más:',
      'Sarin Copiloto Proactivo: sugiere combos y adicionales (Upselling)',
      'Presencia destacada en el Marketplace La Parada',
      'Reportes avanzados de ventas, platos top y rentabilidad',
      'Accesos y roles de staff ilimitados',
      'Acompañamiento prioritario en carga de carta y fotos',
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
