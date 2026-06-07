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
import { CierreCaja, Jornada } from '../types';


interface ResumenCierre {
  totalVentas: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  cantidadGastos: number;
}

/**
 * Crear cierre de caja para una jornada
 */
export async function crearCierreCaja(
  jornada: Jornada,
  totalVentas: number,
  totalGastos: number,
  notas?: string
): Promise<string> {
  try {
    const gananciaNeta = totalVentas - totalGastos;

    const cierreCajaRef = collection(db, 'cierres_caja');
    const docRef = await addDoc(cierreCajaRef, {
      jornada,
      totalVentas,
      totalGastos,
      gananciaNeta,
      notas: notas || '',
      fecha: Timestamp.now(),
      estado: 'completado',
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
  updates: Partial<CierreCaja>
): Promise<void> {
  try {
    const docRef = doc(db, 'cierres_caja', id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating cierre caja:', error);
    throw error;
  }
}

/**
 * Obtener cierre de caja por jornada y fecha
 */
export async function getCierreCajaPorJornadaYFecha(
  jornada: Jornada,
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
      } as CierreCaja;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cierre caja:', error);
    return null;
  }
}

/**
 * Obtener últimos N cierres de caja
 */
export async function getUltimosCierres(limite: number = 30): Promise<CierreCaja[]> {
  try {
    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(cierreCajaRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limite).map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    } as CierreCaja));
  } catch (error) {
    console.error('Error fetching ultimos cierres:', error);
    return [];
  }
}

/**
 * Obtener cierre de caja de hoy
 */
export async function getCierreCajaHoy(): Promise<CierreCaja | null> {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('fecha', '>=', Timestamp.fromDate(hoy)),
      where('fecha', '<', Timestamp.fromDate(mañana)),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
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
  fechaInicio: Date,
  fechaFin: Date
): Promise<ResumenCierre> {
  try {
    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    let totalVentas = 0;
    let totalGastos = 0;
    let cantidadVentas = 0;
    let cantidadGastos = 0;

    snapshot.docs.forEach((doc: any) => {
      const cierre = doc.data() as CierreCaja;
      totalVentas += cierre.totalVentas || 0;
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
