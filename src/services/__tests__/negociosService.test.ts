import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  timestamp: { seconds: 123 },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocs: vi.fn(),
  query: vi.fn(() => ({})),
  Timestamp: { now: () => firestoreMocks.timestamp },
  updateDoc: firestoreMocks.updateDoc,
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

import { actualizarDatosNegocio, getPerfilUsuarioYNegocio } from '../negociosService';

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
});
