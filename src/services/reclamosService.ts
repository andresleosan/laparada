import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import { emitirBonoPrepago } from '@/services/bonosService';
import { registrarMovimientoCaja } from '@/services/movimientosCajaService';
import { crearDomicilioDesdePos } from '@/services/domiciliosService';
import type { ItemVenta } from '@/types';
import type {
  ActualizarEstadoReclamoInput,
  ReclamoPqrs,
  RegistrarReclamoInput,
  ResolverReclamoInput,
} from '@/types/reclamo';
import { formatCOP } from '@/utils/formatCOP';
import { esFechaIsoValida, obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';
import {
  CAUSA_RAIZ_META,
  generarCodigoRadicadoReclamo,
  obtenerSlaObjetivoMin,
  parseFechaReclamo,
  sanitizarMontoReclamoCOP,
  TIPO_RESOLUCION_META,
} from '@/utils/reclamosUtils';

export const COLECCION_RECLAMOS_PQRS = 'reclamos_pqrs';

async function assertReclamoTenant(
  reclamoId: string,
  negocioId: string
): Promise<ReclamoPqrs> {
  const tenantId = requireTenantId(negocioId);
  if (!reclamoId.trim()) {
    throw new Error('Identificador de reclamo requerido');
  }
  const snap = await getDoc(doc(db, COLECCION_RECLAMOS_PQRS, reclamoId));
  if (!snap.exists()) {
    throw new Error('El reclamo o PQRS indicado no existe');
  }
  const data = snap.data() as Omit<ReclamoPqrs, 'id'>;
  if (data.negocioId !== tenantId) {
    throw new Error('Acceso denegado: el reclamo pertenece a otro negocio');
  }
  return {
    ...data,
    id: snap.id,
  };
}

/**
 * Consulta el historial reciente de reclamos, PQRS y garantías del negocio activo.
 */
export async function getReclamosPqrs(
  negocioId: string,
  maxLimite = 250
): Promise<ReclamoPqrs[]> {
  const tenantId = requireTenantId(negocioId);
  if (!db) return [];

  const q = query(
    collection(db, COLECCION_RECLAMOS_PQRS),
    where('negocioId', '==', tenantId),
    orderBy('creadoEn', 'desc'),
    limit(maxLimite)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (docSnap) =>
      ({
        ...docSnap.data(),
        id: docSnap.id,
      }) as ReclamoPqrs
  );
}

/**
 * Suscripción en tiempo real a los reclamos y PQRS del negocio activo.
 */
export function onReclamosPqrsChange(
  negocioId: string,
  callback: (reclamos: ReclamoPqrs[]) => void,
  onError?: (error: Error) => void,
  maxLimite = 250
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!db) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLECCION_RECLAMOS_PQRS),
    where('negocioId', '==', tenantId),
    orderBy('creadoEn', 'desc'),
    limit(maxLimite)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as ReclamoPqrs
      );
      callback(lista);
    },
    (error) => {
      console.error('Error escuchando reclamos_pqrs:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Radica un nuevo reclamo, PQRS o garantía de pedido acotado por `negocioId`.
 */
export async function registrarReclamoPqrs(
  input: RegistrarReclamoInput,
  existentesCount = 0
): Promise<ReclamoPqrs> {
  const tenantId = requireTenantId(input.negocioId);
  const clienteNombre = (input.clienteNombre || '').trim();
  if (clienteNombre.length < 2) {
    throw new Error('El nombre del cliente debe tener al menos 2 caracteres');
  }
  const descripcion = (input.descripcion || '').trim();
  if (descripcion.length < 5) {
    throw new Error('Describe el incidente o solicitud (mínimo 5 caracteres)');
  }
  const registradoPor = (input.registradoPor || '').trim() || 'Operador Turno';
  if (registradoPor.length < 2) {
    throw new Error('Indica el nombre de quien radica el reclamo');
  }

  const fechaIso =
    input.fechaIso && esFechaIsoValida(input.fechaIso)
      ? input.fechaIso.trim()
      : obtenerFechaIsoColombia();
  const codigoRadicado = generarCodigoRadicadoReclamo(fechaIso, existentesCount);
  const slaDefault = obtenerSlaObjetivoMin(input.prioridad);
  const slaObjetivoMin =
    typeof input.slaObjetivoMin === 'number' &&
    Number.isFinite(input.slaObjetivoMin) &&
    input.slaObjetivoMin >= 1 &&
    input.slaObjetivoMin <= 43200
      ? Math.round(input.slaObjetivoMin)
      : slaDefault;
  const montoPedidoCOP = sanitizarMontoReclamoCOP(input.montoPedidoCOP);

  const ahora = Timestamp.now();
  const payload: Omit<ReclamoPqrs, 'id'> = {
    negocioId: tenantId,
    codigoRadicado,
    tipo: input.tipo,
    canal: input.canal,
    causaRaiz: input.causaRaiz,
    prioridad: input.prioridad,
    estado: 'abierto',
    slaObjetivoMin,
    clienteNombre: clienteNombre.slice(0, 160),
    ...(input.clienteTelefono?.trim()
      ? { clienteTelefono: input.clienteTelefono.trim().slice(0, 40) }
      : {}),
    ...(input.direccionEntrega?.trim()
      ? { direccionEntrega: input.direccionEntrega.trim().slice(0, 250) }
      : {}),
    ...(input.barrioEntrega?.trim()
      ? { barrioEntrega: input.barrioEntrega.trim().slice(0, 120) }
      : {}),
    ...(input.domicilioId?.trim()
      ? { domicilioId: input.domicilioId.trim().slice(0, 128) }
      : {}),
    ...(input.ventaId?.trim() ? { ventaId: input.ventaId.trim().slice(0, 128) } : {}),
    ...(input.mesaNombre?.trim()
      ? { mesaNombre: input.mesaNombre.trim().slice(0, 80) }
      : {}),
    ...(input.repartidorNombre?.trim()
      ? { repartidorNombre: input.repartidorNombre.trim().slice(0, 120) }
      : {}),
    ...(Array.isArray(input.itemsAfectados) && input.itemsAfectados.length > 0
      ? { itemsAfectados: input.itemsAfectados.slice(0, 100) }
      : {}),
    montoPedidoCOP,
    descripcion: descripcion.slice(0, 1500),
    fechaIso,
    creadoEn: ahora,
    actualizadoEn: ahora,
    registradoPor: registradoPor.slice(0, 120),
    ...(input.registradoRol?.trim()
      ? { registradoRol: input.registradoRol.trim().slice(0, 40) }
      : {}),
  };

  const docRef = await addDoc(collection(db, COLECCION_RECLAMOS_PQRS), payload);
  const causaLabel = CAUSA_RAIZ_META[input.causaRaiz]?.shortLabel || input.causaRaiz;

  crearAlertaSilenciosa(tenantId, {
    modulo: 'pedidos',
    tipo: 'reclamo_pqrs_nuevo',
    titulo: `PQRS ${codigoRadicado} · ${payload.clienteNombre}`,
    mensaje: `${causaLabel} (${input.canal}): ${payload.descripcion.slice(0, 140)}`,
    urgencia:
      input.prioridad === 'critica'
        ? 'critica'
        : input.prioridad === 'alta'
        ? 'alta'
        : 'media',
    enlace: '/reclamos',
    origen: 'automatico',
    creadaPor: payload.registradoPor,
    metadata: {
      reclamoId: docRef.id,
      codigoRadicado,
      prioridad: input.prioridad,
      canal: input.canal,
    },
  });

  if (input.prioridad === 'critica') {
    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'cortesia_descuento',
      severidad: 'alta',
      titulo: `Reclamo Crítico ${codigoRadicado} · ${payload.clienteNombre}`,
      descripcion: `${causaLabel} · Pedido ${formatCOP(montoPedidoCOP)} · ${payload.descripcion.slice(0, 160)}`,
      montoImpacto: montoPedidoCOP,
      responsableNombre: payload.registradoPor,
      responsableRol: input.registradoRol || 'cajero',
      entidadTipo: 'venta',
      referenciaId: docRef.id,
      detallesForenses: {
        codigoRadicado,
        canal: input.canal,
        causaRaiz: input.causaRaiz,
        slaObjetivoMin,
      },
    });
  }

  return {
    ...payload,
    id: docRef.id,
  };
}

