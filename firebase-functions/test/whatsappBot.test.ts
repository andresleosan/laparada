import { describe, expect, it } from 'vitest';
import {
  parseManualWhatsAppMessageInput,
  WhatsAppMessageError,
} from '../src/bot/manualMessage';
import { parsearComandoOrden } from '../src/bot/orderProcessingService';
import { TEMPLATES_AUTO_RESPUESTA } from '../src/bot/whatsappBotService';

describe('contrato local de WhatsApp', () => {
  it('normaliza el envío manual y rechaza campos adicionales', () => {
    expect(parseManualWhatsAppMessageInput({
      negocioId: 'tenant-a',
      telefono: '+57 300 123 4567',
      contenido: 'Tu pedido está listo',
      idempotencyKey: 'mensaje_manual_123456',
    })).toEqual({
      negocioId: 'tenant-a',
      telefono: '573001234567',
      contenido: 'Tu pedido está listo',
      idempotencyKey: 'mensaje_manual_123456',
    });

    expect(() => parseManualWhatsAppMessageInput({
      negocioId: 'tenant-a',
      telefono: '3001234567',
      contenido: 'Hola',
      idempotencyKey: 'mensaje_manual_123456',
      rol: 'admin',
    })).toThrowError(WhatsAppMessageError);
  });

  it('impide reintroducir plataformas de pago en mensajes manuales', () => {
    expect(() => parseManualWhatsAppMessageInput({
      negocioId: 'tenant-a',
      telefono: '3001234567',
      contenido: 'Completa el pago online en https://example.com/checkout',
      idempotencyKey: 'mensaje_manual_123456',
    })).toThrow(/pago en línea/);
  });

  it('interpreta cantidades, medio offline y dirección por pasos', () => {
    expect(parsearComandoOrden('1x2 3 x 4')).toMatchObject({
      tipo: 'item',
      items: [1, 3],
      cantidades: [2, 4],
    });
    expect(parsearComandoOrden('transferencia')).toMatchObject({
      tipo: 'metodo_pago',
      metodoPago: 'transferencia',
    });
    expect(parsearComandoOrden('Dirección: Calle 10 #20-30 | Centro')).toMatchObject({
      tipo: 'direccion',
      direccion: 'Calle 10 #20-30',
      barrio: 'Centro',
    });
    expect(parsearComandoOrden('1abc')).toMatchObject({ tipo: 'desconocido' });
    expect(parsearComandoOrden('producto 1')).toMatchObject({ tipo: 'desconocido' });
    expect(parsearComandoOrden('1x2 basura')).toMatchObject({ tipo: 'desconocido' });
  });

  it('mantiene las plantillas sin enlaces ni proveedores de cobro', () => {
    const templates = Object.values(TEMPLATES_AUTO_RESPUESTA).join('\n').toLowerCase();
    expect(templates).not.toMatch(/https?:\/\//);
    expect(templates).not.toMatch(/pago (?:online|en línea)|https?:\/\//);
    expect(TEMPLATES_AUTO_RESPUESTA.CONFIRMAR_ORDEN).toContain('Pago offline');
  });
});
