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
  Combo,
  Insumo,
  EntradaInventario,
  EstacionCocinaMerma,
  GuardarSubRecetaInput,
  LoteConsumidoPepsRef,
  LoteInventario,
  MotivoMerma,
  MotivoAjusteInventario,
  OpcionesLoteEntradaInventario,
  Producto,
  RegistrarConteoFisicoMasivoInput,
  RegistrarMermaOperativaInput,
  RegistrarProduccionLoteInput,
  ResultadoMermaOperativa,
  ResultadoProduccionLote,
} from '../types';
import { requireTenantId } from '@/security/tenantScope';
import { calculateInventoryStock } from '@/utils/adminInputValidation';
import { filterInventoryLowStock } from '@/utils/inventoryStock';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import {
  COLECCION_LOTES_INVENTARIO,
  getLotesActivosPorInsumo,
} from '@/services/lotesInventarioService';
import { formatCOP } from '@/utils/formatCOP';
import { obtenerInfoMotivoMerma } from '@/utils/mermasOperativasUtils';
import { validarConfiguracionSubReceta } from '@/utils/produccionCocinaUtils';
import {
  calcularFechaVencimientoDesdeHoras,
  esFechaIsoValida,
  normalizarCodigoLote,
  planificarConsumoPeps,
} from '@/utils/lotesInventarioUtils';
import { calcularConsumoInsumos, type ConsumoInsumoCalculado } from '@/utils/recetasEscandallo';

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
  actualizarCostoUnitario = true,
  opcionesLote?: OpcionesLoteEntradaInventario
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    if (!Number.isFinite(costo) || costo < 0) {
      throw new Error('El costo no puede ser negativo');
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('La cantidad de entrada debe ser mayor a 0');
    }

    const debeCrearLote = Boolean(
      opcionesLote &&
      opcionesLote.crearLote !== false &&
      (
        Boolean(opcionesLote.fechaVencimiento && opcionesLote.fechaVencimiento.trim()) ||
        Boolean(opcionesLote.codigoLote && opcionesLote.codigoLote.trim()) ||
        opcionesLote.crearLote === true
      )
    );
    const fechaVencimientoTrim =
      debeCrearLote && typeof opcionesLote?.fechaVencimiento === 'string'
        ? opcionesLote.fechaVencimiento.trim()
        : '';
    if (fechaVencimientoTrim && !esFechaIsoValida(fechaVencimientoTrim)) {
      throw new Error('La fecha de vencimiento del lote debe tener formato válido YYYY-MM-DD');
    }
    const fechaVencimientoLote: string | null = fechaVencimientoTrim || null;
    const codigoLote = debeCrearLote
      ? normalizarCodigoLote(opcionesLote?.codigoLote, 'LOT')
      : undefined;

    const insumoRef = doc(db, 'inventario', insumoId);
    const entradaRef = doc(collection(db, 'entradas_inventario'));
    const loteRef = debeCrearLote
      ? doc(collection(db, COLECCION_LOTES_INVENTARIO))
      : null;

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
        ...(loteRef && codigoLote
          ? {
              loteInventarioId: loteRef.id,
              codigoLote,
              ...(fechaVencimientoLote ? { fechaVencimientoLote } : {}),
            }
          : {}),
      } as Omit<EntradaInventario, 'id'>);

      if (loteRef && codigoLote) {
        const regSanitario = (opcionesLote?.registroSanitario || '').trim();
        const costoCatalogo =
          typeof insumo.costoUnitario === 'number' &&
          Number.isFinite(insumo.costoUnitario) &&
          insumo.costoUnitario > 0
            ? Math.round(insumo.costoUnitario)
            : 0;
        const costoUnitLote = costoUnitario > 0 ? costoUnitario : costoCatalogo;
        const costoInicialLote =
          costo > 0 ? Math.round(costo) : Math.round(cantidad * costoUnitLote);
        const cantidadLote = Number(cantidad.toFixed(4));

        const lotePayload: Omit<LoteInventario, 'id'> = {
          negocioId: tenantId,
          insumoId,
          insumoNombre: insumo.nombre,
          unidadMedida: insumo.unidad || 'unidades',
          codigoLote,
          cantidadInicial: cantidadLote,
          cantidadDisponible: cantidadLote,
          cantidadConsumida: 0,
          cantidadMerma: 0,
          costoUnitario: costoUnitLote,
          costoTotalInicial: costoInicialLote,
          proveedor: proveedor || 'Manual',
          fechaIngreso: now,
          fechaVencimiento: fechaVencimientoLote,
          estado: 'activo',
          origen: 'compra_entrada',
          ...(opcionesLote?.ubicacionBodega
            ? { ubicacionBodega: opcionesLote.ubicacionBodega }
            : {}),
          ...(typeof opcionesLote?.temperaturaRecepcionC === 'number' &&
          Number.isFinite(opcionesLote.temperaturaRecepcionC)
            ? { temperaturaRecepcionC: opcionesLote.temperaturaRecepcionC }
            : {}),
          ...(regSanitario ? { registroSanitario: regSanitario } : {}),
          entradaInventarioId: entradaRef.id,
          ...(descripcion ? { notas: descripcion } : {}),
          responsable: responsable || 'Administrador',
          creadoEn: now,
          actualizadoEn: now,
        };
        transaction.set(loteRef, lotePayload);
      }
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
    let costoImpactoCOP = 0;

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      const stockPrevio = typeof insumo.stockActual === 'number' ? insumo.stockActual : 0;
      const nuevoStock = Number(Math.max(0, stockPrevio - cantidad).toFixed(4));
      const costoUnitario =
        typeof insumo.costoUnitario === 'number' &&
        Number.isFinite(insumo.costoUnitario) &&
        insumo.costoUnitario > 0
          ? Math.round(insumo.costoUnitario)
          : 0;
      const costoTotal = Math.round(cantidad * costoUnitario);
      costoImpactoCOP = costoTotal;
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
        costo: costoTotal,
        ...(costoUnitario > 0 ? { costoUnitario } : {}),
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
      montoImpacto: costoImpactoCOP,
      responsableNombre: responsable || 'Administrador',
      responsableRol: 'admin',
      entidadTipo: 'inventario',
      referenciaId: salidaRef.id,
      detallesForenses: {
        insumoId,
        cantidadMerma: cantidad,
        costoImpactoCOP,
        notas: notas?.trim() || '',
      },
    });
  } catch (error) {
    console.error('Error registering merma inventario:', error);
    throw error;
  }
}

