// src/services/promocionesService.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import type { CrearPromocionInput, Promocion } from '@/types/promocion';

const COLLECTION_NAME = 'promociones';

/**
 * Consulta todas las promociones configuradas para un negocio
 */
export async function getPromociones(negocioId: string): Promise<Promocion[]> {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, COLLECTION_NAME);
  const q = query(ref, where('negocioId', '==', tenantId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Promocion, 'id'>),
  }));
}

/**
 * Suscripción en tiempo real a las promociones de un negocio
 */
export function onPromocionesChange(
  negocioId: string,
  callback: (promociones: Promocion[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, COLLECTION_NAME);
  const q = query(ref, where('negocioId', '==', tenantId));

  return onSnapshot(
    q,
    (snapshot) => {
      const promociones = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Promocion, 'id'>),
      }));
      callback(promociones);
    },
    (error) => {
      console.error('Error al escuchar promociones en tiempo real:', error);
    }
  );
}

/**
 * Crea una nueva promoción o cupón digital en Firestore
 */
export async function crearPromocion(input: CrearPromocionInput): Promise<string> {
  const tenantId = requireTenantId(input.negocioId);

  const nuevaPromocion: Omit<Promocion, 'id'> = {
    negocioId: tenantId,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || undefined,
    tipo: input.tipo,
    canales: input.canales && input.canales.length > 0 ? input.canales : ['todos'],
    activo: input.activo ?? true,
    diasSemana: input.diasSemana || [],
    horaInicio: input.horaInicio || undefined,
    horaFin: input.horaFin || undefined,
    fechaInicio: input.fechaInicio || undefined,
    fechaFin: input.fechaFin || undefined,
    categoriaIds: input.categoriaIds || [],
    productoIds: input.productoIds || [],
    tipoDescuento: input.tipoDescuento,
    valorDescuento: Math.max(0, Number(input.valorDescuento) || 0),
    montoMinimoSubtotal: input.montoMinimoSubtotal ? Math.max(0, Math.round(Number(input.montoMinimoSubtotal))) : undefined,
    topeDescuentoMaximoCOP: input.topeDescuentoMaximoCOP ? Math.max(0, Math.round(Number(input.topeDescuentoMaximoCOP))) : undefined,
    codigoCupon: input.codigoCupon ? input.codigoCupon.trim().toUpperCase() : undefined,
    limiteUsos: input.limiteUsos ? Math.max(1, Math.round(Number(input.limiteUsos))) : undefined,
    usosActuales: 0,
    creadoEn: new Date().toISOString(),
  };

  const docRef = await addDoc(collection(db, COLLECTION_NAME), nuevaPromocion);
  return docRef.id;
}

/**
 * Actualiza una promoción existente
 */
export async function actualizarPromocion(
  negocioId: string,
  promocionId: string,
  datos: Partial<Promocion>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_NAME, promocionId);

  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    throw new Error('La promoción no existe');
  }

  const actual = snapshot.data() as Promocion;
  if (actual.negocioId !== tenantId) {
    throw new Error('La promoción no pertenece al negocio activo');
  }

  const patch: Record<string, unknown> = {
    actualizadoEn: new Date().toISOString(),
  };

  if (datos.nombre !== undefined) patch.nombre = datos.nombre.trim();
  if (datos.descripcion !== undefined) patch.descripcion = datos.descripcion.trim() || undefined;
  if (datos.tipo !== undefined) patch.tipo = datos.tipo;
  if (datos.canales !== undefined) patch.canales = datos.canales;
  if (datos.activo !== undefined) patch.activo = Boolean(datos.activo);
  if (datos.diasSemana !== undefined) patch.diasSemana = datos.diasSemana;
  if (datos.horaInicio !== undefined) patch.horaInicio = datos.horaInicio || undefined;
  if (datos.horaFin !== undefined) patch.horaFin = datos.horaFin || undefined;
  if (datos.fechaInicio !== undefined) patch.fechaInicio = datos.fechaInicio || undefined;
  if (datos.fechaFin !== undefined) patch.fechaFin = datos.fechaFin || undefined;
  if (datos.categoriaIds !== undefined) patch.categoriaIds = datos.categoriaIds;
  if (datos.productoIds !== undefined) patch.productoIds = datos.productoIds;
  if (datos.tipoDescuento !== undefined) patch.tipoDescuento = datos.tipoDescuento;
  if (datos.valorDescuento !== undefined) patch.valorDescuento = Math.max(0, Number(datos.valorDescuento) || 0);
  if (datos.montoMinimoSubtotal !== undefined) {
    patch.montoMinimoSubtotal = datos.montoMinimoSubtotal ? Math.max(0, Math.round(Number(datos.montoMinimoSubtotal))) : undefined;
  }
  if (datos.topeDescuentoMaximoCOP !== undefined) {
    patch.topeDescuentoMaximoCOP = datos.topeDescuentoMaximoCOP ? Math.max(0, Math.round(Number(datos.topeDescuentoMaximoCOP))) : undefined;
  }
  if (datos.codigoCupon !== undefined) {
    patch.codigoCupon = datos.codigoCupon ? datos.codigoCupon.trim().toUpperCase() : undefined;
  }
  if (datos.limiteUsos !== undefined) {
    patch.limiteUsos = datos.limiteUsos ? Math.max(1, Math.round(Number(datos.limiteUsos))) : undefined;
  }

  await updateDoc(docRef, patch);
}

/**
 * Activa o desactiva rápidamente una promoción
 */
export async function toggleActivarPromocion(
  negocioId: string,
  promocionId: string,
  activo: boolean
): Promise<void> {
  return actualizarPromocion(negocioId, promocionId, { activo });
}

/**
 * Registra atómicamente el uso de un cupón (incrementa usosActuales)
 */
export async function registrarUsoCupon(negocioId: string, promocionId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_NAME, promocionId);

  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return;

  const actual = snapshot.data() as Promocion;
  if (actual.negocioId !== tenantId) {
    throw new Error('La promoción no pertenece al negocio activo');
  }

  await updateDoc(docRef, {
    usosActuales: increment(1),
    actualizadoEn: new Date().toISOString(),
  });
}

/**
 * Elimina una promoción
 */
export async function eliminarPromocion(negocioId: string, promocionId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_NAME, promocionId);

  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return;

  const actual = snapshot.data() as Promocion;
  if (actual.negocioId !== tenantId) {
    throw new Error('La promoción no pertenece al negocio activo');
  }

  await deleteDoc(docRef);
}
