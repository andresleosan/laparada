import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Insumo, EntradaInventario } from '../types';

/**
 * Obtener todos los insumos
 */
export async function getTodosInsumos(): Promise<Insumo[]> {
  try {
    const insumosRef = collection(db, 'inventario');
    const q = query(insumosRef, orderBy('nombre', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Insumo));
  } catch (error) {
    console.error('Error fetching insumos:', error);
    return [];
  }
}

/**
 * Obtener un insumo por ID
 */
export async function getInsumoById(id: string): Promise<Insumo | null> {
  try {
    const docRef = doc(db, 'inventario', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Insumo;
    }
    return null;
  } catch (error) {
    console.error('Error fetching insumo:', error);
    return null;
  }
}

/**
 * Crear nuevo insumo
 */
export async function crearInsumo(
  data: Omit<Insumo, 'id'>
): Promise<string> {
  try {
    const insumosRef = collection(db, 'inventario');
    const docRef = await addDoc(insumosRef, {
      ...data,
      creadoEn: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating insumo:', error);
    throw error;
  }
}

/**
 * Actualizar insumo
 */
export async function actualizarInsumo(
  id: string,
  updates: Partial<Insumo>
): Promise<void> {
  try {
    const docRef = doc(db, 'inventario', id);
    await updateDoc(docRef, {
      ...updates,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating insumo:', error);
    throw error;
  }
}

/**
 * Eliminar insumo
 */
export async function eliminarInsumo(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'inventario', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting insumo:', error);
    throw error;
  }
}

/**
 * Registrar entrada de inventario (aumento de stock)
 */
export async function registrarEntradaInventario(
  insumoId: string,
  cantidad: number,
  costo: number,
  descripcion?: string
): Promise<string> {
  try {
    // Actualizar cantidad del insumo
    const insumo = await getInsumoById(insumoId);
    if (!insumo) throw new Error('Insumo no encontrado');

    await actualizarInsumo(insumoId, {
      cantidad: (insumo.cantidad || 0) + cantidad,
      costoTotal: ((insumo.costoTotal || 0) + (costo * cantidad)),
    });

    // Registrar entrada en historial
    const entradasRef = collection(db, 'entradas_inventario');
    const docRef = await addDoc(entradasRef, {
      insumoId,
      cantidad,
      costo,
      costoTotal: costo * cantidad,
      descripcion: descripcion || 'Entrada manual',
      fecha: Timestamp.now(),
    } as Omit<EntradaInventario, 'id'>);

    return docRef.id;
  } catch (error) {
    console.error('Error registering entrada inventario:', error);
    throw error;
  }
}

/**
 * Registrar salida de inventario (uso de insumo)
 */
export async function registrarSalidaInventario(
  insumoId: string,
  cantidad: number,
  descripcion?: string
): Promise<void> {
  try {
    const insumo = await getInsumoById(insumoId);
    if (!insumo) throw new Error('Insumo no encontrado');

    const nuevaCantidad = Math.max(0, (insumo.cantidad || 0) - cantidad);

    // Actualizar cantidad del insumo
    await actualizarInsumo(insumoId, {
      cantidad: nuevaCantidad,
    });

    // Registrar salida en historial
    const entradasRef = collection(db, 'entradas_inventario');
    await addDoc(entradasRef, {
      insumoId,
      cantidad: -cantidad, // Negativo para indicar salida
      descripcion: descripcion || 'Salida manual',
      fecha: Timestamp.now(),
    } as Omit<EntradaInventario, 'id'>);
  } catch (error) {
    console.error('Error registering salida inventario:', error);
    throw error;
  }
}

/**
 * Obtener historial de entradas/salidas de un insumo
 */
export async function getHistorialInsumo(insumoId: string): Promise<EntradaInventario[]> {
  try {
    const entradasRef = collection(db, 'entradas_inventario');
    const q = query(
      entradasRef,
      where('insumoId', '==', insumoId),
      orderBy('fecha', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as EntradaInventario));
  } catch (error) {
    console.error('Error fetching historial:', error);
    return [];
  }
}

/**
 * Listener en tiempo real para todos los insumos
 */
export function onTodosInsumosChange(
  callback: (insumos: Insumo[]) => void
): () => void {
  const insumosRef = collection(db, 'inventario');
  const q = query(insumosRef, orderBy('nombre', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const insumos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Insumo));
    callback(insumos);
  });
}

/**
 * Obtener insumos con bajo stock (cantidad < stockMinimo)
 */
export async function getInsumosConBajoStock(): Promise<Insumo[]> {
  try {
    const insumos = await getTodosInsumos();
    return insumos.filter((insumo) => (insumo.cantidad || 0) < (insumo.stockMinimo || 10));
  } catch (error) {
    console.error('Error fetching insumos con bajo stock:', error);
    return [];
  }
}
