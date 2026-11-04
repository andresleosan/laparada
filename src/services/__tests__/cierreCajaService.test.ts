import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  updateDoc: firestoreMocks.updateDoc,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  Timestamp: {
    fromDate: vi.fn((d) => ({ toDate: () => d })),
    now: vi.fn(() => ({ seconds: 123456, nanoseconds: 0 })),
  },
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  crearCierreCaja,
  actualizarCierreCaja,
  getCierreCajaHoy,
  getUltimosCierres,
} from '../cierreCajaService';

describe('cierreCajaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('crearCierreCaja', () => {
    it('crea un cierre de caja con aislamiento multi-tenant y redondeo seguro', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'cierre-123' });

      const id = await crearCierreCaja(
        'laparada',
        150000,
        50000,
        'Cierre de turno tarde',
        { ventasPos: 100000, ventasWhatsapp: 50000 }
      );

      expect(id).toBe('cierre-123');
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      const callArgs = firestoreMocks.addDoc.mock.calls[0][1];
      expect(callArgs.negocioId).toBe('laparada');
      expect(callArgs.totalIngresos).toBe(150000);
      expect(callArgs.totalGastos).toBe(50000);
      expect(callArgs.utilidadNeta).toBe(100000);
      expect(callArgs.ventasPos).toBe(100000);
      expect(callArgs.ventasWhatsapp).toBe(50000);
      expect(callArgs.notas).toBe('Cierre de turno tarde');
    });

    it('persiste el desglose de arqueo físico, cajero y saldo esperado correctamente', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'cierre-con-arqueo' });

      const arqueoMock = {
        denominaciones: { b50k: 2, m1000: 5 },
        totalBilletes: 100000,
        totalMonedas: 5000,
        totalFisico: 105000,
        efectivoEsperado: 105000,
        diferencia: 0,
        estadoCuadre: 'cuadrado' as const,
      };

      const id = await crearCierreCaja(
        'laparada',
        200000,
        95000,
        'Cierre cuadrado',
        {
          ventasPos: 150000,
          ventasWhatsapp: 50000,
          arqueo: arqueoMock,
          cajeroNombre: 'Andrés Sánchez',
          efectivoInicial: 50000,
        }
      );

      expect(id).toBe('cierre-con-arqueo');
      const callArgs = firestoreMocks.addDoc.mock.calls[0][1];
      expect(callArgs.arqueo).toEqual(arqueoMock);
      expect(callArgs.efectivoReal).toBe(105000);
      expect(callArgs.efectivoEsperado).toBe(105000);
      expect(callArgs.diferenciaEfectivo).toBe(0);
      expect(callArgs.cajeroNombre).toBe('Andrés Sánchez');
      expect(callArgs.efectivoInicial).toBe(50000);
    });

    it('falla si negocioId está vacío', async () => {
      await expect(crearCierreCaja('', 10000, 5000)).rejects.toThrow();
    });

    it('normaliza valores no numéricos a cero de forma defensiva', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'cierre-safe' });

      await crearCierreCaja('laparada', NaN, -2000);

      const callArgs = firestoreMocks.addDoc.mock.calls[0][1];
      expect(callArgs.totalIngresos).toBe(0);
      expect(callArgs.totalGastos).toBe(0);
      expect(callArgs.utilidadNeta).toBe(0);
    });
  });

  describe('getCierreCajaHoy', () => {
    it('retorna el cierre de hoy si existe', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'cierre-hoy-1',
            data: () => ({
              negocioId: 'laparada',
              totalIngresos: 200000,
              totalGastos: 60000,
              utilidadNeta: 140000,
            }),
          },
        ],
      });

      const cierre = await getCierreCajaHoy('laparada');
      expect(cierre).not.toBeNull();
      expect(cierre?.id).toBe('cierre-hoy-1');
      expect(cierre?.totalIngresos).toBe(200000);
    });

    it('retorna null si no hay cierres hoy', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const cierre = await getCierreCajaHoy('laparada');
      expect(cierre).toBeNull();
    });
  });

  describe('getUltimosCierres', () => {
    it('retorna la lista de cierres con tenantId mapeado', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'c1',
            data: () => ({ negocioId: 'laparada', totalIngresos: 100000 }),
          },
          {
            id: 'c2',
            data: () => ({ negocioId: 'laparada', totalIngresos: 120000 }),
          },
        ],
      });

      const cierres = await getUltimosCierres('laparada', 10);
      expect(cierres).toHaveLength(2);
      expect(cierres[0].id).toBe('c1');
      expect(cierres[1].id).toBe('c2');
    });
  });

  describe('actualizarCierreCaja', () => {
    it('rechaza actualización si el cierre pertenece a otro negocio', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'otro-negocio' }),
      });

      await expect(
        actualizarCierreCaja('cierre-x', { notas: 'hack' }, 'laparada')
      ).rejects.toThrow('El cierre no pertenece al negocio activo');
    });
  });
});

