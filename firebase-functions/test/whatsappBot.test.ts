import { describe, expect, it, vi } from 'vitest';
import {
  buildLaParadaSystemPrompt,
  cleanDeepSeekReply,
  LA_PARADA_ORDER_TOOLS,
  runLaParadaOrderAgent,
} from '../src/ai/deepseekEngine';
import { executeLaParadaOrderTool } from '../src/bot/aiOrderOrchestrator';
import {
  parseManualWhatsAppMessageInput,
  WhatsAppMessageError,
} from '../src/bot/manualMessage';
import { resolveComboPrice } from '../src/bot/menuGenerationService';
import {
  buildWhatsAppSaleItem,
  parsearComandoOrden,
} from '../src/bot/orderProcessingService';
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

  it('resuelve precioEspecial de combos del catálogo y conserva compatibilidad con precioCombo', () => {
    expect(resolveComboPrice({ precioEspecial: 38_000 })).toBe(38_000);
    expect(resolveComboPrice({ precioCombo: 25_000 })).toBe(25_000);
    expect(resolveComboPrice({ precioEspecial: 38_000, precioCombo: 25_000 })).toBe(38_000);
    expect(Number.isNaN(resolveComboPrice({ precioEspecial: 0 }))).toBe(true);
  });

  it('construye ItemVenta compatible con analytics del frontend (tipo, referenciaId y precioUnitario)', () => {
    const item = buildWhatsAppSaleItem({
      catalogoTipo: 'combo',
      referenciaId: 'combo-pareja',
      nombre: 'Combo Pareja',
      cantidad: 2,
      precioUnitario: 38_000,
    });

    expect(item).toEqual({
      tipo: 'combo',
      referenciaId: 'combo-pareja',
      id: 'combo-pareja',
      nombre: 'Combo Pareja',
      cantidad: 2,
      precioUnitario: 38_000,
      precio: 38_000,
      subtotal: 76_000,
      categoria: 'combo',
    });
  });

  it('limpia etiquetas <think> y bloquea enlaces de cobro en respuestas del motor DeepSeek', () => {
    expect(cleanDeepSeekReply('<think>razonamiento interno</think>Hola, ¿qué deseas pedir?')).toBe(
      'Hola, ¿qué deseas pedir?'
    );
    expect(() =>
      cleanDeepSeekReply('Completa el pago online en https://example.com/checkout')
    ).toThrow(/pago en línea/);
  });

  it('ejecuta el bucle de Tool Calling (patrón Sarin Bot) para armar y confirmar un pedido', async () => {
    const completeChatMock = vi
      .fn()
      .mockResolvedValueOnce({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'modificar_carrito',
              arguments: JSON.stringify({
                operacion: 'agregar',
                items: [{ productoId: 'arepa-queso', catalogoTipo: 'producto', cantidad: 2 }],
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_2',
            type: 'function',
            function: {
              name: 'confirmar_pedido',
              arguments: JSON.stringify({
                clienteNombre: 'Carlos',
                direccion: 'Calle 10 # 20-30',
                barrio: 'Centro',
                metodoPago: 'efectivo',
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        role: 'assistant',
        content:
          '✅ Listo Carlos, tu pedido LP-WA-12345678 por $16.000 quedó confirmado con pago en efectivo contra entrega.',
      });

    const executeToolMock = vi
      .fn()
      .mockResolvedValueOnce({
        accion: 'items_agregados',
        output: { ordenId: 'ord-1', totalCOP: 16_000 },
      })
      .mockResolvedValueOnce({
        accion: 'orden_confirmada',
        output: { confirmado: true, codigo: 'LP-WA-12345678' },
      });

    const result = await runLaParadaOrderAgent({
      userMessage: 'Hola soy Carlos, quiero 2 arepas de queso para Calle 10 # 20-30 barrio Centro en efectivo',
      systemPrompt: buildLaParadaSystemPrompt({
        nombreNegocio: 'La Parada',
        mensajeBienvenida: 'Bienvenido',
        mensajeCierre: 'Gracias',
      }),
      context: {
        negocioId: 'laparada',
        numeroCliente: '573109876543',
        queueId: 'queue_test_1',
      },
      executeTool: executeToolMock,
      completeChatFn: completeChatMock,
    });

    expect(executeToolMock).toHaveBeenCalledTimes(2);
    expect(result.accion).toBe('orden_confirmada');
    expect(result.toolActions).toEqual(['items_agregados', 'orden_confirmada']);
    expect(result.respuesta).toContain('LP-WA-12345678');
  });

  it('incluye la herramienta agendar_reserva en LA_PARADA_ORDER_TOOLS con validación requerida', () => {
    const reservaTool = LA_PARADA_ORDER_TOOLS.find((t) => t.function.name === 'agendar_reserva');
    expect(reservaTool).toBeDefined();
    expect(reservaTool?.function.description).toContain('reserva de mesa');
    const params = reservaTool?.function.parameters as { required: string[] };
    expect(params.required).toEqual(['clienteNombre', 'fechaHoraReserva', 'personas']);
  });

  it('ejecuta la herramienta agendar_reserva y persiste la reserva acotada por negocioId', async () => {
    const setMock = vi.fn().mockResolvedValue(undefined);
    const docMock = vi.fn().mockReturnValue({ id: 'res-abc', set: setMock });
    const collectionMock = vi.fn().mockReturnValue({ doc: docMock });
    const mockDb = { collection: collectionMock } as unknown as import('firebase-admin').firestore.Firestore;

    const outcome = await executeLaParadaOrderTool(
      'agendar_reserva',
      {
        clienteNombre: 'Valentina Pérez',
        fechaHoraReserva: '2026-11-03 20:30',
        personas: 5,
        notas: 'Celebración de cumpleaños',
      },
      {
        negocioId: 'laparada',
        numeroCliente: '573201112233',
        queueId: 'q-reserva-1',
      },
      mockDb
    );

    expect(collectionMock).toHaveBeenCalledWith('reservas');
    expect(setMock).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        clienteNombre: 'Valentina Pérez',
        clienteTelefono: '573201112233',
        fechaHoraReserva: '2026-11-03 20:30',
        personas: 5,
        notas: 'Celebración de cumpleaños',
        estado: 'confirmada',
        origen: 'whatsapp',
      })
    );
    expect(outcome.accion).toBe('reserva_agendada');
    expect(outcome.output).toMatchObject({
      reservaId: 'res-abc',
      confirmada: true,
      clienteNombre: 'Valentina Pérez',
      personas: 5,
    });
  });
});
