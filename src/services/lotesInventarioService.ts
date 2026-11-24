import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa, crearNotificacion } from '@/services/notificacionesService';
import type {
  BajaRapidaLoteMermaInput,
  EntradaInventario,
  Insumo,
  LoteInventario,
  NotificacionOperativa,
  RegistrarLoteManualInput,
  ResultadoBajaLoteMerma,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  construirAlertasSanitariasLotes,
  esFechaIsoValida,
  normalizarCodigoLote,
} from '@/utils/lotesInventarioUtils';

export const COLECCION_LOTES_INVENTARIO = 'lotes_inventario';

/**
 * Consulta todos los lotes de inventario del negocio activo ordenados del más reciente al más antiguo.
 */
export async function getTodosLotesInventario(
  negocioId: string,
  limite = 300
): Promise<LoteInventario[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  try {
    const q = query(
      collection(db, COLECCION_LOTES_INVENTARIO),
      where('negocioId', '==', tenantId),
      orderBy('creadoEn', 'desc'),
      limit(limite)
    );
    const snapshot = await getDocs(q);
    if (!snapshot || !Array.isArray(snapshot.docs)) {
      return [];
    }
    return snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Omit<LoteInventario, 'id'>),
      id: docSnap.id,
    }));
  } catch (error) {
    console.error('Error fetching lotes de inventario:', error);
    throw error;
  }
}

/**
 * Suscripción en tiempo real a los lotes de inventario del negocio activo.
 */
