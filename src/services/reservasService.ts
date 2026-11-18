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
  deleteField,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { abrirCuentaMesa } from './mesasService';
import { requireTenantId } from '@/security/tenantScope';
import type { MetodoPago } from '@/types';
import type {
  EstadoAnticipoReserva,
  EstadoReserva,
  NuevaReservaInput,
  OcasionReserva,
  ReservaNegocio,
} from '@/types/reserva';
import { formatCOP } from '@/utils/formatCOP';
import { formatearOcasionReserva } from '@/utils/reservasUtils';

const ESTADOS_VALIDOS = new Set<EstadoReserva>([
  'pendiente',
  'confirmada',
  'completada',
  'cancelada',
]);

const ESTADOS_ANTICIPO_VALIDOS = new Set<EstadoAnticipoReserva>([
  'sin_anticipo',
  'pendiente',
  'verificado',
]);

const METODOS_ANTICIPO_VALIDOS = new Set<MetodoPago>(['efectivo', 'transferencia']);

const OCASIONES_VALIDAS = new Set<OcasionReserva>([
  'ninguna',
  'cumpleanos',
  'aniversario',
  'reunion_empresarial',
  'cita',
  'otro',
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

  if (input.anticipoMonto !== undefined) {
    const monto = Number(input.anticipoMonto);
    if (!Number.isInteger(monto) || monto < 0 || monto > 50_000_000) {
      throw new Error('El anticipo debe ser un monto entero entre $0 y $50.000.000 COP.');
    }
  }

  if (input.anticipoEstado !== undefined && !ESTADOS_ANTICIPO_VALIDOS.has(input.anticipoEstado)) {
    throw new Error('El estado del anticipo de la reserva no es válido.');
  }

  if (input.anticipoMetodo !== undefined && !METODOS_ANTICIPO_VALIDOS.has(input.anticipoMetodo)) {
    throw new Error('El método de pago del anticipo no es válido.');
  }

  if (input.anticipoReferencia !== undefined && String(input.anticipoReferencia).length > 120) {
    throw new Error('La referencia del anticipo no debe exceder 120 caracteres.');
  }

  if (input.ocasionEspecial !== undefined && !OCASIONES_VALIDAS.has(input.ocasionEspecial)) {
    throw new Error('La ocasión especial indicada no es válida.');
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

  const mesaIdLimpia = input.mesaId?.trim();
  const mesaNombreLimpio = input.mesaNombre?.trim();
  const zonaLimpia = input.zonaPreferida?.trim();
  const mesaNumeroValido =
    typeof input.mesaNumero === 'number' &&
    Number.isInteger(input.mesaNumero) &&
    input.mesaNumero > 0
      ? input.mesaNumero
      : undefined;

  const anticipoMontoValido =
    typeof input.anticipoMonto === 'number' && input.anticipoMonto > 0
      ? Math.round(input.anticipoMonto)
      : 0;
  const anticipoEstadoFinal: EstadoAnticipoReserva | undefined =
    anticipoMontoValido > 0
      ? input.anticipoEstado && input.anticipoEstado !== 'sin_anticipo'
        ? input.anticipoEstado
        : 'pendiente'
      : input.anticipoEstado;
  const anticipoReferenciaLimpia = input.anticipoReferencia?.trim();

  const reservasRef = collection(db, 'reservas');
  const docRef = await addDoc(reservasRef, {
    negocioId: tenantId,
    clienteNombre: input.clienteNombre.trim(),
    clienteTelefono: input.clienteTelefono.trim(),
    fechaHoraReserva: input.fechaHoraReserva.trim(),
    personas: Number(input.personas),
    ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
    ...(mesaIdLimpia ? { mesaId: mesaIdLimpia } : {}),
    ...(mesaNumeroValido !== undefined ? { mesaNumero: mesaNumeroValido } : {}),
    ...(mesaNombreLimpio ? { mesaNombre: mesaNombreLimpio } : {}),
    ...(zonaLimpia ? { zonaPreferida: zonaLimpia } : {}),
    ...(anticipoMontoValido > 0 ? { anticipoMonto: anticipoMontoValido } : {}),
    ...(anticipoMontoValido > 0
      ? { anticipoMetodo: input.anticipoMetodo || 'transferencia' }
      : {}),
    ...(anticipoEstadoFinal ? { anticipoEstado: anticipoEstadoFinal } : {}),
    ...(anticipoReferenciaLimpia ? { anticipoReferencia: anticipoReferenciaLimpia } : {}),
    ...(input.ocasionEspecial && input.ocasionEspecial !== 'ninguna'
      ? { ocasionEspecial: input.ocasionEspecial }
      : {}),
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
 * Asigna o desasigna una mesa del salón a una reserva existente.
 */
export async function asignarMesaAReserva(
  negocioId: string,
  reservaId: string,
  mesa: {
    mesaId: string;
    mesaNumero: number;
    mesaNombre: string;
    zonaPreferida?: string;
  } | null
): Promise<void> {
  requireTenantId(negocioId);
  const cleanId = reservaId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la reserva es obligatorio.');
  }

  const reservaRef = doc(db, 'reservas', cleanId);
  if (!mesa) {
    await updateDoc(reservaRef, {
      mesaId: deleteField(),
      mesaNumero: deleteField(),
      mesaNombre: deleteField(),
      actualizadoEn: serverTimestamp(),
    });
    return;
  }

  if (!mesa.mesaId?.trim()) {
    throw new Error('El identificador de la mesa es obligatorio.');
  }

  await updateDoc(reservaRef, {
    mesaId: mesa.mesaId.trim(),
    mesaNumero: Math.max(1, Math.floor(Number(mesa.mesaNumero) || 1)),
    mesaNombre: mesa.mesaNombre.trim() || `Mesa ${mesa.mesaNumero}`,
    ...(mesa.zonaPreferida?.trim() ? { zonaPreferida: mesa.zonaPreferida.trim() } : {}),
    actualizadoEn: serverTimestamp(),
  });
}

/**
 * Registra o verifica un anticipo offline (transferencia o efectivo) sobre una reserva.
 */
export async function registrarAnticipoReserva(
  negocioId: string,
  reservaId: string,
  anticipo: {
    anticipoMonto: number;
    anticipoMetodo: MetodoPago;
    anticipoEstado: EstadoAnticipoReserva;
    anticipoReferencia?: string;
  }
): Promise<void> {
  requireTenantId(negocioId);
  const cleanId = reservaId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la reserva es obligatorio.');
  }

  const monto = Number(anticipo.anticipoMonto);
  if (!Number.isInteger(monto) || monto < 0 || monto > 50_000_000) {
    throw new Error('El anticipo debe ser un monto entero entre $0 y $50.000.000 COP.');
  }
  if (!METODOS_ANTICIPO_VALIDOS.has(anticipo.anticipoMetodo)) {
    throw new Error('El método de pago del anticipo no es válido.');
  }
  if (!ESTADOS_ANTICIPO_VALIDOS.has(anticipo.anticipoEstado)) {
    throw new Error('El estado del anticipo no es válido.');
  }

  const refLimpia = anticipo.anticipoReferencia?.trim() || '';
  if (refLimpia.length > 120) {
    throw new Error('La referencia del anticipo no debe exceder 120 caracteres.');
  }

  const reservaRef = doc(db, 'reservas', cleanId);
  await updateDoc(reservaRef, {
    anticipoMonto: monto,
    anticipoMetodo: anticipo.anticipoMetodo,
    anticipoEstado: monto === 0 ? 'sin_anticipo' : anticipo.anticipoEstado,
    anticipoReferencia: refLimpia ? refLimpia : deleteField(),
    actualizadoEn: serverTimestamp(),
  });
}

/**
 * Registra la fecha/hora de envío de confirmación o recordatorio por WhatsApp.
 */
export async function marcarRecordatorioReservaEnviado(
  negocioId: string,
  reservaId: string,
  confirmarSiPendiente = false
): Promise<string> {
  requireTenantId(negocioId);
  const cleanId = reservaId?.trim();
  if (!cleanId) {
    throw new Error('El ID de la reserva es obligatorio.');
  }

  const fechaEnvioIso = new Date().toISOString();
  const reservaRef = doc(db, 'reservas', cleanId);

  await updateDoc(reservaRef, {
    recordatorioEnviadoEn: fechaEnvioIso,
    ...(confirmarSiPendiente ? { estado: 'confirmada' as EstadoReserva } : {}),
    actualizadoEn: serverTimestamp(),
  });

  return fechaEnvioIso;
}

/**
 * Ejecuta el Check-In de una reserva: abre la cuenta en la mesa del salón y marca la reserva como completada.
 */
export async function sentarReservaEnMesa(
  negocioId: string,
  params: {
    reserva: ReservaNegocio;
    mesaId: string;
    mesaNumero?: number;
    mesaNombre?: string;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
  }
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const reservaId = params.reserva?.id?.trim();
  if (!reservaId) {
    throw new Error('El ID de la reserva es obligatorio para hacer Check-In.');
  }
  if (params.reserva.negocioId && params.reserva.negocioId !== tenantId) {
    throw new Error('La reserva no pertenece al negocio activo.');
  }

  const mesaId = params.mesaId?.trim();
  if (!mesaId) {
    throw new Error('Debes seleccionar una mesa disponible para hacer Check-In.');
  }

  const partesNota: string[] = [];
  if (params.reserva.notas?.trim()) {
    partesNota.push(params.reserva.notas.trim());
  }
  const ocasion = formatearOcasionReserva(params.reserva.ocasionEspecial);
  if (ocasion) {
    partesNota.push(`Ocasión: ${ocasion.label}`);
  }
  const montoAnticipo = Math.max(0, Math.round(Number(params.reserva.anticipoMonto) || 0));
  if (montoAnticipo > 0 && params.reserva.anticipoEstado === 'verificado') {
    partesNota.push(`Anticipo Reserva Verificado: ${formatCOP(montoAnticipo)}`);
  } else if (montoAnticipo > 0 && params.reserva.anticipoEstado === 'pendiente') {
    partesNota.push(`Anticipo Reserva por verificar: ${formatCOP(montoAnticipo)}`);
  }

  const cuentaMesaId = await abrirCuentaMesa(tenantId, {
    mesaId,
    comensales: Math.max(1, Math.floor(Number(params.reserva.personas) || 1)),
    mesero: params.mesero,
    meseroId: params.meseroId,
    meseroNombre: params.meseroNombre,
    clienteNombre: params.reserva.clienteNombre,
    clienteTelefono: params.reserva.clienteTelefono,
    notas: partesNota.length > 0 ? partesNota.join(' · ') : undefined,
  });

  const reservaRef = doc(db, 'reservas', reservaId);
  await updateDoc(reservaRef, {
    estado: 'completada' as EstadoReserva,
    mesaId,
    ...(typeof params.mesaNumero === 'number' ? { mesaNumero: params.mesaNumero } : {}),
    ...(params.mesaNombre?.trim() ? { mesaNombre: params.mesaNombre.trim() } : {}),
    cuentaMesaId,
    actualizadoEn: serverTimestamp(),
  });

  return cuentaMesaId;
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
