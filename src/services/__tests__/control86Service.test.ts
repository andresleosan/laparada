import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRunTransaction = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn();
const mockCrearAlertaSilenciosa = vi.fn();
const mockRegistrarAuditoria = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ path: name })),
  doc: vi.fn((_db, col, id) => ({ path: `${col}/${id}`, id })),
  query: vi.fn((ref) => ref),
  where: vi.fn(),
  deleteField: vi.fn(() => '__DELETE_FIELD__'),
  Timestamp: { now: () => ({ seconds: 1700000000, nanoseconds: 0 }) },
  runTransaction: (...args: unknown[]) => mockRunTransaction(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  writeBatch: vi.fn(() => ({
    update: mockBatchUpdate,
    commit: mockBatchCommit,
  })),
}));

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: (...args: unknown[]) => mockCrearAlertaSilenciosa(...args),
}));
vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: (...args: unknown[]) => mockRegistrarAuditoria(...args),
}));

import {
  activar86Item,
  ajustarPorcionesItem86,
  consumirPorcionesEnPedido,
  guardarEspecialDelDiaItem,
  reactivarItem86,
  restablecerTodosLos86,
} from '../control86Service';

describe('control86Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it('marca en 86 dentro del tenant actualizando solo disponible, control86 y actualizadoEn', async () => {
    const txUpdate = vi.fn();
    mockRunTransaction.mockImplementation(async (_db, fn) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Hamburguesa Doble',
            disponible: true,
          }),
        }),
        update: txUpdate,
      });
    });

    const resultado = await activar86Item('laparada', 'producto', 'prod-1', {
      motivo: 'sin_insumos',
      nota: 'Sin pan brioche',
      responsableNombre: 'Chef Mateo',
    });

    expect(resultado.agotado86).toBe(true);
    expect(resultado.motivo86).toBe('sin_insumos');
    expect(txUpdate).toHaveBeenCalledTimes(1);
    const payload = txUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['actualizadoEn', 'control86', 'disponible']);
    expect(payload.disponible).toBe(false);
    expect(mockCrearAlertaSilenciosa).toHaveBeenCalledTimes(1);
    expect(mockRegistrarAuditoria).toHaveBeenCalledTimes(1);
  });

  it('bloquea mutaciones cross-tenant', async () => {
    mockRunTransaction.mockImplementation(async (_db, fn) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ negocioId: 'otro-local', nombre: 'Ajeno' }),
        }),
        update: vi.fn(),
      });
    });

    await expect(
      reactivarItem86('laparada', 'producto', 'prod-ajeno')
    ).rejects.toThrow('no pertenece al negocio activo');
  });

  it('descuenta porciones en venta y activa 86 automático al llegar a 0', async () => {
    const txUpdate = vi.fn();
    mockRunTransaction.mockImplementation(async (_db, fn) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Costilla BBQ',
            disponible: true,
            control86: {
              agotado86: false,
              contadorActivo: true,
              porcionesDisponibles: 2,
              umbralAlertaPorciones: 5,
              auto86AlLlegarACero: true,
            },
          }),
        }),
        update: txUpdate,
      });
    });

    await consumirPorcionesEnPedido('laparada', [
      {
        tipo: 'producto',
        referenciaId: 'prod-costilla',
        nombre: 'Costilla BBQ',
        cantidad: 2,
        precioUnitario: 25000,
        subtotal: 50000,
      },
    ]);

    expect(txUpdate).toHaveBeenCalledTimes(1);
    const updateData = txUpdate.mock.calls[0][1] as {
      disponible?: boolean;
      control86: { porcionesDisponibles: number; agotado86: boolean };
    };
    expect(updateData.disponible).toBe(false);
    expect(updateData.control86.porcionesDisponibles).toBe(0);
    expect(updateData.control86.agotado86).toBe(true);
    expect(mockCrearAlertaSilenciosa).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({ tipo: 'control_86_agotado' })
    );
  });

  it('ajusta porciones, programa/limpia Especial del Día y restablece en lote', async () => {
    const txUpdate = vi.fn();
    mockRunTransaction.mockImplementation(async (_db, fn) => {
      return fn({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Combo Especial',
            disponible: false,
            control86: { agotado86: true, contadorActivo: true, porcionesDisponibles: 0 },
          }),
        }),
        update: txUpdate,
      });
    });

    const ajustado = await ajustarPorcionesItem86('laparada', 'combo', 'combo-1', {
      contadorActivo: true,
      porcionesDisponibles: 4,
      umbralAlertaPorciones: 5,
    });
    expect(ajustado.agotado86).toBe(false);
    expect(ajustado.porcionesDisponibles).toBe(4);

    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ negocioId: 'laparada', nombre: 'Combo Especial' }),
    });
    await guardarEspecialDelDiaItem('laparada', 'combo', 'combo-1', {
      activo: true,
      etiqueta: 'Solo Hoy',
      diasSemana: [5, 6],
    });
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        especialDelDia: expect.objectContaining({ activo: true, etiqueta: 'Solo Hoy' }),
      })
    );

    const restablecidos = await restablecerTodosLos86('laparada', [
      { id: 'p1', tipo: 'producto' },
      { id: 'c1', tipo: 'combo' },
    ]);
    expect(restablecidos).toBe(2);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
