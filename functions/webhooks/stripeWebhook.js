"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripeWebhook = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
});
// db se inicializa cuando se necesita (Firebase Admin ya está inicializado por index.ts)
const getDb = () => admin.firestore();
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
/**
 * Maneja webhooks de Stripe
 * Actualiza el estado de transacciones basado en eventos de Stripe
 */
exports.stripeWebhook = functions.onRequest(async (req, res) => {
    // Solo POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.rawBody, signature, WEBHOOK_SECRET);
    }
    catch (err) {
        console.error('Webhook signature verification failed:', err);
        res.status(400).json({ error: 'Webhook signature verification failed' });
        return;
    }
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentIntentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await handlePaymentIntentFailed(event.data.object);
                break;
            case 'charge.refunded':
                await handleChargeRefunded(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object);
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
/**
 * Maneja evento: payment_intent.succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
    try {
        const transactionId = paymentIntent.metadata?.transactionId;
        if (!transactionId) {
            console.warn('No transactionId in metadata');
            return;
        }
        const db = getDb();
        const transactionRef = db.collection('transacciones_pago').doc(transactionId);
        await transactionRef.update({
            estado: 'completado',
            referenciaPasarela: paymentIntent.id,
            montoConfirmado: paymentIntent.amount / 100, // Stripe usa centavos
            completadoEn: admin.firestore.FieldValue.serverTimestamp(),
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Transaction ${transactionId} marked as completed`);
    }
    catch (error) {
        console.error('Error handling payment succeeded:', error);
        throw error;
    }
}
/**
 * Maneja evento: payment_intent.payment_failed
 */
async function handlePaymentIntentFailed(paymentIntent) {
    try {
        const transactionId = paymentIntent.metadata?.transactionId;
        if (!transactionId) {
            console.warn('No transactionId in metadata');
            return;
        }
        const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';
        const db = getDb();
        const transactionRef = db.collection('transacciones_pago').doc(transactionId);
        await transactionRef.update({
            estado: 'fallido',
            referenciaPasarela: paymentIntent.id,
            errorMensaje: errorMessage,
            intentosFallidos: admin.firestore.FieldValue.increment(1),
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Transaction ${transactionId} marked as failed: ${errorMessage}`);
    }
    catch (error) {
        console.error('Error handling payment failed:', error);
        throw error;
    }
}
/**
 * Maneja evento: charge.refunded
 */
async function handleChargeRefunded(charge) {
    try {
        const transactionId = charge.metadata?.transactionId;
        if (!transactionId) {
            console.warn('No transactionId in metadata');
            return;
        }
        const db = getDb();
        const transactionRef = db.collection('transacciones_pago').doc(transactionId);
        await transactionRef.update({
            estado: 'reembolsado',
            montoReembolsado: charge.amount_refunded / 100,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Transaction ${transactionId} refunded: $${charge.amount_refunded / 100}`);
    }
    catch (error) {
        console.error('Error handling charge refunded:', error);
        throw error;
    }
}
/**
 * Maneja evento: customer.subscription.deleted
 */
async function handleSubscriptionDeleted(subscription) {
    try {
        const customerId = subscription.customer;
        console.log(`Subscription deleted for customer: ${customerId}`);
        // Aquí podrías hacer más lógica, como cancelar acceso a features premium, etc.
    }
    catch (error) {
        console.error('Error handling subscription deleted:', error);
        throw error;
    }
}
