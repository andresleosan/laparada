import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('seed-e2e solo puede ejecutarse con FIRESTORE_EMULATOR_HOST configurado');
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-la-parada-e2e';
if (!projectId.startsWith('demo-')) {
  throw new Error('seed-e2e exige un projectId demo-* para no tocar datos remotos');
}

const app = initializeApp({ projectId }, `seed-e2e-${Date.now()}`);
const db = getFirestore(app);
const now = Timestamp.now();

await db.collection('negocios').doc('laparada').set({
  id: 'laparada',
  nombre: 'La Parada E2E',
  slug: 'laparada',
  propietarioEmail: 'e2e@example.invalid',
  propietarioNombre: 'E2E',
  telefono: '3000000000',
  estado: 'activo',
  plan: 'basico',
  creadoEn: now,
});

await db.collection('productos').doc('producto-e2e').set({
  id: 'producto-e2e',
  nombre: 'Hamburguesa E2E',
  descripcion: 'Producto exclusivo del entorno local de pruebas',
  categoria: 'Hamburguesas',
  precio: 18_000,
  jornada: 'ambas',
  disponible: true,
  destacado: true,
  negocioId: 'laparada',
  creadoEn: now,
  actualizadoEn: now,
});

console.log(`Seed E2E creado en ${projectId} mediante ${process.env.FIRESTORE_EMULATOR_HOST}`);
await deleteApp(app);
