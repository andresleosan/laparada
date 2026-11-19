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
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  Combo,
  ConfigurarCuentaCorrienteInput,
  CuentaCorriente,
  CuentaMesa,
  MovimientoCartera,
  Producto,
  RegistrarAbonoCarteraInput,
  RegistrarConsumoCreditoInput,
  TicketVentaData,
} from '@/types';
import {
  calcularFechaVencimiento,
  evaluarDisponibilidadCupo,
  generarCodigoMovimientoCartera,
  parseFechaCartera,
  sanitizarMontoCOP,
} from '@/utils/carteraUtils';
import { normalizarTelefono } from '@/utils/clienteUtils';
import { calcularConsumoInsumos } from '@/utils/recetasEscandallo';
import { descontarStockInsumosPorVenta } from '@/services/inventarioService';
import { getCombos, getProductos } from '@/services/productosService';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';

const COL_CUENTAS = 'cuentas_corrientes';
const COL_MOVIMIENTOS = 'movimientos_cartera';

function mapCuentaCorrienteDoc(id: string, data: Record<string, unknown>): CuentaCorriente {
  return {
    negocioId: String(data.negocioId || ''),
    clienteId: String(data.clienteId || ''),
    clienteNombre: String(data.clienteNombre || 'Cliente sin nombre'),
    clienteTelefono: String(data.clienteTelefono || ''),
    empresa: typeof data.empresa === 'string' && data.empresa ? data.empresa : undefined,
    nit: typeof data.nit === 'string' && data.nit ? data.nit : undefined,
    cupoCredito: sanitizarMontoCOP(Number(data.cupoCredito || 0)),
    saldoActual: sanitizarMontoCOP(Number(data.saldoActual || 0)),
    plazoDias:
      Number.isFinite(Number(data.plazoDias)) && Number(data.plazoDias) >= 1
        ? Math.round(Number(data.plazoDias))
        : 15,
    estado: data.estado === 'bloqueada' ? 'bloqueada' : 'activa',
    bloqueoMotivo:
      typeof data.bloqueoMotivo === 'string' && data.bloqueoMotivo
        ? data.bloqueoMotivo
        : undefined,
    notas: typeof data.notas === 'string' && data.notas ? data.notas : undefined,
    ultimoConsumoEn: parseFechaCartera(data.ultimoConsumoEn) || undefined,
    ultimoAbonoEn: parseFechaCartera(data.ultimoAbonoEn) || undefined,
    fechaVencimientoMasAntiguo: parseFechaCartera(data.fechaVencimientoMasAntiguo) || undefined,
    totalConsumosHistorico: sanitizarMontoCOP(Number(data.totalConsumosHistorico || 0)),
    totalAbonosHistorico: sanitizarMontoCOP(Number(data.totalAbonosHistorico || 0)),
    cantidadConsumos: Number.isFinite(Number(data.cantidadConsumos))
      ? Math.max(0, Math.round(Number(data.cantidadConsumos)))
      : 0,
    cantidadAbonos: Number.isFinite(Number(data.cantidadAbonos))
      ? Math.max(0, Math.round(Number(data.cantidadAbonos)))
      : 0,
    creadoEn: parseFechaCartera(data.creadoEn) || new Date(),
    actualizadoEn: parseFechaCartera(data.actualizadoEn) || new Date(),
    id,
  };
}

