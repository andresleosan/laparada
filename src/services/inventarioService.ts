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
import { requireTenantId } from '@/security/tenantScope';

/**
 * Obtener todos los insumos
 */
export async function getTodosInsumos(negocioId: string): Promise<Insumo[]> {
  try {
    const insumosRef = collection(db, 'inventario');
    const q = query(
      insumosRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      orderBy('nombre', 'asc')
    );
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
export async function getInsumoById(id: string, negocioId: string): Promise<Insumo | null> {
  try {
    const tenantId = requireTenantId(negocioId);
    const docRef = doc(db, 'inventario', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().negocioId === tenantId) {
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
    const tenantId = requireTenantId(data.negocioId);
    const insumosRef = collection(db, 'inventario');
    const docRef = await addDoc(insumosRef, {
      ...data,
      negocioId: tenantId,
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
  updates: Partial<Insumo>,
  negocioId: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const insumo = await getInsumoById(id, tenantId);
    if (!insumo) throw new Error('El insumo no pertenece al negocio activo');
    const docRef = doc(db, 'inventario', id);
    await updateDoc(docRef, {
      ...updates,
      negocioId: tenantId,
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
export async function eliminarInsumo(id: string, negocioId: string): Promise<void> {
  try {
    const insumo = await getInsumoById(id, negocioId);
    if (!insumo) throw new Error('El insumo no pertenece al negocio activo');
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
  negocioId: string,
  insumoId: string,
  cantidad: number,
  costo: number,
  proveedor?: string,
  _descripcion?: string
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    // Actualizar cantidad del insumo
    const insumo = await getInsumoById(insumoId, tenantId);
    if (!insumo) throw new Error('Insumo no encontrado');

    await actualizarInsumo(insumoId, {
      stockActual: (insumo.stockActual || 0) + cantidad,
    }, tenantId);

    // Registrar entrada en historial
    const entradasRef = collection(db, 'entradas_inventario');
    const docRef = await addDoc(entradasRef, {
      negocioId: tenantId,
      insumoId,
      insumoNombre: insumo.nombre,
      cantidad,
      costo,
      proveedor: proveedor || 'Manual',
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
  negocioId: string,
  insumoId: string,
  cantidad: number,
  _descripcion?: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const insumo = await getInsumoById(insumoId, tenantId);
    if (!insumo) throw new Error('Insumo no encontrado');

    const nuevoStock = Math.max(0, (insumo.stockActual || 0) - cantidad);

    // Actualizar cantidad del insumo
    await actualizarInsumo(insumoId, {
      stockActual: nuevoStock,
    }, tenantId);

    // Registrar salida en historial
    const entradasRef = collection(db, 'entradas_inventario');
    await addDoc(entradasRef, {
      negocioId: tenantId,
      insumoId,
      insumoNombre: insumo.nombre,
      cantidad: -cantidad, // Negativo para indicar salida
      costo: 0, // Salida no tiene costo
      proveedor: 'Sistema',
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
export async function getHistorialInsumo(
  negocioId: string,
  insumoId: string
): Promise<EntradaInventario[]> {
  try {
    const entradasRef = collection(db, 'entradas_inventario');
    const q = query(
      entradasRef,
      where('negocioId', '==', requireTenantId(negocioId)),
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
  negocioId: string,
  callback: (insumos: Insumo[]) => void,
  onError?: (error: Error) => void
): () => void {
  const insumosRef = collection(db, 'inventario');
  const q = query(
    insumosRef,
    where('negocioId', '==', requireTenantId(negocioId)),
    orderBy('nombre', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const insumos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Insumo));
      callback(insumos);
    },
    (error) => {
      console.error('Error listening to insumos:', error);
      if (onError) onError(error);
      // Emitir array vacío como fallback
      callback([]);
    }
  );
}

/**
 * Obtener insumos con bajo stock (cantidad < stockMinimo)
 */
export async function getInsumosConBajoStock(negocioId: string): Promise<Insumo[]> {
  try {
    const insumos = await getTodosInsumos(negocioId);
    return insumos.filter((insumo) => (insumo.stockActual || 0) < (insumo.stockMinimo || 10));
  } catch (error) {
    console.error('Error fetching insumos con bajo stock:', error);
    return [];
  }
}
