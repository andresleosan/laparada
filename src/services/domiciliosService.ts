import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  onSnapshot,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Domicilio, EstadoDomicilio, MetodoPago, Venta } from '../types';
import { requireTenantId } from '@/security/tenantScope';

/**
 * Obtener domicilios activos (no entregados) para una jornada específica
 */
export async function getDomiciliosActivos(
  jornada: 'mañana' | 'noche' | 'ambas',
  negocioId: string
): Promise<Domicilio[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const domsRef = collection(db, 'domicilios');
    const constraints: any[] = [
      where('negocioId', '==', tenantId),
      where('estado', 'in', ['pendiente', 'en_preparacion', 'en_camino'])
    ];
    if (jornada !== 'ambas') {
      constraints.push(where('jornada', '==', jornada));
    }
    constraints.push(orderBy('creadoEn', 'desc'));
    const q = query(domsRef, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Domicilio));
  } catch (error) {
    console.error('Error fetching domicilios activos:', error);
    return [];
  }
}

/**
 * Obtener historial de domicilios entregados (del día actual)
 */
export async function getDomiciliosEntregados(
  jornada: 'mañana' | 'noche' | 'ambas',
  negocioId: string
): Promise<Domicilio[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const domsRef = collection(db, 'domicilios');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const constraints: any[] = [
      where('negocioId', '==', tenantId),
      where('estado', '==', 'entregado'),
      where('creadoEn', '>=', Timestamp.fromDate(hoy))
    ];
    if (jornada !== 'ambas') {
      constraints.push(where('jornada', '==', jornada));
    }
    constraints.push(orderBy('creadoEn', 'desc'));
    const q = query(domsRef, ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Domicilio));
  } catch (error) {
    console.error('Error fetching domicilios entregados:', error);
    return [];
  }
}

/**
 * Obtener un domicilio por ID
 */
export async function getDomicilioById(id: string, negocioId: string): Promise<Domicilio | null> {
  try {
    const tenantId = requireTenantId(negocioId);
    const docRef = doc(db, 'domicilios', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().negocioId === tenantId) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Domicilio;
    }
    return null;
  } catch (error) {
    console.error('Error fetching domicilio:', error);
    return null;
  }
}

/**
 * Actualizar estado del domicilio
 * Flujo: pendiente → en_preparacion → en_camino → entregado
 */
export async function updateDomicilioEstado(
  id: string,
  nuevoEstado: EstadoDomicilio,
  negocioId: string
): Promise<void> {
  try {
    const domicilio = await getDomicilioById(id, negocioId);
    if (!domicilio) throw new Error('El domicilio no pertenece al negocio activo');
    const docRef = doc(db, 'domicilios', id);
    await updateDoc(docRef, { estado: nuevoEstado });
  } catch (error) {
    console.error('Error updating domicilio estado:', error);
    throw error;
  }
}

/**
 * Listener en tiempo real para domicilios activos
 * Se ejecuta cuando hay cambios en domicilios no entregados
 */
export function onDomiciliosActivosChange(
  jornada: 'mañana' | 'noche' | 'ambas',
  negocioId: string,
  callback: (domicilios: Domicilio[]) => void,
  onError?: (error: Error) => void
): () => void {
  const domsRef = collection(db, 'domicilios');
  const constraints: any[] = [
    where('negocioId', '==', requireTenantId(negocioId)),
    where('estado', 'in', ['pendiente', 'en_preparacion', 'en_camino'])
  ];
  if (jornada !== 'ambas') {
    constraints.push(where('jornada', '==', jornada));
  }
  constraints.push(orderBy('creadoEn', 'desc'));
  const q = query(domsRef, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const domicilios = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      } as Domicilio));
      callback(domicilios);
    },
    (error) => {
      console.error('Error listening to active domicilios:', error);
      if (onError) onError(error);
      callback([]);
    }
  );
}

/**
 * Listener para detectar NUEVOS domicilios (Fase 3: alerta sonora)
 * Útil para reproducir sonido cuando llega pedido nuevo
 */
export function onNuevoDomicilio(
  jornada: 'mañana' | 'noche' | 'ambas',
  negocioId: string,
  callback: (domicilio: Domicilio) => void
): () => void {
  const domsRef = collection(db, 'domicilios');
  const ahora = new Date();
  ahora.setSeconds(ahora.getSeconds() - 10); // últimos 10 segundos

  const constraints: any[] = [
    where('negocioId', '==', requireTenantId(negocioId)),
    where('estado', '==', 'pendiente'),
    where('creadoEn', '>=', Timestamp.fromDate(ahora))
  ];
  if (jornada !== 'ambas') {
    constraints.push(where('jornada', '==', jornada));
  }
  const q = query(domsRef, ...constraints);

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change: any) => {
      if (change.type === 'added') {
        const domicilio = {
          id: change.doc.id,
          ...change.doc.data(),
        } as Domicilio;
        callback(domicilio);
      }
    });
  });
}

/**
 * Crear venta cuando domicilio se marca como entregado
 * El sistema automáticamente linkea ventaId en el domicilio
 */
export async function crearVentaDesdedomicilio(
  domicilio: Domicilio
): Promise<string> {
  try {
    const ventasRef = collection(db, 'ventas');
    const venta: Omit<Venta, 'id'> = {
      negocioId: domicilio.negocioId,
      items: domicilio.items,
      total: domicilio.total,
      metodoPago: domicilio.metodoPago,
      tipoEntrega: 'domicilio',
      origen: 'pos',
      jornada: domicilio.jornada,
      fecha: Timestamp.now(),
      domicilioId: domicilio.id,
    };

    const docRef = await addDoc(ventasRef, venta);

    // Linkear ventaId en el domicilio
    await updateDoc(doc(db, 'domicilios', domicilio.id), {
      ventaId: docRef.id,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating venta from domicilio:', error);
    throw error;
  }
}

/**
 * Crear un domicilio desde POS con los items del carrito y datos del cliente
 */
export async function crearDomicilioDesdePos(
  negocioId: string,
  items: any[],
  total: number,
  metodoPago: MetodoPago,
  clienteNombre: string,
  clienteApellido: string,
  clienteTelefono: string,
  direccion: string,
  barrio: string,
  jornada: 'mañana' | 'noche'
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    const domiciliosRef = collection(db, 'domicilios');
    const domicilio: Omit<Domicilio, 'id'> = {
      negocioId: tenantId,
      clienteNombre: `${clienteNombre} ${clienteApellido}`,
      clienteTelefono,
      direccion,
      barrio,
      items,
      total,
      metodoPago,
      origen: 'pos',
      estado: 'pendiente',
      jornada,
      creadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    };

    const docRef = await addDoc(domiciliosRef, domicilio);
    return docRef.id;
  } catch (error) {
    console.error('Error creating domicilio from POS:', error);
    throw error;
  }
}