/**
 * Registra de forma transaccional una merma operativa avanzada (por insumo directo o por
 * producto/combo terminado con explosión de escandallo), actualiza Kardex, registra auditoría
 * forense inmutable y emite alerta operativa si supera el umbral o proviene de devolución.
 */
export async function registrarMermaOperativaAvanzada(
  negocioId: string,
  input: RegistrarMermaOperativaInput,
  catalogo?: { productos?: Producto[]; combos?: Combo[] }
): Promise<ResultadoMermaOperativa> {
  const tenantId = requireTenantId(negocioId);
  if (!Number.isFinite(input.cantidad) || input.cantidad <= 0) {
    throw new Error('La cantidad de merma debe ser mayor a 0');
  }
  const motivoLimpio = (input.motivo || '').trim();
  if (!motivoLimpio) {
    throw new Error('Debes indicar el motivo de la merma');
  }

  const origen = input.origen || 'bodega';
  const estacion: EstacionCocinaMerma = input.estacion || 'general';
  const responsableLimpio = (input.responsable || 'Administrador').trim();
  const notasLimpias = (input.notas || '').trim();
  const cantidadNum = Number(input.cantidad.toFixed(4));
  const mermaLoteId = `merma_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const infoMotivo = obtenerInfoMotivoMerma(motivoLimpio);

  if (input.modo === 'insumo') {
    const insumoId = (input.insumoId || '').trim();
    if (!insumoId) {
      throw new Error('Debes seleccionar un insumo para registrar la merma');
    }

    const insumoRef = doc(db, 'inventario', insumoId);
    const salidaRef = doc(collection(db, 'entradas_inventario'));
    let referenciaNombre = 'Insumo';
    let unidadSalida = 'unid';
    let costoTotalImpactoCOP = 0;

    await runTransaction(db, async (transaction) => {
      const insumoSnap = await transaction.get(insumoRef);
      if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
        throw new Error('Insumo no encontrado en el negocio activo');
      }

      const insumo = { ...insumoSnap.data(), id: insumoSnap.id } as Insumo;
      referenciaNombre = insumo.nombre || 'Insumo';
      unidadSalida = insumo.unidad || 'unid';

      const stockPrevio =
        typeof insumo.stockActual === 'number' && Number.isFinite(insumo.stockActual)
          ? Math.max(0, insumo.stockActual)
          : 0;
      const nuevoStock = Number(Math.max(0, stockPrevio - cantidadNum).toFixed(4));

      const costoCatalogo =
        typeof insumo.costoUnitario === 'number' &&
        Number.isFinite(insumo.costoUnitario) &&
        insumo.costoUnitario > 0
          ? Math.round(insumo.costoUnitario)
          : 0;
      const costoMapa = input.costosUnitariosPorInsumo?.[insumoId] ?? 0;
      const costoUnitario = costoCatalogo > 0 ? costoCatalogo : Math.max(0, Math.round(costoMapa));
      const costoTotal = Math.round(cantidadNum * costoUnitario);
      costoTotalImpactoCOP = costoTotal;

      const now = Timestamp.now();

      transaction.update(insumoRef, {
        stockActual: nuevoStock,
        actualizadoEn: now,
      });

      transaction.set(salidaRef, {
        negocioId: tenantId,
        insumoId,
        insumoNombre: referenciaNombre,
        cantidad: -cantidadNum,
        costo: costoTotal,
        ...(costoUnitario > 0 ? { costoUnitario } : {}),
        proveedor: `Merma (${origen}): ${infoMotivo.label}`,
        motivo: motivoLimpio,
        fecha: now,
        tipoMovimiento: 'merma',
        stockPrevio,
        stockResultante: nuevoStock,
        notas: notasLimpias,
        responsable: responsableLimpio,
        unidadMedida: unidadSalida,
        origenMerma: origen,
        estacionCocina: estacion,
        mermaLoteId,
        ...(input.comandaId ? { comandaMermaId: input.comandaId } : {}),
      } as Omit<EntradaInventario, 'id'>);
    });

    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'merma_inventario',
      titulo: `Merma Operativa: ${referenciaNombre} (-${cantidadNum} ${unidadSalida})`,
      descripcion: `Baja en ${origen} (${estacion}) por "${infoMotivo.label}". Impacto: ${formatCOP(costoTotalImpactoCOP)}.`,
      motivo: motivoLimpio,
      montoImpacto: costoTotalImpactoCOP,
      responsableNombre: responsableLimpio,
      responsableRol: input.responsableRol || 'admin',
      entidadTipo: 'inventario',
      referenciaId: salidaRef.id,
      detallesForenses: {
        mermaLoteId,
        insumoId,
        origenMerma: origen,
        estacionCocina: estacion,
        cantidadMerma: cantidadNum,
        costoImpactoCOP: costoTotalImpactoCOP,
        ...(input.comandaCodigo ? { comandaCodigo: input.comandaCodigo } : {}),
      },
    });

    if (costoTotalImpactoCOP >= 25000 || origen === 'devolucion_cliente') {
      crearAlertaSilenciosa(tenantId, {
        modulo: origen === 'cocina_kds' ? 'cocina' : 'inventario',
        tipo: 'merma_operativa_alta',
        titulo:
          origen === 'devolucion_cliente'
            ? `Devolución registrada: ${referenciaNombre}`
            : `Alerta de merma elevada: ${referenciaNombre}`,
        mensaje: `Pérdida de ${formatCOP(costoTotalImpactoCOP)} (${infoMotivo.label}) reportada por ${responsableLimpio}.`,
        urgencia: costoTotalImpactoCOP >= 50000 ? 'critica' : 'alta',
        enlace: '/inventario?tab=mermas',
        origen: 'automatico',
        creadaPor: responsableLimpio,
      });
    }

    return {
      mermaLoteId,
      modo: 'insumo',
      referenciaNombre,
      cantidadRegistrada: cantidadNum,
      unidad: unidadSalida,
      motivo: motivoLimpio,
      origen,
      estacion,
      costoTotalImpactoCOP,
      insumosAfectadosCount: 1,
      movimientoIds: [salidaRef.id],
    };
  }

  // Modo: producto_terminado (explosión automática de escandallo a insumos en bodega)
  const referenciaId = (input.referenciaId || '').trim();
  const tipoReferencia = input.tipoReferencia || 'producto';
  if (!referenciaId) {
    throw new Error('Debes seleccionar un producto o combo para registrar la merma o devolución');
  }

  let productosCatalogo = catalogo?.productos ? [...catalogo.productos] : [];
  let combosCatalogo = catalogo?.combos ? [...catalogo.combos] : [];

  let productoTarget =
    tipoReferencia === 'producto'
      ? productosCatalogo.find((p) => p.id === referenciaId)
      : undefined;
  let comboTarget =
    tipoReferencia === 'combo'
      ? combosCatalogo.find((c) => c.id === referenciaId)
      : undefined;

  if (tipoReferencia === 'producto' && !productoTarget) {
    const snap = await getDoc(doc(db, 'productos', referenciaId));
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error('Producto no encontrado en el negocio activo');
    }
    productoTarget = { ...snap.data(), id: snap.id } as Producto;
    productosCatalogo = [...productosCatalogo, productoTarget];
  } else if (tipoReferencia === 'combo' && !comboTarget) {
    const snap = await getDoc(doc(db, 'combos', referenciaId));
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error('Combo no encontrado en el negocio activo');
    }
    comboTarget = { ...snap.data(), id: snap.id } as Combo;
    combosCatalogo = [...combosCatalogo, comboTarget];
  }

  if (comboTarget && Array.isArray(comboTarget.items)) {
    for (const itemCombo of comboTarget.items) {
      if (!productosCatalogo.some((p) => p.id === itemCombo.productoId)) {
        const snapProd = await getDoc(doc(db, 'productos', itemCombo.productoId));
        if (snapProd.exists() && snapProd.data().negocioId === tenantId) {
          productosCatalogo.push({ ...snapProd.data(), id: snapProd.id } as Producto);
        }
      }
    }
  }

  const referenciaNombre = productoTarget
    ? productoTarget.nombre
    : (comboTarget?.nombre || 'Producto');
  const precioUnitario = productoTarget
    ? productoTarget.precio
    : (comboTarget?.precioEspecial || 0);
  const costoRefFallback = productoTarget
    ? productoTarget.costoReferencia || 0
    : (comboTarget?.costoReferencia || 0);

  const consumos = calcularConsumoInsumos(
    [
      {
        tipo: tipoReferencia,
        referenciaId,
        nombre: referenciaNombre,
        cantidad: cantidadNum,
        precioUnitario,
        subtotal: Math.round(precioUnitario * cantidadNum),
      },
    ],
    productosCatalogo,
    combosCatalogo
  );

  const movimientoIds: string[] = [];
  let costoTotalImpactoCOP = 0;
  let insumosAfectadosCount = 0;

  if (consumos.length > 0) {
    await runTransaction(db, async (transaction) => {
      const now = Timestamp.now();
      const insumosLeidos: Array<{
        ref: ReturnType<typeof doc>;
        insumoId: string;
        nombre: string;
        unidad: string;
        stockPrevio: number;
        cantidadMerma: number;
        nuevoStock: number;
        costoUnitario: number;
        costoTotal: number;
      }> = [];

      for (const c of consumos) {
        if (c.cantidadTotal <= 0) continue;
        const insRef = doc(db, 'inventario', c.insumoId);
        const snap = await transaction.get(insRef);
        if (!snap.exists() || snap.data().negocioId !== tenantId) {
          continue;
        }
        const data = snap.data() as Omit<Insumo, 'id'>;
        const stockPrevio =
          typeof data.stockActual === 'number' && Number.isFinite(data.stockActual)
            ? Math.max(0, data.stockActual)
            : 0;
        const cantidadMerma = Number(c.cantidadTotal.toFixed(4));
        const nuevoStock = Number(Math.max(0, stockPrevio - cantidadMerma).toFixed(4));
        const costoCatalogo =
          typeof data.costoUnitario === 'number' &&
          Number.isFinite(data.costoUnitario) &&
          data.costoUnitario > 0
            ? Math.round(data.costoUnitario)
            : 0;
        const costoMapa = input.costosUnitariosPorInsumo?.[c.insumoId] ?? 0;
        const costoUnitario =
          costoCatalogo > 0 ? costoCatalogo : Math.max(0, Math.round(costoMapa));
        const costoTotal = Math.round(cantidadMerma * costoUnitario);

        insumosLeidos.push({
          ref: insRef,
          insumoId: c.insumoId,
          nombre: data.nombre || c.nombreSnapshot || 'Insumo',
          unidad: data.unidad || c.unidadSnapshot || 'unid',
          stockPrevio,
          cantidadMerma,
          nuevoStock,
          costoUnitario,
          costoTotal,
        });
      }

      for (const item of insumosLeidos) {
        transaction.update(item.ref, {
          stockActual: item.nuevoStock,
          actualizadoEn: now,
        });

        const movRef = doc(collection(db, 'entradas_inventario'));
        movimientoIds.push(movRef.id);
        costoTotalImpactoCOP += item.costoTotal;

        transaction.set(movRef, {
          negocioId: tenantId,
          insumoId: item.insumoId,
          insumoNombre: item.nombre,
          cantidad: -item.cantidadMerma,
          costo: item.costoTotal,
          ...(item.costoUnitario > 0 ? { costoUnitario: item.costoUnitario } : {}),
          proveedor: `Merma Plato (${origen}): ${referenciaNombre}`,
          motivo: motivoLimpio,
          fecha: now,
          tipoMovimiento: 'merma',
          stockPrevio: item.stockPrevio,
          stockResultante: item.nuevoStock,
          notas:
            notasLimpias ||
            `${cantidadNum}x ${referenciaNombre}${input.comandaCodigo ? ` · Comanda ${input.comandaCodigo}` : ''}`,
          responsable: responsableLimpio,
          unidadMedida: item.unidad,
          origenMerma: origen,
          estacionCocina: estacion,
          mermaLoteId,
          productoMermaId: referenciaId,
          productoMermaNombre: referenciaNombre,
          ...(input.comandaId ? { comandaMermaId: input.comandaId } : {}),
        } as Omit<EntradaInventario, 'id'>);
      }

      insumosAfectadosCount = insumosLeidos.length;
    });
  }

  if (insumosAfectadosCount === 0 && costoRefFallback > 0) {
    costoTotalImpactoCOP = Math.round(costoRefFallback * cantidadNum);
  }

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: motivoLimpio === 'comanda_cancelada' ? 'cancelacion_comanda' : 'merma_inventario',
    titulo:
      origen === 'devolucion_cliente'
        ? `Devolución de Producto: ${cantidadNum}x ${referenciaNombre}`
        : `Desperdicio de Cocina: ${cantidadNum}x ${referenciaNombre}`,
    descripcion: `Explosión de escandallo sobre ${insumosAfectadosCount} insumo(s) en bodega por "${infoMotivo.label}". Impacto P&L: ${formatCOP(costoTotalImpactoCOP)}.`,
    motivo: motivoLimpio,
    montoImpacto: costoTotalImpactoCOP,
    responsableNombre: responsableLimpio,
    responsableRol: input.responsableRol || 'cocinero',
    entidadTipo: motivoLimpio === 'comanda_cancelada' ? 'comanda' : 'inventario',
    referenciaId: mermaLoteId,
    detallesForenses: {
      mermaLoteId,
      productoMermaId: referenciaId,
      productoMermaNombre: referenciaNombre,
      tipoReferencia,
      cantidadUnidades: cantidadNum,
      insumosAfectadosCount,
      origenMerma: origen,
      estacionCocina: estacion,
      costoImpactoCOP: costoTotalImpactoCOP,
      ...(input.comandaCodigo ? { comandaCodigo: input.comandaCodigo } : {}),
    },
  });

  if (costoTotalImpactoCOP >= 20000 || origen === 'devolucion_cliente') {
    crearAlertaSilenciosa(tenantId, {
      modulo: origen === 'cocina_kds' ? 'cocina' : 'inventario',
      tipo: origen === 'devolucion_cliente' ? 'devolucion_producto' : 'merma_cocina',
      titulo:
        origen === 'devolucion_cliente'
          ? `Devolución de cliente: ${cantidadNum}x ${referenciaNombre}`
          : `Desperdicio reportado en cocina: ${cantidadNum}x ${referenciaNombre}`,
      mensaje: `Impacto de ${formatCOP(costoTotalImpactoCOP)} en bodega (${infoMotivo.label}). Reportó: ${responsableLimpio}.`,
      urgencia: costoTotalImpactoCOP >= 40000 ? 'critica' : 'alta',
      enlace: '/inventario?tab=mermas',
      origen: 'automatico',
      creadaPor: responsableLimpio,
    });
  }

  return {
    mermaLoteId,
    modo: 'producto_terminado',
    referenciaNombre,
    cantidadRegistrada: cantidadNum,
    unidad: 'unidades',
    motivo: motivoLimpio,
    origen,
    estacion,
    costoTotalImpactoCOP,
    insumosAfectadosCount,
    movimientoIds,
  };
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

  const lotesCandidatosPorInsumo = new Map<string, LoteInventario[]>();
  const insumoIdsUnicos = Array.from(
    new Set(consumos.filter((c) => c.cantidadTotal > 0).map((c) => c.insumoId))
  );
  await Promise.all(
    insumoIdsUnicos.map(async (insId) => {
      try {
        const lotes = await getLotesActivosPorInsumo(tenantId, insId);
        if (lotes.length > 0) {
          lotesCandidatosPorInsumo.set(insId, lotes);
        }
      } catch {
        // Silencioso: no bloquear descuento de venta si falla consulta previa de lotes
      }
    })
  );

  const executeWithTransaction = async (transaction: Transaction) => {
    const now = Timestamp.now();

    // 1. Lecturas: leer insumos primero y luego lotes candidatos dentro de la transacción
    const insumoRefsAndDocs: Array<{
      ref: ReturnType<typeof doc>;
      insumoId: string;
      stockActual: number;
      nombre: string;
      consumoTotal: number;
      lotesFrescos: LoteInventario[];
    }> = [];

    for (const c of consumos) {
      if (c.cantidadTotal <= 0) continue;
      const insumoRef = doc(db, 'inventario', c.insumoId);
      const snap = await transaction.get(insumoRef);
      if (!snap.exists() || snap.data().negocioId !== tenantId) {
        continue;
      }
      const data = snap.data();

      const candidatos = lotesCandidatosPorInsumo.get(c.insumoId) || [];
      const lotesFrescos: LoteInventario[] = [];
      for (const cand of candidatos) {
        if (!cand.id) continue;
        const loteRef = doc(db, COLECCION_LOTES_INVENTARIO, cand.id);
        const loteSnap = await transaction.get(loteRef);
        if (loteSnap && loteSnap.exists() && loteSnap.data().negocioId === tenantId) {
          lotesFrescos.push({
            ...(loteSnap.data() as Omit<LoteInventario, 'id'>),
            id: loteSnap.id,
          });
        }
      }

      insumoRefsAndDocs.push({
        ref: insumoRef,
        insumoId: c.insumoId,
        stockActual: typeof data.stockActual === 'number' ? data.stockActual : 0,
        nombre: data.nombre || c.nombreSnapshot,
        consumoTotal: c.cantidadTotal,
        lotesFrescos,
      });
    }

    // 2. Escrituras: actualizar stock, aplicar PEPS sobre lotes y registrar salida en entradas_inventario
    for (const item of insumoRefsAndDocs) {
      const nuevoStock = Number(Math.max(0, item.stockActual - item.consumoTotal).toFixed(4));

      transaction.update(item.ref, {
        stockActual: nuevoStock,
        actualizadoEn: now,
      });

      const lotesConsumidosPeps: LoteConsumidoPepsRef[] = [];
      if (item.lotesFrescos.length > 0) {
        const plan = planificarConsumoPeps(item.insumoId, item.consumoTotal, item.lotesFrescos);
        for (const asig of plan.asignaciones) {
          const loteOriginal = item.lotesFrescos.find((l) => l.id === asig.loteId);
          if (!loteOriginal) continue;
          const loteRef = doc(db, COLECCION_LOTES_INVENTARIO, asig.loteId);
          const nuevoConsumido = Number(
            ((loteOriginal.cantidadConsumida || 0) + asig.cantidadConsumida).toFixed(4)
          );
          transaction.update(loteRef, {
            cantidadDisponible: asig.cantidadRestante,
            cantidadConsumida: nuevoConsumido,
            estado: asig.nuevoEstado,
            actualizadoEn: now,
          });
          lotesConsumidosPeps.push({
            loteId: asig.loteId,
            codigoLote: asig.codigoLote,
            cantidad: asig.cantidadConsumida,
            fechaVencimiento: asig.fechaVencimiento ?? null,
          });
        }
      }

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
        ...(lotesConsumidosPeps.length > 0
          ? {
              lotesConsumidosPeps,
              codigoLote:
                lotesConsumidosPeps.length === 1
                  ? lotesConsumidosPeps[0].codigoLote
                  : lotesConsumidosPeps.map((l) => l.codigoLote).join(', '),
            }
          : {}),
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
 * Registra movimientos contables de merma en Kardex (`entradas_inventario`) cuando se anula
 * una venta sin reintegrar ingredientes (plato ya cocinado o devuelto). Como el stock físico
 * ya fue descontado al facturar la venta, no vuelve a restar `stockActual`, conservando
 * trazabilidad exacta en P&L y Kardex.
 */
export async function registrarMermaPorAnulacionSinReversion(
  negocioId: string,
  consumos: ConsumoInsumoCalculado[],
  referenciaOperativa: string,
  opciones?: {
    motivoAnulacion?: string;
    responsable?: string;
    ventaId?: string;
    notas?: string;
  }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!consumos || consumos.length === 0) return;

  const motivoAnul = (opciones?.motivoAnulacion || '').trim().toLowerCase();
  const esDevolucion = motivoAnul === 'plato_devuelto' || motivoAnul === 'cliente_cancelo';
  const motivoMerma = esDevolucion ? 'devolucion_cliente' : 'comanda_cancelada';
  const origenMerma = motivoAnul === 'plato_devuelto' ? 'devolucion_cliente' : 'cocina_kds';
  const mermaLoteId = `merma_anul_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const responsable = (opciones?.responsable || 'Administrador').trim();
  const notas =
    (opciones?.notas || '').trim() ||
    'Anulación de venta sin reintegro de stock (plato ya preparado)';

  await runTransaction(db, async (transaction) => {
    const now = Timestamp.now();
    const registros: Array<{
      insumoId: string;
      nombre: string;
      unidad: string;
      stockActual: number;
      consumoTotal: number;
      costoUnitario: number;
      costoTotal: number;
    }> = [];

    for (const c of consumos) {
      if (c.cantidadTotal <= 0) continue;
      const insumoRef = doc(db, 'inventario', c.insumoId);
      const snap = await transaction.get(insumoRef);
      if (!snap.exists() || snap.data().negocioId !== tenantId) {
        continue;
      }
      const data = snap.data() as Omit<Insumo, 'id'>;
      const stockActual =
        typeof data.stockActual === 'number' && Number.isFinite(data.stockActual)
          ? Math.max(0, data.stockActual)
          : 0;
      const costoUnitario =
        typeof data.costoUnitario === 'number' &&
        Number.isFinite(data.costoUnitario) &&
        data.costoUnitario > 0
          ? Math.round(data.costoUnitario)
          : 0;
      const consumoTotal = Number(c.cantidadTotal.toFixed(4));
      const costoTotal = Math.round(consumoTotal * costoUnitario);

      registros.push({
        insumoId: c.insumoId,
        nombre: data.nombre || c.nombreSnapshot || 'Insumo',
        unidad: data.unidad || c.unidadSnapshot || 'unid',
        stockActual,
        consumoTotal,
        costoUnitario,
        costoTotal,
      });
    }

    for (const item of registros) {
      const movRef = doc(collection(db, 'entradas_inventario'));
      transaction.set(movRef, {
        negocioId: tenantId,
        insumoId: item.insumoId,
        insumoNombre: item.nombre,
        cantidad: -item.consumoTotal,
        costo: item.costoTotal,
        ...(item.costoUnitario > 0 ? { costoUnitario: item.costoUnitario } : {}),
        proveedor: referenciaOperativa,
        motivo: motivoMerma,
        fecha: now,
        tipoMovimiento: 'merma',
        stockPrevio: item.stockActual,
        stockResultante: item.stockActual,
        notas,
        responsable,
        unidadMedida: item.unidad,
        origenMerma,
        estacionCocina: 'general',
        mermaLoteId,
        ...(opciones?.ventaId ? { comandaMermaId: opciones.ventaId } : {}),
      } as Omit<EntradaInventario, 'id'>);
    }
  });
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
  const fechaVencInputTrim =
    typeof input.fechaVencimiento === 'string' ? input.fechaVencimiento.trim() : '';
  if (fechaVencInputTrim && !esFechaIsoValida(fechaVencInputTrim)) {
    throw new Error('La fecha de vencimiento del lote preparado debe tener formato válido YYYY-MM-DD');
  }

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
    const debeCrearLoteSub =
      (typeof subData.vidaUtilHoras === 'number' && subData.vidaUtilHoras > 0) ||
      Boolean(fechaVencInputTrim);
    const loteSubRef = debeCrearLoteSub
      ? doc(collection(db, COLECCION_LOTES_INVENTARIO))
      : null;
    const codigoLoteSub = debeCrearLoteSub
      ? normalizarCodigoLote(input.codigoLote, 'PREP')
      : undefined;
    const fechaVencSub = debeCrearLoteSub
      ? fechaVencInputTrim ||
        calcularFechaVencimientoDesdeHoras(
          typeof subData.vidaUtilHoras === 'number' ? subData.vidaUtilHoras : 24
        )
      : null;

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
      ...(loteSubRef && codigoLoteSub
        ? {
            loteInventarioId: loteSubRef.id,
            codigoLote: codigoLoteSub,
            ...(fechaVencSub ? { fechaVencimientoLote: fechaVencSub } : {}),
          }
        : {}),
    } as Omit<EntradaInventario, 'id'>);

    if (loteSubRef && codigoLoteSub) {
      transaction.set(loteSubRef, {
        negocioId: tenantId,
        insumoId: subRecetaId,
        insumoNombre: subData.nombre,
        unidadMedida: unidadSalida,
        codigoLote: codigoLoteSub,
        cantidadInicial: cantidadProducida,
        cantidadDisponible: cantidadProducida,
        cantidadConsumida: 0,
        cantidadMerma: 0,
        costoUnitario: costoUnitarioResultanteCOP,
        costoTotalInicial: costoTotalLoteCOP,
        proveedor: `Producción Lote #${loteProduccionId.slice(-6).toUpperCase()}`,
        fechaIngreso: now,
        fechaVencimiento: fechaVencSub,
        estado: 'activo',
        origen: 'produccion_subreceta',
        ubicacionBodega: 'nevera_refrigeracion',
        entradaInventarioId: entradaSubRef.id,
        loteProduccionId,
        notas: notasLimpias || `Preparación de cocina (${multiplicador}x)`,
        responsable: responsableLimpio,
        creadoEn: now,
        actualizadoEn: now,
      } as Omit<LoteInventario, 'id'>);
    }

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
