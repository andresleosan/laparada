import { defineSecret, defineString } from 'firebase-functions/params';

export const whatsappAccessToken = defineSecret('WHATSAPP_ACCESS_TOKEN');
export const whatsappAppSecret = defineSecret('WHATSAPP_APP_SECRET');
export const whatsappWebhookVerifyToken = defineSecret('WHATSAPP_WEBHOOK_VERIFY_TOKEN');
export const resendApiKey = defineSecret('RESEND_API_KEY');
export const deepseekApiKey = defineSecret('DEEPSEEK_API_KEY');
export const deepseekApiKeySarinBot = defineSecret('DEEPSEEK_API_KEY_SARIN_BOT');

export const emailFromAddress = defineString('EMAIL_FROM_ADDRESS', {
  description: 'Remitente oficial de correos transaccionales',
  default: 'La Parada SaaS · ALS Dev Studio <alsdevstudio@alsdevstudio.com>',
});

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
  default: 'v23.0',
  input: {
    text: {
      validationRegex: /^v\d+\.\d+$/,
      validationErrorMessage: 'WHATSAPP_API_VERSION debe tener el formato vN.N',
    },
  },
});

export const whatsappNegocioId = defineString('WHATSAPP_NEGOCIO_ID', {
  description: 'Tenant propietario del número de WhatsApp',
  default: 'laparada',
  input: {
    text: {
      validationRegex: /^[A-Za-z0-9_-]{1,64}$/,
      validationErrorMessage: 'WHATSAPP_NEGOCIO_ID contiene caracteres no permitidos',
    },
  },
});

export const publicAppUrl = defineString('PUBLIC_APP_URL', {
  description: 'URL pública HTTPS del frontend para enlaces de rastreo de pedidos',
  default: 'https://laparada.pages.dev',
  input: {
    text: {
      validationRegex: /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/,
      validationErrorMessage: 'PUBLIC_APP_URL debe ser un origen HTTPS sin ruta final',
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