/**
 * Actualiza estado, prioridad o causa raíz de un reclamo activo antes del cierre.
 */
export async function actualizarEstadoReclamoPqrs(
  negocioId: string,
  reclamoId: string,
  updates: ActualizarEstadoReclamoInput
): Promise<void> {
  const actual = await assertReclamoTenant(reclamoId, negocioId);
  const payload: Record<string, unknown> = {
    actualizadoEn: Timestamp.now(),
  };

  if (updates.estado) {
    payload.estado = updates.estado;
  }
  if (updates.prioridad) {
    payload.prioridad = updates.prioridad;
    if (updates.slaObjetivoMin === undefined) {
      payload.slaObjetivoMin = obtenerSlaObjetivoMin(updates.prioridad);
    }
  }
  if (
    typeof updates.slaObjetivoMin === 'number' &&
    Number.isFinite(updates.slaObjetivoMin) &&
    updates.slaObjetivoMin >= 1 &&
    updates.slaObjetivoMin <= 43200
  ) {
    payload.slaObjetivoMin = Math.round(updates.slaObjetivoMin);
  }
  if (updates.causaRaiz) {
    payload.causaRaiz = updates.causaRaiz;
  }

  await updateDoc(doc(db, COLECCION_RECLAMOS_PQRS, actual.id), payload);
}