export function onTodosLotesInventarioChange(
  negocioId: string,
  callback: (lotes: LoteInventario[]) => void,
  onError?: (error: Error) => void,
  limite = 300
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_LOTES_INVENTARIO),
    where('negocioId', '==', tenantId),
    orderBy('creadoEn', 'desc'),
    limit(limite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lotes = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Omit<LoteInventario, 'id'>),
        id: docSnap.id,
      }));
      callback(lotes);
    },
    (error) => {
      console.error('Error listening to lotes_inventario:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Consulta los lotes en estado `activo` para un insumo específico (para planificación PEPS / FIFO).
 */
export async function getLotesActivosPorInsumo(
  negocioId: string,
  insumoId: string
): Promise<LoteInventario[]> {
  const tenantId = requireTenantId(negocioId);
  const cleanInsumoId = (insumoId || '').trim();
  if (!cleanInsumoId || !db) return [];

  try {
    const q = query(
      collection(db, COLECCION_LOTES_INVENTARIO),
      where('negocioId', '==', tenantId),
      where('insumoId', '==', cleanInsumoId),
      where('estado', '==', 'activo')
    );
    const snapshot = await getDocs(q);
    if (!snapshot || !Array.isArray(snapshot.docs)) {
      return [];
    }
    return snapshot.docs.map((docSnap) => ({
      ...(docSnap.data() as Omit<LoteInventario, 'id'>),
      id: docSnap.id,
    }));
  } catch (error) {
    console.warn('No se pudieron consultar lotes activos por insumo:', error);
    return [];
  }
}

/**
 * Registra manualmente un lote en bodega, sumando stock al insumo + Kardex
 * o únicamente etiquetando saldo existente cuando `soloTrazabilidadStockExistente` es true.
 */
export async function registrarLoteInventarioManual(
  negocioId: string,
  input: RegistrarLoteManualInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const insumoId = (input.insumoId || '').trim();
  if (!insumoId) {
    throw new Error('Debes seleccionar un insumo para registrar el lote');
  }
  if (!Number.isFinite(input.cantidad) || input.cantidad <= 0) {
    throw new Error('La cantidad del lote debe ser mayor a 0');
  }

  const costoTotal =
    typeof input.costoTotal === 'number' && Number.isFinite(input.costoTotal)
      ? Math.round(input.costoTotal)
      : 0;
  if (costoTotal < 0) {
    throw new Error('El costo total del lote no puede ser negativo');
  }

  const fechaTrim = typeof input.fechaVencimiento === 'string'
    ? input.fechaVencimiento.trim()
    : '';
  if (fechaTrim && !esFechaIsoValida(fechaTrim)) {
    throw new Error('La fecha de vencimiento debe tener formato válido YYYY-MM-DD');
  }
  const fechaVencimientoLimpia: string | null = fechaTrim || null;

  const cantidadNum = Number(input.cantidad.toFixed(4));
  const codigoLote = normalizarCodigoLote(input.codigoLote, 'LOT');
  const proveedorLimpio = (input.proveedor || 'Registro de Lote').trim() || 'Registro de Lote';
  const responsableLimpio = (input.responsable || 'Administrador').trim() || 'Administrador';
  const notasLimpias = (input.notas || '').trim();
  const registroSanitarioLimpio = (input.registroSanitario || '').trim();

  const insumoRef = doc(db, 'inventario', insumoId);
  const loteRef = doc(collection(db, COLECCION_LOTES_INVENTARIO));

  await runTransaction(db, async (transaction) => {
    const insumoSnap = await transaction.get(insumoRef);
    if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
      throw new Error('Insumo no encontrado en el negocio activo');
    }

    const insumo = {
      ...(insumoSnap.data() as Omit<Insumo, 'id'>),
      id: insumoSnap.id,
    };
    const now = Timestamp.now();

    const costoUnitarioCalculado =
      costoTotal > 0 && cantidadNum > 0
        ? Math.round(costoTotal / cantidadNum)
        : typeof insumo.costoUnitario === 'number' &&
          Number.isFinite(insumo.costoUnitario) &&
          insumo.costoUnitario > 0
        ? Math.round(insumo.costoUnitario)
        : 0;

    const costoTotalInicial =
      costoTotal > 0
        ? costoTotal
        : Math.round(costoUnitarioCalculado * cantidadNum);

    let entradaId: string | undefined;

    if (!input.soloTrazabilidadStockExistente) {
      const stockPrevio =
        typeof insumo.stockActual === 'number' && Number.isFinite(insumo.stockActual)
          ? Math.max(0, insumo.stockActual)
          : 0;
      const nuevoStock = Number((stockPrevio + cantidadNum).toFixed(4));

      const insumoUpdates: Record<string, unknown> = {
        stockActual: nuevoStock,
        actualizadoEn: now,
      };
      if (costoTotal > 0 && costoUnitarioCalculado > 0) {
        insumoUpdates.costoUnitario = costoUnitarioCalculado;
      }
      if (proveedorLimpio && proveedorLimpio !== 'Registro de Lote' && proveedorLimpio !== 'Manual') {
        insumoUpdates.proveedor = proveedorLimpio;
      }
      transaction.update(insumoRef, insumoUpdates);

      const entradaRef = doc(collection(db, 'entradas_inventario'));
      entradaId = entradaRef.id;
      transaction.set(entradaRef, {
        negocioId: tenantId,
        insumoId,
        insumoNombre: insumo.nombre,
        cantidad: cantidadNum,
        costo: costoTotal,
        costoUnitario: costoUnitarioCalculado,
        proveedor: proveedorLimpio,
        fecha: now,
        tipoMovimiento: 'entrada',
        stockPrevio,
        stockResultante: nuevoStock,
        notas: notasLimpias || `Ingreso con Lote ${codigoLote}`,
        responsable: responsableLimpio,
        unidadMedida: insumo.unidad || 'unidades',
        loteInventarioId: loteRef.id,
        codigoLote,
        ...(fechaVencimientoLimpia ? { fechaVencimientoLote: fechaVencimientoLimpia } : {}),
      } as Omit<EntradaInventario, 'id'>);
    }

    const lotePayload: Omit<LoteInventario, 'id'> = {
      negocioId: tenantId,
      insumoId,
      insumoNombre: insumo.nombre,
      unidadMedida: insumo.unidad || 'unidades',
      codigoLote,
      cantidadInicial: cantidadNum,
      cantidadDisponible: cantidadNum,
      cantidadConsumida: 0,
      cantidadMerma: 0,
      costoUnitario: costoUnitarioCalculado,
      costoTotalInicial,
      proveedor: proveedorLimpio,
      fechaIngreso: now,
      fechaVencimiento: fechaVencimientoLimpia,
      estado: 'activo',
      origen: 'registro_manual',
      ...(input.ubicacionBodega ? { ubicacionBodega: input.ubicacionBodega } : {}),
      ...(typeof input.temperaturaRecepcionC === 'number' && Number.isFinite(input.temperaturaRecepcionC)
        ? { temperaturaRecepcionC: input.temperaturaRecepcionC }
        : {}),
      ...(registroSanitarioLimpio ? { registroSanitario: registroSanitarioLimpio } : {}),
      ...(entradaId ? { entradaInventarioId: entradaId } : {}),
      ...(notasLimpias ? { notas: notasLimpias } : {}),
      responsable: responsableLimpio,
      creadoEn: now,
      actualizadoEn: now,
    };

    transaction.set(loteRef, lotePayload);
  });

  return loteRef.id;
}

/**
 * Da de baja rápida (total o parcial) un lote vencido o deteriorado hacia merma operativa:
 * actualiza el lote, descuenta existencias del insumo, registra en Kardex y emite auditoría + alerta.
 */
export async function darDeBajaLoteAMerma(
  negocioId: string,
  input: BajaRapidaLoteMermaInput
): Promise<ResultadoBajaLoteMerma> {
  const tenantId = requireTenantId(negocioId);
  const loteId = (input.loteId || '').trim();
  if (!loteId) {
    throw new Error('Debes seleccionar un lote válido para dar de baja');
  }

  const motivoLimpio = (input.motivo || 'vencimiento').trim() || 'vencimiento';
  const responsableLimpio = (input.responsable || 'Administrador').trim() || 'Administrador';
  const notasLimpias = (input.notas || '').trim();

  const loteRef = doc(db, COLECCION_LOTES_INVENTARIO, loteId);
  const movRef = doc(collection(db, 'entradas_inventario'));

  let resultado: ResultadoBajaLoteMerma | null = null;

  await runTransaction(db, async (transaction) => {
    const loteSnap = await transaction.get(loteRef);
    if (!loteSnap.exists() || loteSnap.data().negocioId !== tenantId) {
      throw new Error('Lote no encontrado en el negocio activo');
    }

    const lote = {
      ...(loteSnap.data() as Omit<LoteInventario, 'id'>),
      id: loteSnap.id,
    };

    if (lote.estado !== 'activo' && lote.estado !== 'cuarentena') {
      throw new Error('Este lote ya fue agotado o dado de baja anteriormente');
    }

    const disponible =
      typeof lote.cantidadDisponible === 'number' && Number.isFinite(lote.cantidadDisponible)
        ? Math.max(0, lote.cantidadDisponible)
        : 0;

    if (disponible <= 0) {
      throw new Error('El lote no tiene saldo disponible para dar de baja');
    }

    const cantidadBajaRaw =
      typeof input.cantidad === 'number' ? input.cantidad : disponible;

    if (!Number.isFinite(cantidadBajaRaw) || cantidadBajaRaw <= 0) {
      throw new Error('La cantidad a dar de baja debe ser mayor a 0');
    }
    if (cantidadBajaRaw > disponible) {
      throw new Error(
        `La cantidad de baja (${cantidadBajaRaw}) supera el saldo del lote (${disponible})`
      );
    }

    const cantidadBaja = Number(cantidadBajaRaw.toFixed(4));
    const insumoRef = doc(db, 'inventario', lote.insumoId);
    const insumoSnap = await transaction.get(insumoRef);
    if (!insumoSnap.exists() || insumoSnap.data().negocioId !== tenantId) {
      throw new Error('Insumo asociado no encontrado en el negocio activo');
    }

    const insumoData = insumoSnap.data() as Omit<Insumo, 'id'>;
    const stockPrevioInsumo =
      typeof insumoData.stockActual === 'number' && Number.isFinite(insumoData.stockActual)
        ? Math.max(0, insumoData.stockActual)
        : 0;
    const nuevoStockInsumo = Number(Math.max(0, stockPrevioInsumo - cantidadBaja).toFixed(4));

    const nuevaDisponible = Number(Math.max(0, disponible - cantidadBaja).toFixed(4));
    const nuevaMermaAcumulada = Number(((lote.cantidadMerma || 0) + cantidadBaja).toFixed(4));
    const nuevoEstado = nuevaDisponible <= 0 ? 'vencido_baja' : lote.estado;

    const costoUnitario =
      typeof lote.costoUnitario === 'number' &&
      Number.isFinite(lote.costoUnitario) &&
      lote.costoUnitario > 0
        ? Math.round(lote.costoUnitario)
        : typeof insumoData.costoUnitario === 'number' &&
          Number.isFinite(insumoData.costoUnitario) &&
          insumoData.costoUnitario > 0
        ? Math.round(insumoData.costoUnitario)
        : 0;

    const costoPerdidoCOP = Math.round(cantidadBaja * costoUnitario);
    const now = Timestamp.now();

    transaction.update(loteRef, {
      cantidadDisponible: nuevaDisponible,
      cantidadMerma: nuevaMermaAcumulada,
      estado: nuevoEstado,
      motivoBaja: motivoLimpio,
      bajaRegistradaEn: now,
      bajaResponsable: responsableLimpio,
      actualizadoEn: now,
    });

    transaction.update(insumoRef, {
      stockActual: nuevoStockInsumo,
      actualizadoEn: now,
    });

    transaction.set(movRef, {
      negocioId: tenantId,
      insumoId: lote.insumoId,
      insumoNombre: lote.insumoNombre || insumoData.nombre || 'Insumo',
      cantidad: -cantidadBaja,
      costo: costoPerdidoCOP,
      ...(costoUnitario > 0 ? { costoUnitario } : {}),
      proveedor: `Baja Lote ${lote.codigoLote}: ${motivoLimpio}`,
      motivo: motivoLimpio,
      fecha: now,
      tipoMovimiento: 'merma',
      stockPrevio: stockPrevioInsumo,
      stockResultante: nuevoStockInsumo,
      notas:
        notasLimpias ||
        `Baja sanitaria del lote ${lote.codigoLote}${lote.fechaVencimiento ? ` (Venc: ${lote.fechaVencimiento})` : ''}`,
      responsable: responsableLimpio,
      unidadMedida: lote.unidadMedida || insumoData.unidad || 'unidades',
      origenMerma: 'bodega',
      estacionCocina: 'bodega_frio',
      loteInventarioId: lote.id,
      codigoLote: lote.codigoLote,
      ...(lote.fechaVencimiento ? { fechaVencimientoLote: lote.fechaVencimiento } : {}),
    } as Omit<EntradaInventario, 'id'>);

    resultado = {
      loteId: lote.id,
      codigoLote: lote.codigoLote,
      insumoId: lote.insumoId,
      insumoNombre: lote.insumoNombre || insumoData.nombre || 'Insumo',
      cantidadBaja,
      unidadMedida: lote.unidadMedida || insumoData.unidad || 'unidades',
      costoPerdidoCOP,
      movimientoKardexId: movRef.id,
    };
  });

  if (!resultado) {
    throw new Error('No se pudo completar la baja del lote a merma');
  }

  const resumen: ResultadoBajaLoteMerma = resultado;

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'merma_inventario',
    titulo: `Baja Sanitaria de Lote: ${resumen.insumoNombre} (${resumen.codigoLote})`,
    descripcion: `Baja de ${resumen.cantidadBaja} ${resumen.unidadMedida} por "${motivoLimpio}". Impacto P&L: ${formatCOP(resumen.costoPerdidoCOP)}.`,
    motivo: motivoLimpio,
    montoImpacto: resumen.costoPerdidoCOP,
    responsableNombre: responsableLimpio,
    responsableRol: input.responsableRol || 'admin',
    entidadTipo: 'inventario',
    referenciaId: resumen.movimientoKardexId,
    detallesForenses: {
      loteId: resumen.loteId,
      codigoLote: resumen.codigoLote,
      insumoId: resumen.insumoId,
      cantidadBaja: resumen.cantidadBaja,
      costoPerdidoCOP: resumen.costoPerdidoCOP,
    },
  });

  crearAlertaSilenciosa(tenantId, {
    modulo: 'inventario',
    tipo: 'baja_lote_vencido',
    titulo: `Baja de Lote Registrada: ${resumen.insumoNombre}`,
    mensaje: `Se dio de baja el lote ${resumen.codigoLote} (-${resumen.cantidadBaja} ${resumen.unidadMedida}). Pérdida: ${formatCOP(resumen.costoPerdidoCOP)}.`,
    urgencia: resumen.costoPerdidoCOP >= 50000 ? 'critica' : 'alta',
    enlace: '/inventario?tab=lotes',
    origen: 'automatico',
    creadaPor: responsableLimpio,
  });

  return resumen;
}

