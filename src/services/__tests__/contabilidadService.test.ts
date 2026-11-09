import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumenConciliacionContable } from '@/types/contabilidad';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  setDoc: firestoreMocks.setDoc,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  },
}));

vi.mock('@/services/firebase', () => ({ db: {} }));

import {
  getConfiguracionPuc,
  guardarConfiguracionPuc,
  guardarConciliacionCerrada,
  getConciliacionesCerradas,
} from '../contabilidadService';

describe('contabilidadService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfiguracionPuc', () => {
    it('retorna mapeo PUC por defecto si el documento no existe', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const res = await getConfiguracionPuc('negocio-test');
      expect(res.cuentaCaja).toBe('110505');
      expect(res.cuentaIngresosRestaurante).toBe('414005');
      expect(res.cuentaImpoconsumoPorPagar).toBe('249501');
    });

    it('retorna mapeo persistido fusionado con defaults si existe', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          cuentaCaja: '110510',
          centroCostosDefault: '002',
        }),
      });

      const res = await getConfiguracionPuc('negocio-test');
      expect(res.cuentaCaja).toBe('110510');
      expect(res.centroCostosDefault).toBe('002');
      expect(res.cuentaIngresosRestaurante).toBe('414005');
    });
  });

  describe('guardarConfiguracionPuc', () => {
    it('guarda con merge y aislamiento tenant estricto', async () => {
      firestoreMocks.setDoc.mockResolvedValueOnce(undefined);

      await guardarConfiguracionPuc('negocio-test', {
        cuentaCaja: '110520',
      });

      expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
      const payload = firestoreMocks.setDoc.mock.calls[0][1];
      expect(payload.negocioId).toBe('negocio-test');
      expect(payload.cuentaCaja).toBe('110520');
      expect(payload.actualizadoEn).toBeDefined();
    });
  });

  describe('guardarConciliacionCerrada', () => {
    it('persiste un acta oficial de conciliación contable', async () => {
      firestoreMocks.setDoc.mockResolvedValueOnce(undefined);

      const mockConciliacion: ResumenConciliacionContable = {
        periodo: {
          tipo: 'mes_actual',
          inicio: new Date('2026-03-01'),
          fin: new Date('2026-03-31'),
          etiqueta: 'Marzo 2026',
          ano: 2026,
        },
        items: [],
        totalVentasSistema: 1080000,
        totalCobradoEfectivo: 800000,
        totalCobradoTransferencia: 280000,
        totalEgresosPeriodo: 400000,
        totalArqueadoFisico: 800000,
        diferenciaTotalNeta: 0,
        diasCuadrados: 10,
        diasConDiferencia: 0,
        diasSinCierre: 0,
        saludConciliacion: 'optima',
        porcentajeEfectivo: 74,
        porcentajeTransferencia: 26,
      };

      const docId = await guardarConciliacionCerrada(
        'negocio-test',
        mockConciliacion,
        '2026-03',
        'Contador Juan',
        'Revisión mensual sin discrepancias'
      );

      expect(docId).toBe('conc-negocio-test-2026-03');
      expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
      const payload = firestoreMocks.setDoc.mock.calls[0][1];
      expect(payload.negocioId).toBe('negocio-test');
      expect(payload.periodoMes).toBe('2026-03');
      expect(payload.estado).toBe('aprobada');
      expect(payload.responsable).toBe('Contador Juan');
      expect(payload.totalVentas).toBe(1080000);
      expect(payload.baseInc8).toBe(1000000);
      expect(payload.impuestoInc8).toBe(80000);
    });
  });

  describe('getConciliacionesCerradas', () => {
    it('consulta el historial de conciliaciones cerradas filtrando por tenant', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'conc-1',
            data: () => ({
              negocioId: 'negocio-test',
              periodoMes: '2026-03',
              totalVentas: 500000,
            }),
          },
        ],
      });

      const res = await getConciliacionesCerradas('negocio-test');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('conc-1');
      expect(res[0].totalVentas).toBe(500000);
    });
  });
});
