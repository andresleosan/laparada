import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  BonoPrepago,
  CambiarEstadoBonoInput,
  Combo,
  CuentaMesa,
  EmitirBonoInput,
  EstadoBonoPrepago,
  ItemVenta,
  Mesa,
  MetodoPago,
  MovimientoBono,
  OrigenRedencionBono,
  Producto,
  RecargarBonoInput,
  RedimirBonoInput,
  TicketVentaData,
  TipoBonoPrepago,
} from '@/types';
import type { DatosFiscalesTicket } from '@/types/facturacion';
import {
  calcularFechaVencimientoBono,
  evaluarEstadoBono,
  evaluarRedencionBono,
  extraerCodigoDesdeQrOEntrada,
  generarCodigoComprobanteBono,
  generarCodigoUnicoBono,
  normalizarCodigoBono,
  parseFechaBono,
  sanitizarMontoBonoCOP,
} from '@/utils/bonosUtils';
import { normalizarTelefono } from '@/utils/clienteUtils';
import { calcularConsumoInsumos } from '@/utils/recetasEscandallo';
import { descontarStockInsumosPorVenta } from '@/services/inventarioService';
import { getCombos, getProductos } from '@/services/productosService';
import { registrarCompraCliente } from '@/services/clientesService';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';

const COL_BONOS = 'bonos_prepago';
const COL_MOVIMIENTOS = 'movimientos_bonos';

function mapBonoPrepagoDoc(id: string, data: Record<string, unknown>): BonoPrepago {
  const tipoRaw = data.tipo;
  const tipo: TipoBonoPrepago =
    tipoRaw === 'tarjeta_prepago' || tipoRaw === 'vale_consumo' ? tipoRaw : 'bono_regalo';

  const estadoRaw = data.estado;
  const estado: EstadoBonoPrepago =
    estadoRaw === 'agotado' || estadoRaw === 'bloqueado' || estadoRaw === 'anulado'
      ? estadoRaw
      : 'activo';

  const metodoPagoEmision: MetodoPago =
    data.metodoPagoEmision === 'transferencia' ? 'transferencia' : 'efectivo';

  return {
    negocioId: String(data.negocioId || ''),
    codigo: String(data.codigo || ''),
    tipo,
    titularNombre: String(data.titularNombre || 'Titular sin nombre'),
    titularTelefono:
      typeof data.titularTelefono === 'string' && data.titularTelefono
        ? data.titularTelefono
        : undefined,
    compradorNombre:
      typeof data.compradorNombre === 'string' && data.compradorNombre
        ? data.compradorNombre
        : undefined,
    clienteId:
      typeof data.clienteId === 'string' && data.clienteId ? data.clienteId : undefined,
    mensajeRegalo:
      typeof data.mensajeRegalo === 'string' && data.mensajeRegalo
        ? data.mensajeRegalo
        : undefined,
    montoInicial: sanitizarMontoBonoCOP(Number(data.montoInicial || 0)),
    saldoActual: sanitizarMontoBonoCOP(Number(data.saldoActual || 0)),
    totalCargadoHistorico: sanitizarMontoBonoCOP(Number(data.totalCargadoHistorico || 0)),
    totalRedimidoHistorico: sanitizarMontoBonoCOP(Number(data.totalRedimidoHistorico || 0)),
    cantidadRecargas: Number.isFinite(Number(data.cantidadRecargas))
      ? Math.max(0, Math.round(Number(data.cantidadRecargas)))
      : 0,
    cantidadRedenciones: Number.isFinite(Number(data.cantidadRedenciones))
      ? Math.max(0, Math.round(Number(data.cantidadRedenciones)))
      : 0,
    recargable: data.recargable !== false,
    estado,
    motivoBloqueo:
      typeof data.motivoBloqueo === 'string' && data.motivoBloqueo
        ? data.motivoBloqueo
        : undefined,
    metodoPagoEmision,
    referenciaTransferenciaEmision:
      typeof data.referenciaTransferenciaEmision === 'string' &&
      data.referenciaTransferenciaEmision
        ? data.referenciaTransferenciaEmision
        : undefined,
    fechaEmision: parseFechaBono(data.fechaEmision) || new Date(),
    fechaVencimiento: parseFechaBono(data.fechaVencimiento),
    ultimaRecargaEn: parseFechaBono(data.ultimaRecargaEn) || undefined,
    ultimaRedencionEn: parseFechaBono(data.ultimaRedencionEn) || undefined,
    notas: typeof data.notas === 'string' && data.notas ? data.notas : undefined,
    creadoPor:
      typeof data.creadoPor === 'string' && data.creadoPor ? data.creadoPor : undefined,
    creadoEn: parseFechaBono(data.creadoEn) || new Date(),
    actualizadoEn: parseFechaBono(data.actualizadoEn) || new Date(),
    id,
  };
}

