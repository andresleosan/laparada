import { Timestamp } from 'firebase/firestore';

/**
 * Estados posibles de un grupo en lista de espera / walk-in
 */
export type EstadoEspera =
  | 'esperando'
  | 'notificado'
  | 'sentado'
  | 'cancelado'
  | 'no_show';

/**
 * Turno de lista de espera para comensales en puerta (walk-ins)
 */
export interface TurnoEspera {
  id: string;
  negocioId: string;
  codigoTurno: string; // Ej: "E-01", "E-02"
  clienteNombre: string;
  clienteTelefono?: string;
  personas: number;
  zonaPreferida?: string;
  notas?: string;
  estado: EstadoEspera;
  tiempoEstimadoMin: number;
  mesaAsignadaId?: string;
  mesaAsignadaNumero?: number;
  mesaAsignadaNombre?: string;
  cuentaMesaId?: string;
  notificadoEn?: Timestamp | { seconds: number; nanoseconds: number };
  sentadoEn?: Timestamp | { seconds: number; nanoseconds: number };
  creadoEn: Timestamp | { seconds: number; nanoseconds: number };
  actualizadoEn?: Timestamp | { seconds: number; nanoseconds: number };
}

/**
 * Datos de entrada para registrar un nuevo walk-in en puerta
 */
export interface RegistrarTurnoEsperaInput {
  clienteNombre: string;
  clienteTelefono?: string;
  personas: number;
  zonaPreferida?: string;
  notas?: string;
  tiempoEstimadoMin?: number;
}
