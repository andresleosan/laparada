import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date('2026-11-09T20:00:00Z') })),
    fromDate: vi.fn((d: Date) => ({ toDate: () => d })),
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ id: name })),
  doc: firestoreMocks.doc,
  addDoc: firestoreMocks.addDoc,
  updateDoc: firestoreMocks.updateDoc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  limit: vi.fn((num) => ({ limit: num })),
  onSnapshot: vi.fn((_q, cb) => {
    cb({ docs: [], empty: true });
    return vi.fn();
  }),
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock('@/services/firebase', () => ({ db: {} }));

import {
  crearTandaVitrina,
  getTandaActiva,
  agregarAdicionItem,
  registrarMermaItem,
  registrarTransferenciaTanda,
  cerrarTandaVitrina,
} from '../tandaVitrinaService';

describe('tandaVitrinaService', () => {
  const tenantId = 'laparada';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea una tanda de vitrina con items iniciales en estado abierta', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'tanda-123' });

    const items = [
      {
        productoId: 'prod-1',
        nombre: 'Panceroti Ranchero',
        precioUnitario: 4000,
        cantidadInicial: 25,
      },
      {
        productoId: 'prod-2',
        nombre: 'Empanaditas',
        precioUnitario: 1000,
        cantidadInicial: 100,
      },
    ];

    const tandaId = await crearTandaVitrina(tenantId, items, 'caja-1', 'Cajero 1');

    expect(tandaId).toBe('tanda-123');
    expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
    const [, data] = firestoreMocks.addDoc.mock.calls[0];
    expect(data.negocioId).toBe(tenantId);
    expect(data.estado).toBe('abierta');
    expect(data.cajaId).toBe('caja-1');
    expect(data.responsable).toBe('Cajero 1');
    expect(data.items).toHaveLength(2);
    expect(data.items[0].cantidadInicial).toBe(25);
    expect(data.items[1].cantidadInicial).toBe(100);
  });

  it('permite registrar adiciones (nuevas frituras/hornadas) a un item de la tanda', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        negocioId: tenantId,
        estado: 'abierta',
        items: [
          {
            productoId: 'prod-1',
            nombre: 'Panceroti Ranchero',
            precioUnitario: 4000,
            cantidadInicial: 25,
            adiciones: [],
            mermas: [],
          },
        ],
      }),
    });

    await agregarAdicionItem(tenantId, 'tanda-123', 'prod-1', 15, 'Segunda fritura');

    expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
    const [, updateData] = firestoreMocks.updateDoc.mock.calls[0];
    expect(updateData.items[0].adiciones).toHaveLength(1);
    expect(updateData.items[0].adiciones[0].cantidad).toBe(15);
    expect(updateData.items[0].adiciones[0].nota).toBe('Segunda fritura');
  });

  it('permite registrar mermas o bajas a un item de la tanda', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        negocioId: tenantId,
        estado: 'abierta',
        items: [
          {
            productoId: 'prod-1',
            nombre: 'Panceroti Ranchero',
            precioUnitario: 4000,
            cantidadInicial: 25,
            adiciones: [],
            mermas: [],
          },
        ],
      }),
    });

    await registrarMermaItem(tenantId, 'tanda-123', 'prod-1', 2, 'Quemado');

    expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
    const [, updateData] = firestoreMocks.updateDoc.mock.calls[0];
    expect(updateData.items[0].mermas).toHaveLength(1);
    expect(updateData.items[0].mermas[0].cantidad).toBe(2);
    expect(updateData.items[0].mermas[0].motivo).toBe('Quemado');
  });

  it('obtiene la tanda activa si existe', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'tanda-activa-1',
          data: () => ({
            negocioId: tenantId,
            estado: 'abierta',
            items: [],
          }),
        },
      ],
    });

    const activa = await getTandaActiva(tenantId);
    expect(activa).not.toBeNull();
    expect(activa?.id).toBe('tanda-activa-1');
  });

  it('permite registrar transferencias directas a la tanda', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        negocioId: tenantId,
        estado: 'abierta',
        items: [],
        transferencias: [],
      }),
    });

    await registrarTransferenciaTanda(tenantId, 'tanda-123', {
      monto: 24000,
      metodo: 'nequi',
      referencia: 'APROB-9988',
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
    const [, updateData] = firestoreMocks.updateDoc.mock.calls[0];
    expect(updateData.transferencias).toHaveLength(1);
    expect(updateData.transferencias[0].monto).toBe(24000);
    expect(updateData.transferencias[0].metodo).toBe('nequi');
  });

  it('cierra la tanda calculando sobrantes y resumen financiero', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        negocioId: tenantId,
        estado: 'abierta',
        items: [
          {
            productoId: 'prod-1',
            nombre: 'Panceroti Ranchero',
            precioUnitario: 4000,
            cantidadInicial: 25,
            adiciones: [{ id: 'a1', cantidad: 5, hora: { toDate: () => new Date() } }],
            mermas: [],
          },
        ],
        transferencias: [
          { id: 't1', monto: 20000, metodo: 'nequi', hora: { toDate: () => new Date() } },
        ],
      }),
    });

    // Sobraron 3 pancerottis (puestos: 25 + 5 = 30; vendidos: 30 - 3 = 27; subtotal: 27 * 4000 = $108.000)
    const resumen = await cerrarTandaVitrina(tenantId, 'tanda-123', { 'prod-1': 3 });

    expect(resumen.totalVendidos).toBe(27);
    expect(resumen.totalVentaEstimada).toBe(108000);
    expect(resumen.totalTransferencias).toBe(20000);
    expect(resumen.totalEfectivoEsperado).toBe(88000);

    expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
    const [, updateData] = firestoreMocks.updateDoc.mock.calls[0];
    expect(updateData.estado).toBe('cerrada');
    expect(updateData.items[0].sobrantes).toBe(3);
    expect(updateData.items[0].vendidos).toBe(27);
    expect(updateData.items[0].subtotal).toBe(108000);
  });
});
