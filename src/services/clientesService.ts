// src/services/clientesService.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { Cliente, NuevoClienteInput, RegistrarCompraClienteParams, Venta } from '@/types';
import { requireTenantId } from '@/security/tenantScope';
import { normalizarTelefono } from '@/utils/clienteUtils';

function parseFirestoreDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    return new Date(val);
  }
  return new Date();
}

function mapClienteDoc(id: string, data: Record<string, any>): Cliente {
  return {
    id,
    negocioId: data.negocioId,
    nombre: data.nombre || 'Cliente sin nombre',
    telefono: data.telefono || '',
    email: data.email || undefined,
    direcciones: Array.isArray(data.direcciones) ? data.direcciones : [],
    barrio: data.barrio || undefined,
    totalPedidos: Number.isFinite(data.totalPedidos) ? data.totalPedidos : 0,
    totalConsumido: Number.isFinite(data.totalConsumido) ? data.totalConsumido : 0,
    primerPedidoEn: parseFirestoreDate(data.primerPedidoEn),
    ultimoPedidoEn: parseFirestoreDate(data.ultimoPedidoEn),
    loDeSiempre: data.loDeSiempre
      ? {
          items: Array.isArray(data.loDeSiempre.items) ? data.loDeSiempre.items : [],
          total: Number.isFinite(data.loDeSiempre.total) ? data.loDeSiempre.total : 0,
          origen: data.loDeSiempre.origen,
          actualizadoEn: parseFirestoreDate(data.loDeSiempre.actualizadoEn),
        }
      : undefined,
    origenRegistro: data.origenRegistro || 'pos',
    notas: data.notas || undefined,
    creadoEn: parseFirestoreDate(data.creadoEn),
    actualizadoEn: parseFirestoreDate(data.actualizadoEn),
  };
}

/**
 * Obtiene todos los clientes del local activo ordenados por última compra.
 */
