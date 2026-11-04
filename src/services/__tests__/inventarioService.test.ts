import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
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
  runTransaction: firestoreMocks.runTransaction,
  Timestamp: {
    now: vi.fn(() => ({})),
  },
  updateDoc: vi.fn(),
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  descontarStockInsumosPorVenta,
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

describe('descontarStockInsumosPorVenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no ejecuta transacción si la lista de consumos está vacía', async () => {
    await descontarStockInsumosPorVenta('laparada', [], 'Venta #123');
    expect(firestoreMocks.runTransaction).not.toHaveBeenCalled();
  });

  it('descuenta stock atómicamente y registra la salida en entradas_inventario', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Costeño',
          stockActual: 10,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await descontarStockInsumosPorVenta(
      'laparada',
      [
        {
          insumoId: 'ins_queso',
          nombreSnapshot: 'Queso Costeño',
          cantidadTotal: 2.5,
          unidadSnapshot: 'kg',
        },
      ],
      'Venta POS #123456'
    );

    expect(mockTransaction.get).toHaveBeenCalled();
    // 10 - 2.5 = 7.5
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 7.5,
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        insumoId: 'ins_queso',
        cantidad: -2.5,
        costo: 0,
        proveedor: 'Venta POS #123456',
      })
    );
  });

  it('no permite stock negativo si el consumo supera el stock disponible', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Costeño',
          stockActual: 2,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await descontarStockInsumosPorVenta(
      'laparada',
      [
        {
          insumoId: 'ins_queso',
          nombreSnapshot: 'Queso Costeño',
          cantidadTotal: 5,
        },
      ],
      'Venta POS #999'
    );

    // Math.max(0, 2 - 5) = 0
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 0,
      })
    );
  });
});