function mapMovimientoBonoDoc(id: string, data: Record<string, unknown>): MovimientoBono {
  return {
    negocioId: String(data.negocioId || ''),
    bonoId: String(data.bonoId || ''),
    bonoCodigo: String(data.bonoCodigo || ''),
    titularNombre: String(data.titularNombre || ''),
    tipo: (data.tipo as MovimientoBono['tipo']) || 'emision',
    monto: sanitizarMontoBonoCOP(Number(data.monto || 0)),
    saldoPrevio: sanitizarMontoBonoCOP(Number(data.saldoPrevio || 0)),
    saldoResultante: sanitizarMontoBonoCOP(Number(data.saldoResultante || 0)),
    codigoComprobante: String(
      data.codigoComprobante || `BON-${id.slice(-6).toUpperCase()}`
    ),
    metodoPago:
      data.metodoPago === 'efectivo' || data.metodoPago === 'transferencia'
        ? data.metodoPago
        : undefined,
    referenciaTransferencia:
      typeof data.referenciaTransferencia === 'string' && data.referenciaTransferencia
        ? data.referenciaTransferencia
        : undefined,
    origen: data.origen as OrigenRedencionBono | undefined,
    ventaId: typeof data.ventaId === 'string' && data.ventaId ? data.ventaId : undefined,
    mesaNombre:
      typeof data.mesaNombre === 'string' && data.mesaNombre ? data.mesaNombre : undefined,
    cuentaMesaId:
      typeof data.cuentaMesaId === 'string' && data.cuentaMesaId
        ? data.cuentaMesaId
        : undefined,
    items: Array.isArray(data.items) ? (data.items as ItemVenta[]) : undefined,
    fecha: parseFechaBono(data.fecha) || new Date(),
    notas: typeof data.notas === 'string' && data.notas ? data.notas : undefined,
    responsableNombre:
      typeof data.responsableNombre === 'string' && data.responsableNombre
        ? data.responsableNombre
        : undefined,
    id,
  };
}

/**
 * Suscripción en tiempo real a todos los bonos y tarjetas prepago del negocio activo.
 */
export function suscribirBonosPrepago(
  negocioId: string,
  onData: (bonos: BonoPrepago[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const colRef = collection(db, COL_BONOS);
  const q = query(colRef, where('negocioId', '==', tenantId), orderBy('creadoEn', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const bonos = snapshot.docs.map((docSnap) =>
        mapBonoPrepagoDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      onData(bonos);
    },
    (err) => {
      console.warn('Fallback en suscripción de bonos:', err);
      const qFallback = query(colRef, where('negocioId', '==', tenantId));
      onSnapshot(
        qFallback,
        (snap) => {
          const bonos = snap.docs
            .map((docSnap) =>
              mapBonoPrepagoDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
            )
            .sort((a, b) => {
              const fa = parseFechaBono(a.creadoEn)?.getTime() || 0;
              const fb = parseFechaBono(b.creadoEn)?.getTime() || 0;
              return fb - fa;
            });
          onData(bonos);
        },
        (fallbackErr) => {
          onError?.(
            fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr))
          );
        }
      );
    }
  );
}

/**
 * Suscripción en tiempo real al libro de movimientos de bonos del negocio activo.
 */
export function suscribirMovimientosBonos(
  negocioId: string,
  onData: (movimientos: MovimientoBono[]) => void,
  onError?: (error: Error) => void,
  opciones?: { limite?: number }
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const maxDocs = opciones?.limite ?? 200;
  const colRef = collection(db, COL_MOVIMIENTOS);
  const q = query(
    colRef,
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxDocs)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const movs = snapshot.docs.map((docSnap) =>
        mapMovimientoBonoDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      onData(movs);
    },
    (err) => {
      console.warn('Fallback en suscripción de movimientos de bonos:', err);
      const qFallback = query(colRef, where('negocioId', '==', tenantId), limit(maxDocs));
      onSnapshot(
        qFallback,
        (snap) => {
          const movs = snap.docs
            .map((docSnap) =>
              mapMovimientoBonoDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
            )
            .sort((a, b) => {
              const fa = parseFechaBono(a.fecha)?.getTime() || 0;
              const fb = parseFechaBono(b.fecha)?.getTime() || 0;
              return fb - fa;
            });
          onData(movs);
        },
        (fallbackErr) => {
          onError?.(
            fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr))
          );
        }
      );
    }
  );
}

/**
 * Busca un bono activo o registrado por código o contenido QR escaneado, acotado al tenant.
 */