function mapMovimientoCarteraDoc(id: string, data: Record<string, unknown>): MovimientoCartera {
  return {
    negocioId: String(data.negocioId || ''),
    cuentaCorrienteId: String(data.cuentaCorrienteId || ''),
    clienteId: String(data.clienteId || ''),
    clienteNombre: String(data.clienteNombre || ''),
    clienteTelefono: String(data.clienteTelefono || ''),
    tipo: (data.tipo as MovimientoCartera['tipo']) || 'consumo_credito',
    monto: sanitizarMontoCOP(Number(data.monto || 0)),
    saldoPrevio: sanitizarMontoCOP(Number(data.saldoPrevio || 0)),
    saldoResultante: sanitizarMontoCOP(Number(data.saldoResultante || 0)),
    codigoComprobante: String(data.codigoComprobante || `MOV-${id.slice(-6).toUpperCase()}`),
    origen: data.origen as MovimientoCartera['origen'] | undefined,
    metodoPago:
      data.metodoPago === 'efectivo' || data.metodoPago === 'transferencia'
        ? data.metodoPago
        : undefined,
    referenciaTransferencia:
      typeof data.referenciaTransferencia === 'string' && data.referenciaTransferencia
        ? data.referenciaTransferencia
        : undefined,
    items: Array.isArray(data.items) ? (data.items as MovimientoCartera['items']) : undefined,
    mesaNombre:
      typeof data.mesaNombre === 'string' && data.mesaNombre ? data.mesaNombre : undefined,
    cuentaMesaId:
      typeof data.cuentaMesaId === 'string' && data.cuentaMesaId ? data.cuentaMesaId : undefined,
    fecha: parseFechaCartera(data.fecha) || new Date(),
    fechaVencimiento: parseFechaCartera(data.fechaVencimiento) || undefined,
    notas: typeof data.notas === 'string' && data.notas ? data.notas : undefined,
    responsableNombre:
      typeof data.responsableNombre === 'string' && data.responsableNombre
        ? data.responsableNombre
        : undefined,
    id,
  };
}

/**
 * Suscripción en tiempo real a todas las cuentas corrientes del negocio activo.
 */
