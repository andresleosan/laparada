// tests/cloudFunctionsConfiguration.test.ts
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(path), 'utf8');

describe('configuración de Cloud Functions y Google Cloud Secret Manager (laparada-26)', () => {
  it('define todos los secretos requeridos con defineSecret en integrationParams.ts', () => {
    const params = read('firebase-functions/src/config/integrationParams.ts');
    expect(params).toContain("defineSecret('WHATSAPP_ACCESS_TOKEN')");
    expect(params).toContain("defineSecret('WHATSAPP_APP_SECRET')");
    expect(params).toContain("defineSecret('WHATSAPP_WEBHOOK_VERIFY_TOKEN')");
    expect(params).toContain("defineSecret('RESEND_API_KEY')");
    expect(params).toContain("defineSecret('DEEPSEEK_API_KEY')");
  });

  it('declara valores por defecto seguros para los parámetros de integración', () => {
    const params = read('firebase-functions/src/config/integrationParams.ts');
    expect(params).toContain("default: 'laparada'");
    expect(params).toContain("default: 'v23.0'");
    expect(params).toContain("default: 'La Parada SaaS · ALS Dev Studio <alsdevstudio@alsdevstudio.com>'");
  });

  it('inyecta deepseekApiKey en las funciones que orquestan turnos de IA', () => {
    const scheduler = read('firebase-functions/src/bot/messageProcessorScheduler.ts');
    const webhook = read('firebase-functions/src/webhooks/whatsappWebhook.ts');

    expect(scheduler).toContain('secrets: [whatsappAccessToken, deepseekApiKey]');
    expect(webhook).toContain('deepseekApiKey');
  });

  it('posee el archivo de entorno de producción .env.laparada-26 con todos los parámetros operativos', () => {
    expect(existsSync(resolve('firebase-functions/.env.laparada-26'))).toBe(true);
    const envProd = read('firebase-functions/.env.laparada-26');

    expect(envProd).toContain('WHATSAPP_PHONE_NUMBER_ID=');
    expect(envProd).toContain('WHATSAPP_API_VERSION=v23.0');
    expect(envProd).toContain('WHATSAPP_NEGOCIO_ID=laparada');
    expect(envProd).toContain('EMAIL_FROM_ADDRESS=');
    expect(envProd).toContain('EMAIL_REPLY_TO=');
  });

  it('soporta autenticación anónima para visitantes de chat en chatService.ts', () => {
    const chatService = read('src/services/chatService.ts');
    expect(chatService).toContain('signInAnonymously');
    expect(chatService).toContain('auth/operation-not-allowed');
  });
});

