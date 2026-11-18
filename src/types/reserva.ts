import type { Timestamp } from 'firebase/firestore';
import type { MetodoPago } from './index';
import type { Mesa } from './mesa';

export type EstadoReserva = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
export type OrigenReserva = 'whatsapp' | 'web' | 'pos';
export type EstadoAnticipoReserva = 'sin_anticipo' | 'pendiente' | 'verificado';
export type OcasionReserva =
  | 'ninguna'
  | 'cumpleanos'
  | 'aniversario'
  | 'reunion_empresarial'
  | 'cita'
  | 'otro';

export interface ReservaNegocio {
  id: string;
  negocioId: string;
  clienteNombre: string;
  clienteTelefono: string;
  fechaHoraReserva: string;
  personas: number;
  notas?: string;
  estado: EstadoReserva;
  origen: OrigenReserva;
  mesaId?: string;
  mesaNumero?: number;
  mesaNombre?: string;
  zonaPreferida?: string;
  anticipoMonto?: number;
  anticipoMetodo?: MetodoPago;
  anticipoEstado?: EstadoAnticipoReserva;
  anticipoReferencia?: string;
  ocasionEspecial?: OcasionReserva;
  recordatorioEnviadoEn?: string;
  cuentaMesaId?: string;
  creadoEn?: Timestamp | string;
  actualizadoEn?: Timestamp | string;
}

export type NuevaReservaInput = Omit<
  ReservaNegocio,
  'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'
>;

export interface ConflictoHorarioMesaReserva {
  hayConflicto: boolean;
  reservaConflicto?: ReservaNegocio;
  diferenciaMinutos?: number;
  mensaje?: string;
}

export interface EstadoDisponibilidadMesaReserva {
  mesa: Mesa;
  disponibleEnHorario: boolean;
  capacidadSuficiente: boolean;
  coincideZona: boolean;
  conflicto?: ReservaNegocio;
  recomendada: boolean;
}

export interface MetricasLibroReservas {
  total: number;
  hoy: number;
  pendientes: number;
  confirmadas: number;
  completadas: number;
  canceladas: number;
  personasHoy: number;
  conMesaAsignada: number;
  totalAnticiposVerificadosCOP: number;
  totalAnticiposPendientesCOP: number;
  proximas2Horas: number;
}