/**
 * Resuelve formalmente un reclamo ejecutando la acción offline seleccionada:
 * - `bono_cortesia`: emite vale de consumo offline en `/bonos`.
 * - `devolucion_caja`: registra egreso en Caja Menor en `/caja`.
 * - `reenvio_domicilio`: crea nueva comanda de garantía a $0 en `/domicilios`.
 * - `reposicion_salon` / `disculpa_seguimiento`: registra cierre trazable y auditoría.
 */
export async function resolverReclamoPqrs(
  negocioId: string,
  reclamoId: string,
  input: ResolverReclamoInput
): Promise<ReclamoPqrs> {
  const actual = await assertReclamoTenant(reclamoId, negocioId);
  if (actual.estado === 'resuelto' || actual.estado === 'cerrado') {
    throw new Error('Este reclamo ya fue resuelto anteriormente');
  }

  const resolucionNotas = (input.resolucionNotas || '').trim();
  if (resolucionNotas.length < 3) {
    throw new Error('Describe las notas de resolución (mínimo 3 caracteres)');
  }
  const resueltoPor = (input.resueltoPor || '').trim() || 'Administrador';
  if (resueltoPor.length < 2) {
    throw new Error('Indica quién resuelve el reclamo');
  }

  const montoComp = sanitizarMontoReclamoCOP(input.montoCompensacionCOP ?? 0);
  if (
    (input.tipoResolucion === 'bono_cortesia' ||
      input.tipoResolucion === 'devolucion_caja') &&
    montoComp <= 0
  ) {
    throw new Error(
      'Debes indicar un monto de compensación mayor a $0 para emitir bono o devolución en caja'
    );
  }

  let bonoCortesiaId: string | undefined;
  let bonoCortesiaCodigo: string | undefined;
  let movimientoCajaId: string | undefined;
  let movimientoCajaCodigo: string | undefined;
  let reenvioDomicilioId: string | undefined;

  if (input.tipoResolucion === 'bono_cortesia') {
    const resBono = await emitirBonoPrepago(actual.negocioId, {
      tipo: 'vale_consumo',
      titularNombre: actual.clienteNombre,
      titularTelefono: actual.clienteTelefono,
      montoInicial: montoComp,
      metodoPago: 'efectivo',
      vigenciaDias: input.vigenciaBonoDias ?? 30,
      recargable: false,
      mensajeRegalo: `Cortesía por garantía ${actual.codigoRadicado}`,
      notas: `Emitido por reclamo ${actual.codigoRadicado}: ${resolucionNotas.slice(0, 140)}`,
      responsableNombre: resueltoPor,
    });
    bonoCortesiaId = resBono.bono.id;
    bonoCortesiaCodigo = resBono.bono.codigo;
  } else if (input.tipoResolucion === 'devolucion_caja') {
    const mov = await registrarMovimientoCaja({
      negocioId: actual.negocioId,
      tipo: 'egreso_caja_menor',
      monto: montoComp,
      motivo: `Devolución PQRS ${actual.codigoRadicado} · ${actual.clienteNombre}`,
      referencia: actual.codigoRadicado,
      responsableNombre: resueltoPor,
      responsableRol: input.resueltoRol || 'cajero',
      autorizadoPor: input.autorizadoPor || resueltoPor,
      notas: resolucionNotas.slice(0, 240),
    });
    movimientoCajaId = mov.id;
    movimientoCajaCodigo = mov.codigoComprobante;
  } else if (input.tipoResolucion === 'reenvio_domicilio') {
    const direccionFinal = (input.direccionReenvio || actual.direccionEntrega || '').trim();
    if (direccionFinal.length < 4) {
      throw new Error(
        'Indica la dirección de entrega para despachar el reenvío de garantía'
      );
    }
    const barrioFinal = (input.barrioReenvio || actual.barrioEntrega || 'Por confirmar').trim();
    const itemsBase: ItemVenta[] =
      input.itemsReenvio && input.itemsReenvio.length > 0
        ? input.itemsReenvio.map((it) => ({ ...it, precioUnitario: 0, subtotal: 0 }))
        : actual.itemsAfectados && actual.itemsAfectados.length > 0
        ? actual.itemsAfectados.map((it) => ({ ...it, precioUnitario: 0, subtotal: 0 }))
        : [
            {
              tipo: 'producto',
              referenciaId: `garantia-${actual.codigoRadicado}`,
              nombre: `Reposición Garantía ${actual.codigoRadicado}`,
              cantidad: 1,
              precioUnitario: 0,
              subtotal: 0,
              notas: resolucionNotas.slice(0, 120),
            },
          ];

    reenvioDomicilioId = await crearDomicilioDesdePos(
      actual.negocioId,
      itemsBase,
      0,
      'efectivo',
      actual.clienteNombre,
      '',
      actual.clienteTelefono || '',
      direccionFinal,
      barrioFinal,
      {
        costoEnvio: 0,
        notas: `[REENVÍO GARANTÍA ${actual.codigoRadicado}] ${resolucionNotas.slice(0, 180)}`,
      }
    );
  }

  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const creadoDate = parseFechaReclamo(actual.creadoEn);
  const tiempoResolucionMin = creadoDate
    ? Math.max(0, Math.round((ahoraDate.getTime() - creadoDate.getTime()) / 60000))
    : 0;
  const cumplioSla = tiempoResolucionMin <= Math.max(1, actual.slaObjetivoMin || 60);

  const updates: Record<string, unknown> = {
    estado: 'resuelto',
    tipoResolucion: input.tipoResolucion,
    montoCompensacionCOP: montoComp,
    resolucionNotas: resolucionNotas.slice(0, 1500),
    resueltoEn: ahora,
    resueltoPor: resueltoPor.slice(0, 120),
    tiempoResolucionMin,
    cumplioSla,
    actualizadoEn: ahora,
    ...(bonoCortesiaId ? { bonoCortesiaId } : {}),
    ...(bonoCortesiaCodigo ? { bonoCortesiaCodigo } : {}),
    ...(movimientoCajaId ? { movimientoCajaId } : {}),
    ...(movimientoCajaCodigo ? { movimientoCajaCodigo } : {}),
    ...(reenvioDomicilioId ? { reenvioDomicilioId } : {}),
  };

  await updateDoc(doc(db, COLECCION_RECLAMOS_PQRS, actual.id), updates);

  if (
    montoComp > 0 ||
    input.tipoResolucion === 'reenvio_domicilio' ||
    input.tipoResolucion === 'reposicion_salon'
  ) {
    const resLabel = TIPO_RESOLUCION_META[input.tipoResolucion]?.shortLabel || input.tipoResolucion;
    registrarEventoAuditoriaSilencioso({
      negocioId: actual.negocioId,
      categoria:
        input.tipoResolucion === 'devolucion_caja' ? 'movimiento_caja' : 'cortesia_descuento',
      severidad: montoComp >= 50000 ? 'alta' : 'media',
      titulo: `Resolución PQRS ${actual.codigoRadicado} (${resLabel})`,
      descripcion: `${actual.clienteNombre} · ${resolucionNotas.slice(0, 160)}${
        montoComp > 0 ? ` · Compensación: ${formatCOP(montoComp)}` : ''
      }.`,
      montoImpacto: montoComp,
      responsableNombre: resueltoPor,
      responsableRol: input.resueltoRol || 'cajero',
      entidadTipo: input.tipoResolucion === 'devolucion_caja' ? 'caja' : 'venta',
      referenciaId: actual.id,
      detallesForenses: {
        codigoRadicado: actual.codigoRadicado,
        tipoResolucion: input.tipoResolucion,
        cumplioSla,
        tiempoResolucionMin,
        ...(bonoCortesiaCodigo ? { bonoCortesiaCodigo } : {}),
        ...(movimientoCajaCodigo ? { movimientoCajaCodigo } : {}),
        ...(reenvioDomicilioId ? { reenvioDomicilioId } : {}),
      },
    });
  }

  return {
    ...actual,
    estado: 'resuelto',
    tipoResolucion: input.tipoResolucion,
    montoCompensacionCOP: montoComp,
    resolucionNotas: resolucionNotas.slice(0, 1500),
    resueltoEn: ahora,
    resueltoPor: resueltoPor.slice(0, 120),
    tiempoResolucionMin,
    cumplioSla,
    actualizadoEn: ahora,
    ...(bonoCortesiaId ? { bonoCortesiaId } : {}),
    ...(bonoCortesiaCodigo ? { bonoCortesiaCodigo } : {}),
    ...(movimientoCajaId ? { movimientoCajaId } : {}),
    ...(movimientoCajaCodigo ? { movimientoCajaCodigo } : {}),
    ...(reenvioDomicilioId ? { reenvioDomicilioId } : {}),
  };
}

/**
 * Registra marca temporal cuando se abre el envío de respuesta por WhatsApp al cliente.
 */
export async function marcarWhatsAppReclamoEnviado(
  negocioId: string,
  reclamoId: string
): Promise<void> {
  const actual = await assertReclamoTenant(reclamoId, negocioId);
  const ahora = Timestamp.now();
  await updateDoc(doc(db, COLECCION_RECLAMOS_PQRS, actual.id), {
    whatsappEnviadoEn: ahora,
    actualizadoEn: ahora,
  });
}

/**
 * Elimina un reclamo del historial (uso exclusivo administrativo).
 */
export async function eliminarReclamoPqrs(
  negocioId: string,
  reclamoId: string
): Promise<void> {
  const actual = await assertReclamoTenant(reclamoId, negocioId);
  await deleteDoc(doc(db, COLECCION_RECLAMOS_PQRS, actual.id));
}