export async function buscarBonoPorCodigo(
  negocioId: string,
  codigoOQr: string
): Promise<BonoPrepago | null> {
  const tenantId = requireTenantId(negocioId);
  const codigo = extraerCodigoDesdeQrOEntrada(codigoOQr);
  if (!codigo) return null;

  const docId = `bono_${tenantId}_${codigo}`;
  const directSnap = await getDoc(doc(db, COL_BONOS, docId));
  if (directSnap.exists() && directSnap.data()?.negocioId === tenantId) {
    return mapBonoPrepagoDoc(directSnap.id, directSnap.data() as Record<string, unknown>);
  }

  const q = query(
    collection(db, COL_BONOS),
    where('negocioId', '==', tenantId),
    where('codigo', '==', codigo),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return mapBonoPrepagoDoc(first.id, first.data() as Record<string, unknown>);
}

/**
 * Emite un nuevo bono de regalo, tarjeta prepago o vale de consumo de forma transaccional (100% offline).
 */
export async function emitirBonoPrepago(
  negocioId: string,
  input: EmitirBonoInput
): Promise<{ bono: BonoPrepago; movimiento: MovimientoBono }> {
  const tenantId = requireTenantId(negocioId);
  const titularNombre = input.titularNombre.trim();
  const montoInicial = sanitizarMontoBonoCOP(input.montoInicial);

  if (!titularNombre) {
    throw new Error('El nombre del titular o beneficiario es obligatorio.');
  }
  if (montoInicial <= 0) {
    throw new Error('El monto inicial del bono debe ser mayor a $0.');
  }
  if (input.metodoPago !== 'efectivo' && input.metodoPago !== 'transferencia') {
    throw new Error('Método de pago no permitido. Solo se admite efectivo o transferencia.');
  }

  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const codigo = input.codigoPersonalizado?.trim()
    ? normalizarCodigoBono(input.codigoPersonalizado)
    : generarCodigoUnicoBono(input.tipo, ahoraDate);

  if (codigo.length < 4 || codigo.length > 40) {
    throw new Error('El código del bono debe tener entre 4 y 40 caracteres alfanuméricos.');
  }

  const bonoId = `bono_${tenantId}_${codigo}`;
  const bonoRef = doc(db, COL_BONOS, bonoId);
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const codigoComprobante = generarCodigoComprobanteBono('emision', ahoraDate);
  const fechaVencDate = calcularFechaVencimientoBono(ahoraDate, input.vigenciaDias);
  const fechaVencTs = fechaVencDate ? Timestamp.fromDate(fechaVencDate) : null;
  const telefonoNorm = input.titularTelefono
    ? normalizarTelefono(input.titularTelefono) || input.titularTelefono.trim()
    : '';
  const recargable = input.recargable !== false;

  const resultado = await runTransaction(db, async (tx) => {
    const existente = await tx.get(bonoRef);
    if (existente.exists()) {
      throw new Error(`Ya existe un bono registrado con el código ${codigo}.`);
    }

    const bonoData: Record<string, unknown> = {
      negocioId: tenantId,
      codigo,
      tipo: input.tipo,
      titularNombre,
      ...(telefonoNorm ? { titularTelefono: telefonoNorm } : {}),
      ...(input.compradorNombre?.trim()
        ? { compradorNombre: input.compradorNombre.trim() }
        : {}),
      ...(input.clienteId?.trim() ? { clienteId: input.clienteId.trim() } : {}),
      ...(input.mensajeRegalo?.trim()
        ? { mensajeRegalo: input.mensajeRegalo.trim() }
        : {}),
      montoInicial,
      saldoActual: montoInicial,
      totalCargadoHistorico: montoInicial,
      totalRedimidoHistorico: 0,
      cantidadRecargas: 0,
      cantidadRedenciones: 0,
      recargable,
      estado: 'activo',
      metodoPagoEmision: input.metodoPago,
      ...(input.referenciaTransferencia?.trim()
        ? { referenciaTransferenciaEmision: input.referenciaTransferencia.trim() }
        : {}),
      fechaEmision: ahora,
      fechaVencimiento: fechaVencTs,
      ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
      ...(input.responsableNombre?.trim()
        ? { creadoPor: input.responsableNombre.trim() }
        : {}),
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      bonoId,
      bonoCodigo: codigo,
      titularNombre,
      tipo: 'emision',
      monto: montoInicial,
      saldoPrevio: 0,
      saldoResultante: montoInicial,
      codigoComprobante,
      metodoPago: input.metodoPago,
      ...(input.referenciaTransferencia?.trim()
        ? { referenciaTransferencia: input.referenciaTransferencia.trim() }
        : {}),
      origen: 'manual',
      fecha: ahora,
      ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
      ...(input.responsableNombre?.trim()
        ? { responsableNombre: input.responsableNombre.trim() }
        : {}),
    };

    tx.set(bonoRef, bonoData);
    tx.set(movRef, movData);

    return {
      bono: mapBonoPrepagoDoc(bonoId, bonoData),
      movimiento: mapMovimientoBonoDoc(movRef.id, movData),
    };
  });

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'acceso_personal',
    severidad: 'informativa',
    titulo: `Emisión ${codigo} · ${titularNombre}`,
    descripcion: `Emitido por $${montoInicial.toLocaleString('es-CO')} en ${input.metodoPago}.`,
    montoImpacto: montoInicial,
    responsableNombre: input.responsableNombre || 'Cajero POS',
    responsableRol: 'cajero',
    entidadTipo: 'caja',
    referenciaId: resultado.bono.id,
  });

  return resultado;
}

/**
 * Recarga saldo en efectivo o transferencia offline a una tarjeta prepago o bono recargable.
 */