export function suscribirCuentasCorrientes(
  negocioId: string,
  onData: (cuentas: CuentaCorriente[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const colRef = collection(db, COL_CUENTAS);
  const q = query(colRef, where('negocioId', '==', tenantId), orderBy('saldoActual', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const cuentas = snapshot.docs.map((docSnap) =>
        mapCuentaCorrienteDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      onData(cuentas);
    },
    (err) => {
      console.warn('Fallback en suscripción de cuentas corrientes:', err);
      const qFallback = query(colRef, where('negocioId', '==', tenantId));
      onSnapshot(
        qFallback,
        (snap) => {
          const cuentas = snap.docs
            .map((docSnap) =>
              mapCuentaCorrienteDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
            )
            .sort((a, b) => b.saldoActual - a.saldoActual);
          onData(cuentas);
        },
        (fallbackErr) => {
          onError?.(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
        }
      );
    }
  );
}

/**
 * Suscripción en tiempo real a los movimientos de cartera del negocio activo.
 */
export function suscribirMovimientosCartera(
  negocioId: string,
  onData: (movimientos: MovimientoCartera[]) => void,
  onError?: (error: Error) => void,
  opciones?: { limite?: number }
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const maxDocs = opciones?.limite ?? 150;
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
        mapMovimientoCarteraDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      onData(movs);
    },
    (err) => {
      console.warn('Fallback en suscripción de movimientos de cartera:', err);
      const qFallback = query(colRef, where('negocioId', '==', tenantId), limit(maxDocs));
      onSnapshot(
        qFallback,
        (snap) => {
          const movs = snap.docs
            .map((docSnap) =>
              mapMovimientoCarteraDoc(docSnap.id, docSnap.data() as Record<string, unknown>)
            )
            .sort((a, b) => {
              const fa = parseFechaCartera(a.fecha)?.getTime() || 0;
              const fb = parseFechaCartera(b.fecha)?.getTime() || 0;
              return fb - fa;
            });
          onData(movs);
        },
        (fallbackErr) => {
          onError?.(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
        }
      );
    }
  );
}

/**
 * Obtiene la cuenta corriente de un cliente específico en el negocio activo.
 */
export async function getCuentaCorrientePorCliente(
  negocioId: string,
  clienteId: string
): Promise<CuentaCorriente | null> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COL_CUENTAS),
    where('negocioId', '==', tenantId),
    where('clienteId', '==', clienteId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const first = snap.docs[0];
  return mapCuentaCorrienteDoc(first.id, first.data() as Record<string, unknown>);
}

/**
 * Crea o actualiza la configuración de cupo de crédito de un cliente/empresa.
 * Sincroniza el resumen en la ficha `clientes/{clienteId}`.
 */
export async function configurarCuentaCorriente(
  negocioId: string,
  input: ConfigurarCuentaCorrienteInput
): Promise<CuentaCorriente> {
  const tenantId = requireTenantId(negocioId);
  const cupoCredito = sanitizarMontoCOP(input.cupoCredito);
  const plazoDias =
    Number.isFinite(input.plazoDias) && input.plazoDias >= 1
      ? Math.min(180, Math.round(input.plazoDias))
      : 15;

  if (!input.clienteId.trim()) {
    throw new Error('Debes seleccionar un cliente válido.');
  }
  if (!input.clienteNombre.trim()) {
    throw new Error('El nombre del cliente es obligatorio.');
  }
  if (cupoCredito < 0) {
    throw new Error('El cupo de crédito no puede ser negativo.');
  }

  const existente = await getCuentaCorrientePorCliente(tenantId, input.clienteId);
  const ahora = Timestamp.now();
  const estadoFinal = input.estado === 'bloqueada' ? 'bloqueada' : 'activa';
  const telefonoNorm = normalizarTelefono(input.clienteTelefono) || input.clienteTelefono.trim();

  let cuentaResultado: CuentaCorriente;

  if (existente) {
    const cuentaRef = doc(db, COL_CUENTAS, existente.id);
    const updates: Record<string, unknown> = {
      clienteNombre: input.clienteNombre.trim(),
      clienteTelefono: telefonoNorm,
      cupoCredito,
      plazoDias,
      estado: estadoFinal,
      empresa: input.empresa?.trim() || '',
      nit: input.nit?.trim() || '',
      bloqueoMotivo: estadoFinal === 'bloqueada' ? input.bloqueoMotivo?.trim() || 'Bloqueo administrativo' : '',
      notas: input.notas?.trim() || '',
      actualizadoEn: ahora,
    };

    await updateDoc(cuentaRef, updates);
    cuentaResultado = {
      ...existente,
      clienteNombre: input.clienteNombre.trim(),
      clienteTelefono: telefonoNorm,
      cupoCredito,
      plazoDias,
      estado: estadoFinal,
      empresa: input.empresa?.trim() || undefined,
      nit: input.nit?.trim() || undefined,
      bloqueoMotivo:
        estadoFinal === 'bloqueada'
          ? input.bloqueoMotivo?.trim() || 'Bloqueo administrativo'
          : undefined,
      notas: input.notas?.trim() || undefined,
      actualizadoEn: ahora.toDate(),
    };
  } else {
    const cuentaId = `cc_${tenantId}_${input.clienteId}`;
    const cuentaRef = doc(db, COL_CUENTAS, cuentaId);
    const nuevaData: Record<string, unknown> = {
      negocioId: tenantId,
      clienteId: input.clienteId,
      clienteNombre: input.clienteNombre.trim(),
      clienteTelefono: telefonoNorm,
      empresa: input.empresa?.trim() || '',
      nit: input.nit?.trim() || '',
      cupoCredito,
      saldoActual: 0,
      plazoDias,
      estado: estadoFinal,
      bloqueoMotivo: estadoFinal === 'bloqueada' ? input.bloqueoMotivo?.trim() || 'Bloqueo administrativo' : '',
      notas: input.notas?.trim() || '',
      totalConsumosHistorico: 0,
      totalAbonosHistorico: 0,
      cantidadConsumos: 0,
      cantidadAbonos: 0,
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    await setDoc(cuentaRef, nuevaData);
    cuentaResultado = mapCuentaCorrienteDoc(cuentaId, nuevaData);
  }

  // Sincronización best-effort con la ficha del cliente en `clientes`
  try {
    const clienteRef = doc(db, 'clientes', input.clienteId);
    const clienteSnap = await getDoc(clienteRef);
    if (clienteSnap.exists() && clienteSnap.data()?.negocioId === tenantId) {
      await updateDoc(clienteRef, {
        creditoHabilitado: cupoCredito > 0,
        cupoCredito,
        saldoPendienteCredito: cuentaResultado.saldoActual,
        plazoDiasCredito: plazoDias,
        creditoBloqueado: estadoFinal === 'bloqueada',
        ...(input.empresa !== undefined ? { empresa: input.empresa.trim() } : {}),
        ...(input.nit !== undefined ? { nit: input.nit.trim() } : {}),
        actualizadoEn: ahora,
      });
    }
  } catch (err) {
    console.warn('No se pudo sincronizar resumen de crédito en ficha de cliente:', err);
  }

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'acceso_personal',
    severidad: 'informativa',
    titulo: existente
      ? `Cupo de Crédito Actualizado · ${cuentaResultado.clienteNombre}`
      : `Cuenta Corriente Habilitada · ${cuentaResultado.clienteNombre}`,
    descripcion: `Cupo configurado en $${cupoCredito.toLocaleString('es-CO')} (plazo ${plazoDias} días, estado ${estadoFinal}).`,
    montoImpacto: cupoCredito,
    responsableNombre: input.responsableNombre || 'Administrador',
    responsableRol: 'admin',
    entidadTipo: 'caja',
    referenciaId: cuentaResultado.id,
  });

  return cuentaResultado;
}

/**
 * Registra un consumo a crédito (fiado controlado) de forma atómica en Firestore.
 * Valida tenant, estado activo y cupo disponible antes de escribir.
 */
export async function registrarConsumoCredito(
  negocioId: string,
  input: RegistrarConsumoCreditoInput,
  catalogo?: { productos?: Producto[]; combos?: Combo[] }
): Promise<{ cuenta: CuentaCorriente; movimiento: MovimientoCartera }> {
  const tenantId = requireTenantId(negocioId);
  const monto = sanitizarMontoCOP(input.monto);
  if (monto <= 0) {
    throw new Error('El monto del consumo a crédito debe ser mayor a $0.');
  }

  const cuentaRef = doc(db, COL_CUENTAS, input.cuentaCorrienteId);
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const codigoComprobante = generarCodigoMovimientoCartera('consumo_credito', ahoraDate);

  const resultado = await runTransaction(db, async (tx) => {
    const cuentaSnap = await tx.get(cuentaRef);
    if (!cuentaSnap.exists()) {
      throw new Error('La cuenta corriente seleccionada no existe.');
    }

    const rawCuenta = cuentaSnap.data() as Record<string, unknown>;
    if (rawCuenta.negocioId !== tenantId) {
      throw new Error('La cuenta corriente no pertenece al negocio activo.');
    }

    const cuentaActual = mapCuentaCorrienteDoc(cuentaSnap.id, rawCuenta);
    const evalCupo = evaluarDisponibilidadCupo(cuentaActual, monto);
    if (!evalCupo.puedeFiarse) {
      throw new Error(evalCupo.motivoRechazo || 'Cupo de crédito insuficiente.');
    }

    const saldoPrevio = cuentaActual.saldoActual;
    const saldoResultante = saldoPrevio + monto;
    const plazoAplicado =
      input.plazoDiasOverride && input.plazoDiasOverride >= 1
        ? Math.round(input.plazoDiasOverride)
        : cuentaActual.plazoDias || 15;
    const fechaVencimientoDate = calcularFechaVencimiento(ahoraDate, plazoAplicado);
    const fechaVencimientoTs = Timestamp.fromDate(fechaVencimientoDate);

    // Si el cliente estaba en saldo 0, el vencimiento más antiguo pasa a ser el de este consumo
    const nuevaFechaVencMasAntiguo =
      saldoPrevio === 0 || !cuentaActual.fechaVencimientoMasAntiguo
        ? fechaVencimientoTs
        : rawCuenta.fechaVencimientoMasAntiguo;

    tx.update(cuentaRef, {
      saldoActual: saldoResultante,
      ultimoConsumoEn: ahora,
      fechaVencimientoMasAntiguo: nuevaFechaVencMasAntiguo,
      totalConsumosHistorico: cuentaActual.totalConsumosHistorico + monto,
      cantidadConsumos: cuentaActual.cantidadConsumos + 1,
      actualizadoEn: ahora,
    });

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      cuentaCorrienteId: cuentaActual.id,
      clienteId: cuentaActual.clienteId,
      clienteNombre: cuentaActual.clienteNombre,
      clienteTelefono: cuentaActual.clienteTelefono,
      tipo: 'consumo_credito',
      monto,
      saldoPrevio,
      saldoResultante,
      codigoComprobante,
      origen: input.origen,
      fecha: ahora,
      fechaVencimiento: fechaVencimientoTs,
      ...(input.items && input.items.length > 0 ? { items: input.items } : {}),
      ...(input.mesaNombre ? { mesaNombre: input.mesaNombre } : {}),
      ...(input.cuentaMesaId ? { cuentaMesaId: input.cuentaMesaId } : {}),
      ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
      ...(input.responsableNombre?.trim()
        ? { responsableNombre: input.responsableNombre.trim() }
        : {}),
    };

    tx.set(movRef, movData);

    const cuentaActualizada: CuentaCorriente = {
      ...cuentaActual,
      saldoActual: saldoResultante,
      ultimoConsumoEn: ahoraDate,
      fechaVencimientoMasAntiguo:
        saldoPrevio === 0 || !cuentaActual.fechaVencimientoMasAntiguo
          ? fechaVencimientoDate
          : cuentaActual.fechaVencimientoMasAntiguo,
      totalConsumosHistorico: cuentaActual.totalConsumosHistorico + monto,
      cantidadConsumos: cuentaActual.cantidadConsumos + 1,
      actualizadoEn: ahoraDate,
    };

    const movimientoCreado = mapMovimientoCarteraDoc(movRef.id, movData);
    return { cuenta: cuentaActualizada, movimiento: movimientoCreado };
  });

  // Sincronizar ficha del cliente en background
  try {
    const clienteRef = doc(db, 'clientes', resultado.cuenta.clienteId);
    const clienteSnap = await getDoc(clienteRef);
    if (clienteSnap.exists() && clienteSnap.data()?.negocioId === tenantId) {
      await updateDoc(clienteRef, {
        saldoPendienteCredito: resultado.cuenta.saldoActual,
        ultimoPedidoEn: ahora,
        actualizadoEn: ahora,
      });
    }
  } catch (err) {
    console.warn('No se pudo sincronizar saldo de crédito en cliente:', err);
  }

  // Deducción atómica de inventario por recetas de escandallo
  if (input.items && input.items.length > 0) {
    (async () => {
      try {
        const prods = catalogo?.productos || (await getProductos(tenantId));
        const cmbs = catalogo?.combos || (await getCombos(tenantId));
        const consumos = calcularConsumoInsumos(input.items!, prods, cmbs);
        if (consumos.length > 0) {
          await descontarStockInsumosPorVenta(
            tenantId,
            consumos,
            `Fiado ${codigoComprobante} · ${resultado.cuenta.clienteNombre}`
          );
        }
      } catch (err) {
        console.warn('No se pudo descontar inventario en consumo a crédito:', err);
      }
    })();
  }

  return resultado;
}

