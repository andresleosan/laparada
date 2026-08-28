import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('verify-e2e solo puede ejecutarse con FIRESTORE_EMULATOR_HOST configurado');
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-la-parada-e2e';
if (!projectId.startsWith('demo-')) {
  throw new Error('verify-e2e exige un projectId demo-* para no consultar datos remotos');
}

const app = initializeApp({ projectId }, `verify-e2e-${Date.now()}`);
const db = getFirestore(app);

try {
  const snapshot = await db.collection('domicilios').get();
  assert.equal(snapshot.size, 1, 'debe existir exactamente un pedido E2E');

  const order = snapshot.docs[0].data();
  assert.match(order.codigoPublico, /^LP-[A-Z0-9]{8}$/);
  assert.equal(order.negocioId, 'laparada');
  assert.equal(order.total, 18_000);
  assert.equal(order.subtotal, 18_000);
  assert.equal(order.metodoPago, 'efectivo');
  assert.equal(order.tipoEntrega, 'domicilio');
  assert.equal(order.origen, 'web');
  assert.equal(order.items?.length, 1);
  assert.deepEqual(order.items[0], {
    tipo: 'producto',
    referenciaId: 'producto-e2e',
    nombre: 'Hamburguesa E2E',
    cantidad: 1,
    precioUnitario: 18_000,
    subtotal: 18_000,
  });

  console.log(`Pedido E2E validado: ${order.codigoPublico}, total 18000, origen web, pago efectivo`);
} finally {
  await deleteApp(app);
}
