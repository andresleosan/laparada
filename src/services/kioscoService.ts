import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { CrearPedidoKioscoInput, Domicilio, MetodoPago } from '@/types';
import { requireTenantId } from '@/security/tenantScope';
import { calcularTotalKiosco, generarNumeroTurno } from '@/utils/kioscoTurnosUtils';
import { registrarCompraCliente } from '@/services/clientesService';

/**
 * Consulta el último número correlativo de turno emitido en la jornada.
 */
export async function getUltimoTurnoDelDia(negocioId: string): Promise<number> {
  const tenantId = requireTenantId(negocioId);
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'domicilios'),
      where('negocioId', '==', tenantId),
      where('creadoEn', '>=', Timestamp.fromDate(hoy)),
      orderBy('creadoEn', 'desc'),
      limit(20)
    );

    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      if (data.numeroTurno && typeof data.numeroTurno === 'string') {
        const num = parseInt(data.numeroTurno.replace(/[^0-9]/g, ''), 10);
        if (Number.isFinite(num) && num > 0) {
          return num;
        }
      }
    }
    return snap.size;
  } catch (err) {
    console.warn('Error consultando correlativo de turnos de hoy:', err);
    return 0;
  }
}

/**
 * Registra un pedido realizado desde la terminal de autoservicio (Kiosco).
 * Emite la comanda en la colección 'domicilios' con estado 'pendiente', origen 'kiosco',
 * y genera el número de turno secuencial para el cobro en caja y pantalla de llamados.
 */
export async function crearPedidoKiosco(
  negocioId: string,
  input: CrearPedidoKioscoInput
): Promise<{ id: string; numeroTurno: string; total: number }> {
  const tenantId = requireTenantId(negocioId);

  const clienteNombre = (input.clienteNombre || '').trim();
  if (!clienteNombre) {
    throw new Error('El nombre del cliente es obligatorio para el turno');
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('El pedido debe contener al menos un producto');
  }

  const totalCalculado = calcularTotalKiosco(input.items);
  if (totalCalculado <= 0) {
    throw new Error('El total del pedido debe ser mayor a cero');
  }

  // Obtener siguiente número de turno
  const ultimoNumero = await getUltimoTurnoDelDia(tenantId);
  const numeroTurno = generarNumeroTurno(ultimoNumero + 1, 'K');

  const ahora = Timestamp.now();
  const esSalon = input.tipoServicio === 'salon';
  const mesaInfo = input.mesaNumero ? `Mesa ${input.mesaNumero}` : 'Salón';

  const nuevoPedidoData: Omit<Domicilio, 'id'> = {
    negocioId: tenantId,
    clienteNombre,
    clienteTelefono: (input.clienteTelefono || '').trim(),
    direccion: esSalon ? `Salón - ${mesaInfo}` : 'Para Llevar',
    barrio: esSalon ? mesaInfo : 'Kiosco',
    items: input.items,
    total: totalCalculado,
    metodoPago: input.metodoPago || 'efectivo',
    origen: 'kiosco',
    estado: 'pendiente',
    pagado: false,
    numeroTurno,
    tipoServicio: input.tipoServicio,
    mesaNumero: input.mesaNumero || undefined,
    notas: input.notas ? input.notas.trim() : undefined,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };

  const docRef = await addDoc(collection(db, 'domicilios'), nuevoPedidoData);

  // Registro asíncrono no bloqueante en el directorio de clientes si aportó teléfono
  if (input.clienteTelefono && input.clienteTelefono.trim().length >= 7) {
    registrarCompraCliente(tenantId, {
      telefono: input.clienteTelefono.trim(),
      nombre: clienteNombre,
      direccion: esSalon ? `Salón ${mesaInfo}` : 'Kiosco',
      barrio: 'Kiosco',
      monto: totalCalculado,
      items: input.items,
      origen: 'kiosco',
    }).catch((err) => console.warn('Error asociando cliente desde kiosco:', err));
  }

  return {
    id: docRef.id,
    numeroTurno,
    total: totalCalculado,
  };
}

/**
 * Consulta pedidos de kiosco pendientes de cobro en caja.
 */
export async function getPedidosKioscoPendientes(negocioId: string): Promise<Domicilio[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, 'domicilios'),
    where('negocioId', '==', tenantId),
    where('origen', '==', 'kiosco'),
    where('estado', '==', 'pendiente'),
    orderBy('creadoEn', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    ...d.data(),
    id: d.id,
  } as Domicilio));
}

/**
 * Listener en tiempo real para pedidos de kiosco pendientes de cobro en caja.
 */
export function onPedidosKioscoPendientesChange(
  negocioId: string,
  callback: (pedidos: Domicilio[]) => void,
  onError?: (err: Error) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, 'domicilios'),
    where('negocioId', '==', tenantId),
    where('origen', '==', 'kiosco'),
    where('estado', '==', 'pendiente'),
    orderBy('creadoEn', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const pedidos = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      } as Domicilio));
      callback(pedidos);
    },
    (err) => {
      console.error('Error escuchando pedidos pendientes de kiosco:', err);
      if (onError) onError(err);
      callback([]);
    }
  );
}

/**
 * Marca un pedido de kiosco como pagado en caja y lo envía a preparación en cocina.
 */
export async function marcarPedidoKioscoPagado(
  negocioId: string,
  pedidoId: string,
  metodoPago: MetodoPago
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const pedidoRef = doc(db, 'domicilios', pedidoId);

  const snap = await getDoc(pedidoRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('El pedido no pertenece al negocio activo');
  }

  await updateDoc(pedidoRef, {
    pagado: true,
    metodoPago,
    estado: 'en_preparacion',
    actualizadoEn: Timestamp.now(),
  });
}
