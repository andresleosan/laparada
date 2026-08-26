import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import {
  parseManualWhatsAppMessageInput,
  sendManualWhatsAppMessage,
  WhatsAppMessageError,
} from '../src/bot/manualMessage';
import { processWebhookPayload } from '../src/webhooks/whatsappWebhook';

const PROJECT_ID = 'demo-la-parada-rules-test';
const EMULATOR_AVAILABLE = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const COLLECTIONS = [
  'bot_queue',
  'domicilios',
  'mensajes_whatsapp',
  'negocios',
  'ordenes_pendientes',
  '_ordenes_whatsapp_activas',
  'productos',
  'usuarios_negocio',
  '_limites_whatsapp_manual',
];

let app: App;
let db: Firestore;

beforeAll(() => {
  if (!EMULATOR_AVAILABLE) return;
  process.env.WHATSAPP_NEGOCIO_ID = 'tenant-a';
  app = initializeApp({ projectId: PROJECT_ID });
  db = getFirestore(app);
});

beforeEach(async () => {
  if (!EMULATOR_AVAILABLE) return;
  for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) continue;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
});

afterAll(async () => {
  if (app) await deleteApp(app);
  delete process.env.WHATSAPP_NEGOCIO_ID;
});

function incomingPayload(messageId = 'wamid.incoming-1') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: '123456' },
          messages: [{
            from: '573001234567',
            id: messageId,
            timestamp: '1787673600',
            type: 'text',
            text: { body: 'hola' },
          }],
        },
      }],
    }],
  };
}

function statusPayload(status: string, timestamp: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: '123456' },
          statuses: [{ id: 'wamid.outgoing-1', status, timestamp }],
        },
      }],
    }],
  };
}

async function seedProcessingQueue(queueId: string, content: string): Promise<void> {
  await db.collection('bot_queue').doc(queueId).set({
    negocioId: 'tenant-a',
    mensajeId: `message_${queueId}`,
    referenciaWhatsapp: `wamid.${queueId}`,
    numeroOrigen: '573001234567',
    contenido: content,
    tipoContenido: 'text',
    estado: 'procesando',
    intentos: 0,
  });
}

