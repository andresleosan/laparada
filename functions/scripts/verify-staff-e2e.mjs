import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('verify-staff-e2e exige los emuladores de Firestore y Auth');
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-la-parada-staff-e2e';
if (!projectId.startsWith('demo-')) {
  throw new Error('verify-staff-e2e exige un projectId demo-* para no consultar datos remotos');
}

const app = initializeApp({ projectId }, `verify-staff-e2e-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);

try {
  const adminUser = await auth.getUserByEmail('admin-e2e@example.invalid');
  const staffUser = await auth.getUserByEmail('cajera-e2e@example.invalid');
  assert.equal(adminUser.uid, 'admin-e2e');
  assert.equal(staffUser.displayName, 'Cajera E2E');
  assert.notEqual(staffUser.uid, adminUser.uid);

  const adminProfile = await db.collection('usuarios_negocio').doc(adminUser.uid).get();
  const staffProfile = await db.collection('usuarios_negocio').doc(staffUser.uid).get();
  assert.equal(adminProfile.data()?.activo, true);
  assert.deepEqual(
    {
      email: staffProfile.data()?.email,
      nombre: staffProfile.data()?.nombre,
      negocioId: staffProfile.data()?.negocioId,
      rol: staffProfile.data()?.rol,
      activo: staffProfile.data()?.activo,
    },
    {
      email: 'cajera-e2e@example.invalid',
      nombre: 'Cajera E2E',
      negocioId: 'laparada',
      rol: 'cajero',
      activo: true,
    }
  );

  console.log(`Alta de personal E2E validada: admin ${adminUser.uid} conservado y cajero ${staffUser.uid} creado`);
} finally {
  await deleteApp(app);
}

