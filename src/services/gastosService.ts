import {
  collection,
  query,
  where,
  getDocs,

  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Gasto, CategoriaGasto, Jornada } from '../types';

/**
 * Crear nuevo gasto
 */
export async function crearGasto(data: Omit<Gasto, 'id'>): Promise<string> {
  try {
    const gastosRef = collection(db, 'gastos');
    const docRef = await addDoc(gastosRef, {
      ...data,
      creadoEn: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating gasto:', error);
    throw error;
  }
}

/**
 * Actualizar gasto
 */
export async function actualizarGasto(id: string, updates: Partial<Gasto>): Promise<void> {
  try {
    const docRef = doc(db, 'gastos', id);
    await updateDoc(docRef, {
      ...updates,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating gasto:', error);
    throw error;
  }
}

/**
 * Eliminar gasto
 */
export async function eliminarGasto(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'gastos', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting gasto:', error);
    throw error;
  }
}

/**
 * Obtener gastos de una jornada específica
 */
export async function getGastosPorJornada(jornada: Jornada): Promise<Gasto[]> {
  try {
    const gastosRef = collection(db, 'gastos');
    const q = query(
      gastosRef,
      where('jornada', '==', jornada),
      orderBy('fecha', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Gasto));
  } catch (error) {
    console.error('Error fetching gastos por jornada:', error);
    return [];
  }
}

/**
 * Obtener gastos de una categoría
 */
export async function getGastosPorCategoria(categoria: CategoriaGasto): Promise<Gasto[]> {
  try {
    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, where('categoria', '==', categoria), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Gasto));
  } catch (error) {
    console.error('Error fetching gastos por categoria:', error);
    return [];
  }
}

/**
 * Obtener todos los gastos (sin filtro)
 */
export async function getTodosGastos(): Promise<Gasto[]> {
  try {
    const gastosRef = collection(db, 'gastos');
    const q = query(gastosRef, orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Gasto));
  } catch (error) {
    console.error('Error fetching todos gastos:', error);
    return [];
  }
}

/**
 * Obtener gastos de hoy
 */
export async function getGastosHoy(): Promise<Gasto[]> {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const gastosRef = collection(db, 'gastos');
    const q = query(
      gastosRef,
      where('fecha', '>=', Timestamp.fromDate(hoy)),
      where('fecha', '<', Timestamp.fromDate(mañana)),
      orderBy('fecha', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Gasto));
  } catch (error) {
    console.error('Error fetching gastos hoy:', error);
    return [];
  }
}

/**
 * Listener en tiempo real para todos los gastos
 */
export function onTodosGastosChange(callback: (gastos: Gasto[]) => void): () => void {
  const gastosRef = collection(db, 'gastos');
  const q = query(gastosRef, orderBy('fecha', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const gastos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Gasto));
    callback(gastos);
  });
}

/**
 * Calcular total de gastos para un período
 */
export async function calcularTotalGastos(
  fechaInicio: Date,
  fechaFin: Date
): Promise<number> {
  try {
    const gastosRef = collection(db, 'gastos');
    const q = query(
      gastosRef,
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.reduce((total, doc) => {
      const gasto = doc.data() as Gasto;
      return total + (gasto.monto || 0);
    }, 0);
  } catch (error) {
    console.error('Error calculating total gastos:', error);
    return 0;
  }
}

/**
 * Obtener gastos agrupados por categoría
 */
export async function getGastosPorCategoriaAgrupados(): Promise<
  Record<CategoriaGasto, number>
> {
  try {
    const gastos = await getTodosGastos();
    const agrupados: Record<CategoriaGasto, number> = {
      salarios: 0,
      servicios: 0,
      insumos: 0,
      mantenimiento: 0,
      otros: 0,
    };

    gastos.forEach((gasto) => {
      agrupados[gasto.categoria] = (agrupados[gasto.categoria] || 0) + (gasto.monto || 0);
    });

    return agrupados;
  } catch (error) {
    console.error('Error grouping gastos por categoria:', error);
    return {
      salarios: 0,
      servicios: 0,
      insumos: 0,
      mantenimiento: 0,
      otros: 0,
    };
  }
}