export async function recargarSaldoBono(
  negocioId: string,
  input: RecargarBonoInput
): Promise<{ bono: BonoPrepago; movimiento: MovimientoBono }> {
  const tenantId = requireTenantId(negocioId);
  const monto = sanitizarMontoBonoCOP(input.monto);
  if (monto <= 0) {
    throw new Error('El monto de la recarga debe ser mayor a $0.');
  }
  if (input.metodoPago !== 'efectivo' && input.metodoPago !== 'transferencia') {
    throw new Error('Método de pago no permitido. Solo se admite efectivo o transferencia.');
  }

  const bonoRef = doc(db, COL_BONOS, input.bonoId);
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const codigoComprobante = generarCodigoComprobanteBono('recarga', ahoraDate);

  const resultado = await runTransaction(db, async (tx) => {
    const snap = await tx.get(bonoRef);
    if (!snap.exists()) {
      throw new Error('El bono o tarjeta prepago no existe.');
    }
    const raw = snap.data() as Record<string, unknown>;
    if (raw.negocioId !== tenantId) {
      throw new Error('El bono no pertenece al negocio activo.');
    }

    const bonoActual = mapBonoPrepagoDoc(snap.id, raw);
    const evalEstado = evaluarEstadoBono(bonoActual, ahoraDate);
    if (!evalEstado.puedeRecargar) {
      throw new Error(
        evalEstado.motivoInhabilitacion ||
          'Este instrumento no permite recargas en su estado actual.'
      );
    }

    const saldoPrevio = bonoActual.saldoActual;
    const saldoResultante = saldoPrevio + monto;

    let nuevaFechaVencTs: Timestamp | null | undefined = undefined;
    let nuevaFechaVencDate: Date | null = parseFechaBono(bonoActual.fechaVencimiento);
    if (
      typeof input.extenderVigenciaDias === 'number' &&
      input.extenderVigenciaDias > 0
    ) {
      const baseDate =
        nuevaFechaVencDate && nuevaFechaVencDate.getTime() > ahoraDate.getTime()
          ? nuevaFechaVencDate
          : ahoraDate;
      nuevaFechaVencDate = calcularFechaVencimientoBono(
        baseDate,
        input.extenderVigenciaDias
      );
      nuevaFechaVencTs = nuevaFechaVencDate
        ? Timestamp.fromDate(nuevaFechaVencDate)
        : null;
    }

    const updates: Record<string, unknown> = {
      saldoActual: saldoResultante,
      estado: 'activo',
      totalCargadoHistorico: bonoActual.totalCargadoHistorico + monto,
      cantidadRecargas: bonoActual.cantidadRecargas + 1,
      ultimaRecargaEn: ahora,
      actualizadoEn: ahora,
      ...(nuevaFechaVencTs !== undefined ? { fechaVencimiento: nuevaFechaVencTs } : {}),
    };

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      bonoId: bonoActual.id,
      bonoCodigo: bonoActual.codigo,
      titularNombre: bonoActual.titularNombre,
      tipo: 'recarga',
      monto,
      saldoPrevio,
      saldoResultante,
      codigoComprobante,
      metodoPago: input.metodoPago,
      ...(input.referenciaTransferencia?.trim()
        ? { referenciaTransferencia: input.referenciaTransferencia.trim() }
        : {}),
      origen: 'manual',
      fecha: ahora,
      ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
      ...(input.responsableNombre?.trim()
        ? { responsableNombre: input.responsableNombre.trim() }
        : {}),
    };

    tx.update(bonoRef, updates);
    tx.set(movRef, movData);

    const bonoActualizado: BonoPrepago = {
      ...bonoActual,
      saldoActual: saldoResultante,
      estado: 'activo',
      totalCargadoHistorico: bonoActual.totalCargadoHistorico + monto,
      cantidadRecargas: bonoActual.cantidadRecargas + 1,
      ultimaRecargaEn: ahoraDate,
      actualizadoEn: ahoraDate,
      ...(nuevaFechaVencTs !== undefined ? { fechaVencimiento: nuevaFechaVencDate } : {}),
    };

    return {
      bono: bonoActualizado,
      movimiento: mapMovimientoBonoDoc(movRef.id, movData),
    };
  });

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'acceso_personal',
    severidad: 'informativa',
    titulo: `Recarga ${resultado.bono.codigo} · ${resultado.bono.titularNombre}`,
    descripcion: `Recarga de $${monto.toLocaleString('es-CO')} en ${input.metodoPago}. Nuevo saldo: $${resultado.bono.saldoActual.toLocaleString('es-CO')}.`,
    montoImpacto: monto,
    responsableNombre: input.responsableNombre || 'Cajero POS',
    responsableRol: 'cajero',
    entidadTipo: 'caja',
    referenciaId: resultado.movimiento.id,
  });

  return resultado;
}

/**
 * Redime parcial o totalmente el saldo de un bono de forma atómica.
 */
export async function redimirSaldoBono(
  negocioId: string,
  input: RedimirBonoInput
): Promise<{ bono: BonoPrepago; movimiento: MovimientoBono }> {
  const tenantId = requireTenantId(negocioId);
  const montoSolicitado = sanitizarMontoBonoCOP(input.montoARedimir);
  if (montoSolicitado <= 0) {
    throw new Error('El monto a redimir debe ser mayor a $0.');
  }

  const bonoRef = doc(db, COL_BONOS, input.bonoId);
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const codigoComprobante = generarCodigoComprobanteBono('redencion', ahoraDate);

  const resultado = await runTransaction(db, async (tx) => {
    const snap = await tx.get(bonoRef);
    if (!snap.exists()) {
      throw new Error('El bono seleccionado no existe.');
    }
    const raw = snap.data() as Record<string, unknown>;
    if (raw.negocioId !== tenantId) {
      throw new Error('El bono no pertenece al negocio activo.');
    }

    const bonoActual = mapBonoPrepagoDoc(snap.id, raw);
    const evalRed = evaluarRedencionBono(
      bonoActual,
      montoSolicitado,
      montoSolicitado,
      ahoraDate
    );
    if (!evalRed.valido) {
      throw new Error(evalRed.motivoRechazo || 'No es posible redimir el bono.');
    }

    const saldoPrevio = bonoActual.saldoActual;
    const saldoResultante = evalRed.saldoRestanteBono;
    const nuevoEstado: EstadoBonoPrepago = saldoResultante <= 0 ? 'agotado' : 'activo';

    tx.update(bonoRef, {
      saldoActual: saldoResultante,
      estado: nuevoEstado,
      totalRedimidoHistorico: bonoActual.totalRedimidoHistorico + evalRed.montoAplicable,
      cantidadRedenciones: bonoActual.cantidadRedenciones + 1,
      ultimaRedencionEn: ahora,
      actualizadoEn: ahora,
    });

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      bonoId: bonoActual.id,
      bonoCodigo: bonoActual.codigo,
      titularNombre: bonoActual.titularNombre,
      tipo: 'redencion',
      monto: evalRed.montoAplicable,
      saldoPrevio,
      saldoResultante,
      codigoComprobante,
      origen: input.origen,
      ...(input.ventaId ? { ventaId: input.ventaId } : {}),
      ...(input.mesaNombre ? { mesaNombre: input.mesaNombre } : {}),
      ...(input.cuentaMesaId ? { cuentaMesaId: input.cuentaMesaId } : {}),
      ...(input.items && input.items.length > 0 ? { items: input.items } : {}),
      fecha: ahora,
      ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
      ...(input.responsableNombre?.trim()
        ? { responsableNombre: input.responsableNombre.trim() }
        : {}),
    };

    tx.set(movRef, movData);

    return {
      bono: {
        ...bonoActual,
        saldoActual: saldoResultante,
        estado: nuevoEstado,
        totalRedimidoHistorico: bonoActual.totalRedimidoHistorico + evalRed.montoAplicable,
        cantidadRedenciones: bonoActual.cantidadRedenciones + 1,
        ultimaRedencionEn: ahoraDate,
        actualizadoEn: ahoraDate,
      },
      movimiento: mapMovimientoBonoDoc(movRef.id, movData),
    };
  });

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'acceso_personal',
    severidad: 'informativa',
    titulo: `Redención ${resultado.bono.codigo} · ${resultado.bono.titularNombre}`,
    descripcion: `Redimidos $${resultado.movimiento.monto.toLocaleString('es-CO')} en ${input.origen}. Saldo restante: $${resultado.bono.saldoActual.toLocaleString('es-CO')}.`,
    montoImpacto: resultado.movimiento.monto,
    responsableNombre: input.responsableNombre || 'Cajero POS',
    responsableRol: 'cajero',
    entidadTipo: 'venta',
    referenciaId: input.ventaId || resultado.movimiento.id,
  });

  return resultado;
}

