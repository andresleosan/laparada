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
exports.mercadopagoWebhook = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const db = admin.firestore();
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
/**
 * Maneja webhooks de MercadoPago
 * Actualiza el estado de transacciones basado en eventos de MercadoPago
 */
exports.mercadopagoWebhook = functions.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        const { type, data } = req.body;
        // MercadoPago envía tipos como 'payment'
        if (type === 'payment') {
            await handleMercadopagoPayment(data);
        }
        res.json({ received: true });
    }
    catch (error) {
        console.error('Error processing MercadoPago webhook:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
/**
 * Obtiene detalles del pago de MercadoPago API
 */
async function getMercadopagoPaymentDetails(paymentId) {
    try {
        const response = await axios_1.default.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
            },
        });
        return response.data;
    }
    catch (error) {
        console.error('Error fetching MercadoPago payment details:', error);
        return null;
    }
}
/**
 * Mapea estado de MercadoPago a estado interno
 */
function mapMercadopagoStatus(status, statusDetail) {
    switch (status) {
        case 'approved':
            return { estado: 'completado' };
        case 'pending':
            return { estado: 'procesando' };
        case 'authorized':
            return { estado: 'procesando' };
        case 'in_process':
            return { estado: 'procesando' };
        case 'in_mediation':
            return { estado: 'procesando', errorMensaje: 'En mediación' };
        case 'rejected':
            return { estado: 'fallido', errorMensaje: statusDetail };
        case 'cancelled':
            return { estado: 'cancelado', errorMensaje: 'Cancelado por usuario' };
        case 'refunded':
            return { estado: 'reembolsado' };
        case 'charged_back':
            return { estado: 'fallido', errorMensaje: 'Chargeback' };
        default:
            return { estado: 'procesando', errorMensaje: `Status desconocido: ${status}` };
    }
}
/**
 * Maneja evento de pago de MercadoPago
 */
async function handleMercadopagoPayment(data) {
    try {
        const paymentId = data.id;
        if (!paymentId) {
            console.warn('No payment ID in webhook data');
            return;
        }
        // Obtener detalles completos del pago
        const paymentDetails = await getMercadopagoPaymentDetails(paymentId);
        if (!paymentDetails) {
            console.error(`Could not fetch payment details for ${paymentId}`);
            return;
        }
        const transactionId = paymentDetails.external_reference;
        if (!transactionId) {
            console.warn('No external_reference (transactionId) in payment details');
            return;
        }
        const { estado, errorMensaje } = mapMercadopagoStatus(paymentDetails.status, paymentDetails.status_detail);
        const updateData = {
            estado,
            referenciaPasarela: `mp_${paymentId}`,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (estado === 'completado') {
            updateData.montoConfirmado = paymentDetails.transaction_amount;
            updateData.montoRecibido = paymentDetails.transaction_details?.net_received_amount;
            updateData.completadoEn = admin.firestore.FieldValue.serverTimestamp();
        }
        if (errorMensaje) {
            updateData.errorMensaje = errorMensaje;
        }
        if (estado === 'reembolsado') {
            updateData.montoReembolsado = paymentDetails.transaction_amount;
        }
        if (estado === 'fallido') {
            updateData.intentosFallidos = admin.firestore.FieldValue.increment(1);
        }
        const transactionRef = db.collection('transacciones_pago').doc(transactionId);
        await transactionRef.update(updateData);
        console.log(`Transaction ${transactionId} updated to status: ${estado}`);
    }
    catch (error) {
        console.error('Error handling MercadoPago payment:', error);
        throw error;
    }
}
