import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { TransaccionPago, SesionPago, EstadisticasPagos, EstadoPago } from '../types';

/**
 * Crear transacción de pago
 */
export async function crearTransaccionPago(data: Omit<TransaccionPago, 'id'>): Promise<string> {
  try {
    const pagosRef = collection(db, 'transacciones_pago');
    const docRef = await addDoc(pagosRef, {
      ...data,
      creadoEn: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating transaccion pago:', error);
    throw error;
  }
}

/**
 * Actualizar estado de transacción
 */
export async function actualizarTransaccionPago(
  id: string,
  estado: EstadoPago,
  referenciaPasarela?: string,
  errorMensaje?: string
): Promise<void> {
  try {
    const docRef = doc(db, 'transacciones_pago', id);
    const update: any = {
      estado,
      actualizadoEn: Timestamp.now(),
    };

    if (estado === 'completado') {
      update.completadoEn = Timestamp.now();
    }

    if (referenciaPasarela) {
      update.referenciaPasarela = referenciaPasarela;
    }

    if (errorMensaje) {
      update.errorMensaje = errorMensaje;
    }

    await updateDoc(docRef, update);
  } catch (error) {
    console.error('Error updating transaccion pago:', error);
    throw error;
  }
}

/**
 * Obtener transacciones de una venta
 */
export async function getTransaccionesPorVenta(ventaId: string): Promise<TransaccionPago[]> {
  try {
    const pagosRef = collection(db, 'transacciones_pago');
    const q = query(pagosRef, where('ventaId', '==', ventaId), orderBy('creadoEn', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TransaccionPago));
  } catch (error) {
    console.error('Error fetching transacciones por venta:', error);
    return [];
  }
}

/**
 * Obtener todas las transacciones
 */
export async function getTodasTransacciones(): Promise<TransaccionPago[]> {
  try {
    const pagosRef = collection(db, 'transacciones_pago');
    const q = query(pagosRef, orderBy('creadoEn', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TransaccionPago));
  } catch (error) {
    console.error('Error fetching todas transacciones:', error);
    return [];
  }
}

/**
 * Obtener transacciones de hoy
 */
export async function getTransaccionesHoy(): Promise<TransaccionPago[]> {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const mañana = new Date(hoy);
    mañana.setDate(mañana.getDate() + 1);

    const pagosRef = collection(db, 'transacciones_pago');
    const q = query(
      pagosRef,
      where('creadoEn', '>=', Timestamp.fromDate(hoy)),
      where('creadoEn', '<', Timestamp.fromDate(mañana)),
      orderBy('creadoEn', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TransaccionPago));
  } catch (error) {
    console.error('Error fetching transacciones hoy:', error);
    return [];
  }
}

/**
 * Obtener transacciones por estado
 */
export async function getTransaccionesPorEstado(estado: EstadoPago): Promise<TransaccionPago[]> {
  try {
    const pagosRef = collection(db, 'transacciones_pago');
    const q = query(pagosRef, where('estado', '==', estado), orderBy('creadoEn', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TransaccionPago));
  } catch (error) {
    console.error('Error fetching transacciones por estado:', error);
    return [];
  }
}

/**
 * Calcular estadísticas de pagos
 */
export async function calcularEstadisticasPagos(
  fechaInicio?: Date,
  fechaFin?: Date
): Promise<EstadisticasPagos> {
  try {
    let transacciones = await getTodasTransacciones();

    // Filtrar por fecha si se proporciona
    if (fechaInicio && fechaFin) {
      transacciones = transacciones.filter((t) => {
        const fecha = typeof t.creadoEn === 'object' && 'toDate' in t.creadoEn
          ? (t.creadoEn as any).toDate()
          : new Date(t.creadoEn as any);
        return fecha >= fechaInicio && fecha <= fechaFin;
      });
    }

    const totalTransacciones = transacciones.length;
    const totalMonto = transacciones.reduce((sum, t) => sum + (t.monto || 0), 0);
    const transaccionesCompletadas = transacciones.filter((t) => t.estado === 'completado').length;
    const transaccionesFallidas = transacciones.filter((t) => t.estado === 'fallido').length;
    const porcentajeExito =
      totalTransacciones > 0 ? ((transaccionesCompletadas / totalTransacciones) * 100).toFixed(2) : '0';
    const montoPromedio = totalTransacciones > 0 ? totalMonto / totalTransacciones : 0;

    return {
      totalTransacciones,
      totalMonto,
      transaccionesCompletadas,
      transaccionesFallidas,
      porcentajeExito: parseFloat(porcentajeExito as string),
      montoPromedio,
    };
  } catch (error) {
    console.error('Error calculating estadisticas pagos:', error);
    return {
      totalTransacciones: 0,
      totalMonto: 0,
      transaccionesCompletadas: 0,
      transaccionesFallidas: 0,
      porcentajeExito: 0,
      montoPromedio: 0,
    };
  }
}

/**
 * Crear sesión de pago (para Stripe checkout)
 */
export async function crearSesionPago(data: Omit<SesionPago, 'id'>): Promise<string> {
  try {
    const sesionesRef = collection(db, 'sesiones_pago');
    const docRef = await addDoc(sesionesRef, {
      ...data,
      creadoEn: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating sesion pago:', error);
    throw error;
  }
}

/**
 * Obtener sesión de pago
 */
export async function getSesionPago(sesionId: string): Promise<SesionPago | null> {
  try {
    const sesionesRef = collection(db, 'sesiones_pago');
    const q = query(sesionesRef, where('id', '==', sesionId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as SesionPago;
    }
    return null;
  } catch (error) {
    console.error('Error fetching sesion pago:', error);
    return null;
  }
}

/**
 * Actualizar sesión de pago
 */
export async function actualizarSesionPago(sesionId: string, estado: 'activa' | 'completada' | 'expirada'): Promise<void> {
  try {
    const docRef = doc(db, 'sesiones_pago', sesionId);
    const update: any = { estado };

    if (estado === 'completada') {
      update.completadoEn = Timestamp.now();
    }

    await updateDoc(docRef, update);
  } catch (error) {
    console.error('Error updating sesion pago:', error);
    throw error;
  }
}
