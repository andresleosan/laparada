import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn((_, col, id) => ({ path: `${col}/${id}`, id })),
  collection: vi.fn((_, col) => ({ path: col })),
  query: vi.fn((...args) => args),
  where: vi.fn((...args) => args),
  orderBy: vi.fn((...args) => args),
  onSnapshot: vi.fn(),
  registrarAuditoria: vi.fn(),
  crearAlerta: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  onSnapshot: mocks.onSnapshot,
  orderBy: mocks.orderBy,
  query: mocks.query,
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-11-19T18:00:00Z') }),
    fromDate: (d: Date) => d,
  },
  updateDoc: mocks.updateDoc,
  where: mocks.where,
}));

vi.mock('@/services/firebase', () => ({
  db: {},
}));

vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: mocks.registrarAuditoria,
}));

vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: mocks.crearAlerta,
}));

import type { Timestamp } from 'firebase/firestore';
import {
  cerrarLiquidacionDomiciliario,
  entregarBaseRuta,
} from '../liquidacionDomiciliariosService';
import type { Domicilio } from '@/types';

describe('liquidacionDomiciliariosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('entrega base de sencillo en ruta y bloquea duplicados activos del mismo repartidor', async () => {
    mocks.getDocs.mockResolvedValueOnce({ docs: [] });
    mocks.addDoc.mockResolvedValueOnce({ id: 'liq-1' });

    const creada = await entregarBaseRuta({
      negocioId: 'laparada',
      domiciliarioId: 'rep-1',
      domiciliarioNombre: 'Juan',
      montoBaseInicial: 50000,
      entregadoPor: 'Cajero',
    });

    expect(creada.id).toBe('liq-1');
    expect(creada.codigoActa).toBe('LQ-0001');
    expect(creada.estado).toBe('activa');
    expect(creada.montoBaseInicial).toBe(50000);
    expect(mocks.registrarAuditoria).toHaveBeenCalledTimes(1);

    // Intento duplicado con base activa existente
    mocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'liq-1',
          data: () => ({
            negocioId: 'laparada',
            codigoActa: 'LQ-0001',
            domiciliarioId: 'rep-1',
            domiciliarioNombre: 'Juan',
            estado: 'activa',
            montoBaseInicial: 50000,
          }),
        },
      ],
    });

    await expect(
      entregarBaseRuta({
        negocioId: 'laparada',
        domiciliarioId: 'rep-1',
        domiciliarioNombre: 'Juan',
        montoBaseInicial: 30000,
        entregadoPor: 'Cajero',
      })
    ).rejects.toThrow(/ya tiene una base/i);
  });

  it('liquida ruta con base previa, detecta faltante y dispara alerta operativa', async () => {
    mocks.getDocs.mockResolvedValueOnce({ docs: [] });
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'liq-1',
      data: () => ({
        negocioId: 'laparada',
        codigoActa: 'LQ-0001',
        domiciliarioId: 'rep-1',
        domiciliarioNombre: 'Juan',
        estado: 'activa',
        montoBaseInicial: 50000,
        entregadoPor: 'Cajero',
        fechaEntregaBase: new Date(),
      }),
    });
    mocks.updateDoc.mockResolvedValueOnce(undefined);

    const domicilios: Domicilio[] = [
      {
        id: 'd1',
        negocioId: 'laparada',
        clienteNombre: 'Ana',
        clienteTelefono: '3001112233',
        direccion: 'Cll 5',
        barrio: 'Centro',
        items: [],
        total: 35000,
        metodoPago: 'efectivo',
        origen: 'pos',
        estado: 'entregado',
        domiciliarioId: 'rep-1',
        creadoEn: new Date() as unknown as Timestamp,
        actualizadoEn: new Date() as unknown as Timestamp,
      },
    ];

    const acta = await cerrarLiquidacionDomiciliario({
      liquidacionId: 'liq-1',
      negocioId: 'laparada',
      domiciliarioId: 'rep-1',
      domiciliarioNombre: 'Juan',
      domiciliosEntregados: domicilios,
      efectivoEntregadoFisico: 80000, // Esperado: 50.000 + 35.000 = 85.000 -> -5.000
      cajeroReceptor: 'Cajero',
    });

    expect(acta.estado).toBe('liquidada');
    expect(acta.efectivoEsperadoRendir).toBe(85000);
    expect(acta.diferencia).toBe(-5000);
    expect(acta.conciliadoConCaja).toBe(true);
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
    expect(mocks.crearAlerta).toHaveBeenCalledTimes(1);
  });
});
