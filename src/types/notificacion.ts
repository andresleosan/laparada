// src/types/notificacion.ts
import { Timestamp } from 'firebase/firestore';

export type TipoNotificacionCorreo =
  | 'resumen_diario'
  | 'activacion_plan'
  | 'renovacion_plan'
  | 'alerta_vencimiento'
  | 'alerta_cuota_ia';

export type EstadoNotificacionCorreo = 'enviado' | 'simulado' | 'fallido';

export interface NotificacionCorreo {
  id: string;
  negocioId: string;
  tipo: TipoNotificacionCorreo;
  destinatario: string;
  asunto: string;
  estado: EstadoNotificacionCorreo;
  resendId?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
  enviadoEn: Timestamp | { seconds: number; nanoseconds: number } | Date;
}

export interface ResumenDiarioItemProducto {
  nombre: string;
  cantidad: number;
  subtotal: number;
}

export interface ResumenDiarioDatos {
  nombreNegocio: string;
  slug: string;
  fechaTexto: string;
  totalVentasCOP: number;
  cantidadVentas: number;
  ticketPromedioCOP: number;
  ventasPosCOP: number;
  ventasWhatsappWebCOP: number;
  ventasEfectivoCOP: number;
  ventasTransferenciaCOP: number;
  topProductos: ResumenDiarioItemProducto[];
  domiciliosEntregados: number;
  reservasAgendadas: number;
  respuestasIAUsadasHoy: number;
  cierreCaja: {
    cerrado: boolean;
    utilidadNetaCOP?: number;
    totalIngresosCOP?: number;
    totalGastosCOP?: number;
    notas?: string;
  };
}

export interface ResumenDiarioResponse {
  negocioId: string;
  nombreNegocio: string;
  slug: string;
  destinatarioEmail: string;
  propietarioNombre: string;
  fechaISO: string;
  fechaTexto: string;
  datos: ResumenDiarioDatos;
}

export interface EnviarResumenDiarioResult {
  exito: boolean;
  estado: EstadoNotificacionCorreo;
  destinatario: string;
  fechaTexto: string;
  totalVentasCOP: number;
  cantidadVentas: number;
  error?: string;
}

// ==========================================
// NOTIFICACIONES OPERATIVAS EN TIEMPO REAL
// ==========================================

export type ModuloNotificacion =
  | 'pedidos'
  | 'cocina'
  | 'inventario'
  | 'salon'
  | 'caja'
  | 'sistema';

export type UrgenciaNotificacion = 'critica' | 'alta' | 'media' | 'baja';

export type OrigenNotificacion = 'sistema' | 'automatico' | 'manual';

export interface NotificacionOperativa {
  id: string;
  negocioId: string;
  modulo: ModuloNotificacion;
  tipo: string;
  titulo: string;
  mensaje: string;
  urgencia: UrgenciaNotificacion;
  leida: boolean;
  fecha: string; // ISO 8601
  leidaEn?: string;
  leidaPor?: string;
  enlace?: string;
  metadata?: Record<string, unknown>;
  origen: OrigenNotificacion;
  creadaPor?: string;
}

export type CrearNotificacionInput = Omit<
  NotificacionOperativa,
  'id' | 'negocioId' | 'leida' | 'fecha'
> & {
  fecha?: string;
  leida?: boolean;
};

export interface FiltrosNotificaciones {
  modulo?: ModuloNotificacion | 'todos';
  urgencia?: UrgenciaNotificacion | 'todas';
  estado?: 'todas' | 'no_leidas' | 'leidas';
  busqueda?: string;
}

export interface MetricasNotificaciones {
  total: number;
  noLeidas: number;
  criticas: number;
  altas: number;
  medias: number;
  bajas: number;
  porModulo: Record<ModuloNotificacion, number>;
}