describe.runIf(EMULATOR_AVAILABLE)('WhatsApp backend integrado', () => {
  it('persiste y encola una entrada autenticada una sola vez', async () => {
    await processWebhookPayload(db, incomingPayload(), '123456', 'tenant-a');
    await processWebhookPayload(db, incomingPayload(), '123456', 'tenant-a');

    const messages = await db.collection('mensajes_whatsapp').get();
    const queue = await db.collection('bot_queue').get();
    expect(messages.size).toBe(1);
    expect(queue.size).toBe(1);
    expect(messages.docs[0].data()).toMatchObject({
      negocioId: 'tenant-a',
      referenciaWhatsapp: 'wamid.incoming-1',
      tipo: 'entrada',
      procesado: false,
    });
    expect(queue.docs[0].data()).toMatchObject({
      negocioId: 'tenant-a',
      mensajeId: messages.docs[0].id,
      referenciaWhatsapp: 'wamid.incoming-1',
      estado: 'pendiente',
    });
  });

  it('rechaza el lote completo antes de escribir si un evento es inválido', async () => {
    const payload = incomingPayload() as any;
    payload.entry[0].changes[0].value.messages.push({
      from: 'no-es-telefono',
      id: 'wamid.invalid',
      timestamp: '1787673600',
      type: 'text',
      text: { body: 'mensaje inválido' },
    });

    await expect(processWebhookPayload(db, payload, '123456', 'tenant-a')).rejects.toThrow(
      /message.from/
    );
    expect((await db.collection('mensajes_whatsapp').get()).empty).toBe(true);
    expect((await db.collection('bot_queue').get()).empty).toBe(true);
  });

  it('ignora retrocesos y duplicados de estado del proveedor', async () => {
    await db.collection('mensajes_whatsapp').doc('salida-1').set({
      negocioId: 'tenant-a',
      telefono: '573001234567',
      tipo: 'salida',
      contenido: 'Respuesta',
      estado: 'enviado',
      referenciaWhatsapp: 'wamid.outgoing-1',
    });

    await processWebhookPayload(db, statusPayload('read', '1787673610'), '123456', 'tenant-a');
    await processWebhookPayload(db, statusPayload('sent', '1787673605'), '123456', 'tenant-a');
    await processWebhookPayload(db, statusPayload('read', '1787673610'), '123456', 'tenant-a');

    const message = await db.collection('mensajes_whatsapp').doc('salida-1').get();
    const events = await message.ref.collection('eventos_entrega').get();
    expect(message.data()?.estado).toBe('leido');
    expect(events.size).toBe(2);
  });

  it('envía manualmente con autorización, referencia e idempotencia', async () => {
    await db.collection('negocios').doc('tenant-a').set({ id: 'tenant-a', estado: 'activo' });
    await db.collection('usuarios_negocio').doc('cajero-a').set({
      uid: 'cajero-a',
      email: 'cajero-a@example.com',
      negocioId: 'tenant-a',
      rol: 'cajero',
      activo: true,
    });
    const input = parseManualWhatsAppMessageInput({
      negocioId: 'tenant-a',
      telefono: '3001234567',
      contenido: 'Tu pedido está en preparación',
      idempotencyKey: 'manual_integracion_123456',
    });
    const provider = vi.fn().mockResolvedValue('wamid.manual-1');

    const first = await sendManualWhatsAppMessage(
      db,
      input,
      { uid: 'cajero-a', email: 'cajero-a@example.com' },
      provider
    );
    const retry = await sendManualWhatsAppMessage(
      db,
      input,
      { uid: 'cajero-a', email: 'cajero-a@example.com' },
      provider
    );

    expect(first).toMatchObject({ referenciaWhatsapp: 'wamid.manual-1', reused: false });
    expect(retry).toMatchObject({ mensajeId: first.mensajeId, reused: true });
    expect(provider).toHaveBeenCalledTimes(1);
    expect((await db.collection('mensajes_whatsapp').doc(first.mensajeId).get()).data()).toMatchObject({
      negocioId: 'tenant-a',
      tipo: 'salida',
      estado: 'enviado',
      referenciaWhatsapp: 'wamid.manual-1',
    });
  });

  it('rechaza un actor de otro tenant y registra fallas del proveedor', async () => {
    await db.collection('negocios').doc('tenant-a').set({ id: 'tenant-a', estado: 'activo' });
    await db.collection('usuarios_negocio').doc('cajero-b').set({
      uid: 'cajero-b',
      email: 'cajero-b@example.com',
      negocioId: 'tenant-b',
      rol: 'cajero',
      activo: true,
    });
    const input = parseManualWhatsAppMessageInput({
      negocioId: 'tenant-a',
      telefono: '3001234567',
      contenido: 'Mensaje seguro',
      idempotencyKey: 'manual_integracion_654321',
    });

    await expect(sendManualWhatsAppMessage(
      db,
      input,
      { uid: 'cajero-b', email: 'cajero-b@example.com' },
      vi.fn()
    )).rejects.toMatchObject<Partial<WhatsAppMessageError>>({ code: 'permission-denied' });

    await db.collection('usuarios_negocio').doc('cajero-a').set({
      uid: 'cajero-a',
      email: 'cajero-a@example.com',
      negocioId: 'tenant-a',
      rol: 'cajero',
      activo: true,
    });
    await expect(sendManualWhatsAppMessage(
      db,
      input,
      { uid: 'cajero-a', email: 'cajero-a@example.com' },
      vi.fn().mockRejectedValue(new Error('provider unavailable'))
    )).rejects.toMatchObject<Partial<WhatsAppMessageError>>({ code: 'unavailable' });
    const failed = await db.collection('mensajes_whatsapp').where('estado', '==', 'fallido').get();
    expect(failed.size).toBe(1);
  });

  it('impide reutilizar un queueId con otro teléfono o contenido', async () => {
    const { procesarMensajePorBot } = await import('../src/bot/orderProcessingService');
    await seedProcessingQueue('queue_bound_123', '1');

    await expect(procesarMensajePorBot(
      '573009999999',
      '1',
      { queueId: 'queue_bound_123' }
    )).rejects.toThrow(/no coincide/);
    await expect(procesarMensajePorBot(
      '573001234567',
      '2',
      { queueId: 'queue_bound_123' }
    )).rejects.toThrow(/no coincide/);
    expect((await db.collection('ordenes_pendientes').get()).empty).toBe(true);
  });

  it('serializa dos mensajes legítimos concurrentes en una sola orden activa', async () => {
    await db.collection('productos').doc('producto-a').set({
      negocioId: 'tenant-a',
      nombre: 'Arepa',
      precio: 10_000,
      disponible: true,
    });
    const { procesarMensajePorBot } = await import('../src/bot/orderProcessingService');
    await Promise.all([
      seedProcessingQueue('queue_parallel_a', '1'),
      seedProcessingQueue('queue_parallel_b', '1'),
    ]);

    await Promise.all([
      procesarMensajePorBot('573001234567', '1', { queueId: 'queue_parallel_a' }),
      procesarMensajePorBot('573001234567', '1', { queueId: 'queue_parallel_b' }),
    ]);

    const pending = await db.collection('ordenes_pendientes').get();
    const pointers = await db.collection('_ordenes_whatsapp_activas').get();
    expect(pending.size).toBe(1);
    expect(pointers.size).toBe(1);
    expect(pending.docs[0].data().items).toEqual([expect.objectContaining({
      productoId: 'producto-a',
      cantidad: 2,
    })]);
  }, 20_000);

  it('aplica cada paso una sola vez y conserva IDs estables aunque la lógica se reintente', async () => {
    await db.collection('productos').doc('producto-a').set({
      negocioId: 'tenant-a',
      nombre: 'Arepa',
      precio: 10_000,
      disponible: true,
    });
    const { procesarMensajePorBot } = await import('../src/bot/orderProcessingService');

    await seedProcessingQueue('queue_item_123', '1x2');
    const [added, addedRetry] = await Promise.all([
      procesarMensajePorBot('573001234567', '1x2', { queueId: 'queue_item_123' }),
      procesarMensajePorBot('573001234567', '1x2', { queueId: 'queue_item_123' }),
    ]);
    expect(added).toMatchObject({ accion: 'items_agregados' });
    expect(addedRetry).toEqual(added);

    const pending = await db.collection('ordenes_pendientes').get();
    expect(pending.size).toBe(1);
    expect(pending.docs[0].data().items).toEqual([expect.objectContaining({
      productoId: 'producto-a',
      catalogoTipo: 'producto',
      cantidad: 2,
    })]);

    await db.collection('productos').doc('producto-a').update({ precio: 12_000 });

    await seedProcessingQueue('queue_confirm_123', 'confirmar');
    const confirmedStep = await procesarMensajePorBot(
      '573001234567',
      'confirmar',
      { queueId: 'queue_confirm_123' }
    );
    expect(await procesarMensajePorBot(
      '573001234567',
      'confirmar',
      { queueId: 'queue_confirm_123' }
    )).toEqual(confirmedStep);

    await seedProcessingQueue('queue_transfer_123', 'transferencia');
    const paymentStep = await procesarMensajePorBot(
      '573001234567',
      'transferencia',
      { queueId: 'queue_transfer_123' }
    );
    expect(await procesarMensajePorBot(
      '573001234567',
      'transferencia',
      { queueId: 'queue_transfer_123' }
    )).toEqual(paymentStep);

    const address = 'dirección: Calle 10 # 20-30 | Centro';
    await seedProcessingQueue('queue_address_123', address);
    const [confirmation, confirmationRetry] = await Promise.all([
      procesarMensajePorBot(
        '573001234567',
        address,
        { queueId: 'queue_address_123', mensajeCierre: 'Gracias por tu pedido.' }
      ),
      procesarMensajePorBot(
        '573001234567',
        address,
        { queueId: 'queue_address_123', mensajeCierre: 'Gracias por tu pedido.' }
      ),
    ]);

    expect(confirmation).toMatchObject({ accion: 'orden_confirmada' });
    expect(confirmationRetry).toEqual(confirmation);
    expect(confirmation.respuesta.toLowerCase()).toContain('pago offline: transferencia');
    expect(confirmation.respuesta).toContain('Gracias por tu pedido.');
    const deliveries = await db.collection('domicilios').get();
    expect(deliveries.size).toBe(1);
    expect(deliveries.docs[0].data()).toMatchObject({
      negocioId: 'tenant-a',
      origen: 'whatsapp',
      metodoPago: 'transferencia',
      total: 24_000,
      direccion: 'Calle 10 # 20-30',
      barrio: 'Centro',
    });
  }, 20_000);
});
