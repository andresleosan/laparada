import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

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

function buildValidSale(negocioId: string) {
  return {
    negocioId,
    items: [
      {
        tipo: 'producto',
        referenciaId: 'producto-a',
        nombre: 'Producto A',
        cantidad: 1,
        precioUnitario: 1000,
        subtotal: 1000,
      },
    ],
    total: 1000,
    metodoPago: 'efectivo',
    tipoEntrega: 'mostrador',
    origen: 'pos',
    fecha: new Date(0),
  };
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

  it('permite el alta de negocios en estado pendiente y bloquea el alta activa directa', async () => {
    const owner = testEnv
      .authenticatedContext('owner-nuevo', { email: 'owner@example.com' })
      .firestore();
    const negocioRef = doc(owner, 'negocios', 'tenantNuevo');

    // Bloquea crear directamente en estado activo
    await assertFails(
      setDoc(negocioRef, {
        id: 'tenantNuevo',
        propietarioEmail: 'owner@example.com',
        estado: 'activo',
        plan: 'basico',
        creadoEn: new Date(0),
      })
    );

    // Bloquea crear con email ajeno
    await assertFails(
      setDoc(negocioRef, {
        id: 'tenantNuevo',
        propietarioEmail: 'otro@example.com',
        estado: 'pendiente',
        plan: 'basico',
        creadoEn: new Date(0),
      })
    );

    // Permite crear en estado pendiente por el propietario autenticado
    await assertSucceeds(
      setDoc(negocioRef, {
        id: 'tenantNuevo',
        propietarioEmail: 'owner@example.com',
        estado: 'pendiente',
        plan: 'basico',
        creadoEn: new Date(0),
      })
    );
  });

  it('permite el registro del perfil inicial de propietario y bloquea perfiles ajenos o roles no autorizados', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'negocios', 'tenantNuevo'), {
        id: 'tenantNuevo',
        propietarioEmail: 'owner@example.com',
        estado: 'pendiente',
        plan: 'basico',
        creadoEn: new Date(0),
      });
    });
    const owner = testEnv
      .authenticatedContext('owner-nuevo', { email: 'owner@example.com' })
      .firestore();

    // Bloquea crear perfil para otro UID
    await assertFails(
      setDoc(doc(owner, 'usuarios_negocio', 'otro-uid'), {
        uid: 'otro-uid',
        email: 'owner@example.com',
        nombre: 'Owner',
        negocioId: 'tenantNuevo',
        rol: 'admin',
        activo: true,
        creadoEn: new Date(0),
      })
    );

    // Bloquea crear perfil con email ajeno
    await assertFails(
      setDoc(doc(owner, 'usuarios_negocio', 'owner-nuevo'), {
        uid: 'owner-nuevo',
        email: 'otro@example.com',
        nombre: 'Owner',
        negocioId: 'tenantNuevo',
        rol: 'admin',
        activo: true,
        creadoEn: new Date(0),
      })
    );

    // Bloquea rol no autorizado en auto-registro
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

    // Permite registrar el perfil propio inicial como admin
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

  it('autoriza al superadmin a crear y eliminar negocios y lo restringe a otros usuarios', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const db = testEnv
      .authenticatedContext('superadmin', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    const adminA = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();

    // Un admin normal no puede eliminar un negocio
    await assertFails(deleteDoc(doc(adminA, 'negocios', 'tenantA')));

    // El superadmin puede crear negocios
    await assertSucceeds(
      setDoc(doc(db, 'negocios', 'tenantNuevo'), {
        id: 'tenantNuevo',
        propietarioEmail: SUPER_ADMIN_EMAIL,
        estado: 'activo',
        plan: 'enterprise',
        creadoEn: new Date(0),
      })
    );

    // El superadmin puede eliminar negocios
    await assertSucceeds(deleteDoc(doc(db, 'negocios', 'tenantA')));
  });

  it.each<[string, unknown]>([
    ['estado', 'suspendido'],
    ['plan', 'enterprise'],
    ['id', 'otro-tenant'],
    ['propietarioEmail', 'otro@example.com'],
    ['propietarioNombre', 'Otro propietario'],
    ['creadoEn', new Date(1)],
    ['aprobadoEn', new Date(1)],
    ['notasAdmin', 'Nueva suscripción'],
    ['suscripcion', { activa: true }],
  ])('reserva %s a la administración de SuperAdmin e impide que el admin de tenant lo modifique', async (field, value) => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const admin = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const superadmin = testEnv
      .authenticatedContext('superadmin', { email: SUPER_ADMIN_EMAIL })
      .firestore();

    // El admin de tenant no puede alterar campos protegidos
    await assertFails(updateDoc(doc(admin, 'negocios', 'tenantA'), { [field]: value }));

    // El superadmin sí está autorizado para gestionar estos campos
    await assertSucceeds(updateDoc(doc(superadmin, 'negocios', 'tenantA'), { [field]: value }));
  });

  it('mantiene la edición operativa del negocio para admin y superadmin', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const admin = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const superadmin = testEnv
      .authenticatedContext('superadmin', { email: SUPER_ADMIN_EMAIL })
      .firestore();
    const operationalUpdate = {
      nombre: 'Nombre actualizado',
      telefono: '3001234567',
      ciudad: 'Cúcuta',
      direccion: 'Calle 1',
      logoUrl: null,
      actualizadoEn: new Date(1),
    };

    await assertSucceeds(updateDoc(doc(admin, 'negocios', 'tenantA'), operationalUpdate));
    await assertSucceeds(
      updateDoc(doc(superadmin, 'negocios', 'tenantA'), { nombre: 'Nombre corregido' })
    );
  });

  it('bloquea la edición operativa de otro negocio o desde un cajero', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await seedTenant('tenantB', 'cajero-b', 'cajero-b@example.com', 'activo', 'cajero');
    const admin = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cashier = testEnv
      .authenticatedContext('cajero-b', { email: 'cajero-b@example.com' })
      .firestore();

    await assertFails(updateDoc(doc(admin, 'negocios', 'tenantB'), { nombre: 'Intruso' }));
    await assertFails(updateDoc(doc(cashier, 'negocios', 'tenantB'), { nombre: 'Intruso' }));
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
    await assertFails(getDoc(doc(empleadoLegacy, 'domicilios', 'pedido-1')));
  });

  it('limita el catálogo al admin y conserva la operación del cajero en su tenant', async () => {
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    const cajero = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();

    await assertFails(
      setDoc(doc(cajero, 'productos', 'producto-a'), {
        negocioId: 'tenantA',
        nombre: 'No autorizado',
      })
    );
    await assertFails(
      setDoc(doc(cajero, 'inventario', 'insumo-a'), {
        negocioId: 'tenantA',
        nombre: 'Harina',
      })
    );
    await assertSucceeds(
      setDoc(doc(cajero, 'entradas_inventario', 'entrada-a'), {
        negocioId: 'tenantA',
        insumoId: 'insumo-a',
      })
    );
    await assertFails(
      setDoc(doc(cajero, 'entradas_inventario', 'entrada-b'), {
        negocioId: 'tenantB',
        insumoId: 'insumo-b',
      })
    );
    await assertFails(
      updateDoc(doc(cajero, 'entradas_inventario', 'entrada-a'), {
        cantidad: 99,
      })
    );
    await assertFails(deleteDoc(doc(cajero, 'entradas_inventario', 'entrada-a')));
    await assertSucceeds(
      setDoc(doc(cajero, 'ventas', 'venta-a'), {
        negocioId: 'tenantA',
        total: 1000,
      })
    );
    await assertFails(
      setDoc(doc(cajero, 'ventas', 'venta-b'), {
        negocioId: 'tenantB',
        total: 1000,
      })
    );
  });

  it('rechaza una identidad persistida en ventas sin bloquear una venta legítima', async () => {
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    const cajero = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();

    await assertFails(
      setDoc(doc(cajero, 'ventas', 'venta-con-id'), {
        ...buildValidSale('tenantA'),
        id: 'venta-forjada',
      })
    );
    await assertSucceeds(
      setDoc(doc(cajero, 'ventas', 'venta-legitima'), buildValidSale('tenantA'))
    );
  });

  it('impide agregar una identidad persistida al actualizar una venta', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const admin = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const ventaRef = doc(admin, 'ventas', 'venta-a');

    await assertSucceeds(setDoc(ventaRef, buildValidSale('tenantA')));
    await assertFails(updateDoc(ventaRef, { id: 'venta-forjada' }));
  });

  it('solo permite borrar ventas al admin del tenant propietario', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'usuarios_negocio', 'cajero-a'), {
        uid: 'cajero-a',
        email: 'cajero-a@example.com',
        nombre: 'Cajero A',
        negocioId: 'tenantA',
        rol: 'cajero',
        activo: true,
        creadoEn: new Date(0),
      });
      await setDoc(doc(db, 'ventas', 'venta-a'), buildValidSale('tenantA'));
    });

    const cajero = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const admin = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();

    await assertFails(deleteDoc(doc(cajero, 'ventas', 'venta-a')));
    await assertSucceeds(deleteDoc(doc(admin, 'ventas', 'venta-a')));
  });

  it('impide que un admin cree directamente el perfil de otra identidad', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const db = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();

    await assertFails(
      setDoc(doc(db, 'usuarios_negocio', 'cajero-nuevo'), {
        uid: 'cajero-nuevo',
        email: 'cajero-nuevo@example.com',
        nombre: 'Cajero Nuevo',
        negocioId: 'tenantA',
        rol: 'cajero',
        activo: true,
        creadoEn: new Date(0),
      })
    );
  });

  it('bloquea toda escritura directa de domicilios desde clientes públicos', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'domicilios', 'pedido-existente'), {
        negocioId: 'tenantA',
        clienteNombre: 'Cliente',
        estado: 'pendiente',
      });
    });

    const publicDb = testEnv.unauthenticatedContext().firestore();
    const customerDb = testEnv
      .authenticatedContext('cliente', { email: 'cliente@example.com' })
      .firestore();

    await assertFails(setDoc(doc(publicDb, 'domicilios', 'pedido-falso'), { total: 1 }));
    await assertFails(setDoc(doc(customerDb, 'domicilios', 'pedido-falso'), { total: 1 }));
    await assertFails(updateDoc(doc(customerDb, 'domicilios', 'pedido-existente'), { total: 1 }));
    await assertFails(deleteDoc(doc(customerDb, 'domicilios', 'pedido-existente')));
  });

  it('permite lectura pública de rastreo_pedidos pero bloquea toda escritura desde clientes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'rastreo_pedidos', 'token-valido-123'), {
        codigo: 'LP-TEST12',
        estado: 'en_camino',
        negocioId: 'tenantA',
      });
    });

    const publicDb = testEnv.unauthenticatedContext().firestore();
    const customerDb = testEnv
      .authenticatedContext('cliente', { email: 'cliente@example.com' })
      .firestore();

    await assertSucceeds(getDoc(doc(publicDb, 'rastreo_pedidos', 'token-valido-123')));
    await assertFails(setDoc(doc(publicDb, 'rastreo_pedidos', 'token-intruso'), { total: 1 }));
    await assertFails(updateDoc(doc(customerDb, 'rastreo_pedidos', 'token-valido-123'), { estado: 'entregado' }));
    await assertFails(deleteDoc(doc(customerDb, 'rastreo_pedidos', 'token-valido-123')));
  });

  it('rechaza el cruce de tenant y permite el alta del POS solo en el tenant propio', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await seedTenant('tenantB', 'cajero-b', 'cajero-b@example.com', 'activo', 'cajero');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'domicilios', 'pedido-a'), {
        negocioId: 'tenantA',
        estado: 'pendiente',
      });
    });

    const otroTenant = testEnv
      .authenticatedContext('cajero-b', { email: 'cajero-b@example.com' })
      .firestore();
    await assertFails(getDoc(doc(otroTenant, 'domicilios', 'pedido-a')));
    await assertFails(updateDoc(doc(otroTenant, 'domicilios', 'pedido-a'), { estado: 'entregado' }));
    await assertSucceeds(
      setDoc(doc(otroTenant, 'domicilios', 'pedido-b'), {
        negocioId: 'tenantB',
        origen: 'pos',
      })
    );

    const empleadoLegacy = testEnv
      .authenticatedContext('empleado', { role: 'employee' })
      .firestore();
    await assertFails(
      setDoc(doc(empleadoLegacy, 'domicilios', 'pedido-pos'), {
        negocioId: 'laparada',
        origen: 'pos',
      })
    );
  });

  it('aísla las colecciones operativas entre dos tenants y exige queries acotadas', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com');
    const adminA = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const adminB = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();
    const collections = [
      'ventas',
      'domicilios',
      'inventario',
      'entradas_inventario',
      'gastos',
      'cierres_caja',
      'cajas',
    ];

    const basePayload = (negocioId: string, collectionName: string) =>
      collectionName === 'gastos'
        ? {
            negocioId,
            monto: 10000,
            concepto: 'Gasto de prueba',
            categoria: 'insumos',
          }
        : { negocioId };

    for (const collectionName of collections) {
      await assertSucceeds(
        setDoc(doc(adminA, collectionName, `${collectionName}-a`), basePayload('tenantA', collectionName))
      );
      await assertSucceeds(
        setDoc(doc(adminB, collectionName, `${collectionName}-b`), basePayload('tenantB', collectionName))
      );
      await assertSucceeds(
        getDocs(query(collection(adminA, collectionName), where('negocioId', '==', 'tenantA')))
      );
      await assertFails(getDocs(collection(adminA, collectionName)));
      await assertFails(getDoc(doc(adminA, collectionName, `${collectionName}-b`)));
      await assertFails(
        updateDoc(doc(adminA, collectionName, `${collectionName}-b`), { alterado: true })
      );
      await assertFails(
        setDoc(doc(adminA, collectionName, `${collectionName}-intruso`), {
          negocioId: 'tenantB',
        })
      );
    }
  });

  it('permite al superadmin cambiar de tenant sin mezclar resultados', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'ventas', 'venta-a'), {
        negocioId: 'tenantA',
        total: 1000,
      });
      await setDoc(doc(context.firestore(), 'ventas', 'venta-b'), {
        negocioId: 'tenantB',
        total: 2000,
      });
    });
    const superadmin = testEnv
      .authenticatedContext('superadmin', { email: SUPER_ADMIN_EMAIL })
      .firestore();

    const tenantA = await assertSucceeds(
      getDocs(query(collection(superadmin, 'ventas'), where('negocioId', '==', 'tenantA')))
    );
    const tenantB = await assertSucceeds(
      getDocs(query(collection(superadmin, 'ventas'), where('negocioId', '==', 'tenantB')))
    );

    expect(tenantA.docs.map((item) => item.id)).toEqual(['venta-a']);
    expect(tenantB.docs.map((item) => item.id)).toEqual(['venta-b']);
  });

  it('aísla configuración y fotos de transferencia por ruta de tenant', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com');
    const adminA = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' });
    const firestoreA = adminA.firestore();
    const storageA = adminA.storage();

    await assertSucceeds(
      setDoc(doc(firestoreA, 'configuracion', 'tenantA'), {
        negocioId: 'tenantA',
        activo: true,
      })
    );
    await assertFails(
      setDoc(doc(firestoreA, 'configuracion', 'tenantB'), {
        negocioId: 'tenantB',
        activo: true,
      })
    );
    await assertSucceeds(
      uploadBytes(ref(storageA, 'transferencias/tenantA/comprobante.jpg'), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
        contentType: 'image/jpeg',
      })
    );
    await assertFails(
      uploadBytes(ref(storageA, 'transferencias/tenantB/comprobante.jpg'), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
        contentType: 'image/jpeg',
      })
    );
    await assertFails(
      uploadBytes(ref(storageA, 'transferencias/comprobante-legado.jpg'), new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), {
        contentType: 'image/jpeg',
      })
    );
  });

  it('mantiene mensajes y eventos de proveedor bajo autoridad del backend', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'mensajes_whatsapp', 'mensaje-a'), {
        negocioId: 'tenantA',
        telefono: '3000000000',
        tipo: 'entrada',
        contenido: 'Hola',
        estado: 'entregado',
        creadoEn: new Date(0),
      });
      await setDoc(doc(context.firestore(), 'mensajes_whatsapp', 'mensaje-a', 'eventos_entrega', 'evento-a'), {
        negocioId: 'tenantA',
        tipo: 'entregado',
      });
    });
    const adminA = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const adminB = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();
    const mensajeA = doc(adminA, 'mensajes_whatsapp', 'mensaje-a');
    const eventoA = doc(adminA, 'mensajes_whatsapp', 'mensaje-a', 'eventos_entrega', 'evento-a');
    const eventoB = doc(adminB, 'mensajes_whatsapp', 'mensaje-a', 'eventos_entrega', 'evento-b');

    await assertSucceeds(getDoc(eventoA));
    await assertSucceeds(updateDoc(mensajeA, { estado: 'leido', actualizadoEn: new Date() }));
    await assertFails(updateDoc(mensajeA, { contenido: 'alterado' }));
    await assertFails(setDoc(doc(adminA, 'mensajes_whatsapp', 'mensaje-falso'), {
      negocioId: 'tenantA',
      telefono: '3000000000',
      tipo: 'salida',
      contenido: 'Mensaje falso',
      estado: 'enviado',
    }));
    await assertFails(setDoc(doc(adminA, 'mensajes_whatsapp', 'mensaje-a', 'eventos_entrega', 'evento-falso'), {
      negocioId: 'tenantA',
      tipo: 'leido',
    }));
    await assertFails(getDoc(doc(adminB, 'mensajes_whatsapp', 'mensaje-a', 'eventos_entrega', 'evento-a')));
    await assertFails(setDoc(eventoB, { estado: 'leido' }));
  });

  it('mantiene los eventos internos de webhooks fuera del alcance del cliente', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'webhook_eventos', 'evento-1'), {
        proveedor: 'externo',
        negocioId: 'tenantA',
      });
    });

    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const adminDb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const publicDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(adminDb, 'webhook_eventos', 'evento-1')));
    await assertFails(
      setDoc(doc(adminDb, 'webhook_eventos', 'evento-falso'), {
        proveedor: 'externo',
      })
    );
    await assertFails(getDoc(doc(publicDb, 'webhook_eventos', 'evento-1')));
  });

  it('conserva las colecciones históricas de pagos cerradas a todos los clientes', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'transacciones_pago', 'historica-1'), {
        estado: 'archivada',
      });
      await setDoc(doc(context.firestore(), 'sesiones_pago', 'historica-1'), {
        estado: 'archivada',
      });
    });

    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const adminDb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const publicDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(adminDb, 'transacciones_pago', 'historica-1')));
    await assertFails(setDoc(doc(adminDb, 'transacciones_pago', 'nueva'), { monto: 1000 }));
    await assertFails(getDoc(doc(adminDb, 'sesiones_pago', 'historica-1')));
    await assertFails(setDoc(doc(publicDb, 'sesiones_pago', 'nueva'), { estado: 'activa' }));
  });

  it('mantiene privados los controles internos del endpoint de pedidos', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    const adminDb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const publicDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(adminDb, '_idempotencia_pedidos_publicos', 'registro-1')));
    await assertFails(
      setDoc(doc(adminDb, '_idempotencia_pedidos_publicos', 'registro-1'), { ok: true })
    );
    await assertFails(getDoc(doc(publicDb, '_limites_pedidos_publicos', 'registro-1')));
    await assertFails(
      setDoc(doc(publicDb, '_limites_pedidos_publicos', 'registro-1'), { count: 1 })
    );
    await assertFails(getDoc(doc(adminDb, '_ordenes_whatsapp_activas', 'registro-1')));
    await assertFails(
      setDoc(doc(adminDb, '_ordenes_whatsapp_activas', 'registro-1'), {
        negocioId: 'tenantA',
        ordenId: 'orden-1',
      })
    );
  });

  it('aísla metas_presupuestos por tenant y restringe edición a administradores', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'usuarios_negocio', 'cajero-a'), {
        uid: 'cajero-a',
        email: 'cajero-a@example.com',
        nombre: 'Cajero A',
        negocioId: 'tenantA',
        rol: 'cajero',
        activo: true,
        creadoEn: new Date(0),
      });
    });

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroADb = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    await assertSucceeds(
      setDoc(doc(adminADb, 'metas_presupuestos', 'tenantA_2026-11'), {
        negocioId: 'tenantA',
        mesKey: '2026-11',
        metaVentasMensualCOP: 20000000,
      })
    );

    await assertSucceeds(getDoc(doc(cajeroADb, 'metas_presupuestos', 'tenantA_2026-11')));
    await assertFails(
      setDoc(doc(cajeroADb, 'metas_presupuestos', 'tenantA_2026-12'), {
        negocioId: 'tenantA',
        mesKey: '2026-12',
        metaVentasMensualCOP: 25000000,
      })
    );
    await assertFails(getDoc(doc(adminBDb, 'metas_presupuestos', 'tenantA_2026-11')));
  });

  it('permite lectura pública de promociones solo si están activas y aísla escritura administrativa', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'promociones', 'promo-activa-a'), {
        negocioId: 'tenantA',
        nombre: 'Happy Hour Activo',
        activo: true,
        usosActuales: 0,
      });
      await setDoc(doc(db, 'promociones', 'promo-inactiva-a'), {
        negocioId: 'tenantA',
        nombre: 'Promo Pausada',
        activo: false,
        usosActuales: 0,
      });
    });

    const publicDb = testEnv.unauthenticatedContext().firestore();
    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    await assertSucceeds(getDoc(doc(publicDb, 'promociones', 'promo-activa-a')));
    await assertFails(getDoc(doc(publicDb, 'promociones', 'promo-inactiva-a')));
    await assertSucceeds(getDoc(doc(adminADb, 'promociones', 'promo-inactiva-a')));
    await assertFails(getDoc(doc(adminBDb, 'promociones', 'promo-inactiva-a')));
    await assertFails(
      setDoc(doc(adminBDb, 'promociones', 'promo-forjada-a'), {
        negocioId: 'tenantA',
        nombre: 'Promo Forjada',
        activo: true,
        usosActuales: 0,
      })
    );
    await assertFails(deleteDoc(doc(adminBDb, 'promociones', 'promo-activa-a')));
  });

  it('endurece las escrituras públicas de menú QR en mesas, cuentas_mesas y domicilios', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'mesas', 'mesa-1'), {
        negocioId: 'tenantA',
        numero: 1,
        nombre: 'Mesa 1',
        capacidad: 4,
        zona: 'Salón',
        estado: 'libre',
        totalActual: 0,
      });
      await setDoc(doc(db, 'cuentas_mesas', 'cuenta-1'), {
        negocioId: 'tenantA',
        mesaId: 'mesa-1',
        estado: 'abierta',
        total: 25000,
        rondas: [],
        items: [],
      });
    });

    const publicDb = testEnv.unauthenticatedContext().firestore();

    // Llamado al mesero en mesa libre sin cambiar estado o metadatos de mesa
    await assertSucceeds(
      updateDoc(doc(publicDb, 'mesas', 'mesa-1'), {
        negocioId: 'tenantA',
        llamadoPendiente: { id: 'notif-1', tipo: 'llamado', motivo: 'Servilletas', atendido: false },
        actualizadoEn: new Date(1),
      })
    );
    await assertFails(
      updateDoc(doc(publicDb, 'mesas', 'mesa-1'), {
        nombre: 'Mesa Hackeada',
        capacidad: 99,
      })
    );

    // Apertura de cuenta pública debe empezar abierta y en total 0
    await assertFails(
      setDoc(doc(publicDb, 'cuentas_mesas', 'cuenta-falsa'), {
        negocioId: 'tenantA',
        mesaId: 'mesa-1',
        estado: 'cobrada',
        total: 0,
      })
    );
    await assertSucceeds(
      setDoc(doc(publicDb, 'cuentas_mesas', 'cuenta-nueva'), {
        negocioId: 'tenantA',
        mesaId: 'mesa-1',
        estado: 'abierta',
        total: 0,
      })
    );

    // Actualización de cuenta pública no puede reducir total ni marcar cobrada ni inyectar descuento
    await assertFails(
      updateDoc(doc(publicDb, 'cuentas_mesas', 'cuenta-1'), {
        total: 1000,
      })
    );
    await assertFails(
      updateDoc(doc(publicDb, 'cuentas_mesas', 'cuenta-1'), {
        estado: 'cobrada',
      })
    );
    await assertFails(
      updateDoc(doc(publicDb, 'cuentas_mesas', 'cuenta-1'), {
        descuento: 20000,
      })
    );
    await assertSucceeds(
      updateDoc(doc(publicDb, 'cuentas_mesas', 'cuenta-1'), {
        estado: 'por_cobrar',
        actualizadoEn: new Date(2),
      })
    );

    // Comanda directa en domicilios con origen pos exige estado pendiente y total >= 0
    await assertFails(
      setDoc(doc(publicDb, 'domicilios', 'comanda-invalida'), {
        negocioId: 'tenantA',
        origen: 'pos',
        estado: 'entregado',
        items: [],
        total: 10000,
      })
    );
    await assertFails(
      setDoc(doc(publicDb, 'domicilios', 'comanda-negativa'), {
        negocioId: 'tenantA',
        origen: 'pos',
        estado: 'pendiente',
        items: [],
        total: -500,
      })
    );
  });

  it('protege el tarifario de zonas de domicilio por tenant y restringe escritura a admin', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'usuarios_negocio', 'cajero-a'), {
        uid: 'cajero-a',
        email: 'cajero-a@example.com',
        negocioId: 'tenantA',
        rol: 'cajero',
        activo: true,
      });
    });

    const adminA = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroA = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const publicDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(
      setDoc(doc(adminA, 'configuraciones_zonas_domicilio', 'tenantA'), {
        negocioId: 'tenantA',
        habilitarTarifaAutomatica: true,
        tarifaPorDefecto: 5000,
        tiempoEstimadoPorDefectoMin: 30,
        zonas: [],
      })
    );

    await assertFails(
      setDoc(doc(cajeroA, 'configuraciones_zonas_domicilio', 'tenantA'), {
        negocioId: 'tenantA',
        habilitarTarifaAutomatica: true,
        tarifaPorDefecto: 5000,
        tiempoEstimadoPorDefectoMin: 30,
        zonas: [],
      })
    );

    await assertFails(
      setDoc(doc(adminA, 'configuraciones_zonas_domicilio', 'tenantB'), {
        negocioId: 'tenantB',
        habilitarTarifaAutomatica: true,
        tarifaPorDefecto: 5000,
        tiempoEstimadoPorDefectoMin: 30,
        zonas: [],
      })
    );

    await assertSucceeds(getDoc(doc(publicDb, 'configuraciones_zonas_domicilio', 'tenantA')));
    await assertFails(
      setDoc(doc(publicDb, 'configuraciones_zonas_domicilio', 'tenantA'), {
        negocioId: 'tenantA',
        tarifaPorDefecto: 0,
      })
    );
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

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de cotizaciones y catering', () => {
  it('aísla lectura, creación y actualización por negocioId e impide inyectar campo id o borrar por cajero', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroADb = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    const cotRefA = doc(cajeroADb, 'cotizaciones', 'cot-a1');
    // Rechaza si intenta incluir campo mutable id
    await assertFails(
      setDoc(cotRefA, {
        id: 'spoof',
        negocioId: 'tenantA',
        codigo: 'COT-2026-001',
        totalCotizado: 200000,
      })
    );

    // Permite crear cotización válida en el tenant propio
    await assertSucceeds(
      setDoc(cotRefA, {
        negocioId: 'tenantA',
        codigo: 'COT-2026-001',
        totalCotizado: 200000,
        estado: 'borrador',
      })
    );

    // Bloquea lectura/escritura cross-tenant
    await assertFails(getDoc(doc(adminBDb, 'cotizaciones', 'cot-a1')));
    await assertFails(updateDoc(doc(adminBDb, 'cotizaciones', 'cot-a1'), { estado: 'aprobada' }));

    // Bloquea cambio de negocioId y eliminación por cajero; permite eliminar al admin
    await assertFails(updateDoc(cotRefA, { negocioId: 'tenantB' }));
    await assertFails(deleteDoc(cotRefA));
    await assertSucceeds(deleteDoc(doc(adminADb, 'cotizaciones', 'cot-a1')));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de bonos de regalo y tarjetas prepago', () => {
  it('protege aislamiento por negocioId, saldo >= 0, inmutabilidad de codigo/montoInicial y ledger inmutable', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroADb = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    const bonoRefA = doc(cajeroADb, 'bonos_prepago', 'bono_tenantA_BON-2026-TEST01');

    // Rechaza saldo negativo o inyección de id
    await assertFails(
      setDoc(bonoRefA, {
        id: 'fake-id',
        negocioId: 'tenantA',
        codigo: 'BON-2026-TEST01',
        tipo: 'bono_regalo',
        estado: 'activo',
        metodoPagoEmision: 'efectivo',
        montoInicial: 50000,
        saldoActual: 50000,
      })
    );
    await assertFails(
      setDoc(bonoRefA, {
        negocioId: 'tenantA',
        codigo: 'BON-2026-TEST01',
        tipo: 'bono_regalo',
        estado: 'activo',
        metodoPagoEmision: 'efectivo',
        montoInicial: 50000,
        saldoActual: -100,
      })
    );

    // Permite creación válida
    await assertSucceeds(
      setDoc(bonoRefA, {
        negocioId: 'tenantA',
        codigo: 'BON-2026-TEST01',
        tipo: 'bono_regalo',
        estado: 'activo',
        metodoPagoEmision: 'efectivo',
        montoInicial: 50000,
        saldoActual: 50000,
      })
    );

    // Rechaza alteración de código o montoInicial o saldo negativo
    await assertFails(updateDoc(bonoRefA, { codigo: 'OTRO-9999' }));
    await assertFails(updateDoc(bonoRefA, { montoInicial: 999999 }));
    await assertFails(updateDoc(bonoRefA, { saldoActual: -1 }));

    // Permite redención válida en tenantA
    await assertSucceeds(updateDoc(bonoRefA, { saldoActual: 20000 }));

    // Bloquea lectura/escritura desde tenantB y borrado por cajero
    await assertFails(getDoc(doc(adminBDb, 'bonos_prepago', 'bono_tenantA_BON-2026-TEST01')));
    await assertFails(
      updateDoc(doc(adminBDb, 'bonos_prepago', 'bono_tenantA_BON-2026-TEST01'), {
        saldoActual: 0,
      })
    );
    await assertFails(deleteDoc(bonoRefA));

    // Ledger inmutable movimientos_bonos
    const movRefA = doc(cajeroADb, 'movimientos_bonos', 'mov-bono-1');
    await assertSucceeds(
      setDoc(movRefA, {
        negocioId: 'tenantA',
        bonoId: 'bono_tenantA_BON-2026-TEST01',
        tipo: 'emision',
        monto: 50000,
        saldoPrevio: 0,
        saldoResultante: 50000,
      })
    );
    await assertFails(updateDoc(movRefA, { monto: 1000 }));
    await assertFails(getDoc(doc(adminBDb, 'movimientos_bonos', 'mov-bono-1')));
    await assertSucceeds(deleteDoc(doc(adminADb, 'bonos_prepago', 'bono_tenantA_BON-2026-TEST01')));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de movimientos de caja y cortes X', () => {
  it('protege aislamiento por negocioId, montos > 0 e inmutabilidad del ledger de caja y cortes X', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroADb = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    const movRefA = doc(cajeroADb, 'movimientos_caja', 'mov-caja-a1');

    // Rechaza monto <= 0 o inyección de id
    await assertFails(
      setDoc(movRefA, {
        id: 'fake-id',
        negocioId: 'tenantA',
        tipo: 'sangria_caja_fuerte',
        monto: 100000,
        motivo: 'Retiro a caja fuerte',
      })
    );
    await assertFails(
      setDoc(movRefA, {
        negocioId: 'tenantA',
        tipo: 'sangria_caja_fuerte',
        monto: 0,
        motivo: 'Retiro en cero',
      })
    );

    // Permite creación válida por cajero en su tenant
    await assertSucceeds(
      setDoc(movRefA, {
        negocioId: 'tenantA',
        tipo: 'sangria_caja_fuerte',
        monto: 200000,
        motivo: 'Retiro a caja fuerte por exceso de efectivo',
      })
    );

    // Ledger inmutable: prohíbe update y borrado por cajero o acceso cross-tenant
    await assertFails(updateDoc(movRefA, { monto: 50000 }));
    await assertFails(deleteDoc(movRefA));
    await assertFails(getDoc(doc(adminBDb, 'movimientos_caja', 'mov-caja-a1')));
    await assertSucceeds(deleteDoc(doc(adminADb, 'movimientos_caja', 'mov-caja-a1')));

    // Cortes X inmutables
    const corteRefA = doc(cajeroADb, 'cortes_x', 'corte-x-a1');
    await assertSucceeds(
      setDoc(corteRefA, {
        negocioId: 'tenantA',
        cajeroSaliente: 'Cajero Turno A',
        efectivoEsperado: 150000,
      })
    );
    await assertFails(updateDoc(corteRefA, { efectivoEsperado: 0 }));
    await assertFails(getDoc(doc(adminBDb, 'cortes_x', 'corte-x-a1')));
    await assertSucceeds(deleteDoc(doc(adminADb, 'cortes_x', 'corte-x-a1')));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de lotes_inventario (PEPS / FIFO)', () => {
  it('protege aislamiento por negocioId, inmutabilidad de codigoLote/cantidadInicial y rangos sanitarios', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroADb = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    const loteRefA = doc(cajeroADb, 'lotes_inventario', 'lote-a1');

    // Rechaza inyección de campo id, cantidadDisponible > cantidadInicial o fecha inválida
    await assertFails(
      setDoc(loteRefA, {
        id: 'fake-id',
        negocioId: 'tenantA',
        insumoId: 'ins-queso',
        insumoNombre: 'Queso Costeño',
        codigoLote: 'LOT-20261123-AA01',
        cantidadInicial: 10,
        cantidadDisponible: 10,
        cantidadConsumida: 0,
        costoUnitario: 18000,
        estado: 'activo',
        fechaVencimiento: '2026-11-30',
      })
    );
    await assertFails(
      setDoc(loteRefA, {
        negocioId: 'tenantA',
        insumoId: 'ins-queso',
        insumoNombre: 'Queso Costeño',
        codigoLote: 'LOT-20261123-AA01',
        cantidadInicial: 10,
        cantidadDisponible: 12,
        cantidadConsumida: 0,
        costoUnitario: 18000,
        estado: 'activo',
      })
    );
    await assertFails(
      setDoc(loteRefA, {
        negocioId: 'tenantA',
        insumoId: 'ins-queso',
        insumoNombre: 'Queso Costeño',
        codigoLote: 'LOT-20261123-AA01',
        cantidadInicial: 10,
        cantidadDisponible: 10,
        cantidadConsumida: 0,
        costoUnitario: 18000,
        estado: 'activo',
        fechaVencimiento: '30/11/2026',
      })
    );

    // Creación válida dentro del tenant
    await assertSucceeds(
      setDoc(loteRefA, {
        negocioId: 'tenantA',
        insumoId: 'ins-queso',
        insumoNombre: 'Queso Costeño',
        codigoLote: 'LOT-20261123-AA01',
        cantidadInicial: 10,
        cantidadDisponible: 10,
        cantidadConsumida: 0,
        costoUnitario: 18000,
        estado: 'activo',
        fechaVencimiento: '2026-11-30',
      })
    );

    // Consumo operativo permitido para miembro del tenant
    await assertSucceeds(
      updateDoc(loteRefA, {
        cantidadDisponible: 6,
        cantidadConsumida: 4,
      })
    );

    // Prohíbe alterar codigoLote, cantidadInicial o dejar cantidadDisponible negativa
    await assertFails(updateDoc(loteRefA, { codigoLote: 'LOT-ALTERADO' }));
    await assertFails(updateDoc(loteRefA, { cantidadInicial: 99 }));
    await assertFails(updateDoc(loteRefA, { cantidadDisponible: -1 }));

    // Aislamiento cross-tenant y delete exclusivo para admin
    await assertFails(getDoc(doc(adminBDb, 'lotes_inventario', 'lote-a1')));
    await assertFails(deleteDoc(loteRefA));
    await assertSucceeds(deleteDoc(doc(adminADb, 'lotes_inventario', 'lote-a1')));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de Bitácora Sanitaria BPM', () => {
  it('protege aislamiento por negocioId, rangos térmicos, inmutabilidad de aceite y cierre de checklists', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cocinero-a', 'cocinero-a@example.com', 'activo', 'cocinero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cocineroADb = testEnv
      .authenticatedContext('cocinero-a', { email: 'cocinero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    // Config BPM solo writable por admin del tenant
    const cfgRefA = doc(adminADb, 'configuraciones_bpm', 'tenantA');
    const cfgRefCocinero = doc(cocineroADb, 'configuraciones_bpm', 'tenantA');
    await assertFails(
      setDoc(cfgRefCocinero, {
        negocioId: 'tenantA',
        equiposFrio: [],
        freidoras: [],
        plantillaApertura: [],
        plantillaCierre: [],
      })
    );
    await assertSucceeds(
      setDoc(cfgRefA, {
        negocioId: 'tenantA',
        equiposFrio: [{ id: 'eq-1', nombre: 'Nevera 1' }],
        freidoras: [{ id: 'fre-1', nombre: 'Freidora 1' }],
        plantillaApertura: [{ id: 'ap-1', titulo: 'Lavado manos' }],
        plantillaCierre: [{ id: 'ci-1', titulo: 'Limpieza' }],
      })
    );
    await assertSucceeds(getDoc(cfgRefCocinero));
    await assertFails(getDoc(doc(adminBDb, 'configuraciones_bpm', 'tenantA')));

    // Temperaturas BPM: validación de rango e inmutabilidad de medición al resolver desvío
    const tempRefA = doc(cocineroADb, 'registros_temperatura_bpm', 'temp-a1');
    await assertFails(
      setDoc(tempRefA, {
        negocioId: 'tenantA',
        equipoId: 'eq-1',
        equipoNombre: 'Nevera 1',
        tipoEquipo: 'refrigeracion',
        temperaturaC: 400,
        estadoConformidad: 'critico',
        franja: 'apertura',
        fechaIso: '2026-11-24',
        responsableNombre: 'Cocinero A',
      })
    );
    await assertSucceeds(
      setDoc(tempRefA, {
        negocioId: 'tenantA',
        equipoId: 'eq-1',
        equipoNombre: 'Nevera 1',
        tipoEquipo: 'refrigeracion',
        temperaturaC: 8.5,
        estadoConformidad: 'critico',
        franja: 'apertura',
        fechaIso: '2026-11-24',
        responsableNombre: 'Cocinero A',
        resuelto: false,
      })
    );
    await assertSucceeds(
      updateDoc(tempRefA, {
        accionCorrectiva: 'Se ajustó empaque y bajó a 2.5 °C',
        resuelto: true,
        resueltoPor: 'Cocinero A',
      })
    );
    await assertFails(updateDoc(tempRefA, { temperaturaC: 2.0 }));
    await assertFails(getDoc(doc(adminBDb, 'registros_temperatura_bpm', 'temp-a1')));

    // Aceite de freidoras: historial inmutable
    const oilRefA = doc(cocineroADb, 'registros_aceite_bpm', 'oil-a1');
    await assertSucceeds(
      setDoc(oilRefA, {
        negocioId: 'tenantA',
        freidoraId: 'fre-1',
        freidoraNombre: 'Freidora #1',
        tipoEvento: 'cambio_completo',
        colorAceite: 'claro_optimo',
        estadoAceite: 'optimo',
        fechaIso: '2026-11-24',
        litrosCambiados: 15,
        responsableNombre: 'Cocinero A',
      })
    );
    await assertFails(updateDoc(oilRefA, { litrosCambiados: 20 }));

    // Checklists BPM: tipo y fechaIso inmutables en update
    const chkRefA = doc(cocineroADb, 'checklists_bpm', 'tenantA_2026-11-24_apertura');
    await assertSucceeds(
      setDoc(chkRefA, {
        negocioId: 'tenantA',
        tipo: 'apertura',
        estado: 'en_progreso',
        fechaIso: '2026-11-24',
        items: [{ id: 'ap-1', estado: 'cumple' }],
        totalItems: 1,
        porcentajeCumplimiento: 100,
        responsableNombre: 'Cocinero A',
      })
    );
    await assertSucceeds(
      updateDoc(chkRefA, {
        estado: 'completado',
        porcentajeCumplimiento: 100,
      })
    );
    await assertFails(updateDoc(chkRefA, { tipo: 'cierre' }));
    await assertFails(deleteDoc(chkRefA));
    await assertSucceeds(deleteDoc(doc(adminADb, 'checklists_bpm', 'tenantA_2026-11-24_apertura')));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de Mantenimiento Preventivo y Fallas KDS', () => {
  it('protege aislamiento por negocioId, inmutabilidad de órdenes y reporte de fallas desde cocina', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cocinero-a', 'cocinero-a@example.com', 'activo', 'cocinero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cocineroADb = testEnv
      .authenticatedContext('cocinero-a', { email: 'cocinero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    const eqRefA = doc(adminADb, 'equipos_mantenimiento', 'eq-mant-a1');
    const eqRefCocinero = doc(cocineroADb, 'equipos_mantenimiento', 'eq-mant-a1');

    // Cocinero no puede crear activos nuevos; admin sí
    await assertFails(
      setDoc(eqRefCocinero, {
        negocioId: 'tenantA',
        codigoActivo: 'COC-001',
        nombre: 'Freidora #1',
        categoria: 'coccion',
        estadoOperativo: 'operativo',
        frecuenciaPreventivoDias: 90,
        costoAcumuladoCOP: 0,
        totalIntervenciones: 0,
        activo: true,
      })
    );
    await assertSucceeds(
      setDoc(eqRefA, {
        negocioId: 'tenantA',
        codigoActivo: 'COC-001',
        nombre: 'Freidora #1',
        categoria: 'coccion',
        estadoOperativo: 'operativo',
        frecuenciaPreventivoDias: 90,
        costoAcumuladoCOP: 0,
        totalIntervenciones: 0,
        activo: true,
      })
    );
    await assertFails(getDoc(doc(adminBDb, 'equipos_mantenimiento', 'eq-mant-a1')));

    // Cocinero puede reportar falla y marcar estadoOperativo con_falla/fuera_servicio únicamente
    const fallaRefA = doc(cocineroADb, 'reportes_falla_equipos', 'falla-a1');
    await assertSucceeds(
      setDoc(fallaRefA, {
        negocioId: 'tenantA',
        equipoId: 'eq-mant-a1',
        equipoNombre: 'Freidora #1',
        categoriaEquipo: 'coccion',
        severidad: 'critica',
        detieneOperacion: true,
        descripcion: 'No enciende quemador piloto',
        estado: 'abierta',
        origenReporte: 'cocina_kds',
        fechaIso: '2026-11-24',
        reportadoPor: 'Cocinero A',
      })
    );
    await assertSucceeds(
      updateDoc(eqRefCocinero, {
        estadoOperativo: 'fuera_servicio',
      })
    );
    await assertFails(updateDoc(eqRefCocinero, { nombre: 'Alterado por cocinero' }));

    // Órdenes de mantenimiento: solo admin crea, historial inmutable
    const ordenRefA = doc(adminADb, 'ordenes_mantenimiento', 'ord-mant-a1');
    await assertSucceeds(
      setDoc(ordenRefA, {
        negocioId: 'tenantA',
        equipoId: 'eq-mant-a1',
        equipoNombre: 'Freidora #1',
        categoriaEquipo: 'coccion',
        tipo: 'correctivo',
        descripcionTrabajo: 'Cambio de termopila y limpieza',
        fechaIso: '2026-11-24',
        tecnicoNombre: 'TecniCocinas',
        costoCOP: 120000,
        conciliadoConGasto: true,
        responsableNombre: 'Admin A',
        estadoEquipoResultante: 'operativo',
      })
    );
    await assertFails(updateDoc(ordenRefA, { costoCOP: 0 }));
    await assertFails(getDoc(doc(adminBDb, 'ordenes_mantenimiento', 'ord-mant-a1')));

    // Resolución controlada de falla y limpieza admin
    await assertSucceeds(
      updateDoc(fallaRefA, {
        estado: 'resuelta',
        resueltoPor: 'Admin A',
        ordenMantenimientoId: 'ord-mant-a1',
      })
    );
    await assertSucceeds(deleteDoc(ordenRefA));
    await assertSucceeds(deleteDoc(doc(adminADb, 'reportes_falla_equipos', 'falla-a1')));
    await assertSucceeds(deleteDoc(eqRefA));
  });
});

describe.runIf(EMULATORS_AVAILABLE)('Firestore rules multi-tenant de Reclamos, PQRS y Garantías', () => {
  it('protege aislamiento por negocioId, estado inicial, campos inmutables y delete exclusivo admin', async () => {
    await seedTenant('tenantA', 'admin-a', 'admin-a@example.com', 'activo', 'admin');
    await seedTenant('tenantA', 'cajero-a', 'cajero-a@example.com', 'activo', 'cajero');
    await seedTenant('tenantB', 'admin-b', 'admin-b@example.com', 'activo', 'admin');

    const adminADb = testEnv
      .authenticatedContext('admin-a', { email: 'admin-a@example.com' })
      .firestore();
    const cajeroADb = testEnv
      .authenticatedContext('cajero-a', { email: 'cajero-a@example.com' })
      .firestore();
    const adminBDb = testEnv
      .authenticatedContext('admin-b', { email: 'admin-b@example.com' })
      .firestore();

    const recRefA = doc(cajeroADb, 'reclamos_pqrs', 'rec-a1');

    // Prohíbe crear reclamo ya resuelto o con id embebido
    await assertFails(
      setDoc(recRefA, {
        negocioId: 'tenantA',
        codigoRadicado: 'PQR-20261124-001',
        tipo: 'reclamo',
        canal: 'domicilio',
        causaRaiz: 'demora_entrega',
        prioridad: 'alta',
        estado: 'resuelto',
        slaObjetivoMin: 60,
        clienteNombre: 'Cliente Prueba',
        montoPedidoCOP: 30000,
        descripcion: 'Demora superior a 60 minutos en la entrega',
        fechaIso: '2026-11-24',
        registradoPor: 'Cajero A',
      })
    );

    // Creación válida por cajero del tenant
    await assertSucceeds(
      setDoc(recRefA, {
        negocioId: 'tenantA',
        codigoRadicado: 'PQR-20261124-001',
        tipo: 'garantia_pedido',
        canal: 'domicilio',
        causaRaiz: 'pedido_incompleto',
        prioridad: 'critica',
        estado: 'abierto',
        slaObjetivoMin: 30,
        clienteNombre: 'Cliente Prueba',
        montoPedidoCOP: 30000,
        descripcion: 'Faltaron salsas y bebida en pedido a domicilio',
        fechaIso: '2026-11-24',
        registradoPor: 'Cajero A',
      })
    );

    // Cross-tenant prohibido
    await assertFails(getDoc(doc(adminBDb, 'reclamos_pqrs', 'rec-a1')));

    // Update controlado permitido, pero prohíbe mutar codigoRadicado o registradoPor
    await assertSucceeds(
      updateDoc(recRefA, {
        estado: 'resuelto',
        tipoResolucion: 'bono_cortesia',
        montoCompensacionCOP: 15000,
        resolucionNotas: 'Vale de cortesía emitido',
        resueltoPor: 'Cajero A',
        bonoCortesiaCodigo: 'VAL-2026-001',
        cumplioSla: true,
        tiempoResolucionMin: 12,
      })
    );
    await assertFails(updateDoc(recRefA, { codigoRadicado: 'PQR-ALTERADO' }));
    await assertFails(updateDoc(recRefA, { montoCompensacionCOP: -500 }));

    // Delete exclusivo admin
    await assertFails(deleteDoc(recRefA));
    await assertSucceeds(deleteDoc(doc(adminADb, 'reclamos_pqrs', 'rec-a1')));
  });
});
