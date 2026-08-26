import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  createStaffUserInFirebase,
  parseCreateStaffUserInput,
  StaffUserError,
} from './staffUser';

function safeErrorCode(error: unknown): string {
  if (error instanceof StaffUserError) return error.code;
  if (typeof error !== 'object' || error === null || !('code' in error)) return 'unknown';
  return String((error as { code: unknown }).code).slice(0, 80);
}

export const crearUsuarioPersonal = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 5,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
  },
  async (request) => {
    if (!request.auth?.uid || typeof request.auth.token.email !== 'string') {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión');
    }
    if (request.app?.alreadyConsumed) {
      throw new HttpsError('failed-precondition', 'La verificación de la solicitud ya fue usada');
    }

    try {
      const input = parseCreateStaffUserInput(request.data);
      return await createStaffUserInFirebase(
        admin.firestore(),
        admin.auth(),
        input,
        { uid: request.auth.uid, email: request.auth.token.email }
      );
    } catch (error) {
      if (error instanceof StaffUserError) {
        throw new HttpsError(error.code, error.message);
      }
      console.error('Error interno al crear personal', { code: safeErrorCode(error) });
      throw new HttpsError('internal', 'No fue posible crear el usuario');
    }
  }
);