/**
 * Alterna el estado de cuarentena de un lote con saldo disponible (lo excluye temporalmente de PEPS).
 */
export async function cambiarCuarentenaLote(
  negocioId: string,
  loteId: string,
  enCuarentena: boolean,
  motivo?: string,
  responsable?: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const cleanLoteId = (loteId || '').trim();
  if (!cleanLoteId) {
    throw new Error('ID de lote requerido');
  }

  const loteRef = doc(db, COLECCION_LOTES_INVENTARIO, cleanLoteId);
  const responsableLimpio = (responsable || 'Administrador').trim() || 'Administrador';
  const motivoLimpio = (motivo || (enCuarentena ? 'Revisión sanitaria preventiva' : 'Liberado de cuarentena')).trim();
  let loteInfo: { codigoLote: string; insumoNombre: string } | null = null;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(loteRef);
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error('Lote no encontrado en el negocio activo');
    }

    const data = snap.data() as Omit<LoteInventario, 'id'>;
    if ((data.cantidadDisponible || 0) <= 0) {
      throw new Error('No puedes cambiar a cuarentena un lote sin saldo disponible');
    }
    if (data.estado === 'vencido_baja' || data.estado === 'agotado') {
      throw new Error('No se puede cambiar el estado de un lote agotado o dado de baja');
    }

    loteInfo = {
      codigoLote: data.codigoLote,
      insumoNombre: data.insumoNombre,
    };

    transaction.update(loteRef, {
      estado: enCuarentena ? 'cuarentena' : 'activo',
      ...(motivoLimpio ? { notas: motivoLimpio } : {}),
      actualizadoEn: Timestamp.now(),
    });
  });

  if (loteInfo) {
    const info: { codigoLote: string; insumoNombre: string } = loteInfo;
    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'ajuste_inventario',
      severidad: enCuarentena ? 'media' : 'informativa',
      titulo: enCuarentena
        ? `Lote en Cuarentena: ${info.insumoNombre} (${info.codigoLote})`
        : `Lote Liberado a Operación: ${info.insumoNombre} (${info.codigoLote})`,
      descripcion: motivoLimpio,
      motivo: enCuarentena ? 'cuarentena_sanitaria' : 'liberacion_cuarentena',
      montoImpacto: 0,
      responsableNombre: responsableLimpio,
      responsableRol: 'admin',
      entidadTipo: 'inventario',
      referenciaId: cleanLoteId,
    });
  }
}

