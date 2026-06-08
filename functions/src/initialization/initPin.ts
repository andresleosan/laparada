import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

/**
 * Cloud Function to initialize admin PIN (one-time setup)
 * This function creates the initial PIN configuration in Firestore
 * Only accessible with admin auth and should be deleted after use
 */
export const initializeAdminPin = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { pin } = data;

    if (!pin) {
      throw new functions.https.HttpsError('invalid-argument', 'PIN requerido');
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(pin)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'PIN debe ser 6 dígitos'
      );
    }

    // Check if PIN already exists
    const configDoc = await db.collection('config').doc('admin').get();
    if (configDoc.exists) {
      throw new functions.https.HttpsError(
        'already-exists',
        'La configuración de PIN ya existe'
      );
    }

    // Hash the PIN
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    // Create the config document
    await db.collection('config').doc('admin').set({
      pinHash: pinHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: context.auth.uid,
    });

    return {
      success: true,
      message: 'PIN inicializado exitosamente',
    };
  } catch (error: any) {
    console.error('Error initializing PIN:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Error al inicializar PIN: ' + error.message
    );
  }
});
