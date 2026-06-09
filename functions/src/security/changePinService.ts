import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

/**
 * Hash a PIN using SHA256
 */
function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

/**
 * Verify if a PIN matches the hash
 */
function verifyPin(pin: string, hash: string): boolean {
  const pinHash = hashPin(pin);
  return pinHash === hash;
}

/**
 * Cloud Function to change admin PIN
 * Requires: currentPin, newPin, confirmNewPin
 * Returns: success status and message
 */
export const changeAdminPin = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { currentPin, newPin, confirmNewPin } = data;

    // Validate inputs
    if (!currentPin || !newPin || !confirmNewPin) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Faltan campos requeridos'
      );
    }

    // Validate PIN format (6 digits)
    if (!/^\d{6}$/.test(newPin)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'El nuevo PIN debe ser 6 dígitos'
      );
    }

    // Verify new PIN matches confirmation
    if (newPin !== confirmNewPin) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Los PINs nuevos no coinciden'
      );
    }

    // Verify new PIN is different from current
    if (currentPin === newPin) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'El nuevo PIN debe ser diferente al actual'
      );
    }

    // Get current PIN hash from Firestore
    const configDoc = await db.collection('config').doc('admin').get();
    const currentPinHash = configDoc.data()?.pinHash;

    if (!currentPinHash) {
      throw new functions.https.HttpsError(
        'internal',
        'No se encontró configuración de PIN'
      );
    }

    // Verify current PIN is correct
    if (!verifyPin(currentPin, currentPinHash)) {
      throw new functions.https.HttpsError('invalid-argument', 'PIN actual incorrecto');
    }

    // Hash new PIN
    const newPinHash = hashPin(newPin);

    // Update Firestore
    await db.collection('config').doc('admin').update({
      pinHash: newPinHash,
      lastPinChange: admin.firestore.FieldValue.serverTimestamp(),
      changedBy: context.auth.uid,
    });

    return {
      success: true,
      message: 'PIN cambiado exitosamente',
    };
  } catch (error: any) {
    console.error('Error changing PIN:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Error al cambiar el PIN: ' + error.message
    );
  }
});

/**
 * Cloud Function to verify admin PIN
 * Used by client to validate PIN without exposing it
 */
export const verifyAdminPin = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }

    const { pin } = data;

    if (!pin) {
      throw new functions.https.HttpsError('invalid-argument', 'PIN requerido');
    }

    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    // Leer estado de intentos
    const attemptsRef = db.collection('pin_attempts').doc(context.auth.uid);
    const attemptsDoc = await attemptsRef.get();
    const now = admin.firestore.Timestamp.now();

    if (attemptsDoc.exists) {
      const attemptData = attemptsDoc.data()!;
      if (attemptData.lockedUntil && attemptData.lockedUntil.toMillis() > now.toMillis()) {
        const minutesLeft = Math.ceil((attemptData.lockedUntil.toMillis() - now.toMillis()) / 60000);
        throw new functions.https.HttpsError(
          'resource-exhausted',
          `Demasiados intentos. Intenta en ${minutesLeft} minuto(s).`
        );
      }
    }

    const configDoc = await db.collection('config').doc('admin').get();
    const pinHash = configDoc.data()?.pinHash;

    if (!pinHash) {
      throw new functions.https.HttpsError(
        'internal',
        'No se encontró configuración de PIN'
      );
    }

    const isValid = verifyPin(pin, pinHash);

    if (!isValid) {
      const count = attemptsDoc.exists ? (attemptsDoc.data()?.count ?? 0) : 0;
      await attemptsRef.set({
        count: count + 1,
        lockedUntil: (count + 1) >= MAX_ATTEMPTS
          ? admin.firestore.Timestamp.fromMillis(now.toMillis() + LOCKOUT_MINUTES * 60000)
          : null,
        lastAttempt: now
      }, { merge: true });
    } else {
      await attemptsRef.set({ count: 0, lockedUntil: null }, { merge: true });
    }

    return {
      valid: isValid,
    };
  } catch (error: any) {
    console.error('Error verifying PIN:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Error al verificar el PIN'
    );
  }
});