export interface RegistrarVentaConBonoParams {
  bonoId: string;
  montoARedimir?: number;
  items: ItemVenta[];
  subtotal: number;
  descuento?: number;
  descuentoMotivo?: string;
  propina?: number;
  total: number;
  metodoPagoExcedente: MetodoPago;
  fotoTransferenciaPath?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  origen?: 'pos' | 'mesas';
  cuentaMesaId?: string;
  mesaNombre?: string;
  meseroId?: string;
  meseroNombre?: string;
  responsableNombre?: string;
  datosFiscales?: DatosFiscalesTicket & {
    consecutivoFiscal?: string;
    baseGravable?: number;
    valorImpuesto?: number;
    tarifaImpuesto?: number;
    tipoImpuesto?: 'inc' | 'iva' | 'ninguno';
    resolucionDian?: string;
  };
}

/**
 * Registra de forma 100% atómica en una sola transacción Firestore:
 * 1) Validación y descuento de saldo en `bonos_prepago/{bonoId}`
 * 2) Emisión del documento oficial en `ventas/{ventaId}`
 * 3) Registro inmutable en `movimientos_bonos/{movId}`
 */
export async function registrarVentaConBonoAtomica(
  negocioId: string,
  params: RegistrarVentaConBonoParams,
  catalogo?: { productos?: Producto[]; combos?: Combo[] }
): Promise<{
  ventaId: string;
  bono: BonoPrepago;
  movimiento: MovimientoBono;
  montoRedimido: number;
  excedentePagado: number;
}> {
  const tenantId = requireTenantId(negocioId);
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('No se puede registrar una venta sin ítems.');
  }
  const totalOrden = sanitizarMontoBonoCOP(params.total);
  if (totalOrden <= 0) {
    throw new Error('El total de la venta debe ser mayor a $0 para redimir un bono.');
  }
  if (
    params.metodoPagoExcedente !== 'efectivo' &&
    params.metodoPagoExcedente !== 'transferencia'
  ) {
    throw new Error('Método de pago de excedente no permitido.');
  }

  const bonoRef = doc(db, COL_BONOS, params.bonoId);
  const ventaRef = doc(collection(db, 'ventas'));
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const codigoComprobante = generarCodigoComprobanteBono('redencion', ahoraDate);

  const txResult = await runTransaction(db, async (tx) => {
    const bonoSnap = await tx.get(bonoRef);
    if (!bonoSnap.exists()) {
      throw new Error('El bono o tarjeta prepago seleccionada no existe.');
    }
    const rawBono = bonoSnap.data() as Record<string, unknown>;
    if (rawBono.negocioId !== tenantId) {
      throw new Error('El bono no pertenece al negocio activo.');
    }

    const bonoActual = mapBonoPrepagoDoc(bonoSnap.id, rawBono);
    const evalRed = evaluarRedencionBono(
      bonoActual,
      totalOrden,
      params.montoARedimir,
      ahoraDate
    );
    if (!evalRed.valido) {
      throw new Error(evalRed.motivoRechazo || 'No es posible aplicar el bono.');
    }

    const saldoPrevio = bonoActual.saldoActual;
    const saldoResultante = evalRed.saldoRestanteBono;
    const nuevoEstado: EstadoBonoPrepago = saldoResultante <= 0 ? 'agotado' : 'activo';

    const ventaData: Record<string, unknown> = {
      negocioId: tenantId,
      items: params.items,
      subtotal: sanitizarMontoBonoCOP(params.subtotal),
      total: totalOrden,
      metodoPago: params.metodoPagoExcedente,
      tipoEntrega: 'mostrador',
      origen: 'pos',
      fecha: ahora,
      bonoId: bonoActual.id,
      bonoCodigo: bonoActual.codigo,
      montoBonoRedimido: evalRed.montoAplicable,
      montoExcedentePagado: evalRed.excedentePorPagar,
      ...(typeof params.descuento === 'number' && params.descuento > 0
        ? { descuento: params.descuento }
        : {}),
      ...(params.descuentoMotivo ? { descuentoMotivo: params.descuentoMotivo } : {}),
      ...(typeof params.propina === 'number' && params.propina > 0
        ? { propina: params.propina }
        : {}),
      ...(params.fotoTransferenciaPath
        ? { fotoTransferenciaPath: params.fotoTransferenciaPath }
        : {}),
      ...(params.clienteNombre || bonoActual.titularNombre
        ? { clienteNombre: params.clienteNombre || bonoActual.titularNombre }
        : {}),
      ...(params.clienteTelefono || bonoActual.titularTelefono
        ? { clienteTelefono: params.clienteTelefono || bonoActual.titularTelefono }
        : {}),
      ...(params.cuentaMesaId ? { cuentaMesaId: params.cuentaMesaId } : {}),
      ...(params.mesaNombre ? { mesaNombre: params.mesaNombre } : {}),
      ...(params.meseroId ? { meseroId: params.meseroId } : {}),
      ...(params.meseroNombre ? { meseroNombre: params.meseroNombre } : {}),
      ...(params.datosFiscales?.consecutivoFiscal
        ? {
            consecutivoFiscal: params.datosFiscales.consecutivoFiscal,
            baseGravable: params.datosFiscales.baseGravable,
            valorImpuesto: params.datosFiscales.valorImpuesto,
            tarifaImpuesto: params.datosFiscales.tarifaImpuesto,
            tipoImpuesto: params.datosFiscales.tipoImpuesto,
            resolucionDian: params.datosFiscales.resolucionDian,
          }
        : {}),
    };

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      bonoId: bonoActual.id,
      bonoCodigo: bonoActual.codigo,
      titularNombre: bonoActual.titularNombre,
      tipo: 'redencion',
      monto: evalRed.montoAplicable,
      saldoPrevio,
      saldoResultante,
      codigoComprobante,
      origen: params.origen || 'pos',
      ventaId: ventaRef.id,
      ...(params.mesaNombre ? { mesaNombre: params.mesaNombre } : {}),
      ...(params.cuentaMesaId ? { cuentaMesaId: params.cuentaMesaId } : {}),
      items: params.items,
      fecha: ahora,
      notas:
        evalRed.excedentePorPagar > 0
          ? `Redención parcial. Excedente $${evalRed.excedentePorPagar.toLocaleString('es-CO')} en ${params.metodoPagoExcedente}.`
          : 'Cubierto 100% con saldo de bono/prepago.',
      ...(params.responsableNombre?.trim()
        ? { responsableNombre: params.responsableNombre.trim() }
        : {}),
    };

    tx.update(bonoRef, {
      saldoActual: saldoResultante,
      estado: nuevoEstado,
      totalRedimidoHistorico: bonoActual.totalRedimidoHistorico + evalRed.montoAplicable,
      cantidadRedenciones: bonoActual.cantidadRedenciones + 1,
      ultimaRedencionEn: ahora,
      actualizadoEn: ahora,
    });
    tx.set(ventaRef, ventaData);
    tx.set(movRef, movData);

    const bonoActualizado: BonoPrepago = {
      ...bonoActual,
      saldoActual: saldoResultante,
      estado: nuevoEstado,
      totalRedimidoHistorico: bonoActual.totalRedimidoHistorico + evalRed.montoAplicable,
      cantidadRedenciones: bonoActual.cantidadRedenciones + 1,
      ultimaRedencionEn: ahoraDate,
      actualizadoEn: ahoraDate,
    };

    return {
      ventaId: ventaRef.id,
      bono: bonoActualizado,
      movimiento: mapMovimientoBonoDoc(movRef.id, movData),
      montoRedimido: evalRed.montoAplicable,
      excedentePagado: evalRed.excedentePorPagar,
    };
  });

  // Deducción de inventario por escandallo (best-effort)
  (async () => {
    try {
      const prods = catalogo?.productos || (await getProductos(tenantId));
      const cmbs = catalogo?.combos || (await getCombos(tenantId));
      const consumos = calcularConsumoInsumos(params.items, prods, cmbs);
      if (consumos.length > 0) {
        await descontarStockInsumosPorVenta(
          tenantId,
          consumos,
          `Bono ${txResult.bono.codigo} · Venta #${txResult.ventaId.slice(-6)}`
        );
      }
    } catch (err) {
      console.warn('No se pudo descontar inventario al redimir bono:', err);
    }
  })();

  const telCliente = params.clienteTelefono || txResult.bono.titularTelefono;
  if (telCliente) {
    registrarCompraCliente(tenantId, {
      telefono: telCliente,
      nombre: params.clienteNombre || txResult.bono.titularNombre,
      monto: totalOrden,
      items: params.items,
      origen: 'pos',
    }).catch((err) => {
      console.warn('No se pudo actualizar historial de cliente al redimir bono:', err);
    });
  }

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'acceso_personal',
    severidad: 'informativa',
    titulo: `Venta con Bono ${txResult.bono.codigo} · #${txResult.ventaId.slice(-6).toUpperCase()}`,
    descripcion: `Redimidos $${txResult.montoRedimido.toLocaleString('es-CO')} (excedente $${txResult.excedentePagado.toLocaleString('es-CO')} en ${params.metodoPagoExcedente}).`,
    montoImpacto: txResult.montoRedimido,
    responsableNombre: params.responsableNombre || 'Cajero POS',
    responsableRol: 'cajero',
    entidadTipo: 'venta',
    referenciaId: txResult.ventaId,
  });

  return txResult;
}

