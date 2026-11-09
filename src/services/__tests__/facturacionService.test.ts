import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((_db, _col, id) => ({ id })),
  collection: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  doc: firestoreMocks.doc,
  collection: firestoreMocks.collection,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  setDoc: firestoreMocks.setDoc,
  runTransaction: firestoreMocks.runTransaction,
  onSnapshot: firestoreMocks.onSnapshot,
  query: firestoreMocks.query,
  where: firestoreMocks.where,
  orderBy: firestoreMocks.orderBy,
  limit: firestoreMocks.limit,
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => 1700000000000 })),
  },
}));

vi.mock('@/services/firebase', () => ({ db: {} }));

import {
  asignarSiguienteConsecutivoPos,
  getConfiguracionFiscal,
  getComprobantesZ,
  guardarComprobanteZ,
  guardarConfiguracionFiscal,
} from '../facturacionService';
import type { ComprobanteZ } from '@/types';

describe('facturacionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfiguracionFiscal', () => {
    it('retorna la configuración almacenada si el documento existe', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'laparada',
        data: () => ({
          negocioId: 'laparada',
          habilitado: true,
          razonSocial: 'COMERCIALIZADORA PARADA SAS',
          nit: '900.123.456',
        }),
      });

      const config = await getConfiguracionFiscal('laparada');
      expect(config.negocioId).toBe('laparada');
      expect(config.razonSocial).toBe('COMERCIALIZADORA PARADA SAS');
      expect(config.nit).toBe('900.123.456');
    });

    it('retorna configuración por defecto si el documento no existe', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const config = await getConfiguracionFiscal('laparada');
      expect(config.negocioId).toBe('laparada');
      expect(config.habilitado).toBe(true);
      expect(config.tarifaDefault.porcentaje).toBe(8);
    });
  });

  describe('guardarConfiguracionFiscal', () => {
    it('guarda configuración fusionando datos con tenantId obligatorio', async () => {
      firestoreMocks.setDoc.mockResolvedValueOnce(undefined);

      await guardarConfiguracionFiscal('laparada', {
        razonSocial: 'NUEVA RAZÓN SOCIAL',
        nit: '901.999.888',
      });

      expect(firestoreMocks.setDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'laparada' }),
        expect.objectContaining({
          negocioId: 'laparada',
          razonSocial: 'NUEVA RAZÓN SOCIAL',
          nit: '901.999.888',
        }),
        { merge: true }
      );
    });
  });

  describe('asignarSiguienteConsecutivoPos', () => {
    it('asigna y avanza el consecutivo atómicamente', async () => {
      firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
        const fakeTx = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              negocioId: 'laparada',
              resolucion: {
                prefijo: 'POS',
                consecutivoActual: 42,
                rangoInicial: 1,
                rangoFinal: 10000,
                numeroResolucion: '18764000',
              },
            }),
          }),
          set: vi.fn(),
        };
        return await callback(fakeTx);
      });

      const res = await asignarSiguienteConsecutivoPos('laparada');
      expect(res.consecutivoFiscal).toBe('POS-00042');
      expect(res.folioNumero).toBe(42);
    });
  });

  describe('guardarComprobanteZ y getComprobantesZ', () => {
    it('persiste un comprobante Z con ID y tenantId', async () => {
      firestoreMocks.setDoc.mockResolvedValueOnce(undefined);

      const comprobantePrueba: ComprobanteZ = {
        id: 'corte_2026-11-08',
        negocioId: 'laparada',
        numeroZ: 'Z-20261108-0001',
        fechaCorte: '2026-11-08',
        horaGeneracion: '22:00',
        generadoPor: 'Admin',
        resolucionNumero: '18764',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 10,
        consecutivoInicialTexto: 'POS-00001',
        consecutivoFinalTexto: 'POS-00010',
        totalDocumentosEmitidos: 10,
        totalDocumentosAnulados: 0,
        totalVentasBrutas: 100000,
        totalDescuentos: 0,
        totalVentasNetas: 100000,
        baseGravableInc8: 92593,
        impuestoInc8: 7407,
        baseGravableIva19: 0,
        impuestoIva19: 0,
        baseExenta: 0,
        totalImpuestos: 7407,
        totalPropinas: 0,
        totalCobrado: 100000,
        totalEfectivo: 100000,
        totalTransferencia: 0,
      };

      const docId = await guardarComprobanteZ('laparada', comprobantePrueba);
      expect(docId).toBe('corte_2026-11-08');
      expect(firestoreMocks.setDoc).toHaveBeenCalled();
    });

    it('recupera historial de comprobantes Z', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'corte_1',
            data: () => ({
              numeroZ: 'Z-001',
              fechaCorte: '2026-11-08',
            }),
          },
        ],
      });

      const lista = await getComprobantesZ('laparada');
      expect(lista).toHaveLength(1);
      expect(lista[0].numeroZ).toBe('Z-001');
    });
  });
});
