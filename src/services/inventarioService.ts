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
  limit,
  runTransaction,
  Timestamp,
  type Transaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Insumo,
  EntradaInventario,
  MotivoMerma,
  MotivoAjusteInventario,
} from '../types';
import { requireTenantId } from '@/security/tenantScope';
import { calculateInventoryStock } from '@/utils/adminInputValidation';
import { filterInventoryLowStock } from '@/utils/inventoryStock';
import type { ConsumoInsumoCalculado } from '@/utils/recetasEscandallo';

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
 * Registrar entrada de inventario (aumento de stock / compra comercial)
 */
export async function registrarEntradaInventario(
  negocioId: string,
  insumoId: string,
  cantidad: number,
  costo: number,
  proveedor?: string,
  descripcion?: string,
  responsable?: string
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (!Number.isFinite(costo) || costo < 0) {
      throw new Error('El costo no puede ser negativo');
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de entrada debe ser mayor a 0');
    }

    const insumoRef = doc(db, 'inventario', insumoId);
    const entradaRef = doc(collection(db, 'entradas_inventario'));

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const stockPrevio = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;
      const nuevoStock = calculateInventoryStock(stockPrevio, cantidad, 'entrada');
      const costoUnitario = cantidad > 0 && costo > 0 ? Math.round(costo / cantidad) : 0;
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
        costoUnitario,
        proveedor: proveedor || 'Manual',
        fecha: now,
        tipoMovimiento: 'entrada',
        stockPrevio,
        stockResultante: nuevoStock,
        notas: descripcion || '',
        responsable: responsable || 'Administrador',
        unidadMedida: insumo.unidad,
      } as Omit<EntradaInventario, 'id'>);
    });

    return entradaRef.id;
  } catch (error) {
    console.error('Error registering entrada inventario:', error);
    throw error;
  }
}

/**
 * Registrar salida manual de inventario (uso interno o consumo no ligado a recetas)
 */
export async function registrarSalidaInventario(
  negocioId: string,
  insumoId: string,
  cantidad: number,
  descripcion?: string,
  responsable?: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de salida debe ser mayor a 0');
    }

    const insumoRef = doc(db, 'inventario', insumoId);
    const salidaRef = doc(collection(db, 'entradas_inventario'));

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const stockPrevio = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;
      const nuevoStock = calculateInventoryStock(stockPrevio, cantidad, 'salida');
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
        proveedor: 'Salida Manual',
        fecha: now,
        tipoMovimiento: 'salida_manual',
        stockPrevio,
        stockResultante: nuevoStock,
        notas: descripcion || '',
        responsable: responsable || 'Administrador',
        unidadMedida: insumo.unidad,
      } as Omit<EntradaInventario, 'id'>);
    });
  } catch (error) {
    console.error('Error registering salida inventario:', error);
    throw error;
  }
}

/**
 * Registrar merma / desperdicio de insumo con justificación y auditoría
 */
export async function registrarMermaInventario(
  negocioId: string,
  insumoId: string,
  cantidad: number,
  motivo: MotivoMerma | string,
  notas?: string,
  responsable?: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de merma debe ser mayor a 0');
    }
    if (!motivo || !motivo.trim()) {
      throw new Error('Debes indicar el motivo de la merma');
    }

    const insumoRef = doc(db, 'inventario', insumoId);
    const salidaRef = doc(collection(db, 'entradas_inventario'));

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const stockPrevio = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;
      const nuevoStock = Number(Math.max(0, stockPrevio - cantidad).toFixed(4));
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
        proveedor: `Merma: ${motivo.trim()}`,
        motivo: motivo.trim(),
        fecha: now,
        tipoMovimiento: 'merma',
        stockPrevio,
        stockResultante: nuevoStock,
        notas: notas?.trim() || '',
        responsable: responsable || 'Administrador',
        unidadMedida: insumo.unidad,
      } as Omit<EntradaInventario, 'id'>);
    });
  } catch (error) {
    console.error('Error registering merma inventario:', error);
    throw error;
  }
}

