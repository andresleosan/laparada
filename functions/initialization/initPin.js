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
exports.initializeAdminPin = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const db = admin.firestore();
/**
 * Cloud Function to initialize admin PIN (one-time setup)
 * This function creates the initial PIN configuration in Firestore
 * Only accessible with admin auth and should be deleted after use
 */
exports.initializeAdminPin = functions.https.onCall(async (data, context) => {
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
            throw new functions.https.HttpsError('invalid-argument', 'PIN debe ser 6 dígitos');
        }
        // Check if PIN already exists
        const configDoc = await db.collection('config').doc('admin').get();
        if (configDoc.exists) {
            throw new functions.https.HttpsError('already-exists', 'La configuración de PIN ya existe');
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
    }
    catch (error) {
        console.error('Error initializing PIN:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Error al inicializar PIN: ' + error.message);
    }
});
