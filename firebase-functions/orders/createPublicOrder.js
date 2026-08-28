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
exports.crearPedidoPublico = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const publicOrder_1 = require("./publicOrder");
function requestIp(request) {
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
        if (typeof lastHeader !== 'string')
            return undefined;
        const addresses = lastHeader.split(',');
        return addresses[addresses.length - 1]?.trim();
    }
    return undefined;
}
exports.crearPedidoPublico = (0, https_1.onCall)({
    region: 'us-central1',
    timeoutSeconds: 15,
    memory: '256MiB',
    maxInstances: 10,
    enforceAppCheck: true,
    consumeAppCheckToken: true,
}, async (request) => {
    try {
        if (request.app?.alreadyConsumed) {
            throw new publicOrder_1.PublicOrderError('failed-precondition', 'La verificación de la solicitud ya fue usada');
        }
        const input = (0, publicOrder_1.parsePublicOrderInput)(request.data);
        const appId = request.app?.appId;
        const clientKey = (0, publicOrder_1.createPublicClientKey)(appId, requestIp(request));
        return await (0, publicOrder_1.createPublicOrderInFirestore)(admin.firestore(), input, clientKey, {
            authUid: request.auth?.uid,
            appId,
        });
    }
    catch (error) {
        if (error instanceof publicOrder_1.PublicOrderError) {
            throw new https_1.HttpsError(error.code, error.message);
        }
        console.error('Error interno al crear pedido público', {
            error: error instanceof Error ? error.message : 'unknown',
        });
        throw new https_1.HttpsError('internal', 'No fue posible crear el pedido');
    }
});
