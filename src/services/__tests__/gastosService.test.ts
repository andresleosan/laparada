import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDoc, getDoc, updateDoc } from 'firebase/firestore';
import {
  actualizarGasto,
  crearGasto,
  registrarGastoDetallado,
} from '../gastosService';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ path: name })),
  doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}`, id })),
  addDoc: vi.fn(async () => ({ id: 'gasto-123' })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(async () => undefined),
  deleteDoc: vi.fn(async () => undefined),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
    fromDate: vi.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
}));

vi.mock('../firebase', () => ({ db: {} }));

describe('gastosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra un gasto operativo detallado con aislamiento multi-tenant y sin campo id', async () => {
    const result = await registrarGastoDetallado({
      negocioId: 'laparada',
      concepto: '  Pago de energía CENS  ',
      monto: 185000,
      categoria: 'servicios',
      origenFondo: 'banco_transferencia',
      metodoPago: 'transferencia',
      proveedorNombre: 'CENS',
      numeroComprobante: 'FAC-991',
      deducible: true,
    });

    expect(result.id).toBe('gasto-123');
    expect(result.concepto).toBe('Pago de energía CENS');
    expect(result.origenFondo).toBe('banco_transferencia');
    expect(addDoc).toHaveBeenCalledTimes(1);
    const payload = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.negocioId).toBe('laparada');
    expect(payload).not.toHaveProperty('id');
  });

  it('rechaza montos no positivos o conceptos vacíos en crearGasto', async () => {
    await expect(
      crearGasto({
        negocioId: 'laparada',
        concepto: '   ',
        monto: 5000,
        categoria: 'aseo',
        fecha: { seconds: 1, nanoseconds: 0 } as never,
      })
    ).rejects.toThrow('El concepto del gasto es obligatorio');

    await expect(
      crearGasto({
        negocioId: 'laparada',
        concepto: 'Aseo',
        monto: 0,
        categoria: 'aseo',
        fecha: { seconds: 1, nanoseconds: 0 } as never,
      })
    ).rejects.toThrow('El monto del gasto debe ser mayor a cero');
  });

  it('bloquea actualización cross-tenant en actualizarGasto', async () => {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'otro-negocio' }),
    } as never);

    await expect(
      actualizarGasto('g1', { monto: 20000 }, 'laparada')
    ).rejects.toThrow('El gasto no pertenece al negocio activo');
    expect(updateDoc).not.toHaveBeenCalled();
  });
});
