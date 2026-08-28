"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappNegocioId = exports.whatsappApiVersion = exports.whatsappPhoneNumberId = exports.removeBgApiKey = exports.whatsappWebhookVerifyToken = exports.whatsappAppSecret = exports.whatsappAccessToken = void 0;
exports.requireConfiguredValue = requireConfiguredValue;
const params_1 = require("firebase-functions/params");
exports.whatsappAccessToken = (0, params_1.defineSecret)('WHATSAPP_ACCESS_TOKEN');
exports.whatsappAppSecret = (0, params_1.defineSecret)('WHATSAPP_APP_SECRET');
exports.whatsappWebhookVerifyToken = (0, params_1.defineSecret)('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
exports.removeBgApiKey = (0, params_1.defineSecret)('REMOVE_BG_API_KEY');
exports.whatsappPhoneNumberId = (0, params_1.defineString)('WHATSAPP_PHONE_NUMBER_ID', {
    description: 'Identificador del número de WhatsApp Business en Meta',
    input: {
        text: {
            validationRegex: /^\d+$/,
            validationErrorMessage: 'WHATSAPP_PHONE_NUMBER_ID debe contener solo dígitos',
        },
    },
});
exports.whatsappApiVersion = (0, params_1.defineString)('WHATSAPP_API_VERSION', {
    description: 'Versión habilitada de Graph API, por ejemplo v26.0',
    input: {
        text: {
            validationRegex: /^v\d+\.\d+$/,
            validationErrorMessage: 'WHATSAPP_API_VERSION debe tener el formato vN.N',
        },
    },
});
exports.whatsappNegocioId = (0, params_1.defineString)('WHATSAPP_NEGOCIO_ID', {
    description: 'Tenant propietario del número de WhatsApp',
    input: {
        text: {
            validationRegex: /^[A-Za-z0-9_-]{1,64}$/,
            validationErrorMessage: 'WHATSAPP_NEGOCIO_ID contiene caracteres no permitidos',
        },
    },
});
function requireConfiguredValue(value, name) {
    const normalized = value.trim();
    if (!normalized) {
        throw new Error(`${name} is not configured`);
    }
    return normalized;
}
