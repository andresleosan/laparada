import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  createPublicClientKey,
  createPublicOrderInFirestore,
  parsePublicOrderInput,
  PublicOrderError,
} from './publicOrder';

function requestIp(request: { rawRequest: { headers: Record<string, unknown>; ip?: string } }): string | undefined {
  if (request.rawRequest.ip) {
    return request.rawRequest.ip;
  }
  const forwarded = request.rawRequest.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const addresses = forwarded.split(',');
    return addresses[addresses.length - 1]?.trim();
  }
  if (Array.isArray(forwarded) && typeof forwarded[0] === 'string') {
    const lastHeader = forwarded[forwarded.length - 1];
    if (typeof lastHeader !== 'string') return undefined;
    const addresses = lastHeader.split(',');
    return addresses[addresses.length - 1]?.trim();
  }
  return undefined;
}

export const crearPedidoPublico = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
  },
  async (request) => {
    try {
      if (request.app?.alreadyConsumed) {
        throw new PublicOrderError('failed-precondition', 'La verificación de la solicitud ya fue usada');
      }

      const input = parsePublicOrderInput(request.data);
      const appId = request.app?.appId;
      const clientKey = createPublicClientKey(appId, requestIp(request));
      return await createPublicOrderInFirestore(admin.firestore(), input, clientKey, {
        authUid: request.auth?.uid,
        appId,
      });
    } catch (error) {
      if (error instanceof PublicOrderError) {
        throw new HttpsError(error.code, error.message);
      }
      console.error('Error interno al crear pedido público', {
        error: error instanceof Error ? error.message : 'unknown',
      });
      throw new HttpsError('internal', 'No fue posible crear el pedido');
    }
  }
);
