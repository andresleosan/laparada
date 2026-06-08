import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { TransaccionPago } from '../types';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVALS_MINUTES = [5, 15, 60];

/**
 * Habilita reintentos automáticos para una transacción
 */
export async function enablePaymentRetry(transactionId: string): Promise<void> {
  try {
    const docRef = doc(db, 'transacciones_pago', transactionId);
    await updateDoc(docRef, {
      permiteReintentos: true,
      intentosFallidos: 0,
      proxReintentoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });
    console.log(`Retry enabled for transaction ${transactionId}`);
  } catch (error) {
    console.error('Error enabling payment retry:', error);
    throw error;
  }
}

/**
 * Deshabilita reintentos automáticos para una transacción
 */
export async function disablePaymentRetry(transactionId: string): Promise<void> {
  try {
    const docRef = doc(db, 'transacciones_pago', transactionId);
    await updateDoc(docRef, {
      permiteReintentos: false,
      actualizadoEn: Timestamp.now(),
    });
    console.log(`Retry disabled for transaction ${transactionId}`);
  } catch (error) {
    console.error('Error disabling payment retry:', error);
    throw error;
  }
}

/**
 * Obtiene transacciones que pueden ser reintentar
 */
export async function getRetryablePayments(): Promise<TransaccionPago[]> {
  try {
    const pagosRef = collection(db, 'transacciones_pago');
    const q = query(
      pagosRef,
      where('estado', '==', 'fallido'),
      where('permiteReintentos', '==', true),
      where('intentosFallidos', '<', MAX_RETRY_ATTEMPTS),
      orderBy('creadoEn', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as TransaccionPago));
  } catch (error) {
    console.error('Error fetching retryable payments:', error);
    return [];
  }
}

/**
 * Obtiene el historial de reintentos de una transacción
 */
export async function getRetryHistory(transactionId: string): Promise<any[]> {
  try {
    const retryHistoryRef = collection(db, 'transacciones_pago', transactionId, 'reintentos');
    const q = query(retryHistoryRef, orderBy('fechaIntento', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching retry history:', error);
    return [];
  }
}

/**
 * Registra un intento fallido de pago
 */
export async function recordFailedPaymentAttempt(
  transactionId: string,
  errorMessage: string,
  attemptNumber: number
): Promise<void> {
  try {
    const docRef = doc(db, 'transacciones_pago', transactionId);
    const now = new Date();
    const nextRetryMinutes =
      attemptNumber < RETRY_INTERVALS_MINUTES.length
        ? RETRY_INTERVALS_MINUTES[attemptNumber]
        : RETRY_INTERVALS_MINUTES[RETRY_INTERVALS_MINUTES.length - 1];

    const nextRetryTime = new Date(now.getTime() + nextRetryMinutes * 60 * 1000);

    await updateDoc(docRef, {
      intentosFallidos: attemptNumber,
      errorMensaje: errorMessage,
      proxReintentoEn: Timestamp.fromDate(nextRetryTime),
      ultimoIntento: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    });

    // Registrar en subcollection de reintentos
    const retryHistoryRef = collection(db, 'transacciones_pago', transactionId, 'reintentos');
    await (
      await import('firebase/firestore').then((f) => f.addDoc)
    )(retryHistoryRef, {
      intentoNumero: attemptNumber,
      estado: 'fallido',
      error: errorMessage,
      fechaIntento: Timestamp.now(),
      proximoReintentoEn: nextRetryTime,
    });

    console.log(`Failed attempt recorded for transaction ${transactionId}`);
  } catch (error) {
    console.error('Error recording failed payment attempt:', error);
    throw error;
  }
}

/**
 * Marca una transacción como completada después de reintento
 */
export async function markPaymentAsRetried(
  transactionId: string,
  referenciaPasarela: string,
  attemptNumber: number
): Promise<void> {
  try {
    const docRef = doc(db, 'transacciones_pago', transactionId);
    await updateDoc(docRef, {
      estado: 'completado',
      referenciaPasarela,
      intentosFallidos: attemptNumber,
      completadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
      permiteReintentos: false,
    });

    // Registrar éxito en subcollection
    const retryHistoryRef = collection(db, 'transacciones_pago', transactionId, 'reintentos');
    await (
      await import('firebase/firestore').then((f) => f.addDoc)
    )(retryHistoryRef, {
      intentoNumero: attemptNumber,
      estado: 'exitoso',
      referenciaPasarela,
      fechaIntento: Timestamp.now(),
    });

    console.log(`Payment marked as completed after retry: ${transactionId}`);
  } catch (error) {
    console.error('Error marking payment as retried:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de reintentos
 */
export async function getRetryStatistics(): Promise<{
  totalRetryable: number;
  withoutRetry: number;
  withRetry: number;
  avgAttemptsPerTransaction: number;
}> {
  try {
    const pagosRef = collection(db, 'transacciones_pago');

    // Transacciones fallidas sin reintentos
    const noRetryQ = query(
      pagosRef,
      where('estado', '==', 'fallido'),
      where('permiteReintentos', '==', false)
    );
    const noRetrySnapshot = await getDocs(noRetryQ);

    // Transacciones fallidas con reintentos
    const withRetryQ = query(
      pagosRef,
      where('estado', '==', 'fallido'),
      where('permiteReintentos', '==', true)
    );
    const withRetrySnapshot = await getDocs(withRetryQ);

    // Calcular promedio de intentos
    const allFailedQ = query(pagosRef, where('estado', '==', 'fallido'));
    const allFailedSnapshot = await getDocs(allFailedQ);
    const totalAttempts = allFailedSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().intentosFallidos || 0);
    }, 0);
    const avgAttempts =
      allFailedSnapshot.size > 0 ? totalAttempts / allFailedSnapshot.size : 0;

    return {
      totalRetryable: noRetrySnapshot.size + withRetrySnapshot.size,
      withoutRetry: noRetrySnapshot.size,
      withRetry: withRetrySnapshot.size,
      avgAttemptsPerTransaction: parseFloat(avgAttempts.toFixed(2)),
    };
  } catch (error) {
    console.error('Error fetching retry statistics:', error);
    return {
      totalRetryable: 0,
      withoutRetry: 0,
      withRetry: 0,
      avgAttemptsPerTransaction: 0,
    };
  }
}
