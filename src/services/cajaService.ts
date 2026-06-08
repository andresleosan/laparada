import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Caja, Jornada } from '../types';

/**
 * Crear caja para una jornada
 */
export async function crearCaja(
  jornada: Jornada,
  montoInicial: number
): Promise<string> {
  try {
    const cajaRef = collection(db, 'cajas');
    const docRef = await addDoc(cajaRef, {
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
export async function getCajaHoy(jornada: Jornada): Promise<Caja | null> {
  try {
    const hoy = new Date();
    const fechaInicio = new Date(hoy);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(hoy);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaRef = collection(db, 'cajas');
    const q = query(
      cajaRef,
      where('jornada', '==', jornada),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Caja;
    }

    return null;
  } catch (error) {
    console.error('Error getting caja hoy:', error);
    throw error;
  }
}

/**
 * Obtener caja por jornada y fecha específica
 */
export async function getCajaPorJornadaYFecha(
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
      where('jornada', '==', jornada),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Caja;
    }

    return null;
  } catch (error) {
    console.error('Error getting caja por jornada y fecha:', error);
    throw error;
  }
}

/**
 * Actualizar caja (saldo, ingresos, egresos)
 */
export async function actualizarCaja(
  id: string,
  updates: Partial<Omit<Caja, 'id' | 'fecha'>>
): Promise<void> {
  try {
    const docRef = doc(db, 'cajas', id);
    await updateDoc(docRef, {
      ...updates,
    });
  } catch (error) {
    console.error('Error updating caja:', error);
    throw error;
  }
}

/**
 * Sumar ingresos a la caja (ventas en efectivo)
 */
export async function sumarIngresosCaja(cajaId: string, monto: number): Promise<void> {
  try {
    const cajaRef = doc(db, 'cajas', cajaId);
    const cajaDoc = await getDocs(query(collection(db, 'cajas'), where('__name__', '==', cajaId)));
    
    if (!cajaDoc.empty) {
      const caja = cajaDoc.docs[0].data() as Caja;
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
export async function restarEgresosCaja(cajaId: string, monto: number): Promise<void> {
  try {
    const cajaRef = doc(db, 'cajas', cajaId);
    const cajaDoc = await getDocs(query(collection(db, 'cajas'), where('__name__', '==', cajaId)));
    
    if (!cajaDoc.empty) {
      const caja = cajaDoc.docs[0].data() as Caja;
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
export async function getCajasPorFecha(fecha: Date): Promise<Caja[]> {
  try {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const cajaRef = collection(db, 'cajas');
    const q = query(
      cajaRef,
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin)),
      orderBy('fecha', 'desc')
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
