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
  GuardarSubRecetaInput,
  MotivoMerma,
  MotivoAjusteInventario,
  RegistrarConteoFisicoMasivoInput,
  RegistrarProduccionLoteInput,
  ResultadoProduccionLote,
} from '../types';
import { requireTenantId } from '@/security/tenantScope';
import { calculateInventoryStock } from '@/utils/adminInputValidation';
import { filterInventoryLowStock } from '@/utils/inventoryStock';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { validarConfiguracionSubReceta } from '@/utils/produccionCocinaUtils';
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
  responsable?: string,
  actualizarCostoUnitario = true
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

      const insumoUpdates: Record<string, unknown> = {
        stockActual: nuevoStock,
        actualizadoEn: now,
      };
      if (actualizarCostoUnitario && costoUnitario > 0) {
        insumoUpdates.costoUnitario = costoUnitario;
      }
      if (actualizarCostoUnitario && proveedor && proveedor !== 'Manual') {
        insumoUpdates.proveedor = proveedor.trim();
      }

      transaction.update(insumoRef, insumoUpdates);
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

    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'merma_inventario',
      titulo: `Baja por Merma (${cantidad}) en Bodega`,
      descripcion: `Merma registrada por "${motivo.trim()}" sobre insumo #${insumoId.slice(-6)}.`,
      motivo: motivo.trim(),
      montoImpacto: 0,
      responsableNombre: responsable || 'Administrador',
      responsableRol: 'admin',
      entidadTipo: 'inventario',
      referenciaId: salidaRef.id,
      detallesForenses: {
        insumoId,
        cantidadMerma: cantidad,
        notas: notas?.trim() || '',
      },
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
 * Registra atómicamente en lote un Conteo Físico Rápido de Bodega,
 * actualizando únicamente los insumos que presentaron diferencia frente al sistema.
 */
