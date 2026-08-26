import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(path), 'utf8');

describe('frontera activa de WhatsApp', () => {
  it('expone un solo webhook y un único envío manual de backend', () => {
    const index = read('functions/src/index.ts');
    const client = read('src/services/whatsappService.ts');
    expect(index).toContain('whatsappWebhook');
    expect(index).toContain('enviarMensajeWhatsAppManual');
    expect(client).toContain("httpsCallable");
    expect(client).toContain("'enviarMensajeWhatsAppManual'");
    expect(client).not.toContain('addDoc');
    expect(client).not.toMatch(/simulad|twilio/i);
  });

  it('encola entradas de forma atómica y enlaza cada salida con la referencia de Meta', () => {
    const webhook = read('functions/src/webhooks/whatsappWebhook.ts');
    const delivery = read('functions/src/bot/manualMessage.ts');
    const scheduler = read('functions/src/bot/messageProcessorScheduler.ts');
    expect(webhook).toContain("collection('bot_queue')");
    expect(webhook).toContain('runTransaction');
    expect(delivery).toContain('referenciaWhatsapp');
    expect(delivery).toContain("estado: 'enviado'");
    expect(scheduler).toContain('enviarRespuestaQueue');
    expect(scheduler).toContain('guardarResultadoQueue');
    expect(scheduler).not.toMatch(/Juan Pérez|3012345678|TODO: Implementar rastreo/);
  });

  it('liga cada mutación de orden al queueId y conserva referencias estables de catálogo', () => {
    const orderFlow = read('functions/src/bot/orderProcessingService.ts');
    const menu = read('functions/src/bot/menuGenerationService.ts');
    const scheduler = read('functions/src/bot/messageProcessorScheduler.ts');
    const rules = read('firestore.rules');
    expect(scheduler).toContain('queueId,');
    expect(orderFlow).toContain("collection('_ordenes_whatsapp_activas')");
    expect(orderFlow).toContain('persistQueueResult(transaction, operation, result)');
    expect(menu).toContain("catalogoTipo: 'producto' | 'combo'");
    expect(orderFlow).toContain(".doc(item.productoId)");
    expect(rules).toContain('match /_ordenes_whatsapp_activas/{registroId}');
  });

  it('mantiene retirados los handlers y reintentos simulados', () => {
    const retiredPaths = [
      'functions/src/webhook/whatsappHandler.ts',
      'functions/src/webhook/menuBuilder.ts',
      'functions/src/bot/deliveryTrackingService.ts',
      'src/services/messageDeliveryService.ts',
      'src/hooks/useAdvancedIntegrations.ts',
      'src/context/BotContext.tsx',
    ];
    for (const path of retiredPaths) {
      expect(existsSync(resolve(path)), `${path} debe permanecer retirado`).toBe(false);
    }
    expect(read('src/services/botConfigService.ts')).not.toMatch(/placeholder|validateWebhookSignature/i);
  });

  it('no introduce enlaces ni plataformas de cobro en el runtime de WhatsApp', () => {
    const runtime = [
      'functions/src/bot/whatsappBotService.ts',
      'functions/src/bot/orderProcessingService.ts',
      'functions/src/bot/messageProcessorScheduler.ts',
      'src/services/whatsappService.ts',
    ].map(read).join('\n').toLowerCase();
    expect(runtime).not.toMatch(/mercado\s*pago|stripe|paypal|payu|wompi/);
    expect(runtime).not.toMatch(/https?:\/\/[^\s'"`]*(checkout|payment|pay\b)/);
    expect(runtime).not.toContain("metodopago: 'pendiente'");
  });
});
