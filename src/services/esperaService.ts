import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  EstadoEspera,
  RegistrarTurnoEsperaInput,
  TurnoEspera,
} from '@/types/espera';
import type { Mesa } from '@/types/mesa';
import {
  construirMensajeMesaLista,
  generarCodigoTurnoEspera,
  normalizarTelefonoEspera,
} from '@/utils/esperaUtils';
import { abrirCuentaMesa } from './mesasService';
import { enviarMensajeWhatsApp } from './whatsappService';

const COLECCION_ESPERA = 'lista_espera';

function inicioDelDiaTimestamp(): Timestamp {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(hoy);
}

/**
 * Escucha en tiempo real todos los turnos de lista de espera registrados hoy para el negocio.
 */
export function onListaEsperaHoyChange(
  negocioId: string,
  callback: (turnos: TurnoEspera[]) => void,
  onError?: (err: Error) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_ESPERA),
    where('negocioId', '==', tenantId),
    where('creadoEn', '>=', inicioDelDiaTimestamp()),
    orderBy('creadoEn', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TurnoEspera, 'id'>),
      }));
      callback(lista);
    },
    (err) => {
      console.error('Error escuchando lista de espera:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Calcula el siguiente correlativo de turno de espera para el día actual.
 */
export async function getSiguienteCorrelativoEspera(negocioId: string): Promise<number> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_ESPERA),
    where('negocioId', '==', tenantId),
    where('creadoEn', '>=', inicioDelDiaTimestamp())
  );
  const snap = await getDocs(q);
  return snap.size + 1;
}

/**
 * Registra un nuevo comensal / grupo en la lista de espera de salón.
 */
