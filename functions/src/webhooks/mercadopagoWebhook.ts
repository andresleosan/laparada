import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

const db = admin.firestore();
const MERCADOPAGO_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN || '';

/**
 * Tipos para MercadoPago webhooks
 */
interface MercadoPagoPayment {
  id: number;
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back';
  status_detail: string;
  external_reference?: string;
  transaction_amount?: number;
  transaction_details?: {
    net_received_amount?: number;
  };
}

/**
 * Maneja webhooks de MercadoPago
 * Actualiza el estado de transacciones basado en eventos de MercadoPago
 */
export const mercadopagoWebhook = functions.onRequest(async (req, res) => {
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
  } catch (error) {
    console.error('Error processing MercadoPago webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Obtiene detalles del pago de MercadoPago API
 */
async function getMercadopagoPaymentDetails(paymentId: number): Promise<MercadoPagoPayment | null> {
  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching MercadoPago payment details:', error);
    return null;
  }
}

/**
 * Mapea estado de MercadoPago a estado interno
 */
function mapMercadopagoStatus(
  status: MercadoPagoPayment['status'],
  statusDetail: string
): { estado: string; errorMensaje?: string } {
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
async function handleMercadopagoPayment(data: any) {
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

    const { estado, errorMensaje } = mapMercadopagoStatus(
      paymentDetails.status,
      paymentDetails.status_detail
    );

    const updateData: any = {
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
  } catch (error) {
    console.error('Error handling MercadoPago payment:', error);
    throw error;
  }
}
