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
exports.initializeAdminPin = exports.verifyAdminPin = exports.changeAdminPin = exports.crearUsuarioPrueba = exports.reintenrarMensajesEnError = exports.limpiarOrdenesExpiradas = exports.procesarMensajesBot = exports.retryFailedPayments = exports.whatsappWebhook = exports.mercadopagoWebhook = exports.stripeWebhook = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
// Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
    admin.initializeApp();
}
const stripeWebhook_1 = require("./webhooks/stripeWebhook");
Object.defineProperty(exports, "stripeWebhook", { enumerable: true, get: function () { return stripeWebhook_1.stripeWebhook; } });
const mercadopagoWebhook_1 = require("./webhooks/mercadopagoWebhook");
Object.defineProperty(exports, "mercadopagoWebhook", { enumerable: true, get: function () { return mercadopagoWebhook_1.mercadopagoWebhook; } });
const whatsappWebhook_1 = require("./webhooks/whatsappWebhook");
Object.defineProperty(exports, "whatsappWebhook", { enumerable: true, get: function () { return whatsappWebhook_1.whatsappWebhook; } });
const retryPaymentHandler_1 = require("./utils/retryPaymentHandler");
Object.defineProperty(exports, "retryFailedPayments", { enumerable: true, get: function () { return retryPaymentHandler_1.retryFailedPayments; } });
const messageProcessorScheduler_1 = require("./bot/messageProcessorScheduler");
Object.defineProperty(exports, "procesarMensajesBot", { enumerable: true, get: function () { return messageProcessorScheduler_1.procesarMensajesBot; } });
Object.defineProperty(exports, "limpiarOrdenesExpiradas", { enumerable: true, get: function () { return messageProcessorScheduler_1.limpiarOrdenesExpiradas; } });
Object.defineProperty(exports, "reintenrarMensajesEnError", { enumerable: true, get: function () { return messageProcessorScheduler_1.reintenrarMensajesEnError; } });
const crearUsuarioPrueba_1 = require("./scripts/crearUsuarioPrueba");
Object.defineProperty(exports, "crearUsuarioPrueba", { enumerable: true, get: function () { return crearUsuarioPrueba_1.crearUsuarioPrueba; } });
const changePinService_1 = require("./security/changePinService");
Object.defineProperty(exports, "changeAdminPin", { enumerable: true, get: function () { return changePinService_1.changeAdminPin; } });
Object.defineProperty(exports, "verifyAdminPin", { enumerable: true, get: function () { return changePinService_1.verifyAdminPin; } });
const initPin_1 = require("./initialization/initPin");
Object.defineProperty(exports, "initializeAdminPin", { enumerable: true, get: function () { return initPin_1.initializeAdminPin; } });