/**
 * Registra un abono parcial o total a la cuenta corriente del cliente (100% offline: efectivo o transferencia).
 */
export async function registrarAbonoCartera(
  negocioId: string,
  input: RegistrarAbonoCarteraInput
): Promise<{ cuenta: CuentaCorriente; movimiento: MovimientoCartera }> {
  const tenantId = requireTenantId(negocioId);
  const monto = sanitizarMontoCOP(input.monto);
  if (monto <= 0) {
    throw new Error('El monto del abono debe ser mayor a $0.');
  }
  if (input.metodoPago !== 'efectivo' && input.metodoPago !== 'transferencia') {
    throw new Error('Método de pago no permitido. Solo se admite efectivo o transferencia.');
  }

  const cuentaRef = doc(db, COL_CUENTAS, input.cuentaCorrienteId);
  const movRef = doc(collection(db, COL_MOVIMIENTOS));
  const ahora = Timestamp.now();
  const ahoraDate = ahora.toDate();
  const codigoComprobante = generarCodigoMovimientoCartera('abono', ahoraDate);

  const resultado = await runTransaction(db, async (tx) => {
    const cuentaSnap = await tx.get(cuentaRef);
    if (!cuentaSnap.exists()) {
      throw new Error('La cuenta corriente no existe.');
    }
    const rawCuenta = cuentaSnap.data() as Record<string, unknown>;
    if (rawCuenta.negocioId !== tenantId) {
      throw new Error('La cuenta corriente no pertenece al negocio activo.');
    }

    const cuentaActual = mapCuentaCorrienteDoc(cuentaSnap.id, rawCuenta);
    if (cuentaActual.saldoActual <= 0) {
      throw new Error('Esta cuenta corriente no tiene saldo pendiente por abonar.');
    }
    if (monto > cuentaActual.saldoActual) {
      throw new Error(
        `El abono ($${monto.toLocaleString('es-CO')}) no puede superar el saldo pendiente ($${cuentaActual.saldoActual.toLocaleString('es-CO')}).`
      );
    }

    const saldoPrevio = cuentaActual.saldoActual;
    const saldoResultante = Math.max(0, saldoPrevio - monto);

    tx.update(cuentaRef, {
      saldoActual: saldoResultante,
      ultimoAbonoEn: ahora,
      ...(saldoResultante === 0 ? { fechaVencimientoMasAntiguo: null } : {}),
      totalAbonosHistorico: cuentaActual.totalAbonosHistorico + monto,
      cantidadAbonos: cuentaActual.cantidadAbonos + 1,
      actualizadoEn: ahora,
    });

    const movData: Record<string, unknown> = {
      negocioId: tenantId,
      cuentaCorrienteId: cuentaActual.id,
      clienteId: cuentaActual.clienteId,
      clienteNombre: cuentaActual.clienteNombre,
      clienteTelefono: cuentaActual.clienteTelefono,
      tipo: 'abono',
      monto,
      saldoPrevio,
      saldoResultante,
      codigoComprobante,
      metodoPago: input.metodoPago,
      fecha: ahora,
      ...(input.referenciaTransferencia?.trim()
        ? { referenciaTransferencia: input.referenciaTransferencia.trim() }
        : {}),
      ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
      ...(input.responsableNombre?.trim()
        ? { responsableNombre: input.responsableNombre.trim() }
        : {}),
    };

    tx.set(movRef, movData);

    const cuentaActualizada: CuentaCorriente = {
      ...cuentaActual,
      saldoActual: saldoResultante,
      ultimoAbonoEn: ahoraDate,
      fechaVencimientoMasAntiguo:
        saldoResultante === 0 ? undefined : cuentaActual.fechaVencimientoMasAntiguo,
      totalAbonosHistorico: cuentaActual.totalAbonosHistorico + monto,
      cantidadAbonos: cuentaActual.cantidadAbonos + 1,
      actualizadoEn: ahoraDate,
    };

    const movimientoCreado = mapMovimientoCarteraDoc(movRef.id, movData);
    return { cuenta: cuentaActualizada, movimiento: movimientoCreado };
  });

  // Sincronizar ficha del cliente en background
  try {
    const clienteRef = doc(db, 'clientes', resultado.cuenta.clienteId);
    const clienteSnap = await getDoc(clienteRef);
    if (clienteSnap.exists() && clienteSnap.data()?.negocioId === tenantId) {
      await updateDoc(clienteRef, {
        saldoPendienteCredito: resultado.cuenta.saldoActual,
        actualizadoEn: ahora,
      });
    }
  } catch (err) {
    console.warn('No se pudo sincronizar saldo tras abono en cliente:', err);
  }

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'acceso_personal',
    severidad: 'informativa',
    titulo: `Abono a Cartera ${codigoComprobante} · ${resultado.cuenta.clienteNombre}`,
    descripcion: `Abono de $${monto.toLocaleString('es-CO')} en ${input.metodoPago}. Saldo restante: $${resultado.cuenta.saldoActual.toLocaleString('es-CO')}.`,
    montoImpacto: monto,
    responsableNombre: input.responsableNombre || 'Cajero POS',
    responsableRol: 'cajero',
    entidadTipo: 'caja',
    referenciaId: resultado.movimiento.id,
  });

  return resultado;
}