/**
 * Registrar ajuste de inventario por auditoría o conteo físico en bodega
 */
export async function registrarAjusteInventario(
  negocioId: string,
  insumoId: string,
  nuevoStockFisico: number,
  motivo: MotivoAjusteInventario | string,
  notas?: string,
  responsable?: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (!Number.isFinite(nuevoStockFisico) || nuevoStockFisico < 0) {
      throw new Error('El nuevo stock físico no puede ser negativo');
    }
    if (!motivo || !motivo.trim()) {
      throw new Error('Debes indicar el motivo del ajuste');
    }

    const insumoRef = doc(db, 'inventario', insumoId);
    const ajusteRef = doc(collection(db, 'entradas_inventario'));

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const stockPrevio = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;
      const stockFisicoRedondeado = Number(nuevoStockFisico.toFixed(4));
      const diferencia = Number((stockFisicoRedondeado - stockPrevio).toFixed(4));
      const now = Timestamp.now();

      transaction.update(insumoRef, {
        stockActual: stockFisicoRedondeado,
        actualizadoEn: now,
      });

      transaction.set(ajusteRef, {
        negocioId: tenantId,
        insumoId,
        insumoNombre: insumo.nombre,
        cantidad: diferencia,
        costo: 0,
        proveedor: `Ajuste: ${motivo.trim()}`,
        motivo: motivo.trim(),
        fecha: now,
        tipoMovimiento: 'ajuste',
        stockPrevio,
        stockResultante: stockFisicoRedondeado,
        notas: notas?.trim() || '',
        responsable: responsable || 'Administrador',
        unidadMedida: insumo.unidad,
      } as Omit<EntradaInventario, 'id'>);
    });
  } catch (error) {
    console.error('Error registering ajuste inventario:', error);
    throw error;
  }
}

/**
 * Descuenta atómicamente el stock de insumos por una venta en mostrador o entrega de domicilio.
 * Registra cada salida en 'entradas_inventario' con cantidad negativa y costo 0.
 * Si se pasa una transacción activa (ej. finalizarDomicilio), la reutiliza de forma determinista.
 */
export async function descontarStockInsumosPorVenta(
  negocioId: string,
  consumos: ConsumoInsumoCalculado[],
  referenciaOperativa: string,
  externalTransaction?: Transaction
): Promise<void> {
  if (!consumos || consumos.length === 0) return;

  const tenantId = requireTenantId(negocioId);

  const executeWithTransaction = async (transaction: Transaction) => {
    const now = Timestamp.now();

    // 1. Lecturas: leer todos los insumos primero en la transacción
    const insumoRefsAndDocs: Array<{
      ref: ReturnType<typeof doc>;
      insumoId: string;
      stockActual: number;
      nombre: string;
      consumoTotal: number;
    }> = [];

    for (const c of consumos) {
      if (c.cantidadTotal <= 0) continue;
      const insumoRef = doc(db, 'inventario', c.insumoId);
      const snap = await transaction.get(insumoRef);
      if (!snap.exists() || snap.data().negocioId !== tenantId) {
        continue;
      }
      const data = snap.data();
      insumoRefsAndDocs.push({
        ref: insumoRef,
        insumoId: c.insumoId,
        stockActual: typeof data.stockActual === 'number' ? data.stockActual : 0,
        nombre: data.nombre || c.nombreSnapshot,
        consumoTotal: c.cantidadTotal,
      });
    }

    // 2. Escrituras: actualizar stock y registrar salida en entradas_inventario
    for (const item of insumoRefsAndDocs) {
      const nuevoStock = Number(Math.max(0, item.stockActual - item.consumoTotal).toFixed(4));

      transaction.update(item.ref, {
        stockActual: nuevoStock,
        actualizadoEn: now,
      });

      const salidaRef = doc(collection(db, 'entradas_inventario'));
      transaction.set(salidaRef, {
        negocioId: tenantId,
        insumoId: item.insumoId,
        insumoNombre: item.nombre,
        cantidad: -item.consumoTotal,
        costo: 0,
        proveedor: referenciaOperativa,
        fecha: now,
        tipoMovimiento: 'salida_venta',
        stockPrevio: item.stockActual,
        stockResultante: nuevoStock,
      } as Omit<EntradaInventario, 'id'>);
    }
  };

  try {
    if (externalTransaction) {
      await executeWithTransaction(externalTransaction);
    } else {
      await runTransaction(db, executeWithTransaction);
    }
  } catch (error) {
    console.error('Error descontando stock de insumos por venta:', error);
    throw error;
  }
}

