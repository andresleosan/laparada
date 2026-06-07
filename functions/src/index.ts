// functions/src/index.ts
import * as functions from 'firebase-functions/v2/https';

/**
 * TODO: Implementar Cloud Functions en fases posteriores
 * - whatsappWebhook: Manejo de webhooks de Meta
 * - createDomicilio: Crear pedido desde bot
 * - updateDomicilioStatus: Actualizar estado de domicilio
 * - generateMenuFromDB: Generar menú dinámico
 */

export const hello = functions.onRequest((req, res) => {
  res.json({ message: 'Cloud Functions - La Parada' });
});