/**
 * Cobra y finaliza la cuenta de una mesa de salón redimiendo parcial o totalmente un bono/tarjeta prepago.
 */
export async function cobrarMesaConBono(
  negocioId: string,
  params: {
    mesaId: string;
    cuentaId: string;
    bonoId: string;
    montoARedimir?: number;
    metodoPagoExcedente: MetodoPago;
    propina?: number;
    descuento?: number;
    descuentoMotivo?: string;
    montoRecibido?: number;
    responsableNombre?: string;
    negocioNombre?: string;
    negocioSlug?: string;
    negocioDireccion?: string;
    negocioTelefono?: string;
  },
  catalogo?: { productos?: Producto[]; combos?: Combo[] }
): Promise<TicketVentaData> {
  const tenantId = requireTenantId(negocioId);
  const mesaRef = doc(db, 'mesas', params.mesaId);
  const cuentaRef = doc(db, 'cuentas_mesas', params.cuentaId);

  const [mesaSnap, cuentaSnap] = await Promise.all([getDoc(mesaRef), getDoc(cuentaRef)]);
  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa no pertenece al negocio activo.');
  }
  if (!cuentaSnap.exists() || cuentaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La cuenta no pertenece al negocio activo.');
  }

  const mesa = mesaSnap.data() as Mesa;
  const cuenta = cuentaSnap.data() as CuentaMesa;
  if (!cuenta.items || cuenta.items.length === 0) {
    throw new Error('No se puede cobrar una cuenta de mesa vacía.');
  }

  const subtotalCobro =
    typeof cuenta.saldoPendiente === 'number' ? cuenta.saldoPendiente : cuenta.total;
  const descuentoSeguro =
    typeof params.descuento === 'number' && params.descuento > 0
      ? Math.min(subtotalCobro, params.descuento)
      : 0;
  const propinaSegura = Math.max(0, Math.round(params.propina || 0));
  const totalACobrar = Math.max(0, subtotalCobro - descuentoSeguro) + propinaSegura;

  const meseroNombre = cuenta.meseroNombre || cuenta.mesero || mesa.meseroNombre || mesa.mesero;
  const meseroId = cuenta.meseroId || mesa.meseroId;

  const res = await registrarVentaConBonoAtomica(
    tenantId,
    {
      bonoId: params.bonoId,
      montoARedimir: params.montoARedimir,
      items: cuenta.items,
      subtotal: subtotalCobro,
      descuento: descuentoSeguro > 0 ? descuentoSeguro : undefined,
      descuentoMotivo: params.descuentoMotivo,
      propina: propinaSegura > 0 ? propinaSegura : undefined,
      total: totalACobrar,
      metodoPagoExcedente: params.metodoPagoExcedente,
      clienteNombre: cuenta.clienteNombre,
      clienteTelefono: cuenta.clienteTelefono,
      origen: 'mesas',
      cuentaMesaId: params.cuentaId,
      mesaNombre: cuenta.mesaNombre,
      meseroId,
      meseroNombre,
      responsableNombre: params.responsableNombre,
    },
    catalogo
  );

  const ahora = Timestamp.now();

  if (Array.isArray(cuenta.rondas)) {
    for (const r of cuenta.rondas) {
      if (r.comandaId) {
        try {
          await updateDoc(doc(db, 'domicilios', r.comandaId), {
            estado: 'entregado',
            ventaId: res.ventaId,
            actualizadoEn: ahora,
          });
        } catch {
          // Ignorar si ya fue finalizada en KDS
        }
      }
    }
  }

  await Promise.all([
    updateDoc(cuentaRef, {
      estado: 'cobrada',
      cierre: ahora,
      ventaId: res.ventaId,
      metodoPago: params.metodoPagoExcedente,
      bonoId: res.bono.id,
      bonoCodigo: res.bono.codigo,
      montoBonoRedimido: res.montoRedimido,
      totalPagado: cuenta.total + propinaSegura,
      saldoPendiente: 0,
      actualizadoEn: ahora,
    }),
    updateDoc(mesaRef, {
      estado: 'libre',
      cuentaActivaId: null,
      comensales: null,
      mesero: null,
      totalActual: 0,
      saldoPendiente: 0,
      apertura: null,
      actualizadoEn: ahora,
    }),
  ]);

  const cambio =
    params.metodoPagoExcedente === 'efectivo' &&
    typeof params.montoRecibido === 'number' &&
    params.montoRecibido >= res.excedentePagado
      ? params.montoRecibido - res.excedentePagado
      : undefined;

  return {
    ventaId: res.ventaId,
    negocioNombre: params.negocioNombre || 'La Parada',
    negocioSlug: params.negocioSlug,
    negocioDireccion: params.negocioDireccion,
    negocioTelefono: params.negocioTelefono,
    fecha: new Date(),
    items: [...cuenta.items],
    subtotal: subtotalCobro,
    descuento: descuentoSeguro > 0 ? descuentoSeguro : undefined,
    descuentoMotivo: params.descuentoMotivo,
    propina: propinaSegura > 0 ? propinaSegura : undefined,
    total: totalACobrar,
    metodoPago: params.metodoPagoExcedente,
    tipoEntrega: 'mostrador',
    montoRecibido: res.excedentePagado > 0 ? params.montoRecibido : undefined,
    cambio,
    clienteNombre: cuenta.clienteNombre || res.bono.titularNombre,
    clienteTelefono: cuenta.clienteTelefono || res.bono.titularTelefono,
    mesaNombre: cuenta.mesaNombre,
    bonoCodigo: res.bono.codigo,
    montoBonoRedimido: res.montoRedimido,
    saldoBonoRestante: res.bono.saldoActual,
    montoExcedentePagado: res.excedentePagado,
  };
}