/**
 * Reintegra insumos consumidos al stock de inventario por anulación de venta
 */
export async function revertirStockInsumosPorVenta(
  negocioId: string,
  consumos: ConsumoInsumoCalculado[],
  referenciaOperativa: string,
  externalTransaction?: Transaction
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!consumos || consumos.length === 0) return;

  const executeWithTransaction = async (transaction: Transaction) => {
    const now = Timestamp.now();
    const insumoRefsAndDocs: Array<{
      ref: ReturnType<typeof doc>;
      insumoId: string;
      stockActual: number;
      nombre: string;
      consumoTotal: number;
    }> = [];

    // 1. Lecturas agrupadas
    for (const c of consumos) {
      if (c.cantidadTotal <= 0) continue;
      const insumoRef = doc(db, 'inventario', c.insumoId);
      const snap = await transaction.get(insumoRef);
      if (!snap.exists() || snap.data().negocioId !== tenantId) {
        continue;
      }
      const data = snap.data();
      insumoRefsAndDocs.push({
        ref: insumoRef,
        insumoId: c.insumoId,
        stockActual: typeof data.stockActual === 'number' ? data.stockActual : 0,
        nombre: data.nombre || c.nombreSnapshot,
        consumoTotal: c.cantidadTotal,
      });
    }

    // 2. Escrituras: sumar stock y registrar entrada de ajuste/reversión
    for (const item of insumoRefsAndDocs) {
      const nuevoStock = Number((item.stockActual + item.consumoTotal).toFixed(4));

      transaction.update(item.ref, {
        stockActual: nuevoStock,
        actualizadoEn: now,
      });

      const entradaRef = doc(collection(db, 'entradas_inventario'));
      transaction.set(entradaRef, {
        negocioId: tenantId,
        insumoId: item.insumoId,
        insumoNombre: item.nombre,
        cantidad: item.consumoTotal,
        costo: 0,
        proveedor: referenciaOperativa,
        fecha: now,
        tipoMovimiento: 'reversion',
        stockPrevio: item.stockActual,
        stockResultante: nuevoStock,
      } as Omit<EntradaInventario, 'id'>);
    }
  };

  try {
    if (externalTransaction) {
      await executeWithTransaction(externalTransaction);
    } else {
      await runTransaction(db, executeWithTransaction);
    }
  } catch (error) {
    console.error('Error revirtiendo stock de insumos por anulación:', error);
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

/**
 * Obtener todos los movimientos del Kardex para el tenant
 */
export async function getTodosMovimientosInventario(
  negocioId: string,
  limite = 200
): Promise<EntradaInventario[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const entradasRef = collection(db, 'entradas_inventario');
    const q = query(
      entradasRef,
      where('negocioId', '==', tenantId),
      orderBy('fecha', 'desc'),
      limit(limite)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as EntradaInventario));
  } catch (error) {
    console.error('Error fetching movimientos inventario:', error);
    throw error;
  }
}

/**
 * Listener en tiempo real para los movimientos del Kardex
 */
export function onTodosMovimientosInventarioChange(
  negocioId: string,
  callback: (movimientos: EntradaInventario[]) => void,
  onError?: (error: Error) => void,
  limite = 200
): () => void {
  const tenantId = requireTenantId(negocioId);
  const entradasRef = collection(db, 'entradas_inventario');
  const q = query(
    entradasRef,
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(limite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const movimientos = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      } as EntradaInventario));
      callback(movimientos);
    },
    (error) => {
      console.error('Error listening to movimientos inventario:', error);
      if (onError) onError(error);
    }
  );
}
