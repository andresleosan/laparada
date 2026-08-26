import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Caja, Jornada } from '../types';
import { requireTenantId } from '@/security/tenantScope';

async function getCajaDelTenant(cajaId: string, negocioId: string): Promise<Caja | null> {
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(doc(db, 'cajas', cajaId));
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) return null;
  return { id: snapshot.id, ...snapshot.data() } as Caja;
}

/**
 * Crear caja para una jornada
 */
export async function crearCaja(
  negocioId: string,
  jornada: Jornada,
  montoInicial: number
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    const cajaRef = collection(db, 'cajas');
    const docRef = await addDoc(cajaRef, {
      negocioId: tenantId,
      jornada,
      montoInicial,
      ingresos: 0,
      egresos: 0,
      saldoActual: montoInicial,
      fecha: Timestamp.now(),
    } as Omit<Caja, 'id'>);

    return docRef.id;
  } catch (error) {
    console.error('Error creating caja:', error);
    throw error;
  }
}

/**
 * Obtener caja actual de hoy por jornada
 */
export async function getCajaHoy(negocioId: string, jornada: Jornada): Promise<Caja | null> {
  try {
    const hoy = new Date();
    const fechaInicio = new Date(hoy);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(hoy);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaRef = collection(db, 'cajas');
    const q = query(
      cajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('jornada', '==', jornada),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cajaHoy = snapshot.docs[0];
      return {
        id: cajaHoy.id,
        ...cajaHoy.data(),
      } as Caja;
    }

    return null;
  } catch (error) {
    console.error('Error getting caja hoy:', error);
    return null;
  }
}

/**
 * Obtener caja por jornada y fecha específica
 */
export async function getCajaPorJornadaYFecha(
  negocioId: string,
  jornada: Jornada,
  fecha: Date
): Promise<Caja | null> {
  try {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaRef = collection(db, 'cajas');
    const q = query(
      cajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('jornada', '==', jornada),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cajaDoc = snapshot.docs[0];
      return {
        id: cajaDoc.id,
        ...cajaDoc.data(),
      } as Caja;
    }

    return null;
  } catch (error) {
    console.error('Error getting caja por jornada y fecha:', error);
    return null;
  }
}

/**
 * Actualizar caja (saldo, ingresos, egresos)
 */
export async function actualizarCaja(
  id: string,
  updates: Partial<Omit<Caja, 'id' | 'fecha'>>,
  negocioId: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (!await getCajaDelTenant(id, tenantId)) {
      throw new Error('La caja no pertenece al negocio activo');
    }
    const docRef = doc(db, 'cajas', id);
    await updateDoc(docRef, {
      ...updates,
      negocioId: tenantId,
    });
  } catch (error) {
    console.error('Error updating caja:', error);
    throw error;
  }
}

/**
 * Sumar ingresos a la caja (ventas en efectivo)
 */
export async function sumarIngresosCaja(
  cajaId: string,
  monto: number,
  negocioId: string
): Promise<void> {
  try {
    const cajaRef = doc(db, 'cajas', cajaId);
    const cajaDoc = await getDoc(cajaRef);
    
    if (cajaDoc.exists() && cajaDoc.data().negocioId === requireTenantId(negocioId)) {
      const caja = cajaDoc.data() as Caja;
      const nuevosIngresos = caja.ingresos + monto;
      const nuevoSaldo = caja.montoInicial + nuevosIngresos - caja.egresos;

      await updateDoc(cajaRef, {
        ingresos: nuevosIngresos,
        saldoActual: nuevoSaldo,
      });
    }
  } catch (error) {
    console.error('Error sumando ingresos a caja:', error);
    throw error;
  }
}

/**
 * Restar egresos de la caja (gastos deducidos)
 */
export async function restarEgresosCaja(
  cajaId: string,
  monto: number,
  negocioId: string
): Promise<void> {
  try {
    const cajaRef = doc(db, 'cajas', cajaId);
    const cajaDoc = await getDoc(cajaRef);
    
    if (cajaDoc.exists() && cajaDoc.data().negocioId === requireTenantId(negocioId)) {
      const caja = cajaDoc.data() as Caja;
      const nuevosEgresos = caja.egresos + monto;
      const nuevoSaldo = caja.montoInicial + caja.ingresos - nuevosEgresos;

      await updateDoc(cajaRef, {
        egresos: nuevosEgresos,
        saldoActual: nuevoSaldo,
      });
    }
  } catch (error) {
    console.error('Error restando egresos de caja:', error);
    throw error;
  }
}

/**
 * Obtener todas las cajas de una fecha
 */
export async function getCajasPorFecha(negocioId: string, fecha: Date): Promise<Caja[]> {
  try {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaRef = collection(db, 'cajas');
    const q = query(
      cajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Caja));
  } catch (error) {
    console.error('Error getting cajas por fecha:', error);
    throw error;
  }
}

/**
 * Reiniciar caja (resetea todo a 0)
 */
export async function reiniciarCaja(cajaId: string, negocioId: string): Promise<void> {
  try {
    if (!await getCajaDelTenant(cajaId, negocioId)) {
      throw new Error('La caja no pertenece al negocio activo');
    }
    const docRef = doc(db, 'cajas', cajaId);

    await updateDoc(docRef, {
      montoInicial: 0,
      ingresos: 0,
      egresos: 0,
      saldoActual: 0,
    });
  } catch (error) {
    console.error('Error reiniciando caja:', error);
    throw error;
  }
}
