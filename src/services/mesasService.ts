import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  CuentaMesa,
  Mesa,
  PagoParcialMesa,
  RondaComanda,
} from '@/types/mesa';
import type { ItemVenta, MetodoPago, TicketVentaData } from '@/types';
import {
  calcularConsolidadoItems,
  calcularTotalCuenta,
  mesasDefaultIniciales,
} from '@/utils/mesasUtils';
import {
  validarTrasladoMesa,
  crearEventoTraslado,
  validarFusionMesas,
  combinarCuentasMesas,
} from '@/utils/mesasTransferenciaYFusion';
import { calcularSaldoPendienteCuenta } from '@/utils/propinasYModificadores';
import { registrarVenta } from './ventasService';

/**
 * Obtiene todas las mesas de un negocio ordenadas por número ascendente.
 */
export async function getMesas(negocioId: string): Promise<Mesa[]> {
  const tenantId = requireTenantId(negocioId);
  const mesasRef = collection(db, 'mesas');
  const q = query(
    mesasRef,
    where('negocioId', '==', tenantId),
    orderBy('numero', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<Mesa, 'id'>),
  }));
}

/**
 * Escucha en tiempo real todas las mesas de un negocio.
 */
export function onMesasChange(
  negocioId: string,
  onUpdate: (mesas: Mesa[]) => void,
  onError?: (err: Error) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const mesasRef = collection(db, 'mesas');
  const q = query(
    mesasRef,
    where('negocioId', '==', tenantId),
    orderBy('numero', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const mesas: Mesa[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Mesa, 'id'>),
      }));
      onUpdate(mesas);
    },
    (err) => {
      console.error('Error al escuchar mesas:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Registra una nueva mesa en el salón.
 */
export async function crearMesa(
  negocioId: string,
  data: {
    numero: number;
    nombre: string;
    capacidad: number;
    zona: string;
  }
): Promise<string> {
  const tenantId = requireTenantId(negocioId);

  const numero = Math.max(1, Math.floor(Number(data.numero) || 1));
  const nombre = (data.nombre || `Mesa ${numero}`).trim();
  const capacidad = Math.max(1, Math.floor(Number(data.capacidad) || 4));
  const zona = (data.zona || 'Salón Principal').trim();

  const nuevaMesa: Omit<Mesa, 'id'> = {
    numero,
    nombre,
    capacidad,
    zona,
    estado: 'libre',
    negocioId: tenantId,
    totalActual: 0,
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  };

  const docRef = await addDoc(collection(db, 'mesas'), nuevaMesa);
  return docRef.id;
}

/**
 * Actualiza datos descriptivos de una mesa (nombre, capacidad, zona, número).
 */
export async function actualizarMesa(
  negocioId: string,
  mesaId: string,
  updates: Partial<Pick<Mesa, 'nombre' | 'capacidad' | 'zona' | 'numero'>>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!mesaId?.trim()) throw new Error('ID de mesa no válido.');

  const mesaRef = doc(db, 'mesas', mesaId);
  const mesaSnap = await getDoc(mesaRef);
  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa no pertenece al negocio activo.');
  }

  const patch: Record<string, unknown> = {
    actualizadoEn: Timestamp.now(),
  };

  if (updates.nombre !== undefined) patch.nombre = updates.nombre.trim();
  if (updates.zona !== undefined) patch.zona = updates.zona.trim();
  if (updates.capacidad !== undefined) patch.capacidad = Math.max(1, Math.floor(updates.capacidad));
  if (updates.numero !== undefined) patch.numero = Math.max(1, Math.floor(updates.numero));

  await updateDoc(mesaRef, patch);
}

/**
 * Elimina una mesa de Firestore siempre que se encuentre libre.
 */
export async function eliminarMesa(negocioId: string, mesaId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  if (!mesaId?.trim()) throw new Error('ID de mesa no válido.');

  const mesaRef = doc(db, 'mesas', mesaId);
  const mesaSnap = await getDoc(mesaRef);
  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa no pertenece al negocio activo.');
  }

  const estado = mesaSnap.data()?.estado;
  if (estado === 'ocupada' || estado === 'por_cobrar') {
    throw new Error('No puedes eliminar una mesa con cuenta activa o comensales sentados.');
  }

  await deleteDoc(mesaRef);
}

