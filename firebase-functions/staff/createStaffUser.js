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
exports.crearUsuarioPersonal = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const staffUser_1 = require("./staffUser");
function safeErrorCode(error) {
    if (error instanceof staffUser_1.StaffUserError)
        return error.code;
    if (typeof error !== 'object' || error === null || !('code' in error))
        return 'unknown';
    return String(error.code).slice(0, 80);
}
exports.crearUsuarioPersonal = (0, https_1.onCall)({
    region: 'us-central1',
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 5,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
}, async (request) => {
    if (!request.auth?.uid || typeof request.auth.token.email !== 'string') {
        throw new https_1.HttpsError('unauthenticated', 'Debes iniciar sesión');
    }
    if (request.app?.alreadyConsumed) {
        throw new https_1.HttpsError('failed-precondition', 'La verificación de la solicitud ya fue usada');
    }
    try {
        const input = (0, staffUser_1.parseCreateStaffUserInput)(request.data);
        return await (0, staffUser_1.createStaffUserInFirebase)(admin.firestore(), admin.auth(), input, { uid: request.auth.uid, email: request.auth.token.email });
    }
    catch (error) {
        if (error instanceof staffUser_1.StaffUserError) {
            throw new https_1.HttpsError(error.code, error.message);
        }
        console.error('Error interno al crear personal', { code: safeErrorCode(error) });
        throw new https_1.HttpsError('internal', 'No fue posible crear el usuario');
    }
});