/**
 * Sincroniza en Firestore (`notificaciones_operativas`) las alertas sanitarias de lotes,
 * deduplicando por `metadata.claveSanitaria` diaria.
 */
export async function sincronizarAlertasSanitariasLotes(
  negocioId: string,
  lotes: LoteInventario[],
  notificacionesExistentes: NotificacionOperativa[] = [],
  ahora: Date = new Date()
): Promise<{ emitidas: number }> {
  const tenantId = requireTenantId(negocioId);
  const alertas = construirAlertasSanitariasLotes(lotes, ahora);
  if (alertas.length === 0) {
    return { emitidas: 0 };
  }

  const clavesExistentes = new Set<string>();
  for (const notif of notificacionesExistentes) {
    const clave = notif.metadata?.claveSanitaria;
    if (typeof clave === 'string' && clave.trim()) {
      clavesExistentes.add(clave.trim());
    }
  }

  let emitidas = 0;
  for (const alerta of alertas) {
    const clave =
      typeof alerta.metadata?.claveSanitaria === 'string'
        ? alerta.metadata.claveSanitaria.trim()
        : '';
    if (clave && clavesExistentes.has(clave)) {
      continue;
    }
    await crearNotificacion(tenantId, alerta);
    if (clave) {
      clavesExistentes.add(clave);
    }
    emitidas += 1;
  }

  return { emitidas };
}
