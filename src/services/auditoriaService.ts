import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type { EventoAuditoria, RegistrarEventoAuditoriaInput } from '@/types';
import {
  determinarSeveridadEvento,
  extraerCodigoVisible,
  generarHuellaForense,
  sanitizarMontoAuditoria,
} from '@/utils/auditoriaUtils';

const COLECCION_BITACORA = 'bitacora_auditoria';

/**
 * Registra de forma inmutable un evento de seguridad u operación crítica en `bitacora_auditoria`.
 * Las reglas de Firestore prohíben cualquier `update` o `delete` posterior sobre esta colección.
 */
export async function registrarEventoAuditoria(
  input: RegistrarEventoAuditoriaInput
): Promise<string> {
  const tenantId = requireTenantId(input.negocioId);
  const titulo = (input.titulo || '').trim();
  if (!titulo) {
    throw new Error('El título del evento de auditoría es obligatorio');
  }

  const montoImpacto = sanitizarMontoAuditoria(input.montoImpacto ?? 0);
  const responsableNombre = (input.responsableNombre || 'Administrador').trim();
  const referenciaId = (input.referenciaId || `manual_${Date.now()}`).trim();
  const severidad =
    input.severidad || determinarSeveridadEvento(input.categoria, montoImpacto);
  const codigoVisible = extraerCodigoVisible(referenciaId);
  const huellaForense = generarHuellaForense({
    negocioId: tenantId,
    categoria: input.categoria,
    referenciaId,
    montoImpacto,
    responsableNombre,
  });

  const payload: Omit<EventoAuditoria, 'id'> = {
    negocioId: tenantId,
    categoria: input.categoria,
    severidad,
    titulo,
    descripcion: (input.descripcion || '').trim(),
    ...(input.motivo ? { motivo: input.motivo.trim() } : {}),
    montoImpacto,
    responsableNombre,
    ...(input.responsableRol ? { responsableRol: input.responsableRol.trim() } : {}),
    entidadTipo: input.entidadTipo,
    referenciaId,
    codigoVisible,
    ...(input.detallesForenses ? { detallesForenses: input.detallesForenses } : {}),
    fecha: Timestamp.now(),
    origenRegistro: 'bitacora_inmutable',
    huellaForense,
  };

  const docRef = await addDoc(collection(db, COLECCION_BITACORA), payload);
  return docRef.id;
}

/**
 * Emite un registro inmutable en segundo plano sin interrumpir el flujo principal del cajero
 */
export function registrarEventoAuditoriaSilencioso(
  input: RegistrarEventoAuditoriaInput
): void {
  registrarEventoAuditoria(input).catch((err) => {
    console.warn('No se pudo persistir evento en bitacora_auditoria:', err);
  });
}

/**
 * Obtiene los registros inmutables de `bitacora_auditoria` para el negocio activo
 */
export async function getBitacoraAuditoria(
  negocioId: string,
  limite = 250
): Promise<EventoAuditoria[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_BITACORA),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(limite)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      }) as EventoAuditoria
  );
}

/**
 * Suscripción en tiempo real a `bitacora_auditoria` acotada por `negocioId`
 */
export function onBitacoraAuditoriaChange(
  negocioId: string,
  callback: (eventos: EventoAuditoria[]) => void,
  onError?: (error: Error) => void,
  limite = 250
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_BITACORA),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(limite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as EventoAuditoria
      );
      callback(items);
    },
    (error) => {
      console.error('Error escuchando bitacora_auditoria:', error);
      if (onError) onError(error);
    }
  );
}