export async function getClientes(negocioId: string): Promise<Cliente[]> {
  const tenantId = requireTenantId(negocioId);
  try {
    const colRef = collection(db, 'clientes');
    const q = query(
      colRef,
      where('negocioId', '==', tenantId),
      orderBy('ultimoPedidoEn', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => mapClienteDoc(docSnap.id, docSnap.data()));
  } catch (error) {
    console.error('Error fetching clientes:', error);
    // Fallback sin ordenamiento si falta índice temporal
    const colRef = collection(db, 'clientes');
    const qFallback = query(colRef, where('negocioId', '==', tenantId));
    const snap = await getDocs(qFallback);
    const lista = snap.docs.map((docSnap) => mapClienteDoc(docSnap.id, docSnap.data()));
    return lista.sort((a, b) => {
      const timeA = parseFirestoreDate(a.ultimoPedidoEn).getTime();
      const timeB = parseFirestoreDate(b.ultimoPedidoEn).getTime();
      return timeB - timeA;
    });
  }
}

/**
 * Busca un cliente por número de teléfono en el local activo.
 */
export async function getClientePorTelefono(
  negocioId: string,
  telefono: string
): Promise<Cliente | null> {
  const tenantId = requireTenantId(negocioId);
  const normPhone = normalizarTelefono(telefono);
  if (!normPhone) return null;

  const colRef = collection(db, 'clientes');
  const q = query(
    colRef,
    where('negocioId', '==', tenantId),
    where('telefono', '==', normPhone),
    limit(1)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;
  const firstDoc = snap.docs[0];
  return mapClienteDoc(firstDoc.id, firstDoc.data());
}

/**
 * Registra o actualiza reactivamente los datos y el pedido recurrente ("lo de siempre")
 * de un cliente tras realizar una compra o pedido en POS, WhatsApp o Tienda.
 */
export async function registrarCompraCliente(
  negocioId: string,
  params: RegistrarCompraClienteParams
): Promise<Cliente | null> {
  const tenantId = requireTenantId(negocioId);
  const normPhone = normalizarTelefono(params.telefono);
  if (!normPhone) return null;

  try {
    const clienteExistente = await getClientePorTelefono(tenantId, normPhone);
    const ahora = Timestamp.now();
    const montoValido = Number.isFinite(params.monto) && params.monto > 0 ? params.monto : 0;

    let loDeSiempreData = clienteExistente?.loDeSiempre;
    if (params.items && params.items.length > 0) {
      loDeSiempreData = {
        items: params.items,
        total: montoValido,
        origen: params.origen,
        actualizadoEn: ahora,
      };
    }

    if (clienteExistente) {
      // Actualizar cliente existente
      const clienteRef = doc(db, 'clientes', clienteExistente.id);
      const direccionesActuales = clienteExistente.direcciones || [];
      const nuevasDirecciones = params.direccion && params.direccion.trim()
        ? Array.from(new Set([params.direccion.trim(), ...direccionesActuales])).slice(0, 5)
        : direccionesActuales;

      const updates: Record<string, any> = {
        totalPedidos: (clienteExistente.totalPedidos || 0) + 1,
        totalConsumido: (clienteExistente.totalConsumido || 0) + montoValido,
        ultimoPedidoEn: ahora,
        actualizadoEn: ahora,
        direcciones: nuevasDirecciones,
      };

      if (params.nombre && params.nombre.trim() && (!clienteExistente.nombre || clienteExistente.nombre.startsWith('Cliente '))) {
        updates.nombre = params.nombre.trim();
      }
      if (params.barrio && params.barrio.trim()) {
        updates.barrio = params.barrio.trim();
      }
      if (loDeSiempreData) {
        updates.loDeSiempre = loDeSiempreData;
      }

      await updateDoc(clienteRef, updates);
      return {
        ...clienteExistente,
        ...updates,
        primerPedidoEn: clienteExistente.primerPedidoEn,
        ultimoPedidoEn: ahora.toDate(),
        actualizadoEn: ahora.toDate(),
      };
    } else {
      // Crear nuevo cliente
      const colRef = collection(db, 'clientes');
      const nombreFinal = params.nombre && params.nombre.trim()
        ? params.nombre.trim()
        : `Cliente ${normPhone.slice(-4)}`;
      const direcciones = params.direccion && params.direccion.trim()
        ? [params.direccion.trim()]
        : [];

      const nuevoClienteData: Record<string, any> = {
        negocioId: tenantId,
        nombre: nombreFinal,
        telefono: normPhone,
        direcciones,
        barrio: params.barrio?.trim() || '',
        totalPedidos: 1,
        totalConsumido: montoValido,
        primerPedidoEn: ahora,
        ultimoPedidoEn: ahora,
        origenRegistro: params.origen || 'pos',
        creadoEn: ahora,
        actualizadoEn: ahora,
      };

      if (loDeSiempreData) {
        nuevoClienteData.loDeSiempre = loDeSiempreData;
      }

      const docRef = await addDoc(colRef, nuevoClienteData);
      return mapClienteDoc(docRef.id, nuevoClienteData);
    }
  } catch (error) {
    console.error('Error al registrar compra de cliente:', error);
    return null;
  }
}

/**
 * Revierte métricas acumuladas de compras de un cliente cuando una venta es anulada.
 */
export async function revertirCompraCliente(
  negocioId: string,
  clienteTelefono: string,
  montoVenta: number
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const normPhone = normalizarTelefono(clienteTelefono);
    if (!normPhone) return;

    const cliente = await getClientePorTelefono(tenantId, normPhone);
    if (!cliente) return;

    const clienteRef = doc(db, 'clientes', cliente.id);
    const monto = Math.max(0, Math.round(Number.isFinite(montoVenta) ? montoVenta : 0));
    const nuevoTotalConsumido = Math.max(0, cliente.totalConsumido - monto);
    const nuevoTotalPedidos = Math.max(0, cliente.totalPedidos - 1);

    await updateDoc(clienteRef, {
      totalConsumido: nuevoTotalConsumido,
      totalPedidos: nuevoTotalPedidos,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.warn('No se pudo revertir métricas de cliente en anulación:', error);
  }
}

/**
 * Registra manualmente un nuevo cliente desde el panel administrativo.
 */
export async function crearCliente(
  negocioId: string,
  input: NuevoClienteInput
): Promise<Cliente> {
  const tenantId = requireTenantId(negocioId);
  const normPhone = normalizarTelefono(input.telefono);
  if (!normPhone) {
    throw new Error('El teléfono del cliente es obligatorio');
  }

  const existente = await getClientePorTelefono(tenantId, normPhone);
  if (existente) {
    throw new Error(`Ya existe un cliente registrado con el teléfono ${formatearTelefonoVisual(normPhone)}`);
  }

  const ahora = Timestamp.now();
  const direcciones = input.direccion && input.direccion.trim() ? [input.direccion.trim()] : [];

  const nuevoClienteData: Record<string, any> = {
    negocioId: tenantId,
    nombre: input.nombre.trim(),
    telefono: normPhone,
    email: input.email?.trim() || '',
    direcciones,
    barrio: input.barrio?.trim() || '',
    notas: input.notas?.trim() || '',
    totalPedidos: 0,
    totalConsumido: 0,
    primerPedidoEn: ahora,
    ultimoPedidoEn: ahora,
    origenRegistro: input.origenRegistro || 'pos',
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const docRef = await addDoc(collection(db, 'clientes'), nuevoClienteData);
  return mapClienteDoc(docRef.id, nuevoClienteData);
}

/**
 * Actualiza los datos de un cliente existente.
 */
export async function actualizarCliente(
  negocioId: string,
  clienteId: string,
  updates: Partial<Pick<Cliente, 'nombre' | 'telefono' | 'email' | 'barrio' | 'notas' | 'direcciones'>>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const clienteRef = doc(db, 'clientes', clienteId);
  const snap = await getDoc(clienteRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('El cliente no pertenece al negocio activo');
  }

  const dataToUpdate: Record<string, any> = {
    actualizadoEn: Timestamp.now(),
  };

  if (updates.nombre !== undefined) dataToUpdate.nombre = updates.nombre.trim();
  if (updates.telefono !== undefined) {
    dataToUpdate.telefono = normalizarTelefono(updates.telefono);
  }
  if (updates.email !== undefined) dataToUpdate.email = updates.email.trim();
  if (updates.barrio !== undefined) dataToUpdate.barrio = updates.barrio.trim();
  if (updates.notas !== undefined) dataToUpdate.notas = updates.notas.trim();
  if (updates.direcciones !== undefined) {
    dataToUpdate.direcciones = Array.isArray(updates.direcciones)
      ? updates.direcciones.filter(Boolean)
      : [];
  }

  await updateDoc(clienteRef, dataToUpdate);
}

/**
 * Elimina un cliente del directorio.
 */
export async function eliminarCliente(negocioId: string, clienteId: string): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const clienteRef = doc(db, 'clientes', clienteId);
  const snap = await getDoc(clienteRef);

  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('El cliente no pertenece al negocio activo');
  }

  await deleteDoc(clienteRef);
}

/**
 * Consulta el historial cronológico de compras realizadas por un cliente.
 */
export async function getHistorialVentasCliente(
  negocioId: string,
  telefono: string
): Promise<Venta[]> {
  const tenantId = requireTenantId(negocioId);
  const normPhone = normalizarTelefono(telefono);
  if (!normPhone) return [];

  try {
    const q = query(
      collection(db, 'ventas'),
      where('negocioId', '==', tenantId),
      where('clienteTelefono', '==', normPhone),
      orderBy('fecha', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as Venta));
  } catch (error) {
    console.error('Error fetching historial ventas cliente:', error);
    // Fallback sin índice ordenado
    const qFallback = query(
      collection(db, 'ventas'),
      where('negocioId', '==', tenantId),
      where('clienteTelefono', '==', normPhone),
      limit(20)
    );
    const snap = await getDocs(qFallback);
    return snap.docs.map((docSnap) => ({
      ...docSnap.data(),
      id: docSnap.id,
    } as Venta));
  }
}

function formatearTelefonoVisual(telefono: string): string {
  if (telefono.length === 10) {
    return `${telefono.slice(0, 3)} ${telefono.slice(3, 6)} ${telefono.slice(6)}`;
  }
  return telefono;
}
