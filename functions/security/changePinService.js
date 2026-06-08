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
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdminPin = exports.changeAdminPin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
/**
 * Hash a PIN using SHA256
 */
function hashPin(pin) {
    return crypto.createHash('sha256').update(pin).digest('hex');
}
/**
 * Verify if a PIN matches the hash
 */
function verifyPin(pin, hash) {
    const pinHash = hashPin(pin);
    return pinHash === hash;
}
/**
 * Cloud Function to change admin PIN
 * Requires: currentPin, newPin, confirmNewPin
 * Returns: success status and message
 */
exports.changeAdminPin = functions.https.onCall(async (data, context) => {
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }
        const { currentPin, newPin, confirmNewPin } = data;
        // Validate inputs
        if (!currentPin || !newPin || !confirmNewPin) {
            throw new functions.https.HttpsError('invalid-argument', 'Faltan campos requeridos');
        }
        // Validate PIN format (6 digits)
        if (!/^\d{6}$/.test(newPin)) {
            throw new functions.https.HttpsError('invalid-argument', 'El nuevo PIN debe ser 6 dígitos');
        }
        // Verify new PIN matches confirmation
        if (newPin !== confirmNewPin) {
            throw new functions.https.HttpsError('invalid-argument', 'Los PINs nuevos no coinciden');
        }
        // Verify new PIN is different from current
        if (currentPin === newPin) {
            throw new functions.https.HttpsError('invalid-argument', 'El nuevo PIN debe ser diferente al actual');
        }
        // Get current PIN hash from Firestore
        const configDoc = await db.collection('config').doc('admin').get();
        const currentPinHash = configDoc.data()?.pinHash;
        if (!currentPinHash) {
            throw new functions.https.HttpsError('internal', 'No se encontró configuración de PIN');
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
    }
    catch (error) {
        console.error('Error changing PIN:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al cambiar el PIN: ' + error.message);
    }
});
/**
 * Cloud Function to verify admin PIN
 * Used by client to validate PIN without exposing it
 */
exports.verifyAdminPin = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
        }
        const { pin } = data;
        if (!pin) {
            throw new functions.https.HttpsError('invalid-argument', 'PIN requerido');
        }
        const configDoc = await db.collection('config').doc('admin').get();
        const pinHash = configDoc.data()?.pinHash;
        if (!pinHash) {
            throw new functions.https.HttpsError('internal', 'No se encontró configuración de PIN');
        }
        const isValid = verifyPin(pin, pinHash);
        return {
            valid: isValid,
        };
    }
    catch (error) {
        console.error('Error verifying PIN:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al verificar el PIN');
    }
});