export async function registrarTurnoEspera(
  negocioId: string,
  input: RegistrarTurnoEsperaInput
): Promise<TurnoEspera> {
  const tenantId = requireTenantId(negocioId);
  const clienteNombre = input.clienteNombre.trim();
  if (!clienteNombre) {
    throw new Error('El nombre del comensal es obligatorio.');
  }

  const personas = Math.max(1, Math.floor(Number(input.personas) || 1));
  const telefonoLimpio = normalizarTelefonoEspera(input.clienteTelefono);
  const correlativo = await getSiguienteCorrelativoEspera(tenantId);
  const codigoTurno = generarCodigoTurnoEspera(correlativo);
  const ahora = Timestamp.now();

  const nuevoTurno: Omit<TurnoEspera, 'id'> = {
    negocioId: tenantId,
    codigoTurno,
    clienteNombre,
    ...(telefonoLimpio ? { clienteTelefono: telefonoLimpio } : {}),
    personas,
    zonaPreferida: input.zonaPreferida?.trim() || 'Cualquiera',
    ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
    estado: 'esperando',
    tiempoEstimadoMin: Math.max(0, Math.round(input.tiempoEstimadoMin ?? 15)),
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const docRef = await addDoc(collection(db, COLECCION_ESPERA), nuevoTurno);
  return {
    id: docRef.id,
    ...nuevoTurno,
  };
}

/**
 * Notifica automáticamente por WhatsApp al comensal que su mesa está lista
 * y actualiza su estado a 'notificado'.
 */
export async function notificarTurnoWhatsApp(
  negocioId: string,
  turno: TurnoEspera,
  negocioNombre: string,
  mesaSugerida?: Pick<Mesa, 'id' | 'numero' | 'nombre'>
): Promise<{ mensaje: string; enviadoPorSistema: boolean }> {
  const tenantId = requireTenantId(negocioId);
  if (turno.negocioId !== tenantId) {
    throw new Error('El turno no pertenece al negocio activo.');
  }

  const telefono = normalizarTelefonoEspera(turno.clienteTelefono);
  if (!telefono) {
    throw new Error('Este turno no tiene un número de WhatsApp registrado.');
  }

  const mensaje = construirMensajeMesaLista({
    negocioNombre,
    clienteNombre: turno.clienteNombre,
    codigoTurno: turno.codigoTurno,
    mesaNombre: mesaSugerida?.nombre,
  });

  await enviarMensajeWhatsApp(tenantId, {
    telefono,
    contenido: mensaje,
    idempotencyKey: `espera_${turno.id}_${mesaSugerida?.id || 'general'}`,
  });

  const ahora = Timestamp.now();
  await updateDoc(doc(db, COLECCION_ESPERA, turno.id), {
    estado: 'notificado' as EstadoEspera,
    notificadoEn: ahora,
    actualizadoEn: ahora,
  });

  return { mensaje, enviadoPorSistema: true };
}

/**
 * Marca manualmente un turno como notificado (llamado verbal o enlace directo wa.me).
 */
export async function marcarTurnoNotificado(
  negocioId: string,
  turnoId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const turnoRef = doc(db, COLECCION_ESPERA, turnoId);
  const snap = await getDoc(turnoRef);
  if (!snap.exists() || snap.data()?.negocioId !== tenantId) {
    throw new Error('Turno de espera no encontrado en este negocio.');
  }
  const ahora = Timestamp.now();
  await updateDoc(turnoRef, {
    estado: 'notificado' as EstadoEspera,
    notificadoEn: ahora,
    actualizadoEn: ahora,
  });
}

/**
 * Asigna una mesa libre al turno en espera, abre su cuenta en salón y marca el turno como 'sentado'.
 */
export async function sentarTurnoEnMesa(
  negocioId: string,
  params: {
    turnoId: string;
    mesaId: string;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
  }
): Promise<{ cuentaMesaId: string; mesaNumero: number; mesaNombre: string }> {
  const tenantId = requireTenantId(negocioId);
  const turnoRef = doc(db, COLECCION_ESPERA, params.turnoId);
  const turnoSnap = await getDoc(turnoRef);

  if (!turnoSnap.exists() || turnoSnap.data()?.negocioId !== tenantId) {
    throw new Error('Turno de espera no encontrado en el negocio activo.');
  }

  const turnoData = turnoSnap.data() as Omit<TurnoEspera, 'id'>;
  if (turnoData.estado === 'sentado' || turnoData.estado === 'cancelado') {
    throw new Error('Este turno ya fue cerrado o sentado previamente.');
  }

  const mesaRef = doc(db, 'mesas', params.mesaId);
  const mesaSnap = await getDoc(mesaRef);
  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa seleccionada no pertenece al negocio activo.');
  }

  const mesaData = mesaSnap.data() as Mesa;
  const cuentaMesaId = await abrirCuentaMesa(tenantId, {
    mesaId: params.mesaId,
    comensales: turnoData.personas,
    mesero: params.mesero,
    meseroId: params.meseroId,
    meseroNombre: params.meseroNombre,
    clienteNombre: turnoData.clienteNombre,
    clienteTelefono: turnoData.clienteTelefono,
    notas: turnoData.notas,
  });

  const ahora = Timestamp.now();
  await updateDoc(turnoRef, {
    estado: 'sentado' as EstadoEspera,
    mesaAsignadaId: params.mesaId,
    mesaAsignadaNumero: mesaData.numero,
    mesaAsignadaNombre: mesaData.nombre,
    cuentaMesaId,
    sentadoEn: ahora,
    actualizadoEn: ahora,
  });

  return {
    cuentaMesaId,
    mesaNumero: mesaData.numero,
    mesaNombre: mesaData.nombre,
  };
}

/**
 * Actualiza el estado de un turno (cancelado, no_show o regresar a esperando).
 */
export async function actualizarEstadoTurnoEspera(
  negocioId: string,
  turnoId: string,
  estado: Extract<EstadoEspera, 'esperando' | 'cancelado' | 'no_show'>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const turnoRef = doc(db, COLECCION_ESPERA, turnoId);
  const snap = await getDoc(turnoRef);

  if (!snap.exists() || snap.data()?.negocioId !== tenantId) {
    throw new Error('Turno no encontrado en este negocio.');
  }

  await updateDoc(turnoRef, {
    estado,
    actualizadoEn: Timestamp.now(),
  });
}
