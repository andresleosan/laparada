import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error('seed-tenant-e2e exige los emuladores de Firestore y Auth');
}

const projectId = process.env.GCLOUD_PROJECT || 'demo-la-parada-tenant-e2e';
if (!projectId.startsWith('demo-')) {
  throw new Error('seed-tenant-e2e exige un projectId demo-* para no tocar datos remotos');
}

const app = initializeApp({ projectId }, `seed-tenant-e2e-${Date.now()}`);
const auth = getAuth(app);
const db = getFirestore(app);
const superAdminEmail = 'andres.san1404@gmail.com';

try {
  try {
    await auth.deleteUser((await auth.getUserByEmail(superAdminEmail)).uid);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }

  await auth.createUser({
    uid: 'superadmin-e2e',
    email: superAdminEmail,
    password: 'SuperAdminE2E123',
    displayName: 'Super Admin E2E',
    emailVerified: true,
  });

  const now = Timestamp.now();
  const tenants = [
    {
      id: 'laparada',
      nombre: 'La Parada E2E',
      slug: 'la-parada-e2e',
      propietarioEmail: superAdminEmail,
      productoId: 'producto-laparada',
      productoNombre: 'Producto exclusivo La Parada',
      precio: 11000,
    },
    {
      id: 'tenant-b',
      nombre: 'Negocio B E2E',
      slug: 'negocio-b-e2e',
      propietarioEmail: 'owner-b@example.invalid',
      productoId: 'producto-tenant-b',
      productoNombre: 'Producto exclusivo Negocio B',
      precio: 22000,
    },
  ];

  for (const tenant of tenants) {
    await db.collection('negocios').doc(tenant.id).set({
      id: tenant.id,
      nombre: tenant.nombre,
      slug: tenant.slug,
      propietarioEmail: tenant.propietarioEmail,
      propietarioNombre: `Owner ${tenant.nombre}`,
      telefono: '3000000000',
      estado: 'activo',
      plan: 'basico',
      creadoEn: now,
    });
    await db.collection('productos').doc(tenant.productoId).set({
      negocioId: tenant.id,
      nombre: tenant.productoNombre,
      descripcion: 'Dato aislado para smoke E2E',
      precio: tenant.precio,
      jornada: 'ambas',
      disponible: true,
      destacado: false,
      creadoEn: now,
      actualizadoEn: now,
    });
  }

  console.log(`Dos tenants y superadmin E2E sembrados en ${projectId}`);
} finally {
  await deleteApp(app);
}
