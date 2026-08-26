import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('seed-staff-e2e exige los emuladores de Firestore y Auth');
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-la-parada-staff-e2e';
if (!projectId.startsWith('demo-')) {
  throw new Error('seed-staff-e2e exige un projectId demo-* para no tocar datos remotos');
}

const app = initializeApp({ projectId }, `seed-staff-e2e-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
const adminEmail = 'admin-e2e@example.invalid';
const staffEmail = 'cajera-e2e@example.invalid';

async function deleteAuthUserByEmail(email) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.deleteUser(user.uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }
}

try {
  await deleteAuthUserByEmail(adminEmail);
  await deleteAuthUserByEmail(staffEmail);

  const oldStaffProfiles = await db.collection('usuarios_negocio')
    .where('email', '==', staffEmail)
    .get();
  for (const profile of oldStaffProfiles.docs) {
    await profile.ref.delete();
  }

  await auth.createUser({
    uid: 'admin-e2e',
    email: adminEmail,
    password: 'AdminE2ESeguro123',
    displayName: 'Admin E2E',
  });
  await auth.setCustomUserClaims('admin-e2e', { admin: true });
  const now = Timestamp.now();
  await db.collection('negocios').doc('laparada').set({
    id: 'laparada',
    nombre: 'La Parada E2E',
    slug: 'laparada',
    propietarioEmail: adminEmail,
    propietarioNombre: 'Admin E2E',
    telefono: '3000000000',
    estado: 'activo',
    plan: 'basico',
    creadoEn: now,
  });
  await db.collection('usuarios_negocio').doc('admin-e2e').set({
    uid: 'admin-e2e',
    email: adminEmail,
    nombre: 'Admin E2E',
    negocioId: 'laparada',
    rol: 'admin',
    activo: true,
    creadoEn: now,
  });

  console.log(`Entorno de personal E2E sembrado en ${projectId}`);
} finally {
  await deleteApp(app);
}
