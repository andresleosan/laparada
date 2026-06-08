import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const db = admin.firestore();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Maneja webhooks de Stripe
 * Actualiza el estado de transacciones basado en eventos de Stripe
 */
export const stripeWebhook = functions.onRequest(async (req, res) => {
  // Solo POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({ error: 'Missing signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Webhook signature verification failed' });
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Maneja evento: payment_intent.succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const transactionId = paymentIntent.metadata?.transactionId;
    if (!transactionId) {
      console.warn('No transactionId in metadata');
      return;
    }

    const transactionRef = db.collection('transacciones_pago').doc(transactionId);
    await transactionRef.update({
      estado: 'completado',
      referenciaPasarela: paymentIntent.id,
      montoConfirmado: paymentIntent.amount / 100, // Stripe usa centavos
      completadoEn: admin.firestore.FieldValue.serverTimestamp(),
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Transaction ${transactionId} marked as completed`);
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

/**
 * Maneja evento: payment_intent.payment_failed
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const transactionId = paymentIntent.metadata?.transactionId;
    if (!transactionId) {
      console.warn('No transactionId in metadata');
      return;
    }

    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

    const transactionRef = db.collection('transacciones_pago').doc(transactionId);
    await transactionRef.update({
      estado: 'fallido',
      referenciaPasarela: paymentIntent.id,
      errorMensaje: errorMessage,
      intentosFallidos: admin.firestore.FieldValue.increment(1),
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Transaction ${transactionId} marked as failed: ${errorMessage}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}

/**
 * Maneja evento: charge.refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const transactionId = charge.metadata?.transactionId;
    if (!transactionId) {
      console.warn('No transactionId in metadata');
      return;
    }

    const transactionRef = db.collection('transacciones_pago').doc(transactionId);
    await transactionRef.update({
      estado: 'reembolsado',
      montoReembolsado: charge.amount_refunded / 100,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Transaction ${transactionId} refunded: $${charge.amount_refunded / 100}`);
  } catch (error) {
    console.error('Error handling charge refunded:', error);
    throw error;
  }
}

/**
 * Maneja evento: customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    console.log(`Subscription deleted for customer: ${customerId}`);

    // Aquí podrías hacer más lógica, como cancelar acceso a features premium, etc.
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}
