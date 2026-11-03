import type { Timestamp } from 'firebase/firestore';

export type EstadoReserva = 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
export type OrigenReserva = 'whatsapp' | 'web' | 'pos';

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
  creadoEn?: Timestamp | string;
  actualizadoEn?: Timestamp | string;
}

export type NuevaReservaInput = Omit<ReservaNegocio, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>;