export async function registrarConteoFisicoMasivo(
  negocioId: string,
  input: RegistrarConteoFisicoMasivoInput
): Promise<{ ajustadosCount: number }> {
  const tenantId = requireTenantId(negocioId);
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('No hay insumos seleccionados para el conteo físico');
  }

  for (const item of input.items) {
    if (!Number.isFinite(item.nuevoStockFisico) || item.nuevoStockFisico < 0) {
      throw new Error('El stock físico contado no puede ser negativo');
    }
  }

  const motivoLimpio = (input.motivo || 'conteo_fisico').trim() || 'conteo_fisico';
  const notasLimpias = input.notas?.trim() || 'Conteo físico rápido de bodega';
  const responsableLimpio = input.responsable?.trim() || 'Administrador';

  let ajustadosCount = 0;

  try {
    await runTransaction(db, async (transaction) => {
      const now = Timestamp.now();
      const lecturas: Array<{
        ref: ReturnType<typeof doc>;
        insumo: Insumo;
        stockPrevio: number;
        stockFisicoRedondeado: number;
        diferencia: number;
      }> = [];

      // 1. Fase de lecturas en transacción
      for (const item of input.items) {
        if (!item.insumoId) continue;
        const insumoRef = doc(db, 'inventario', item.insumoId);
        const snap = await transaction.get(insumoRef);
        if (!snap.exists() || snap.data().negocioId !== tenantId) {
          continue;
        }
        const insumo = { ...snap.data(), id: snap.id } as Insumo;
        const stockPrevio = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;
        const stockFisicoRedondeado = Number(item.nuevoStockFisico.toFixed(4));
        const diferencia = Number((stockFisicoRedondeado - stockPrevio).toFixed(4));

        if (diferencia !== 0) {
          lecturas.push({
            ref: insumoRef,
            insumo,
            stockPrevio,
            stockFisicoRedondeado,
            diferencia,
          });
        }
      }

      // 2. Fase de escrituras en transacción
      for (const item of lecturas) {
        transaction.update(item.ref, {
          stockActual: item.stockFisicoRedondeado,
          actualizadoEn: now,
        });

        const ajusteRef = doc(collection(db, 'entradas_inventario'));
        transaction.set(ajusteRef, {
          negocioId: tenantId,
          insumoId: item.insumo.id,
          insumoNombre: item.insumo.nombre,
          cantidad: item.diferencia,
          costo: 0,
          proveedor: `Conteo Físico: ${motivoLimpio}`,
          motivo: motivoLimpio,
          fecha: now,
          tipoMovimiento: 'ajuste',
          stockPrevio: item.stockPrevio,
          stockResultante: item.stockFisicoRedondeado,
          notas: notasLimpias,
          responsable: responsableLimpio,
          unidadMedida: item.insumo.unidad,
        } as Omit<EntradaInventario, 'id'>);

        ajustadosCount += 1;
      }
    });

    if (ajustadosCount > 0) {
      registrarEventoAuditoriaSilencioso({
        negocioId: tenantId,
        categoria: 'merma_inventario',
        titulo: `Conteo Físico Rápido de Bodega (${ajustadosCount} ajustes)`,
        descripcion: `Se ajustaron ${ajustadosCount} insumos por conteo físico en bodega. Notas: ${notasLimpias}`,
        motivo: motivoLimpio,
        montoImpacto: 0,
        responsableNombre: responsableLimpio,
        responsableRol: 'admin',
        entidadTipo: 'inventario',
        referenciaId: `conteo_${Date.now()}`,
        detallesForenses: {
          ajustadosCount,
          totalEvaluados: input.items.length,
          notas: notasLimpias,
        },
      });
    }

    return { ajustadosCount };
  } catch (error) {
    console.error('Error registrando conteo físico masivo:', error);
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

/**
 * Crea o actualiza una Sub-Receta / Preparación Base en `inventario` con aislamiento multi-tenant.
 */
export async function guardarConfiguracionSubReceta(
  negocioId: string,
  data: GuardarSubRecetaInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const validacion = validarConfiguracionSubReceta(data);
  if (!validacion.valida) {
    throw new Error(validacion.errores[0] || 'Configuración de sub-receta inválida');
  }

  const now = Timestamp.now();
  const recetaLimpia = data.recetaInsumos.map((ing) => ({
    insumoId: ing.insumoId.trim(),
    nombreSnapshot: (ing.nombreSnapshot || '').trim(),
    cantidad: Number(ing.cantidad.toFixed(4)),
    ...(ing.unidadSnapshot?.trim() ? { unidadSnapshot: ing.unidadSnapshot.trim() } : {}),
  }));

  const payloadBase: Record<string, unknown> = {
    negocioId: tenantId,
    nombre: data.nombre.trim(),
    unidad: data.unidad.trim(),
    esSubReceta: true,
    categoriaSubReceta: data.categoriaSubReceta || 'otro',
    rendimientoLote: Number(data.rendimientoLote.toFixed(4)),
    stockMinimo: Number(Math.max(0, data.stockMinimo ?? 0).toFixed(4)),
    recetaInsumos: recetaLimpia,
    actualizadoEn: now,
  };

  if (data.instruccionesPreparacion?.trim()) {
    payloadBase.instruccionesPreparacion = data.instruccionesPreparacion.trim();
  }
  if (
    typeof data.tiempoPreparacionMin === 'number' &&
    Number.isFinite(data.tiempoPreparacionMin) &&
    data.tiempoPreparacionMin > 0
  ) {
    payloadBase.tiempoPreparacionMin = Math.round(data.tiempoPreparacionMin);
  }
  if (
    typeof data.vidaUtilHoras === 'number' &&
    Number.isFinite(data.vidaUtilHoras) &&
    data.vidaUtilHoras > 0
  ) {
    payloadBase.vidaUtilHoras = Math.round(data.vidaUtilHoras);
  }
  if (
    typeof data.costoUnitario === 'number' &&
    Number.isFinite(data.costoUnitario) &&
    data.costoUnitario > 0
  ) {
    payloadBase.costoUnitario = Math.round(data.costoUnitario);
  }

  if (data.id?.trim()) {
    const subRecetaId = data.id.trim();
    const existente = await getInsumoById(subRecetaId, tenantId);
    if (!existente) {
      throw new Error('La preparación base no pertenece al negocio activo');
    }

    await updateDoc(doc(db, 'inventario', subRecetaId), payloadBase);
    return subRecetaId;
  }

  const stockInicial =
    typeof data.stockActual === 'number' && Number.isFinite(data.stockActual)
      ? Number(Math.max(0, data.stockActual).toFixed(4))
      : 0;

  const docRef = await addDoc(collection(db, 'inventario'), {
    ...payloadBase,
    stockActual: stockInicial,
    creadoEn: now,
  });

  return docRef.id;
}

/**
 * Ejecuta de forma atómica la producción de un lote de Sub-Receta en cocina:
 * descuenta insumos primarios, registra movimientos `salida_produccion` y acredita
 * el lote terminado (`entrada_produccion`) en bodega y Kardex con actualización de costo unitario.
 */
export async function registrarProduccionLoteSubReceta(
  negocioId: string,
  input: RegistrarProduccionLoteInput
): Promise<ResultadoProduccionLote> {
  const tenantId = requireTenantId(negocioId);
  const subRecetaId = (input.subRecetaId || '').trim();
  if (!subRecetaId) {
    throw new Error('Debes seleccionar una preparación base para producir');
  }
  if (!Number.isFinite(input.multiplicadorLotes) || input.multiplicadorLotes <= 0) {
    throw new Error('El multiplicador de lotes debe ser mayor a 0');
  }
  if (
    input.cantidadProducidaReal !== undefined &&
    (!Number.isFinite(input.cantidadProducidaReal) || input.cantidadProducidaReal <= 0)
  ) {
    throw new Error('La cantidad real producida debe ser mayor a 0');
  }

  const multiplicador = Number(input.multiplicadorLotes.toFixed(4));
  const loteProduccionId = `lote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const responsableLimpio = (input.responsable || 'Cocina / Administrador').trim();
  const notasLimpias = (input.notas || '').trim();

  let resultado: ResultadoProduccionLote | null = null;

  await runTransaction(db, async (transaction) => {
    const now = Timestamp.now();
    const subRecetaRef = doc(db, 'inventario', subRecetaId);
    const subSnap = await transaction.get(subRecetaRef);

    if (!subSnap.exists() || subSnap.data().negocioId !== tenantId) {
      throw new Error('Preparación base no encontrada en el negocio activo');
    }

    const subData = subSnap.data() as Omit<Insumo, 'id'>;
    const recetaInsumos = Array.isArray(subData.recetaInsumos) ? subData.recetaInsumos : [];
    if (!subData.esSubReceta || recetaInsumos.length === 0) {
      throw new Error('La preparación base no tiene insumos primarios configurados');
    }

    const unidadSalida = (subData.unidad || 'unid').trim();
    const rendimientoBase =
      typeof subData.rendimientoLote === 'number' &&
      Number.isFinite(subData.rendimientoLote) &&
      subData.rendimientoLote > 0
        ? subData.rendimientoLote
        : 1;
    const cantidadProducida =
      typeof input.cantidadProducidaReal === 'number' && input.cantidadProducidaReal > 0
        ? Number(input.cantidadProducidaReal.toFixed(4))
        : Number((rendimientoBase * multiplicador).toFixed(4));

    // Fase 1: Lectura de todos los insumos primarios
    const insumosLeidos: Array<{
      ref: ReturnType<typeof doc>;
      insumoId: string;
      nombre: string;
      unidad: string;
      stockPrevio: number;
      cantidadRequerida: number;
      nuevoStock: number;
      costoUnitario: number;
      subtotalCosto: number;
    }> = [];

    let sumaCostoExacto = 0;

    for (const ing of recetaInsumos) {
      const cantPorLote = typeof ing.cantidad === 'number' ? ing.cantidad : 0;
      if (!ing.insumoId || cantPorLote <= 0 || ing.insumoId === subRecetaId) continue;

      const ingRef = doc(db, 'inventario', ing.insumoId);
      const ingSnap = await transaction.get(ingRef);
      if (!ingSnap.exists() || ingSnap.data().negocioId !== tenantId) {
        throw new Error(
          `Insumo primario "${ing.nombreSnapshot || ing.insumoId}" no encontrado en el negocio activo`
        );
      }

      const ingData = ingSnap.data() as Omit<Insumo, 'id'>;
      const nombreIng = (ingData.nombre || ing.nombreSnapshot || 'Insumo').trim();
      const unidadIng = (ingData.unidad || ing.unidadSnapshot || 'unid').trim();
      const stockPrevio =
        typeof ingData.stockActual === 'number' && Number.isFinite(ingData.stockActual)
          ? Math.max(0, ingData.stockActual)
          : 0;

      const cantidadRequerida = Number((cantPorLote * multiplicador).toFixed(4));
      if (!input.permitirStockParcial && Number((stockPrevio - cantidadRequerida).toFixed(4)) < 0) {
        throw new Error(
          `Stock insuficiente de "${nombreIng}": hay ${stockPrevio} ${unidadIng}, se requieren ${cantidadRequerida} ${unidadIng}`
        );
      }

      const nuevoStock = Number(Math.max(0, stockPrevio - cantidadRequerida).toFixed(4));
      const costoCatalogo =
        typeof ingData.costoUnitario === 'number' &&
        Number.isFinite(ingData.costoUnitario) &&
        ingData.costoUnitario > 0
          ? ingData.costoUnitario
          : 0;
      const costoMapa = input.costosUnitariosPorInsumo?.[ing.insumoId] ?? 0;
      const costoUnitario = costoCatalogo > 0 ? costoCatalogo : Math.max(0, Math.round(costoMapa));
      const subtotalExacto = cantidadRequerida * costoUnitario;
      sumaCostoExacto += subtotalExacto;

      insumosLeidos.push({
        ref: ingRef,
        insumoId: ing.insumoId,
        nombre: nombreIng,
        unidad: unidadIng,
        stockPrevio,
        cantidadRequerida,
        nuevoStock,
        costoUnitario,
        subtotalCosto: Math.round(subtotalExacto),
      });
    }

    if (insumosLeidos.length === 0) {
      throw new Error('La preparación base no tiene insumos válidos para descontar');
    }

    const costoTotalLoteCOP = Math.round(sumaCostoExacto);
    const costoUnitarioResultanteCOP =
      cantidadProducida > 0 && costoTotalLoteCOP > 0
        ? Math.round(costoTotalLoteCOP / cantidadProducida)
        : typeof subData.costoUnitario === 'number' && subData.costoUnitario > 0
          ? Math.round(subData.costoUnitario)
          : 0;

    // Fase 2: Escritura atómica en insumos primarios + Sub-Receta + Kardex
    for (const item of insumosLeidos) {
      transaction.update(item.ref, {
        stockActual: item.nuevoStock,
        actualizadoEn: now,
      });

      const salidaRef = doc(collection(db, 'entradas_inventario'));
      transaction.set(salidaRef, {
        negocioId: tenantId,
        insumoId: item.insumoId,
        insumoNombre: item.nombre,
        cantidad: -item.cantidadRequerida,
        costo: item.subtotalCosto,
        costoUnitario: item.costoUnitario,
        proveedor: `Consumo Lote: ${subData.nombre}`,
        fecha: now,
        tipoMovimiento: 'salida_produccion',
        stockPrevio: item.stockPrevio,
        stockResultante: item.nuevoStock,
        motivo: 'produccion_cocina',
        notas: notasLimpias || `${multiplicador}x lote (${cantidadProducida} ${unidadSalida})`,
        responsable: responsableLimpio,
        unidadMedida: item.unidad,
        loteProduccionId,
        subRecetaId,
        subRecetaNombre: subData.nombre,
        multiplicadorLotes: multiplicador,
      } as Omit<EntradaInventario, 'id'>);
    }

    const stockPrevioSub =
      typeof subData.stockActual === 'number' && Number.isFinite(subData.stockActual)
        ? Math.max(0, subData.stockActual)
        : 0;
    const stockResultanteSub = Number((stockPrevioSub + cantidadProducida).toFixed(4));

    const subUpdates: Record<string, unknown> = {
      stockActual: stockResultanteSub,
      ultimoLoteProducidoEn: now,
      actualizadoEn: now,
    };
    if (costoUnitarioResultanteCOP > 0) {
      subUpdates.costoUnitario = costoUnitarioResultanteCOP;
    }

    transaction.update(subRecetaRef, subUpdates);

    const entradaSubRef = doc(collection(db, 'entradas_inventario'));
    transaction.set(entradaSubRef, {
      negocioId: tenantId,
      insumoId: subRecetaId,
      insumoNombre: subData.nombre,
      cantidad: cantidadProducida,
      costo: costoTotalLoteCOP,
      costoUnitario: costoUnitarioResultanteCOP,
      proveedor: `Producción Lote #${loteProduccionId.slice(-6).toUpperCase()}`,
      fecha: now,
      tipoMovimiento: 'entrada_produccion',
      stockPrevio: stockPrevioSub,
      stockResultante: stockResultanteSub,
      motivo: 'produccion_cocina',
      notas:
        notasLimpias ||
        `Consumo de ${insumosLeidos.length} insumos primarios (${multiplicador}x)`,
      responsable: responsableLimpio,
      unidadMedida: unidadSalida,
      loteProduccionId,
      subRecetaId,
      subRecetaNombre: subData.nombre,
      multiplicadorLotes: multiplicador,
    } as Omit<EntradaInventario, 'id'>);

    resultado = {
      loteProduccionId,
      subRecetaId,
      subRecetaNombre: subData.nombre,
      cantidadProducida,
      unidadSalida,
      costoTotalLoteCOP,
      costoUnitarioResultanteCOP,
      stockPrevioSubReceta: stockPrevioSub,
      stockResultanteSubReceta: stockResultanteSub,
      insumosConsumidosCount: insumosLeidos.length,
    };
  });

  if (!resultado) {
    throw new Error('No se pudo completar la transacción de producción');
  }

  const resumenFinal: ResultadoProduccionLote = resultado;

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'ajuste_inventario',
    severidad: 'informativa',
    titulo: `Producción Lote: ${resumenFinal.subRecetaNombre} (+${resumenFinal.cantidadProducida} ${resumenFinal.unidadSalida})`,
    descripcion: `Conversión de ${resumenFinal.insumosConsumidosCount} insumos primarios en lote preparado (${multiplicador}x).`,
    motivo: 'produccion_cocina',
    montoImpacto: 0,
    responsableNombre: responsableLimpio,
    responsableRol: 'admin',
    entidadTipo: 'inventario',
    referenciaId: loteProduccionId,
    detallesForenses: {
      subRecetaId,
      cantidadProducida: resumenFinal.cantidadProducida,
      costoTotalLoteCOP: resumenFinal.costoTotalLoteCOP,
      costoUnitarioResultanteCOP: resumenFinal.costoUnitarioResultanteCOP,
      multiplicadorLotes: multiplicador,
    },
  });

  return resumenFinal;
}
