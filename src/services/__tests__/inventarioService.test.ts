import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: vi.fn(() => ({})),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  runTransaction: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({})),
  },
  updateDoc: vi.fn(),
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  getHistorialInsumo,
  getInsumosConBajoStock,
  getTodosInsumos,
  onTodosInsumosChange,
} from '../inventarioService';

describe('lecturas de inventario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propaga el error al fallar la lectura de todos los insumos', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getTodosInsumos('negocio-a')).rejects.toBe(failure);
  });

  it('propaga el error al fallar la lectura del historial', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getHistorialInsumo('negocio-a', 'insumo-a')).rejects.toBe(failure);
  });

  it('propaga el error al calcular bajo stock si falla la lectura base', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getInsumosConBajoStock('negocio-a')).rejects.toBe(failure);
  });

  it('no clasifica como bajo stock un insumo con mínimo cero', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'aceite',
          data: () => ({
            actualizadoEn: {},
            creadoEn: {},
            negocioId: 'negocio-a',
            nombre: 'Aceite',
            stockActual: 5,
            stockMinimo: 0,
            unidad: 'litros',
          }),
        },
      ],
    });

    await expect(getInsumosConBajoStock('negocio-a')).resolves.toEqual([]);
  });

  it('notifica el error del listener sin reemplazar existencias por una lista vacía', () => {
    const failure = new Error('Listener interrumpido');
    const onData = vi.fn();
    const onError = vi.fn();
    firestoreMocks.onSnapshot.mockImplementation((_query, _next, listenerError) => {
      listenerError(failure);
      return vi.fn();
    });

    onTodosInsumosChange('negocio-a', onData, onError);

    expect(onError).toHaveBeenCalledWith(failure);
    expect(onData).not.toHaveBeenCalled();
  });
});
