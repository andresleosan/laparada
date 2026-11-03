import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import type { EstadoReserva, NuevaReservaInput, ReservaNegocio } from '@/types/reserva';

const ESTADOS_VALIDOS = new Set<EstadoReserva>([
  'pendiente',
  'confirmada',
  'completada',
  'cancelada',
]);

export interface FiltrosReservas {
  estado?: EstadoReserva;
  limite?: number;
}

export function validarDatosReserva(input: NuevaReservaInput): void {
  const nombre = input.clienteNombre?.trim();
  if (!nombre || nombre.length < 2 || nombre.length > 100) {
    throw new Error('El nombre del cliente debe tener entre 2 y 100 caracteres.');
  }

  const telefono = input.clienteTelefono?.trim();
  if (!telefono || telefono.length < 7 || telefono.length > 20) {
    throw new Error('El teléfono del cliente debe tener entre 7 y 20 caracteres.');
  }

  const fechaHora = input.fechaHoraReserva?.trim();
  if (!fechaHora) {
    throw new Error('La fecha y hora de la reserva es requerida.');
  }

  const personas = Number(input.personas);
  if (!Number.isInteger(personas) || personas < 1 || personas > 50) {
    throw new Error('La cantidad de personas debe ser un número entero entre 1 y 50.');
  }

  if (!ESTADOS_VALIDOS.has(input.estado)) {
    throw new Error('El estado de la reserva no es válido.');
  }

  if (input.notas && input.notas.length > 500) {
    throw new Error('Las notas de la reserva no deben exceder 500 caracteres.');
  }
}

/**
 * Crea una nueva reserva en Firestore para el negocio activo.
 */
export async function crearReserva(
  negocioId: string,
  input: NuevaReservaInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  validarDatosReserva(input);

  const reservasRef = collection(db, 'reservas');
  const docRef = await addDoc(reservasRef, {
    negocioId: tenantId,
    clienteNombre: input.clienteNombre.trim(),
    clienteTelefono: input.clienteTelefono.trim(),
    fechaHoraReserva: input.fechaHoraReserva.trim(),
    personas: Number(input.personas),
    ...(input.notas ? { notas: input.notas.trim() } : {}),
    estado: input.estado,
    origen: input.origen,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Actualiza el estado de una reserva (ej. de pendiente a confirmada, completada o cancelada).
 */
export async function actualizarEstadoReserva(
  negocioId: string,
  reservaId: string,
  nuevoEstado: EstadoReserva
): Promise<void> {
  requireTenantId(negocioId);
  const cleanId = reservaId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la reserva es obligatorio.');
  }

  if (!ESTADOS_VALIDOS.has(nuevoEstado)) {
    throw new Error('El estado indicado para la reserva no es válido.');
  }

  const reservaRef = doc(db, 'reservas', cleanId);
  await updateDoc(reservaRef, {
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
  });
}

/**
 * Elimina permanentemente una reserva (restringido a roles autorizados por Firestore rules).
 */
export async function eliminarReserva(
  negocioId: string,
  reservaId: string
): Promise<void> {
  requireTenantId(negocioId);
  const cleanId = reservaId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la reserva es obligatorio.');
  }

  const reservaRef = doc(db, 'reservas', cleanId);
  await deleteDoc(reservaRef);
}

/**
 * Consulta las reservas del negocio aplicando filtros opcionales.
 */
export async function getReservas(
  negocioId: string,
  filtros: FiltrosReservas = {}
): Promise<ReservaNegocio[]> {
  const tenantId = requireTenantId(negocioId);
  const reservasRef = collection(db, 'reservas');

  let q = query(
    reservasRef,
    where('negocioId', '==', tenantId),
    orderBy('fechaHoraReserva', 'asc')
  );

  if (filtros.estado) {
    q = query(
      reservasRef,
      where('negocioId', '==', tenantId),
      where('estado', '==', filtros.estado),
      orderBy('fechaHoraReserva', 'asc')
    );
  }

  if (filtros.limite && filtros.limite > 0) {
    q = query(q, limit(filtros.limite));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    ...docSnap.data(),
    id: docSnap.id,
  })) as ReservaNegocio[];
}

/**
 * Suscribe a las reservas del negocio en tiempo real.
 */
export function suscribirReservas(
  negocioId: string,
  onUpdate: (reservas: ReservaNegocio[]) => void,
  onError?: (error: Error) => void,
  filtros: FiltrosReservas = {}
): () => void {
  const tenantId = requireTenantId(negocioId);
  const reservasRef = collection(db, 'reservas');

  let q = query(
    reservasRef,
    where('negocioId', '==', tenantId),
    orderBy('fechaHoraReserva', 'asc')
  );

  if (filtros.estado) {
    q = query(
      reservasRef,
      where('negocioId', '==', tenantId),
      where('estado', '==', filtros.estado),
      orderBy('fechaHoraReserva', 'asc')
    );
  }

  if (filtros.limite && filtros.limite > 0) {
    q = query(q, limit(filtros.limite));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const reservas = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as ReservaNegocio[];
      onUpdate(reservas);
    },
    (err) => {
      console.error('Error en suscripción a reservas:', err);
      onError?.(err);
    }
  );
}