/**
 * Inicializa las 6 mesas por defecto para un nuevo restaurante.
 */
export async function inicializarMesasDefault(negocioId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const actuales = await getMesas(tenantId);
  if (actuales.length > 0) return;

  const defaults = mesasDefaultIniciales(tenantId);
  const mesasRef = collection(db, 'mesas');

  for (const mesa of defaults) {
    await addDoc(mesasRef, {
      ...mesa,
      creadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
  }
}

/**
 * Obtiene la cuenta activa de una mesa por su ID.
 */
export async function getCuentaActivaMesa(
  negocioId: string,
  cuentaId: string
): Promise<CuentaMesa | null> {
  const tenantId = requireTenantId(negocioId);
  if (!cuentaId?.trim()) return null;

  const cuentaRef = doc(db, 'cuentas_mesas', cuentaId);
  const cuentaSnap = await getDoc(cuentaRef);
  if (!cuentaSnap.exists() || cuentaSnap.data()?.negocioId !== tenantId) {
    return null;
  }

  return {
    id: cuentaSnap.id,
    ...(cuentaSnap.data() as Omit<CuentaMesa, 'id'>),
  };
}

/**
 * Escucha en tiempo real la cuenta activa de una mesa.
 */
export function onCuentaMesaChange(
  negocioId: string,
  cuentaId: string,
  onUpdate: (cuenta: CuentaMesa | null) => void,
  onError?: (err: Error) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  if (!cuentaId?.trim()) {
    onUpdate(null);
    return () => {};
  }

  const cuentaRef = doc(db, 'cuentas_mesas', cuentaId);
  return onSnapshot(
    cuentaRef,
    (snap) => {
      if (!snap.exists() || snap.data()?.negocioId !== tenantId) {
        onUpdate(null);
        return;
      }
      onUpdate({
        id: snap.id,
        ...(snap.data() as Omit<CuentaMesa, 'id'>),
      });
    },
    (err) => {
      console.error('Error al escuchar cuenta de mesa:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Abre una nueva cuenta para una mesa libre y la marca como ocupada.
 */
export async function abrirCuentaMesa(
  negocioId: string,
  params: {
    mesaId: string;
    comensales: number;
    mesero?: string;
    clienteNombre?: string;
    clienteTelefono?: string;
    notas?: string;
  }
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const mesaRef = doc(db, 'mesas', params.mesaId);
  const mesaSnap = await getDoc(mesaRef);

  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa no pertenece al negocio activo.');
  }

  const mesaData = mesaSnap.data() as Mesa;
  if (mesaData.estado === 'ocupada' || mesaData.estado === 'por_cobrar') {
    throw new Error('La mesa ya se encuentra ocupada con una cuenta abierta.');
  }

  const ahora = Timestamp.now();
  const comensales = Math.max(1, Math.floor(Number(params.comensales) || 1));
  const mesero = params.mesero?.trim() || undefined;
  const clienteNombre = params.clienteNombre?.trim() || undefined;
  const clienteTelefono = params.clienteTelefono?.trim() || undefined;
  const notas = params.notas?.trim() || undefined;

  // 1. Crear documento en cuentas_mesas
  const nuevaCuenta: Omit<CuentaMesa, 'id'> = {
    mesaId: params.mesaId,
    mesaNumero: mesaData.numero,
    mesaNombre: mesaData.nombre,
    negocioId: tenantId,
    estado: 'abierta',
    comensales,
    ...(mesero ? { mesero } : {}),
    ...(clienteNombre ? { clienteNombre } : {}),
    ...(clienteTelefono ? { clienteTelefono } : {}),
    ...(notas ? { notas } : {}),
    rondas: [],
    items: [],
    total: 0,
    apertura: ahora,
  };

  const cuentaDocRef = await addDoc(collection(db, 'cuentas_mesas'), nuevaCuenta);

  // 2. Actualizar estado de la mesa
  await updateDoc(mesaRef, {
    estado: 'ocupada',
    cuentaActivaId: cuentaDocRef.id,
    comensales,
    ...(mesero ? { mesero } : {}),
    totalActual: 0,
    apertura: ahora,
    actualizadoEn: ahora,
  });

  return cuentaDocRef.id;
}

/**
 * Agrega una nueva ronda de comanda a una cuenta abierta y opcionalmente la despacha al KDS de Cocina.
 */
export async function agregarRondaACuenta(
  negocioId: string,
  cuentaId: string,
  params: {
    items: ItemVenta[];
    notas?: string;
    enviarAKDS?: boolean;
  }
): Promise<RondaComanda> {
  const tenantId = requireTenantId(negocioId);
  if (!Array.isArray(params.items) || params.items.length === 0) {
    throw new Error('Debes agregar al menos un ítem a la ronda.');
  }

  const cuentaRef = doc(db, 'cuentas_mesas', cuentaId);
  const cuentaSnap = await getDoc(cuentaRef);

  if (!cuentaSnap.exists() || cuentaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La cuenta no pertenece al negocio activo.');
  }

  const cuenta = cuentaSnap.data() as CuentaMesa;
  if (cuenta.estado === 'cobrada' || cuenta.estado === 'cancelada') {
    throw new Error('No se pueden agregar rondas a una cuenta cerrada o cancelada.');
  }

  const ahora = Timestamp.now();
  const rondasActuales = cuenta.rondas || [];
  const numeroRonda = rondasActuales.length + 1;
  const totalRonda = calcularTotalCuenta(params.items);

  let comandaId: string | undefined;

  // Despacho a Cocina (KDS) mediante la colección de comandas/domicilios
  if (params.enviarAKDS) {
    const comandaData = {
      negocioId: tenantId,
      clienteNombre: `${cuenta.mesaNombre} · Ronda ${numeroRonda}`,
      direccion: `Salón - ${cuenta.mesaNombre}`,
      barrio: `Mesa ${cuenta.mesaNumero}`,
      clienteTelefono: cuenta.clienteTelefono || '',
      items: params.items,
      total: totalRonda,
      metodoPago: 'efectivo' as MetodoPago,
      origen: 'pos' as const,
      estado: 'pendiente' as const,
      notas: params.notas ? `Comanda Mesa: ${params.notas}` : 'Comanda para Mesa en Salón',
      creadoEn: ahora,
      actualizadoEn: ahora,
    };

    const domRef = await addDoc(collection(db, 'domicilios'), comandaData);
    comandaId = domRef.id;
  }

  const nuevaRonda: RondaComanda = {
    id: `ronda_${numeroRonda}_${Date.now()}`,
    numero: numeroRonda,
    enviadoEn: ahora,
    items: params.items,
    total: totalRonda,
    enviadoCocina: Boolean(params.enviarAKDS),
    ...(params.notas ? { notas: params.notas.trim() } : {}),
    ...(comandaId ? { comandaId } : {}),
  };

  const todasLasRondas = [...rondasActuales, nuevaRonda];
  const itemsConsolidados = calcularConsolidadoItems(todasLasRondas);
  const totalGeneral = calcularTotalCuenta(itemsConsolidados);

  // Actualizar cuenta en Firestore
  await updateDoc(cuentaRef, {
    rondas: todasLasRondas,
    items: itemsConsolidados,
    total: totalGeneral,
    actualizadoEn: ahora,
  });

  // Sincronizar total acumulado en la mesa
  const mesaRef = doc(db, 'mesas', cuenta.mesaId);
  await updateDoc(mesaRef, {
    totalActual: totalGeneral,
    actualizadoEn: ahora,
  });

  return nuevaRonda;
}

/**
 * Solicita el pre-cierre de la mesa (cambia su estado a 'por_cobrar' y emite la cuenta de control).
 */
export async function solicitarPrecierreMesa(
  negocioId: string,
  mesaId: string,
  cuentaId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const mesaRef = doc(db, 'mesas', mesaId);
  const cuentaRef = doc(db, 'cuentas_mesas', cuentaId);

  const [mesaSnap, cuentaSnap] = await Promise.all([getDoc(mesaRef), getDoc(cuentaRef)]);
  if (!mesaSnap.exists() || mesaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La mesa no pertenece al negocio activo.');
  }
  if (!cuentaSnap.exists() || cuentaSnap.data()?.negocioId !== tenantId) {
    throw new Error('La cuenta no pertenece al negocio activo.');
  }

  const ahora = Timestamp.now();
  await Promise.all([
    updateDoc(mesaRef, { estado: 'por_cobrar', actualizadoEn: ahora }),
    updateDoc(cuentaRef, { estado: 'por_cobrar', actualizadoEn: ahora }),
  ]);
}

/**
 * Cobra y finaliza la cuenta de una mesa: registra la venta en Firestore,
 * finaliza las comandas de cocina asociadas, libera la mesa a 'libre' y
 * retorna el comprobante TicketVentaData listo para impresión o envío por WhatsApp.
 */
export async function cobrarYFinalizarMesa(
  negocioId: string,
  params: {
    mesaId: string;
    cuentaId: string;
    metodoPago: MetodoPago;
    propina?: number;
    descuento?: number;
    descuentoMotivo?: string;
    montoRecibido?: number;
    fotoTransferenciaPath?: string;
    clienteNombre?: string;
    clienteTelefono?: string;
    negocioNombre?: string;
    negocioSlug?: string;
    negocioDireccion?: string;
    negocioTelefono?: string;
  }
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

  const cuenta = cuentaSnap.data() as CuentaMesa;
  if (cuenta.items.length === 0) {
    throw new Error('No se puede cobrar una cuenta vacía sin consumos.');
  }

  const propina = Math.max(0, Math.round(params.propina || 0));
  const subtotalCobro = typeof cuenta.saldoPendiente === 'number' ? cuenta.saldoPendiente : cuenta.total;
  const descuentoSeguro = typeof params.descuento === 'number' && params.descuento > 0 ? Math.min(subtotalCobro, params.descuento) : 0;
  const subtotalConDescuento = Math.max(0, subtotalCobro - descuentoSeguro);
  const total = subtotalConDescuento + propina;
  const clienteNombre = params.clienteNombre?.trim() || cuenta.clienteNombre;
  const clienteTelefono = params.clienteTelefono?.trim() || cuenta.clienteTelefono;

  // 1. Registrar venta contable oficial en Firestore
  const tieneOpcionesExtra = propina > 0 || descuentoSeguro > 0 || cuenta.saldoPendiente !== undefined;
  const ventaId = tieneOpcionesExtra
    ? await registrarVenta(
        tenantId,
        cuenta.items,
        total,
        params.metodoPago,
        undefined,
        clienteTelefono,
        params.fotoTransferenciaPath,
        'mostrador',
        clienteNombre,
        undefined,
        undefined,
        {
          subtotal: subtotalCobro,
          descuento: descuentoSeguro > 0 ? descuentoSeguro : undefined,
          descuentoMotivo: params.descuentoMotivo || undefined,
          propina: propina > 0 ? propina : undefined,
          cuentaMesaId: params.cuentaId,
          mesaNombre: cuenta.mesaNombre,
        }
      )
    : await registrarVenta(
        tenantId,
        cuenta.items,
        total,
        params.metodoPago,
        undefined,
        clienteTelefono,
        params.fotoTransferenciaPath,
        'mostrador',
        clienteNombre,
        undefined
      );

  const ahora = Timestamp.now();

  // 2. Marcar comandas en KDS (si hubo) como despachadas/entregadas
  if (Array.isArray(cuenta.rondas)) {
    for (const r of cuenta.rondas) {
      if (r.comandaId) {
        try {
          const domRef = doc(db, 'domicilios', r.comandaId);
          await updateDoc(domRef, {
            estado: 'entregado',
            ventaId,
            actualizadoEn: ahora,
          });
        } catch {
          // Ignorar si la comanda ya fue finalizada manualmente en KDS
        }
      }
    }
  }

  // 3. Marcar cuenta como cobrada
  await updateDoc(cuentaRef, {
    estado: 'cobrada',
    cierre: ahora,
    ventaId,
    metodoPago: params.metodoPago,
    propina: propina > 0 ? propina : undefined,
    totalPagado: cuenta.total + propina,
    saldoPendiente: 0,
    actualizadoEn: ahora,
  });

  // 4. Liberar mesa automáticamente a 'libre'
  await updateDoc(mesaRef, {
    estado: 'libre',
    cuentaActivaId: null,
    comensales: null,
    mesero: null,
    totalActual: 0,
    saldoPendiente: 0,
    apertura: null,
    actualizadoEn: ahora,
  });

  // 5. Preparar y retornar comprobante térmico digital
  const cambio =
    typeof params.montoRecibido === 'number' && params.montoRecibido >= total
      ? params.montoRecibido - total
      : undefined;

  return {
    ventaId,
    negocioNombre: params.negocioNombre || 'La Parada',
    negocioSlug: params.negocioSlug,
    negocioDireccion: params.negocioDireccion,
    negocioTelefono: params.negocioTelefono,
    fecha: new Date(),
    items: [...cuenta.items],
    subtotal: subtotalCobro,
    descuento: descuentoSeguro > 0 ? descuentoSeguro : undefined,
    descuentoMotivo: params.descuentoMotivo || undefined,
    propina: propina > 0 ? propina : undefined,
    total,
    metodoPago: params.metodoPago,
    tipoEntrega: 'mostrador',
    montoRecibido: params.montoRecibido,
    cambio,
    clienteNombre,
    clienteTelefono,
    mesaNombre: cuenta.mesaNombre,
  };
}

/**
 * Registra un cobro parcial / abono para una mesa de salón.
 * Emite una venta contable en Firestore con su ticket para el comensal que paga,
 * actualiza el saldo pendiente de la cuenta, y si la cuenta queda saldada,
 * finaliza la mesa automáticamente.
 */
export async function registrarPagoParcialMesa(
  negocioId: string,
  params: {
    mesaId: string;
    cuentaId: string;
    monto: number;
    metodoPago: MetodoPago;
    propina?: number;
    clienteNombre?: string;
    notas?: string;
    cajeroNombre?: string;
    montoRecibido?: number;
    negocioNombre?: string;
    negocioSlug?: string;
    negocioDireccion?: string;
    negocioTelefono?: string;
  }
): Promise<{
  ticket: TicketVentaData;
  estaSaldada: boolean;
  saldoRestante: number;
}> {
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

  const cuenta = cuentaSnap.data() as CuentaMesa;
  const montoAbono = Math.max(0, Math.round(params.monto));
  if (montoAbono <= 0) {
    throw new Error('El monto del abono debe ser mayor a 0 COP.');
  }

  const propinaAbono = Math.max(0, Math.round(params.propina || 0));
  const totalCobrado = montoAbono + propinaAbono;
  const ahora = Timestamp.now();

  const itemAbono: ItemVenta = {
    tipo: 'producto',
    referenciaId: `abono_${params.cuentaId}_${Date.now()}`,
    nombre: `Abono Parcial · ${cuenta.mesaNombre} (${params.clienteNombre || 'Comensal'})`,
    cantidad: 1,
    precioUnitario: montoAbono,
    subtotal: montoAbono,
    ...(params.notas ? { notas: params.notas.trim() } : {}),
  };

  const ventaId = await registrarVenta(
    tenantId,
    [itemAbono],
    totalCobrado,
    params.metodoPago,
    undefined,
    undefined,
    undefined,
    'mostrador',
    params.clienteNombre || `Comensal · ${cuenta.mesaNombre}`,
    undefined,
    undefined,
    {
      subtotal: montoAbono,
      propina: propinaAbono > 0 ? propinaAbono : undefined,
      cuentaMesaId: params.cuentaId,
      mesaNombre: cuenta.mesaNombre,
      esPagoParcial: true,
    }
  );

  const nuevoPago: PagoParcialMesa = {
    id: `pago_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    monto: montoAbono,
    metodoPago: params.metodoPago,
    fecha: ahora,
    ...(propinaAbono > 0 ? { propina: propinaAbono } : {}),
    ...(params.clienteNombre ? { clienteNombre: params.clienteNombre.trim() } : {}),
    ...(params.notas ? { notas: params.notas.trim() } : {}),
    ventaId,
    ...(params.cajeroNombre ? { cajeroNombre: params.cajeroNombre } : {}),
  };

  const pagosActuales = [...(cuenta.pagosParciales || []), nuevoPago];
  const saldoInfo = calcularSaldoPendienteCuenta(cuenta.total, pagosActuales, cuenta.propina || 0);

  if (saldoInfo.estaSaldada) {
    // Si la cuenta quedó 100% saldada, cerramos la cuenta y liberamos la mesa
    if (Array.isArray(cuenta.rondas)) {
      for (const r of cuenta.rondas) {
        if (r.comandaId) {
          try {
            const domRef = doc(db, 'domicilios', r.comandaId);
            await updateDoc(domRef, {
              estado: 'entregado',
              ventaId,
              actualizadoEn: ahora,
            });
          } catch {
            // Ignorar si ya fue finalizada
          }
        }
      }
    }

    await Promise.all([
      updateDoc(cuentaRef, {
        pagosParciales: pagosActuales,
        totalPagado: saldoInfo.totalAbonado,
        saldoPendiente: 0,
        estado: 'cobrada',
        cierre: ahora,
        ventaId,
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
  } else {
    // Aún queda saldo pendiente
    await Promise.all([
      updateDoc(cuentaRef, {
        pagosParciales: pagosActuales,
        totalPagado: saldoInfo.totalAbonado,
        saldoPendiente: saldoInfo.saldoRestante,
        actualizadoEn: ahora,
      }),
      updateDoc(mesaRef, {
        saldoPendiente: saldoInfo.saldoRestante,
        actualizadoEn: ahora,
      }),
    ]);
  }

  const cambio =
    typeof params.montoRecibido === 'number' && params.montoRecibido >= totalCobrado
      ? params.montoRecibido - totalCobrado
      : undefined;

  const ticket: TicketVentaData = {
    ventaId,
    negocioNombre: params.negocioNombre || 'La Parada',
    negocioSlug: params.negocioSlug,
    negocioDireccion: params.negocioDireccion,
    negocioTelefono: params.negocioTelefono,
    fecha: new Date(),
    items: [itemAbono],
    subtotal: montoAbono,
    propina: propinaAbono > 0 ? propinaAbono : undefined,
    total: totalCobrado,
    metodoPago: params.metodoPago,
    tipoEntrega: 'mostrador',
    montoRecibido: params.montoRecibido,
    cambio,
    clienteNombre: params.clienteNombre,
    mesaNombre: cuenta.mesaNombre,
    esPagoParcial: true,
    saldoPendiente: saldoInfo.saldoRestante,
    abonoNumero: pagosActuales.length,
  };

  return {
    ticket,
    estaSaldada: saldoInfo.estaSaldada,
    saldoRestante: saldoInfo.saldoRestante,
  };
}

/**
 * Cancela una cuenta abierta y libera la mesa inmediatamente.
 */
export async function cancelarCuentaMesa(
  negocioId: string,
  mesaId: string,
  cuentaId: string,
  motivo?: string
): Promise<void> {
  requireTenantId(negocioId);
  const mesaRef = doc(db, 'mesas', mesaId);
  const cuentaRef = doc(db, 'cuentas_mesas', cuentaId);

  const ahora = Timestamp.now();
  await Promise.all([
    updateDoc(cuentaRef, {
      estado: 'cancelada',
      cierre: ahora,
      ...(motivo ? { notasCancelacion: motivo.trim() } : {}),
      actualizadoEn: ahora,
    }),
    updateDoc(mesaRef, {
      estado: 'libre',
      cuentaActivaId: null,
      comensales: null,
      mesero: null,
      totalActual: 0,
      apertura: null,
      actualizadoEn: ahora,
    }),
  ]);
}

/**
 * Traslada la cuenta de una mesa origen a una mesa destino libre.
 * Actualiza la cuenta, transfiere el estado a la nueva mesa, libera la mesa anterior
 * y sincroniza las comandas activas enviadas a cocina (KDS).
 */
export async function transferirCuentaMesa(
  negocioId: string,
  params: {
    mesaOrigenId: string;
    mesaDestinoId: string;
    cuentaId: string;
    motivo?: string;
    operador?: string;
  }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const mesaOrigenRef = doc(db, 'mesas', params.mesaOrigenId);
  const mesaDestinoRef = doc(db, 'mesas', params.mesaDestinoId);
  const cuentaRef = doc(db, 'cuentas_mesas', params.cuentaId);

  const [mesaOrigenSnap, mesaDestinoSnap, cuentaSnap] = await Promise.all([
    getDoc(mesaOrigenRef),
    getDoc(mesaDestinoRef),
    getDoc(cuentaRef),
  ]);

  if (!mesaOrigenSnap.exists() || !mesaDestinoSnap.exists() || !cuentaSnap.exists()) {
    throw new Error('No se encontraron los documentos requeridos para el traslado.');
  }

  const mesaOrigen = { id: mesaOrigenSnap.id, ...(mesaOrigenSnap.data() as Omit<Mesa, 'id'>) };
  const mesaDestino = { id: mesaDestinoSnap.id, ...(mesaDestinoSnap.data() as Omit<Mesa, 'id'>) };
  const cuenta = { id: cuentaSnap.id, ...(cuentaSnap.data() as Omit<CuentaMesa, 'id'>) };

  if (mesaOrigen.negocioId !== tenantId || mesaDestino.negocioId !== tenantId || cuenta.negocioId !== tenantId) {
    throw new Error('Los documentos no pertenecen al negocio activo.');
  }

  const validacion = validarTrasladoMesa(mesaOrigen, mesaDestino, cuenta);
  if (!validacion.valido) {
    throw new Error(validacion.error || 'Traslado no permitido.');
  }

  const ahora = Timestamp.now();
  const eventoTraslado = crearEventoTraslado(mesaOrigen, mesaDestino, params.motivo, params.operador);
  const trasladosActuales = cuenta.traslados || [];

  // 1. Actualizar cuenta con la nueva mesa y agregar evento de auditoría
  await updateDoc(cuentaRef, {
    mesaId: mesaDestino.id,
    mesaNumero: mesaDestino.numero,
    mesaNombre: mesaDestino.nombre,
    traslados: [...trasladosActuales, eventoTraslado],
    actualizadoEn: ahora,
  });

  // 2. Liberar mesa origen
  await updateDoc(mesaOrigenRef, {
    estado: 'libre',
    cuentaActivaId: null,
    totalActual: 0,
    saldoPendiente: 0,
    comensales: null,
    mesero: null,
    apertura: null,
    actualizadoEn: ahora,
  });

  // 3. Ocupar mesa destino con los datos de la comanda
  await updateDoc(mesaDestinoRef, {
    estado: mesaOrigen.estado,
    cuentaActivaId: cuenta.id,
    totalActual: mesaOrigen.totalActual || cuenta.total || 0,
    saldoPendiente: typeof cuenta.saldoPendiente === 'number' ? cuenta.saldoPendiente : cuenta.total || 0,
    comensales: mesaOrigen.comensales || cuenta.comensales || 1,
    mesero: mesaOrigen.mesero || cuenta.mesero || null,
    apertura: mesaOrigen.apertura || cuenta.apertura || ahora,
    actualizadoEn: ahora,
  });

  // 4. Sincronizar comandas de cocina en domicilios si existen
  if (cuenta.rondas && cuenta.rondas.length > 0) {
    for (const ronda of cuenta.rondas) {
      if (ronda.comandaId) {
        try {
          const comandaRef = doc(db, 'domicilios', ronda.comandaId);
          await updateDoc(comandaRef, {
            clienteNombre: `${mesaDestino.nombre} · Ronda ${ronda.numero}`,
            direccion: `Salón - ${mesaDestino.nombre}`,
            barrio: `Mesa ${mesaDestino.numero}`,
            actualizadoEn: ahora,
          });
        } catch (err) {
          console.warn(`No se pudo sincronizar comanda ${ronda.comandaId} tras traslado:`, err);
        }
      }
    }
  }
}

/**
 * Une dos mesas ocupadas: consolida rondas, ítems, comensales y abonos en la mesa principal,
 * registra el evento de auditoría en la cuenta principal, marca la cuenta secundaria como 'fusionada'
 * y libera la mesa secundaria para nuevos comensales.
 */
export async function unirCuentasMesas(
  negocioId: string,
  params: {
    mesaPrincipalId: string;
    mesaSecundariaId: string;
    cuentaPrincipalId: string;
    cuentaSecundariaId: string;
    motivo?: string;
    operador?: string;
  }
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const mesaPrincipalRef = doc(db, 'mesas', params.mesaPrincipalId);
  const mesaSecundariaRef = doc(db, 'mesas', params.mesaSecundariaId);
  const cuentaPrincipalRef = doc(db, 'cuentas_mesas', params.cuentaPrincipalId);
  const cuentaSecundariaRef = doc(db, 'cuentas_mesas', params.cuentaSecundariaId);

  const [mesaPPrincipalSnap, mesaSecundariaSnap, cuentaPrincipalSnap, cuentaSecundariaSnap] =
    await Promise.all([
      getDoc(mesaPrincipalRef),
      getDoc(mesaSecundariaRef),
      getDoc(cuentaPrincipalRef),
      getDoc(cuentaSecundariaRef),
    ]);

  if (
    !mesaPPrincipalSnap.exists() ||
    !mesaSecundariaSnap.exists() ||
    !cuentaPrincipalSnap.exists() ||
    !cuentaSecundariaSnap.exists()
  ) {
    throw new Error('No se encontraron todos los documentos requeridos para la unión de mesas.');
  }

  const mesaPrincipal = {
    id: mesaPPrincipalSnap.id,
    ...(mesaPPrincipalSnap.data() as Omit<Mesa, 'id'>),
  };
  const mesaSecundaria = {
    id: mesaSecundariaSnap.id,
    ...(mesaSecundariaSnap.data() as Omit<Mesa, 'id'>),
  };
  const cuentaPrincipal = {
    id: cuentaPrincipalSnap.id,
    ...(cuentaPrincipalSnap.data() as Omit<CuentaMesa, 'id'>),
  };
  const cuentaSecundaria = {
    id: cuentaSecundariaSnap.id,
    ...(cuentaSecundariaSnap.data() as Omit<CuentaMesa, 'id'>),
  };

  if (
    mesaPrincipal.negocioId !== tenantId ||
    mesaSecundaria.negocioId !== tenantId ||
    cuentaPrincipal.negocioId !== tenantId ||
    cuentaSecundaria.negocioId !== tenantId
  ) {
    throw new Error('Las mesas y cuentas no pertenecen al negocio activo.');
  }

  const validacion = validarFusionMesas(
    mesaPrincipal,
    mesaSecundaria,
    cuentaPrincipal,
    cuentaSecundaria
  );
  if (!validacion.valido) {
    throw new Error(validacion.error || 'Unión de mesas no permitida.');
  }

  const resultado = combinarCuentasMesas(
    cuentaPrincipal,
    cuentaSecundaria,
    params.motivo,
    params.operador
  );

  const ahora = Timestamp.now();
  const fusionesActuales = cuentaPrincipal.fusiones || [];

  // 1. Actualizar cuenta principal con los datos consolidados
  await updateDoc(cuentaPrincipalRef, {
    rondas: resultado.rondasCombinadas,
    items: resultado.itemsConsolidados,
    total: resultado.nuevoTotal,
    comensales: resultado.nuevosComensales,
    pagosParciales: resultado.pagosParcialesCombinados,
    totalPagado: resultado.totalPagadoCombinado,
    saldoPendiente: resultado.saldoPendienteCombinado,
    fusiones: [...fusionesActuales, resultado.eventoFusion],
    actualizadoEn: ahora,
  });

  // 2. Actualizar mesa principal con el nuevo total y comensales
  await updateDoc(mesaPrincipalRef, {
    totalActual: resultado.nuevoTotal,
    saldoPendiente: resultado.saldoPendienteCombinado,
    comensales: resultado.nuevosComensales,
    actualizadoEn: ahora,
  });

  // 3. Marcar cuenta secundaria como 'fusionada'
  await updateDoc(cuentaSecundariaRef, {
    estado: 'fusionada',
    fusionadaConCuentaId: cuentaPrincipal.id,
    fusionadaConMesaNombre: mesaPrincipal.nombre,
    cierre: ahora,
    actualizadoEn: ahora,
  });

  // 4. Liberar mesa secundaria
  await updateDoc(mesaSecundariaRef, {
    estado: 'libre',
    cuentaActivaId: null,
    totalActual: 0,
    saldoPendiente: 0,
    comensales: null,
    mesero: null,
    apertura: null,
    actualizadoEn: ahora,
  });

  // 5. Actualizar comandas pendientes en cocina de la mesa secundaria
  if (cuentaSecundaria.rondas && cuentaSecundaria.rondas.length > 0) {
    for (const ronda of cuentaSecundaria.rondas) {
      if (ronda.comandaId) {
        try {
          const comandaRef = doc(db, 'domicilios', ronda.comandaId);
          await updateDoc(comandaRef, {
            clienteNombre: `${mesaPrincipal.nombre} (Antes ${mesaSecundaria.nombre}) · Ronda ${ronda.numero}`,
            direccion: `Salón - ${mesaPrincipal.nombre}`,
            barrio: `Mesa ${mesaPrincipal.numero}`,
            actualizadoEn: ahora,
          });
        } catch (err) {
          console.warn(`No se pudo sincronizar comanda ${ronda.comandaId} tras fusión:`, err);
        }
      }
    }
  }
}
