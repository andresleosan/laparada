import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const PROJECT_ID = 'demo-la-parada-rules-test';
const SUPER_ADMIN_EMAIL = 'andres.san1404@gmail.com';
const EMULATORS_AVAILABLE = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_STORAGE_EMULATOR_HOST
);

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  if (!EMULATORS_AVAILABLE) return;

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve('firestore.rules'), 'utf8'),
    },
    storage: {
      rules: readFileSync(resolve('storage.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.clearStorage();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

async function seedTenant(
  negocioId: string,
  uid: string,
  email: string,
  estado: 'activo' | 'pendiente' = 'activo',
  rol: 'admin' | 'cajero' = 'admin'
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'negocios', negocioId), {
      id: negocioId,
      nombre: `Negocio ${negocioId}`,
      propietarioEmail: email,
      estado,
      plan: 'basico',
      creadoEn: new Date(0),
    });

    await setDoc(doc(db, 'usuarios_negocio', uid), {
      uid,
      email,
      nombre: `Usuario ${uid}`,
      negocioId,
      rol,
      activo: true,
      creadoEn: new Date(0),
    });
  });
}

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant del menú', () => {
  it('mantiene público el menú', async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(db, 'productos', 'publico')));
    await assertSucceeds(getDoc(doc(db, 'categorias', 'publica')));
  });

  it('permite crear producto y categoría en el tenant propio', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const db = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();

    await assertSucceeds(
      setDoc(doc(db, 'productos', 'producto-a'), {
        nombre: 'Producto A',
        negocioId: 'tenantA',
      })
    );
    await assertSucceeds(
      setDoc(doc(db, 'categorias', 'categoria-a'), {
        nombre: 'Categoría A',
        activo: true,
        negocioId: 'tenantA',
      })
    );
  });

  it('impide escribir en otro tenant o cambiar el tenant de un documento', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const db = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const productoRef = doc(db, 'productos', 'producto-a');

    await assertFails(
      setDoc(productoRef, { nombre: 'Intruso', negocioId: 'tenantB' })
    );

    await assertSucceeds(
      setDoc(productoRef, { nombre: 'Propio', negocioId: 'tenantA' })
    );

    await assertFails(updateDoc(productoRef, { negocioId: 'tenantB' }));
  });

  it('bloquea usuarios sin perfil y negocios pendientes', async () => {
    const sinPerfil = testEnv
      .authenticatedContext('sin-perfil', { email: 'nadie@example.com' })
      .firestore();
    await assertFails(
      setDoc(doc(sinPerfil, 'productos', 'sin-perfil'), {
        nombre: 'No permitido',
        negocioId: 'tenantA',
      })
    );

    await seedTenant(
      'tenantPendiente',
      'admin-pendiente',
      'pendiente@example.com',
      'pendiente'
    );
    const pendiente = testEnv
      .authenticatedContext('admin-pendiente', {
        email: 'pendiente@example.com',
      })
      .firestore();
    await assertFails(
      setDoc(doc(pendiente, 'productos', 'pendiente'), {
        nombre: 'No permitido',
        negocioId: 'tenantPendiente',
      })
    );
  });

  it('autoriza al superadmin autenticado para La Parada', async () => {
    const db = testEnv
      .authenticatedContext('superadmin', { email: SUPER_ADMIN_EMAIL })
      .firestore();

    await assertSucceeds(
      setDoc(doc(db, 'productos', 'laparada'), {
        nombre: 'Producto La Parada',
        negocioId: 'laparada',
      })
    );
  });

  it('permite registrar únicamente un negocio pendiente y su propietario', async () => {
    const owner = testEnv
      .authenticatedContext('owner-nuevo', { email: 'owner@example.com' })
      .firestore();
    const negocioRef = doc(owner, 'negocios', 'tenantNuevo');

    await assertFails(
      setDoc(negocioRef, {
        id: 'tenantNuevo',
        propietarioEmail: 'owner@example.com',
        estado: 'activo',
        plan: 'basico',
        creadoEn: new Date(0),
      })
    );

    await assertSucceeds(
      setDoc(negocioRef, {
        id: 'tenantNuevo',
        propietarioEmail: 'owner@example.com',
        estado: 'pendiente',
        plan: 'basico',
        creadoEn: new Date(0),
      })
    );

    await assertFails(
      setDoc(doc(owner, 'usuarios_negocio', 'owner-nuevo'), {
        uid: 'owner-nuevo',
        email: 'owner@example.com',
        nombre: 'Owner',
        negocioId: 'tenantNuevo',
        rol: 'cajero',
        activo: true,
        creadoEn: new Date(0),
      })
    );

    await assertSucceeds(
      setDoc(doc(owner, 'usuarios_negocio', 'owner-nuevo'), {
        uid: 'owner-nuevo',
        email: 'owner@example.com',
        nombre: 'Owner',
        negocioId: 'tenantNuevo',
        rol: 'admin',
        activo: true,
        creadoEn: new Date(0),
      })
    );
  });

  it('impide que un admin de tenant se autoapruebe', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const db = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();

    await assertFails(
      updateDoc(doc(db, 'negocios', 'tenantA'), { estado: 'suspendido' })
    );
    await assertSucceeds(
      updateDoc(doc(db, 'negocios', 'tenantA'), { nombre: 'Nombre actualizado' })
    );
  });

  it('no expone domicilios a cualquier usuario autenticado', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'domicilios', 'pedido-1'), {
        clienteNombre: 'Cliente',
      });
    });

    const usuarioComun = testEnv
      .authenticatedContext('usuario-comun', { email: 'comun@example.com' })
      .firestore();
    await assertFails(getDoc(doc(usuarioComun, 'domicilios', 'pedido-1')));

    const empleadoLegacy = testEnv
      .authenticatedContext('empleado', { role: 'employee' })
      .firestore();
    await assertSucceeds(getDoc(doc(empleadoLegacy, 'domicilios', 'pedido-1')));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Storage rules multi-tenant de fotos', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

  it('permite una imagen del tenant propio', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const storage = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .storage();

    await assertSucceeds(
      uploadBytes(ref(storage, 'productos/tenantA/item/foto.jpg'), jpeg, {
        contentType: 'image/jpeg',
      })
    );

    const publicStorage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(
      getBytes(ref(publicStorage, 'productos/tenantA/item/foto.jpg'))
    );
  });

  it('bloquea otro tenant, usuarios sin perfil y negocios pendientes', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const storage = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .storage();
    await assertFails(
      uploadBytes(ref(storage, 'productos/tenantB/item/foto.jpg'), jpeg, {
        contentType: 'image/jpeg',
      })
    );

    const sinPerfil = testEnv
      .authenticatedContext('sin-perfil', { email: 'nadie@example.com' })
      .storage();
    await assertFails(
      uploadBytes(ref(sinPerfil, 'productos/tenantA/item/foto.jpg'), jpeg, {
        contentType: 'image/jpeg',
      })
    );

    await seedTenant(
      'tenantPendiente',
      'admin-pendiente',
      'pendiente@example.com',
      'pendiente'
    );
    const pendiente = testEnv
      .authenticatedContext('admin-pendiente', {
        email: 'pendiente@example.com',
      })
      .storage();
    await assertFails(
      uploadBytes(
        ref(pendiente, 'productos/tenantPendiente/item/foto.jpg'),
        jpeg,
        { contentType: 'image/jpeg' }
      )
    );
  });

  it('rechaza contenido que no sea imagen', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const storage = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .storage();

    await assertFails(
      uploadBytes(ref(storage, 'productos/tenantA/item/datos.txt'), jpeg, {
        contentType: 'text/plain',
      })
    );
  });

  it('rechaza imágenes de 2 MiB o más', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const storage = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .storage();

    await assertFails(
      uploadBytes(
        ref(storage, 'productos/tenantA/item/grande.jpg'),
        new Uint8Array(2 * 1024 * 1024),
        { contentType: 'image/jpeg' }
      )
    );
  });

  it('autoriza la foto de La Parada al superadmin autenticado', async () => {
    const storage = testEnv
      .authenticatedContext('superadmin', { email: SUPER_ADMIN_EMAIL })
      .storage();

    await assertSucceeds(
      uploadBytes(ref(storage, 'productos/laparada/item/foto.jpg'), jpeg, {
        contentType: 'image/jpeg',
      })
    );
  });
});
