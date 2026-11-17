import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ field, op, value })),
  onSnapshot: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name: string) => ({ name })),
  doc: vi.fn((_db, col: string, id: string) => ({ col, id })),
  getDocs: firestoreMocks.getDocs,
  getDoc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  increment: vi.fn(),
  query: firestoreMocks.query,
  where: firestoreMocks.where,
  onSnapshot: firestoreMocks.onSnapshot,
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  onPromocionesActivasChange,
  onPromocionesChange,
} from '../promocionesService';

describe('promocionesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('onPromocionesActivasChange filtra por negocioId y activo == true para el storefront público', () => {
    const unsubscribeMock = vi.fn();
    firestoreMocks.onSnapshot.mockImplementation((_q, onNext) => {
      onNext({
        docs: [
          {
            id: 'promo-canonica',
            data: () => ({
              id: 'id-no-confiable',
              negocioId: 'laparada',
              nombre: 'Happy Hour 2x1',
              activo: true,
            }),
          },
        ],
      });
      return unsubscribeMock;
    });

    const callback = vi.fn();
    const unsubscribe = onPromocionesActivasChange('laparada', callback);

    expect(firestoreMocks.where).toHaveBeenCalledWith('negocioId', '==', 'laparada');
    expect(firestoreMocks.where).toHaveBeenCalledWith('activo', '==', true);
    expect(callback).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'promo-canonica',
        negocioId: 'laparada',
        nombre: 'Happy Hour 2x1',
        activo: true,
      }),
    ]);

    unsubscribe();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('onPromocionesChange filtra por negocioId para el panel administrativo', () => {
    firestoreMocks.onSnapshot.mockReturnValue(vi.fn());
    onPromocionesChange('tenant-abc', vi.fn());

    expect(firestoreMocks.where).toHaveBeenCalledWith('negocioId', '==', 'tenant-abc');
    expect(firestoreMocks.where).not.toHaveBeenCalledWith('activo', '==', true);
  });

  it('rechaza negocioId inválido al suscribirse a promociones activas', () => {
    expect(() => onPromocionesActivasChange('invalid/id', vi.fn())).toThrow();
  });
});
