import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  onSnapshot,
  orderBy,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Domicilio, EstadoDomicilio, Venta } from '../types';

/**
 * Obtener domicilios activos (no entregados) para una jornada específica
 */
export async function getDomiciliosActivos(
  jornada: 'mañana' | 'noche' | 'ambas'
): Promise<Domicilio[]> {
  try {
    const domsRef = collection(db, 'domicilios');
    const q = query(
      domsRef,
      where('estado', 'in', ['pendiente', 'en_preparacion', 'en_camino']),
      where('jornada', 'in', jornada === 'ambas' ? ['mañana', 'noche'] : [jornada]),
      orderBy('estado', 'asc'),
      orderBy('creadoEn', 'desc')
    );
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
  jornada: 'mañana' | 'noche' | 'ambas'
): Promise<Domicilio[]> {
  try {
    const domsRef = collection(db, 'domicilios');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const q = query(
      domsRef,
      where('estado', '==', 'entregado'),
      where('jornada', 'in', jornada === 'ambas' ? ['mañana', 'noche'] : [jornada]),
      where('creadoEn', '>=', Timestamp.fromDate(hoy)),
      orderBy('creadoEn', 'desc')
    );
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
export async function getDomicilioById(id: string): Promise<Domicilio | null> {
  try {
    const docRef = doc(db, 'domicilios', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
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
  nuevoEstado: EstadoDomicilio
): Promise<void> {
  try {
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
  callback: (domicilios: Domicilio[]) => void
): () => void {
  const domsRef = collection(db, 'domicilios');
  const q = query(
    domsRef,
    where('estado', 'in', ['pendiente', 'en_preparacion', 'en_camino']),
    where('jornada', 'in', jornada === 'ambas' ? ['mañana', 'noche'] : [jornada]),
    orderBy('estado', 'asc'),
    orderBy('creadoEn', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const domicilios = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    } as Domicilio));
    callback(domicilios);
  });
}

/**
 * Listener para detectar NUEVOS domicilios (Fase 3: alerta sonora)
 * Útil para reproducir sonido cuando llega pedido nuevo
 */
export function onNuevoDomicilio(
  jornada: 'mañana' | 'noche' | 'ambas',
  callback: (domicilio: Domicilio) => void
): () => void {
  const domsRef = collection(db, 'domicilios');
  const ahora = new Date();
  ahora.setSeconds(ahora.getSeconds() - 5); // últimos 5 segundos

  const q = query(
    domsRef,
    where('estado', '==', 'pendiente'),
    where('jornada', 'in', jornada === 'ambas' ? ['mañana', 'noche'] : [jornada]),
    where('creadoEn', '>=', Timestamp.fromDate(ahora)),
    orderBy('creadoEn', 'desc')
  );

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
      items: domicilio.items,
      total: domicilio.total,
      metodoPago: domicilio.metodoPago || 'domicilio',
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
  items: any[],
  total: number,
  clienteNombre: string,
  clienteApellido: string,
  clienteTelefono: string,
  direccion: string,
  barrio: string,
  jornada: 'mañana' | 'noche'
): Promise<string> {
  try {
    const domiciliosRef = collection(db, 'domicilios');
    const domicilio: Omit<Domicilio, 'id'> = {
      clienteNombre: `${clienteNombre} ${clienteApellido}`,
      clienteTelefono,
      direccion,
      barrio,
      items,
      total,
      metodoPago: 'domicilio',
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
