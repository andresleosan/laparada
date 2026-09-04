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
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Insumo, EntradaInventario } from '../types';
import { requireTenantId } from '@/security/tenantScope';
import { calculateInventoryStock } from '@/utils/adminInputValidation';
import { filterInventoryLowStock } from '@/utils/inventoryStock';

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
      ...doc.data(),
      id: doc.id,
    } as Insumo));
  } catch (error) {
    console.error('Error fetching insumos:', error);
    throw error;
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
        ...docSnap.data(),
        id: docSnap.id,
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
    if (!Number.isFinite(costo) || costo < 0) {
      throw new Error('El costo no puede ser negativo');
    }

    const insumoRef = doc(db, 'inventario', insumoId);
    const entradaRef = doc(collection(db, 'entradas_inventario'));

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const nuevoStock = calculateInventoryStock(insumo.stockActual || 0, cantidad, 'entrada');
      const now = Timestamp.now();

      transaction.update(insumoRef, {
        stockActual: nuevoStock,
        actualizadoEn: now,
      });
      transaction.set(entradaRef, {
        negocioId: tenantId,
        insumoId,
        insumoNombre: insumo.nombre,
        cantidad,
        costo,
        proveedor: proveedor || 'Manual',
        fecha: now,
      } as Omit<EntradaInventario, 'id'>);
    });

    return entradaRef.id;
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
    const insumoRef = doc(db, 'inventario', insumoId);
    const salidaRef = doc(collection(db, 'entradas_inventario'));

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const nuevoStock = calculateInventoryStock(insumo.stockActual || 0, cantidad, 'salida');
      const now = Timestamp.now();

      transaction.update(insumoRef, {
        stockActual: nuevoStock,
        actualizadoEn: now,
      });
      transaction.set(salidaRef, {
        negocioId: tenantId,
        insumoId,
        insumoNombre: insumo.nombre,
        cantidad: -cantidad,
        costo: 0,
        proveedor: 'Sistema',
        fecha: now,
      } as Omit<EntradaInventario, 'id'>);
    });
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
      ...doc.data(),
      id: doc.id,
    } as EntradaInventario));
  } catch (error) {
    console.error('Error fetching historial:', error);
    throw error;
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
        ...doc.data(),
        id: doc.id,
      } as Insumo));
      callback(insumos);
    },
    (error) => {
      console.error('Error listening to insumos:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Obtener insumos con bajo stock (cantidad < stockMinimo)
 */
export async function getInsumosConBajoStock(negocioId: string): Promise<Insumo[]> {
  try {
    const insumos = await getTodosInsumos(negocioId);
    return filterInventoryLowStock(insumos);
  } catch (error) {
    console.error('Error fetching insumos con bajo stock:', error);
    throw error;
  }
}