/**
 * Cambia el estado administrativo de un bono (bloquear, desbloquear, anular o extender vigencia).
 */
export async function cambiarEstadoBono(
  negocioId: string,
  input: CambiarEstadoBonoInput
): Promise<{ bono: BonoPrepago; movimiento: MovimientoBono }> {
  const tenantId = requireTenantId(negocioId);
  const bonoRef = doc(db, COL_BONOS, input.bonoId);
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();

  const tipoMovMap: Record<CambiarEstadoBonoInput['accion'], MovimientoBono['tipo']> = {
    bloquear: 'bloqueo',
    desbloquear: 'desbloqueo',
    anular: 'anulacion',
    extender_vigencia: 'ajuste_saldo',
  };
  const tipoMov = tipoMovMap[input.accion];
  const codigoComprobante = generarCodigoComprobanteBono(tipoMov, ahoraDate);

  const resultado = await runTransaction(db, async (tx) => {
    const snap = await tx.get(bonoRef);
    if (!snap.exists()) {
      throw new Error('El bono no existe.');
    }
    const raw = snap.data() as Record<string, unknown>;
    if (raw.negocioId !== tenantId) {
      throw new Error('El bono no pertenece al negocio activo.');
    }

    const bonoActual = mapBonoPrepagoDoc(snap.id, raw);
    if (bonoActual.estado === 'anulado' && input.accion !== 'extender_vigencia') {
      throw new Error('Un bono anulado no puede reactivarse.');
    }

    let nuevoEstado: EstadoBonoPrepago = bonoActual.estado;
    let motivoBloqueo = bonoActual.motivoBloqueo;
    let fechaVencDate = parseFechaBono(bonoActual.fechaVencimiento);
    let fechaVencTs: Timestamp | null | undefined = undefined;
    let notaMov = input.motivo?.trim() || '';

    if (input.accion === 'bloquear') {
      nuevoEstado = 'bloqueado';
      motivoBloqueo = input.motivo?.trim() || 'Bloqueo preventivo administrativo';
      notaMov = motivoBloqueo;
    } else if (input.accion === 'desbloquear') {
      nuevoEstado = bonoActual.saldoActual > 0 ? 'activo' : 'agotado';
      motivoBloqueo = '';
      notaMov = input.motivo?.trim() || 'Bono reactivado por administración';
    } else if (input.accion === 'anular') {
      nuevoEstado = 'anulado';
      motivoBloqueo = input.motivo?.trim() || 'Anulación definitiva administrativa';
      notaMov = motivoBloqueo;
    } else if (input.accion === 'extender_vigencia') {
      const dias = Math.max(1, Math.round(input.nuevaVigenciaDias || 30));
      const base =
        fechaVencDate && fechaVencDate.getTime() > ahoraDate.getTime()
          ? fechaVencDate
          : ahoraDate;
      fechaVencDate = calcularFechaVencimientoBono(base, dias);
      fechaVencTs = fechaVencDate ? Timestamp.fromDate(fechaVencDate) : null;
      if (bonoActual.estado !== 'bloqueado' && bonoActual.estado !== 'anulado') {
        nuevoEstado = bonoActual.saldoActual > 0 ? 'activo' : 'agotado';
      }
      notaMov = input.motivo?.trim() || `Vigencia extendida +${dias} días`;
    }

    tx.update(bonoRef, {
      estado: nuevoEstado,
      motivoBloqueo: motivoBloqueo || '',
      ...(fechaVencTs !== undefined ? { fechaVencimiento: fechaVencTs } : {}),
      actualizadoEn: ahora,
    });

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      bonoId: bonoActual.id,
      bonoCodigo: bonoActual.codigo,
      titularNombre: bonoActual.titularNombre,
      tipo: tipoMov,
      monto: 0,
      saldoPrevio: bonoActual.saldoActual,
      saldoResultante: bonoActual.saldoActual,
      codigoComprobante,
      origen: 'manual',
      fecha: ahora,
      ...(notaMov ? { notas: notaMov } : {}),
      ...(input.responsableNombre?.trim()
        ? { responsableNombre: input.responsableNombre.trim() }
        : {}),
    };

    tx.set(movRef, movData);

    const bonoActualizado: BonoPrepago = {
      ...bonoActual,
      estado: nuevoEstado,
      motivoBloqueo: motivoBloqueo || undefined,
      ...(fechaVencTs !== undefined ? { fechaVencimiento: fechaVencDate } : {}),
      actualizadoEn: ahoraDate,
    };

    return {
      bono: bonoActualizado,
      movimiento: mapMovimientoBonoDoc(movRef.id, movData),
    };
  });

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: input.accion === 'anular' ? 'anulacion_venta' : 'acceso_personal',
    severidad: input.accion === 'anular' ? 'alta' : 'media',
    titulo: `Bono ${resultado.bono.codigo} · ${input.accion.replace('_', ' ')}`,
    descripcion: resultado.movimiento.notas || `Acción ${input.accion} ejecutada sobre bono.`,
    montoImpacto: resultado.bono.saldoActual,
    responsableNombre: input.responsableNombre || 'Administrador',
    responsableRol: 'admin',
    entidadTipo: 'caja',
    referenciaId: resultado.bono.id,
  });

  return resultado;
}
