import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  timestamp: { seconds: 123 },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'mock-col' })),
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  setDoc: firestoreMocks.setDoc,
  Timestamp: {
    now: () => firestoreMocks.timestamp,
    fromMillis: (ms: number) => ({ seconds: Math.floor(ms / 1000) }),
  },
  updateDoc: firestoreMocks.updateDoc,
  where: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(() => Promise.resolve({ user: { uid: 'nuevo-uid' } })),
}));

vi.mock('../firebase', () => ({ db: {}, auth: { currentUser: null } }));

import {
  actualizarDatosNegocio,
  aprobarNegocio,
  cambiarEstadoNegocio,
  getPerfilUsuarioYNegocio,
  getNegocioPorSlug,
  getNegociosActivosPublicos,
  renovarSuscripcionNegocio,
  solicitarRegistroNegocio,
} from '../negociosService';

describe('datos operativos del negocio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guarda solo datos operativos aunque la entrada incluya campos de suscripción o identidad', async () => {
    const updates = {
      nombre: 'Restaurante actualizado',
      telefono: '3000000000',
      ciudad: 'Cúcuta',
      direccion: 'Calle 1',
      logoUrl: null,
      estado: 'activo' as const,
      plan: 'enterprise' as const,
      id: 'otro-tenant',
      propietarioEmail: 'otro@example.com',
      propietarioNombre: 'Otro propietario',
      aprobadoEn: { seconds: 999 },
      notasAdmin: 'Activado desde el cliente',
      actualizadoEn: { seconds: 999 },
    };

    await actualizarDatosNegocio('tenant-a', updates);

    expect(firestoreMocks.updateDoc).toHaveBeenCalledExactlyOnceWith(
      { path: 'negocios/tenant-a' },
      {
        nombre: updates.nombre,
        telefono: updates.telefono,
        ciudad: updates.ciudad,
        direccion: updates.direccion,
        logoUrl: null,
        actualizadoEn: firestoreMocks.timestamp,
      }
    );
  });

  it('mantiene una edición parcial sin enviar campos indefinidos', async () => {
    await actualizarDatosNegocio('tenant-a', { nombre: 'Nuevo nombre' });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledExactlyOnceWith(
      { path: 'negocios/tenant-a' },
      { nombre: 'Nuevo nombre', actualizadoEn: firestoreMocks.timestamp }
    );
  });

  it('rechaza un tenant inválido antes de escribir', async () => {
    await expect(actualizarDatosNegocio('../tenant-b', { nombre: 'Intruso' }))
      .rejects.toThrow();

    expect(firestoreMocks.updateDoc).not.toHaveBeenCalled();
  });

  it('propaga los fallos para que configuración no confirme una edición fallida', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.updateDoc.mockRejectedValueOnce(failure);

    await expect(actualizarDatosNegocio('tenant-a', { nombre: 'Nuevo nombre' }))
      .rejects.toBe(failure);
  });

  it('resuelve el negocio asignado por el perfil con su ID canónico', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          uid: 'admin-a',
          email: 'admin-a@example.com',
          nombre: 'Admin',
          negocioId: 'tenant-a',
          rol: 'admin',
          activo: true,
        }),
      })
      .mockResolvedValueOnce({
        id: 'tenant-a',
        exists: () => true,
        data: () => ({ id: 'tenant-b', nombre: 'Mi negocio', estado: 'suspendido' }),
      });

    const perfil = await getPerfilUsuarioYNegocio('admin-a@example.com', 'admin-a');

    expect(perfil.negocio).toEqual({
      id: 'tenant-a',
      nombre: 'Mi negocio',
      estado: 'suspendido',
    });
    expect(firestoreMocks.getDoc).toHaveBeenNthCalledWith(1, { path: 'usuarios_negocio/admin-a' });
    expect(firestoreMocks.getDoc).toHaveBeenNthCalledWith(2, { path: 'negocios/tenant-a' });
    expect(perfil.esSuperAdmin).toBe(false);
  });

  it('persiste los datos operativos del negocio oficial laparada y hace fallback a setDoc si el documento aún no existe', async () => {
    firestoreMocks.updateDoc.mockRejectedValueOnce({ code: 'not-found' });

    await actualizarDatosNegocio('laparada', {
      telefono: '3109876543',
      direccion: 'Av. Libertadores # 10-20',
      ciudad: 'Cúcuta',
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledExactlyOnceWith(
      { path: 'negocios/laparada' },
      {
        telefono: '3109876543',
        direccion: 'Av. Libertadores # 10-20',
        ciudad: 'Cúcuta',
        actualizadoEn: firestoreMocks.timestamp,
      }
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledExactlyOnceWith(
      { path: 'negocios/laparada' },
      {
        telefono: '3109876543',
        direccion: 'Av. Libertadores # 10-20',
        ciudad: 'Cúcuta',
        actualizadoEn: firestoreMocks.timestamp,
      },
      { merge: true }
    );
  });

  it('fusiona los datos operativos persistidos de laparada para el superadmin conservando su estado activo', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      id: 'laparada',
      exists: () => true,
      data: () => ({
        telefono: '3109876543',
        direccion: 'Av. 0 # 15-30',
        ciudad: 'Cúcuta',
        estado: 'suspendido',
      }),
    });

    const perfil = await getPerfilUsuarioYNegocio('andres.san1404@gmail.com', 'superadmin-uid');

    expect(perfil.esSuperAdmin).toBe(true);
    expect(perfil.negocio.id).toBe('laparada');
    expect(perfil.negocio.telefono).toBe('3109876543');
    expect(perfil.negocio.direccion).toBe('Av. 0 # 15-30');
    expect(perfil.negocio.estado).toBe('activo');
  });

  it('permite solicitar registro de un nuevo negocio con su plan deseado en estado pendiente', async () => {
    const res = await solicitarRegistroNegocio({
      nombreNegocio: 'El Punto Burger',
      nombrePropietario: 'Carlos Pérez',
      email: 'carlos@elpunto.com',
      password: 'password123',
      telefono: '3009876543',
      ciudad: 'Cúcuta',
      planDeseado: 'prueba_3d',
    });

    expect(res.uid).toBe('nuevo-uid');
    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(2);
  });

  it('permite al superadmin aprobar un negocio asignando vigencia y cuota de IA', async () => {
    await aprobarNegocio('tenant-nuevo', 'prueba_3d');

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { path: 'negocios/tenant-nuevo' },
      expect.objectContaining({
        estado: 'activo',
        plan: 'prueba_3d',
        planId: 'prueba_3d',
        cuotaRespuestasIA: 300,
        respuestasIAUsadas: 0,
      })
    );
  });

  it('permite renovar la suscripción de un negocio sumando días y cuota de IA', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        cuotaRespuestasIA: 300,
        suscripcionVenceEn: { toMillis: () => Date.now() + 86400000 },
      }),
    });

    await renovarSuscripcionNegocio('tenant-nuevo', 'semanal_7d');

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { path: 'negocios/tenant-nuevo' },
      expect.objectContaining({
        estado: 'activo',
        plan: 'semanal_7d',
        planId: 'semanal_7d',
        cuotaRespuestasIA: 1000, // 300 previas + 700 del nuevo plan
      })
    );
  });

  it('permite cambiar el estado de un negocio a suspendido o rechazado', async () => {
    await cambiarEstadoNegocio('tenant-nuevo', 'suspendido', 'Falta pago');

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { path: 'negocios/tenant-nuevo' },
      expect.objectContaining({
        estado: 'suspendido',
        notasAdmin: 'Falta pago',
      })
    );
  });

  describe('resolución pública de negocios por slug y marketplace', () => {
    it('resuelve La Parada de inmediato cuando el slug es laparada o la-parada', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ nombre: 'La Parada Oficial' }),
      });

      const res = await getNegocioPorSlug('la-parada');
      expect(res).not.toBeNull();
      expect(res?.id).toBe('laparada');
      expect(res?.nombre).toBe('La Parada Oficial');
    });

    it('busca por campo slug en Firestore y devuelve el negocio si está activo', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'tenant-123',
            data: () => ({
              nombre: 'El Punto Burger',
              slug: 'el-punto-burger',
              estado: 'activo',
            }),
          },
        ],
      });

      const res = await getNegocioPorSlug('el-punto-burger');
      expect(res).not.toBeNull();
      expect(res?.id).toBe('tenant-123');
      expect(res?.nombre).toBe('El Punto Burger');
    });

    it('devuelve null si el negocio no existe o no está activo', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const res = await getNegocioPorSlug('inexistente');
      expect(res).toBeNull();
    });

    it('obtiene los negocios activos para el marketplace e incluye siempre La Parada', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'local-1',
            data: () => ({
              id: 'local-1',
              nombre: 'Food Truck Central',
              slug: 'food-truck-central',
              estado: 'activo',
            }),
          },
        ],
      });
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ nombre: 'La Parada' }),
      });

      const lista = await getNegociosActivosPublicos();
      expect(lista.length).toBeGreaterThanOrEqual(2);
      expect(lista.some((n) => n.id === 'laparada')).toBe(true);
      expect(lista.some((n) => n.id === 'local-1')).toBe(true);
    });
  });
});
