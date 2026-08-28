import { defineSecret, defineString } from 'firebase-functions/params';

export const whatsappAccessToken = defineSecret('WHATSAPP_ACCESS_TOKEN');
export const whatsappAppSecret = defineSecret('WHATSAPP_APP_SECRET');
export const whatsappWebhookVerifyToken = defineSecret('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
export const removeBgApiKey = defineSecret('REMOVE_BG_API_KEY');

export const whatsappPhoneNumberId = defineString('WHATSAPP_PHONE_NUMBER_ID', {
  description: 'Identificador del número de WhatsApp Business en Meta',
  input: {
    text: {
      validationRegex: /^\d+$/,
      validationErrorMessage: 'WHATSAPP_PHONE_NUMBER_ID debe contener solo dígitos',
    },
  },
});

export const whatsappApiVersion = defineString('WHATSAPP_API_VERSION', {
  description: 'Versión habilitada de Graph API, por ejemplo v26.0',
  input: {
    text: {
      validationRegex: /^v\d+\.\d+$/,
      validationErrorMessage: 'WHATSAPP_API_VERSION debe tener el formato vN.N',
    },
  },
});

export const whatsappNegocioId = defineString('WHATSAPP_NEGOCIO_ID', {
  description: 'Tenant propietario del número de WhatsApp',
  input: {
    text: {
      validationRegex: /^[A-Za-z0-9_-]{1,64}$/,
      validationErrorMessage: 'WHATSAPP_NEGOCIO_ID contiene caracteres no permitidos',
    },
  },
});

export function requireConfiguredValue(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${name} is not configured`);
  }
  return normalized;
}
