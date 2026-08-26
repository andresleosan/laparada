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
exports.reintenrarMensajesEnError = exports.limpiarOrdenesExpiradas = exports.procesarMensajesBot = exports.whatsappWebhook = exports.enviarMensajeWhatsAppManual = exports.crearUsuarioPersonal = exports.crearPedidoPublico = void 0;
// functions/src/index.ts
const admin = __importStar(require("firebase-admin"));
// Inicializar Firebase Admin una sola vez
if (!admin.apps.length) {
    admin.initializeApp();
}
const whatsappWebhook_1 = require("./webhooks/whatsappWebhook");
Object.defineProperty(exports, "whatsappWebhook", { enumerable: true, get: function () { return whatsappWebhook_1.whatsappWebhook; } });
const messageProcessorScheduler_1 = require("./bot/messageProcessorScheduler");
Object.defineProperty(exports, "procesarMensajesBot", { enumerable: true, get: function () { return messageProcessorScheduler_1.procesarMensajesBot; } });
Object.defineProperty(exports, "limpiarOrdenesExpiradas", { enumerable: true, get: function () { return messageProcessorScheduler_1.limpiarOrdenesExpiradas; } });
Object.defineProperty(exports, "reintenrarMensajesEnError", { enumerable: true, get: function () { return messageProcessorScheduler_1.reintenrarMensajesEnError; } });
const createPublicOrder_1 = require("./orders/createPublicOrder");
Object.defineProperty(exports, "crearPedidoPublico", { enumerable: true, get: function () { return createPublicOrder_1.crearPedidoPublico; } });
const createStaffUser_1 = require("./staff/createStaffUser");
Object.defineProperty(exports, "crearUsuarioPersonal", { enumerable: true, get: function () { return createStaffUser_1.crearUsuarioPersonal; } });
const sendWhatsAppMessage_1 = require("./bot/sendWhatsAppMessage");
Object.defineProperty(exports, "enviarMensajeWhatsAppManual", { enumerable: true, get: function () { return sendWhatsAppMessage_1.enviarMensajeWhatsAppManual; } });