/**
 * Carga la cuenta de una mesa de salón a la cuenta corriente (fiado controlado) de un cliente,
 * cierra las comandas de cocina, libera la mesa a 'libre' y emite el comprobante digital.
 */
export async function cargarCuentaMesaACredito(
  negocioId: string,
  params: {
    mesaId: string;
    cuentaId: string;
    cuentaCorrienteId: string;
    propina?: number;
    descuento?: number;
    descuentoMotivo?: string;
    notas?: string;
    responsableNombre?: string;
    negocioNombre?: string;
    negocioSlug?: string;
    negocioDireccion?: string;
    negocioTelefono?: string;
  }
): Promise<TicketVentaData> {
  const tenantId = requireTenantId(negocioId);
  const mesaRef = doc(db, 'mesas', params.mesaId);
  const cuentaMesaRef = doc(db, 'cuentas_mesas', params.cuentaId);

  const [mesaSnap, cuentaMesaSnap] = await Promise.all([
    getDoc(mesaRef),
    getDoc(cuentaMesaRef),
  ]);

  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa no pertenece al negocio activo.');
  }
  if (!cuentaMesaSnap.exists() || cuentaMesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La cuenta de mesa no pertenece al negocio activo.');
  }

  const cuentaMesa = cuentaMesaSnap.data() as CuentaMesa;
  if (!cuentaMesa.items || cuentaMesa.items.length === 0) {
    throw new Error('No se puede cargar a crédito una cuenta de mesa vacía.');
  }

  const subtotalCobro =
    typeof cuentaMesa.saldoPendiente === 'number'
      ? cuentaMesa.saldoPendiente
      : cuentaMesa.total;
  const descuentoSeguro =
    typeof params.descuento === 'number' && params.descuento > 0
      ? Math.min(subtotalCobro, params.descuento)
      : 0;
  const propinaSegura = Math.max(0, Math.round(params.propina || 0));
  const totalACredito = Math.max(0, subtotalCobro - descuentoSeguro) + propinaSegura;

  const { cuenta: cuentaCorriente, movimiento } = await registrarConsumoCredito(tenantId, {
    cuentaCorrienteId: params.cuentaCorrienteId,
    monto: totalACredito,
    origen: 'mesas',
    items: cuentaMesa.items,
    mesaNombre: cuentaMesa.mesaNombre,
    cuentaMesaId: params.cuentaId,
    notas: params.notas || `Consumo en ${cuentaMesa.mesaNombre}`,
    responsableNombre: params.responsableNombre,
  });

  const ahora = Timestamp.now();

  // Marcar comandas en KDS como entregadas
  if (Array.isArray(cuentaMesa.rondas)) {
    for (const r of cuentaMesa.rondas) {
      if (r.comandaId) {
        try {
          await updateDoc(doc(db, 'domicilios', r.comandaId), {
            estado: 'entregado',
            actualizadoEn: ahora,
          });
        } catch {
          // Ignorar si ya fue cerrada en KDS
        }
      }
    }
  }

  // Cerrar cuenta de mesa y liberar mesa
  await Promise.all([
    updateDoc(cuentaMesaRef, {
      estado: 'cobrada',
      cierre: ahora,
      movimientoCarteraId: movimiento.id,
      esVentaCredito: true,
      totalPagado: cuentaMesa.total + propinaSegura,
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

  const cupoDisponibleRestante = Math.max(
    0,
    cuentaCorriente.cupoCredito - cuentaCorriente.saldoActual
  );

  return {
    ventaId: movimiento.codigoComprobante,
    negocioNombre: params.negocioNombre || 'La Parada',
    negocioSlug: params.negocioSlug,
    negocioDireccion: params.negocioDireccion,
    negocioTelefono: params.negocioTelefono,
    fecha: new Date(),
    items: cuentaMesa.items,
    subtotal: subtotalCobro,
    descuento: descuentoSeguro > 0 ? descuentoSeguro : undefined,
    descuentoMotivo: params.descuentoMotivo,
    propina: propinaSegura > 0 ? propinaSegura : undefined,
    total: totalACredito,
    metodoPago: 'efectivo',
    tipoEntrega: 'mostrador',
    clienteNombre: cuentaCorriente.clienteNombre,
    clienteTelefono: cuentaCorriente.clienteTelefono,
    mesaNombre: cuentaMesa.mesaNombre,
    esVentaCredito: true,
    saldoCarteraResultante: cuentaCorriente.saldoActual,
    cupoDisponibleRestante,
    fechaVencimientoCredito: parseFechaCartera(movimiento.fechaVencimiento) || undefined,
  };
}
