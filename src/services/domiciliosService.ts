import {
  collection,
  query,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  onSnapshot,
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
    // Simple query without composite index
    const q = query(domsRef);
    const snapshot = await getDocs(q);
    
    // Filter in memory
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Domicilio))
      .filter(
        (dom) =>
          ['pendiente', 'en_preparacion', 'en_camino'].includes(dom.estado) &&
          (jornada === 'ambas' || dom.jornada === jornada)
      )
      .sort((a, b) => b.creadoEn.toMillis() - a.creadoEn.toMillis());
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

    // Simple query without composite index
    const q = query(domsRef);
    const snapshot = await getDocs(q);
    
    // Filter in memory
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Domicilio))
      .filter(
        (dom) =>
          dom.estado === 'entregado' &&
          (jornada === 'ambas' || dom.jornada === jornada) &&
          dom.creadoEn.toDate() >= hoy
      )
      .sort((a, b) => b.creadoEn.toMillis() - a.creadoEn.toMillis());
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
  callback: (domicilios: Domicilio[]) => void,
  onError?: (error: Error) => void
): () => void {
  const domsRef = collection(db, 'domicilios');
  // Simple query without composite index - filter in memory
  const q = query(domsRef);

  return onSnapshot(
    q,
    (snapshot) => {
      const domicilios = snapshot.docs
        .map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        } as Domicilio))
        .filter(
          (dom) =>
            ['pendiente', 'en_preparacion', 'en_camino'].includes(dom.estado) &&
            (jornada === 'ambas' || dom.jornada === jornada)
        )
        .sort((a, b) => b.creadoEn.toMillis() - a.creadoEn.toMillis());
      callback(domicilios);
    },
    (error) => {
      console.error('Error listening to active domicilios:', error);
      if (onError) onError(error);
      // Emitir array vacío como fallback
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
  callback: (domicilio: Domicilio) => void
): () => void {
  const domsRef = collection(db, 'domicilios');
  const ahora = new Date();
  ahora.setSeconds(ahora.getSeconds() - 5); // últimos 5 segundos

  // Simple query without composite index - filter in memory
  const q = query(domsRef);

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change: any) => {
      if (change.type === 'added') {
        const domicilio = {
          id: change.doc.id,
          ...change.doc.data(),
        } as Domicilio;
        
        // Filter in memory
        if (
          domicilio.estado === 'pendiente' &&
          (jornada === 'ambas' || domicilio.jornada === jornada) &&
          domicilio.creadoEn.toDate() >= ahora
        ) {
          callback(domicilio);
        }
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
