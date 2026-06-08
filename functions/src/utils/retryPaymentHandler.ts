import * as functions from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_INTERVALS_MINUTES = [5, 15, 60]; // Reintentar a los 5min, 15min, 1h

/**
 * Scheduled function que reintenta transacciones fallidas
 * Se ejecuta cada 10 minutos
 */
export const retryFailedPayments = functions.onSchedule('every 10 minutes', async (context) => {
  try {
    console.log('Starting retry failed payments job...');

    // Obtener transacciones fallidas que pueden ser reintentar
    const failedTransactionsRef = db.collection('transacciones_pago');
    const querySnapshot = await failedTransactionsRef
      .where('estado', '==', 'fallido')
      .where('intentosFallidos', '<', MAX_RETRY_ATTEMPTS)
      .where('permiteReintentos', '==', true)
      .get();

    console.log(`Found ${querySnapshot.size} failed transactions to retry`);

    const results = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
    };

    for (const doc of querySnapshot.docs) {
      const transaction = doc.data();
      const shouldRetry = shouldRetryTransaction(transaction);

      if (shouldRetry) {
        try {
          await retryTransaction(doc.id, transaction);
          results.attempted++;
          results.succeeded++;
        } catch (error) {
          console.error(`Failed to retry transaction ${doc.id}:`, error);
          results.attempted++;
          results.failed++;

          // Marcar para no reintentar si alcanzó el máximo de intentos
          if (transaction.intentosFallidos + 1 >= MAX_RETRY_ATTEMPTS) {
            await failedTransactionsRef.doc(doc.id).update({
              permiteReintentos: false,
              ultimoIntentoPor: 'sistema',
            });
          }
        }
      }
    }

    console.log(`Retry job completed:`, results);
  } catch (error) {
    console.error('Error in retry failed payments job:', error);
  }
});

/**
 * Determina si una transacción debe ser reintentar
 */
function shouldRetryTransaction(transaction: any): boolean {
  if (!transaction.proxReintentoEn) {
    // Primer reintento - esperar 5 minutos
    const now = new Date();
    const createdAt =
      transaction.creadoEn instanceof admin.firestore.Timestamp
        ? transaction.creadoEn.toDate()
        : new Date(transaction.creadoEn);

    const minutesSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    return minutesSinceCreation >= RETRY_INTERVALS_MINUTES[0];
  }

  // Reintentos subsecuentes
  const nextRetryTime = transaction.proxReintentoEn;
  const nextRetryDate =
    nextRetryTime instanceof admin.firestore.Timestamp
      ? nextRetryTime.toDate()
      : new Date(nextRetryTime);

  return new Date() >= nextRetryDate;
}

/**
 * Reintenta una transacción fallida
 */
async function retryTransaction(transactionId: string, transaction: any): Promise<void> {
  const { pasarela, montoOriginal, clientId, metadata } = transaction;

  console.log(`Retrying transaction ${transactionId} via ${pasarela}...`);

  if (pasarela === 'stripe') {
    await retryStripePayment(transactionId, transaction);
  } else if (pasarela === 'mercadopago') {
    await retryMercadopagoPayment(transactionId, transaction);
  } else {
    throw new Error(`Unknown payment gateway: ${pasarela}`);
  }
}

/**
 * Reintenta un pago de Stripe
 */
async function retryStripePayment(transactionId: string, transaction: any): Promise<void> {
  try {
    const paymentIntentId = transaction.referenciaPasarela;

    if (!paymentIntentId) {
      throw new Error('No Stripe payment intent ID found');
    }

    // Cancelar intent anterior y crear uno nuevo
    const canceledIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    console.log(`Canceled previous payment intent: ${paymentIntentId}`);

    // Crear nuevo payment intent
    const newIntent = await stripe.paymentIntents.create({
      amount: Math.round(transaction.montoOriginal * 100), // Convertir a centavos
      currency: transaction.moneda || 'usd',
      customer: transaction.stripeCostumerId,
      metadata: {
        transactionId,
        ventaId: transaction.ventaId,
        retryAttempt: (transaction.intentosFallidos || 0) + 1,
      },
      description: transaction.descripcion,
    });

    const nextRetryIndex = Math.min(
      (transaction.intentosFallidos || 0) + 1,
      RETRY_INTERVALS_MINUTES.length - 1
    );
    const nextRetryMinutes = RETRY_INTERVALS_MINUTES[nextRetryIndex];

    const nextRetryTime = new Date();
    nextRetryTime.setMinutes(nextRetryTime.getMinutes() + nextRetryMinutes);

    // Actualizar transacción con nuevo intent
    await db.collection('transacciones_pago').doc(transactionId).update({
      referenciaPasarela: newIntent.id,
      intentosFallidos: admin.firestore.FieldValue.increment(1),
      proxReintentoEn: nextRetryTime,
      ultimoIntento: admin.firestore.FieldValue.serverTimestamp(),
      notas: `Reintento automático ${(transaction.intentosFallidos || 0) + 1}`,
    });

    console.log(`Created new Stripe payment intent: ${newIntent.id}`);
  } catch (error) {
    console.error('Error retrying Stripe payment:', error);
    throw error;
  }
}

/**
 * Reintenta un pago de MercadoPago
 */
async function retryMercadopagoPayment(transactionId: string, transaction: any): Promise<void> {
  try {
    // MercadoPago no permite "reintentar" directamente
    // En su lugar, crear una nueva preferencia de pago
    // (Se recomienda usar Webhooks para manejar esto en producción)

    const nextRetryIndex = Math.min(
      (transaction.intentosFallidos || 0) + 1,
      RETRY_INTERVALS_MINUTES.length - 1
    );
    const nextRetryMinutes = RETRY_INTERVALS_MINUTES[nextRetryIndex];

    const nextRetryTime = new Date();
    nextRetryTime.setMinutes(nextRetryTime.getMinutes() + nextRetryMinutes);

    // Marcar para reintentar después
    await db.collection('transacciones_pago').doc(transactionId).update({
      intentosFallidos: admin.firestore.FieldValue.increment(1),
      proxReintentoEn: nextRetryTime,
      ultimoIntento: admin.firestore.FieldValue.serverTimestamp(),
      notas: `Reintento automático de MercadoPago ${(transaction.intentosFallidos || 0) + 1}`,
    });

    console.log(`Marked MercadoPago transaction for retry`);
  } catch (error) {
    console.error('Error retrying MercadoPago payment:', error);
    throw error;
  }
}
