import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { SUPER_ADMIN_EMAIL } from '../src/config/auth';
import {
  createStaffUserInFirebase,
  parseCreateStaffUserInput,
  StaffUserError,
  type StaffRole,
} from '../src/staff/staffUser';

const PROJECT_ID = 'demo-la-parada-rules-test';
const EMULATORS_AVAILABLE = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST
);

let app: App;
let db: Firestore;
let auth: Auth;

beforeAll(() => {
  if (!EMULATORS_AVAILABLE) return;
  app = initializeApp({ projectId: PROJECT_ID }, 'staff-user-integration');
  db = getFirestore(app);
  auth = getAuth(app);
});

beforeEach(async () => {
  if (!EMULATORS_AVAILABLE) return;
  for (const collectionName of ['negocios', 'usuarios_negocio']) {
    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) continue;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }
  const users = await auth.listUsers(1000);
  if (users.users.length > 0) {
    await auth.deleteUsers(users.users.map((user) => user.uid));
  }
});

afterAll(async () => {
  if (app) await deleteApp(app);
});

async function seedBusiness(id: string, estado = 'activo') {
  await db.collection('negocios').doc(id).set({ id, estado });
}

async function seedActor(input: {
  uid: string;
  email: string;
  negocioId: string;
  rol: StaffRole;
  activo: boolean;
  profile?: boolean;
}) {
  await auth.createUser({ uid: input.uid, email: input.email, password: 'ActorSeguro123' });
  if (input.profile !== false) {
    await db.collection('usuarios_negocio').doc(input.uid).set({
      uid: input.uid,
      email: input.email,
      nombre: input.uid,
      negocioId: input.negocioId,
      rol: input.rol,
      activo: input.activo,
      creadoEn: new Date(0),
    });
  }
}

function staffInput(email: string, negocioId = 'tenant-a') {
  return parseCreateStaffUserInput({
    negocioId,
    nombre: 'Nueva Cajera',
    email,
    password: 'NuevaSegura123',
    rol: 'cajero',
  });
}

describe.runIf(EMULATORS_AVAILABLE)('alta segura de personal', () => {
  it('permite a un admin activo crear personal sin reemplazar su identidad', async () => {
    await seedBusiness('tenant-a');
    await seedActor({
      uid: 'admin-a',
      email: 'admin-a@example.com',
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: true,
    });

    const created = await createStaffUserInFirebase(
      db,
      auth,
      staffInput('cajera@example.com'),
      { uid: 'admin-a', email: 'admin-a@example.com' }
    );

    expect(created).toMatchObject({
      email: 'cajera@example.com',
      negocioId: 'tenant-a',
      rol: 'cajero',
      activo: true,
    });
    expect((await auth.getUser('admin-a')).email).toBe('admin-a@example.com');
    expect((await auth.getUser(created.uid)).displayName).toBe('Nueva Cajera');
    expect((await db.collection('usuarios_negocio').doc(created.uid).get()).data()).toMatchObject(created);
  });

  it('rechaza ausencia de perfil, perfil inactivo, cajero y cruce de tenant', async () => {
    await seedBusiness('tenant-a');
    await seedBusiness('tenant-b');
    await seedActor({
      uid: 'sin-perfil',
      email: 'sin-perfil@example.com',
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: true,
      profile: false,
    });
    await seedActor({
      uid: 'inactivo',
      email: 'inactivo@example.com',
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: false,
    });
    await seedActor({
      uid: 'cajero',
      email: 'cajero@example.com',
      negocioId: 'tenant-a',
      rol: 'cajero',
      activo: true,
    });
    await seedActor({
      uid: 'admin-a',
      email: 'admin-a@example.com',
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: true,
    });

    const cases = [
      { actor: { uid: 'sin-perfil', email: 'sin-perfil@example.com' }, tenant: 'tenant-a' },
      { actor: { uid: 'inactivo', email: 'inactivo@example.com' }, tenant: 'tenant-a' },
      { actor: { uid: 'cajero', email: 'cajero@example.com' }, tenant: 'tenant-a' },
      { actor: { uid: 'admin-a', email: 'admin-a@example.com' }, tenant: 'tenant-b' },
    ];

    for (const [index, testCase] of cases.entries()) {
      await expect(
        createStaffUserInFirebase(
          db,
          auth,
          staffInput(`rechazado-${index}@example.com`, testCase.tenant),
          testCase.actor
        )
      ).rejects.toMatchObject<Partial<StaffUserError>>({ code: 'permission-denied' });
    }
    expect((await db.collection('usuarios_negocio').get()).size).toBe(3);
  });

  it('permite al superadmin crear un admin en un negocio activo', async () => {
    await seedBusiness('tenant-b');
    await seedActor({
      uid: 'superadmin',
      email: SUPER_ADMIN_EMAIL,
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: true,
      profile: false,
    });
    const input = parseCreateStaffUserInput({
      ...staffInput('admin-b@example.com', 'tenant-b'),
      rol: 'admin',
    });

    const created = await createStaffUserInFirebase(
      db,
      auth,
      input,
      { uid: 'superadmin', email: SUPER_ADMIN_EMAIL }
    );
    expect(created).toMatchObject({ negocioId: 'tenant-b', rol: 'admin' });
  });

  it('rechaza correos duplicados sin crear un segundo perfil', async () => {
    await seedBusiness('tenant-a');
    await seedActor({
      uid: 'admin-a',
      email: 'admin-a@example.com',
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: true,
    });
    await auth.createUser({
      uid: 'existente',
      email: 'duplicado@example.com',
      password: 'Existente123',
    });

    await expect(
      createStaffUserInFirebase(
        db,
        auth,
        staffInput('duplicado@example.com'),
        { uid: 'admin-a', email: 'admin-a@example.com' }
      )
    ).rejects.toMatchObject<Partial<StaffUserError>>({ code: 'already-exists' });
    expect((await db.collection('usuarios_negocio').get()).size).toBe(1);
  });

  it('rechaza altas cuando el negocio no está activo', async () => {
    await seedBusiness('tenant-a', 'suspendido');
    await seedActor({
      uid: 'admin-a',
      email: 'admin-a@example.com',
      negocioId: 'tenant-a',
      rol: 'admin',
      activo: true,
    });

    await expect(
      createStaffUserInFirebase(
        db,
        auth,
        staffInput('cajera@example.com'),
        { uid: 'admin-a', email: 'admin-a@example.com' }
      )
    ).rejects.toMatchObject<Partial<StaffUserError>>({ code: 'failed-precondition' });
  });
});

