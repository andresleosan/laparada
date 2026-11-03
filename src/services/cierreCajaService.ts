import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { CierreCaja } from '../types';
import { requireTenantId } from '@/security/tenantScope';

export interface DetalleCierre {
  ventasPos?: number;
  ventasWhatsapp?: number;
}

export interface ResumenCierre {
  totalVentas: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  cantidadGastos: number;
}

/**
 * Crear el cierre de caja del día o turno
 */
export async function crearCierreCaja(
  negocioId: string,
  totalVentas: number,
  totalGastos: number,
  notas?: string,
  detalle?: DetalleCierre
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    const safeVentas = Math.max(0, Math.round(Number.isFinite(totalVentas) ? totalVentas : 0));
    const safeGastos = Math.max(0, Math.round(Number.isFinite(totalGastos) ? totalGastos : 0));
    const utilidadNeta = safeVentas - safeGastos;

    const cierreCajaRef = collection(db, 'cierres_caja');
    const docRef = await addDoc(cierreCajaRef, {
      negocioId: tenantId,
      totalIngresos: safeVentas,
      totalGastos: safeGastos,
      utilidadNeta,
      ventasPos: Math.max(0, Math.round(detalle?.ventasPos ?? 0)),
      ventasWhatsapp: Math.max(0, Math.round(detalle?.ventasWhatsapp ?? 0)),
      notas: (notas || '').trim(),
      fecha: Timestamp.now(),
    } as Omit<CierreCaja, 'id'>);

    return docRef.id;
  } catch (error) {
    console.error('Error creating cierre caja:', error);
    throw error;
  }
}

/**
 * Actualizar cierre de caja
 */
export async function actualizarCierreCaja(
  id: string,
  updates: Partial<Omit<CierreCaja, 'id' | 'negocioId'>>,
  negocioId: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const docRef = doc(db, 'cierres_caja', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
      throw new Error('El cierre no pertenece al negocio activo');
    }
    await updateDoc(docRef, { ...updates, negocioId: tenantId });
  } catch (error) {
    console.error('Error updating cierre caja:', error);
    throw error;
  }
}

/**
 * Obtener el cierre de caja de una fecha específica
 */
export async function getCierreCajaPorFecha(
  negocioId: string,
  fecha: Date
): Promise<CierreCaja | null> {
  try {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      return {
        ...firstDoc.data(),
        id: firstDoc.id,
      } as CierreCaja;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cierre caja:', error);
    return null;
  }
}

/**
 * Obtener últimos N cierres de caja ordenados cronológicamente descendente
 */
export async function getUltimosCierres(
  negocioId: string,
  limiteResultados: number = 30
): Promise<CierreCaja[]> {
  try {
    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      orderBy('fecha', 'desc'),
      limit(limiteResultados)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      ...d.data(),
      id: d.id,
    } as CierreCaja));
  } catch (error) {
    console.error('Error fetching ultimos cierres:', error);
    return [];
  }
}

/**
 * Obtener cierre de caja de hoy
 */
export async function getCierreCajaHoy(negocioId: string): Promise<CierreCaja | null> {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(hoy)),
      where('fecha', '<', Timestamp.fromDate(manana)),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      return {
        ...firstDoc.data(),
        id: firstDoc.id,
      } as CierreCaja;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cierre caja hoy:', error);
    return null;
  }
}

/**
 * Calcular resumen de cierre de caja para un período
 */
export async function calcularResumenCierre(
  negocioId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<ResumenCierre> {
  try {
    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    let totalVentas = 0;
    let totalGastos = 0;
    let cantidadVentas = 0;
    let cantidadGastos = 0;

    snapshot.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      const cierre = d.data() as CierreCaja;
      totalVentas += cierre.totalIngresos || 0;
      totalGastos += cierre.totalGastos || 0;
      cantidadVentas += 1;
      cantidadGastos += 1;
    });

    return {
      totalVentas,
      totalGastos,
      gananciaNeta: totalVentas - totalGastos,
      cantidadVentas,
      cantidadGastos,
    };
  } catch (error) {
    console.error('Error calculating resumen cierre:', error);
    return {
      totalVentas: 0,
      totalGastos: 0,
      gananciaNeta: 0,
      cantidadVentas: 0,
      cantidadGastos: 0,
    };
  }
}
