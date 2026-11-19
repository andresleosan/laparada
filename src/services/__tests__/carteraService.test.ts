import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  doc: vi.fn((_db: unknown, col: string, id?: string) => ({ col, id: id || 'auto_id' })),
  collection: vi.fn((_db: unknown, col: string) => ({ col })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((...args: unknown[]) => args),
  descontarStockInsumosPorVenta: vi.fn(),
  registrarEventoAuditoriaSilencioso: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  limit: mocks.limit,
  onSnapshot: vi.fn(),
  orderBy: mocks.orderBy,
  query: mocks.query,
  runTransaction: mocks.runTransaction,
  setDoc: mocks.setDoc,
  updateDoc: mocks.updateDoc,
  where: mocks.where,
  Timestamp: {
    now: () => ({ toDate: () => new Date('2026-11-18T18:00:00Z') }),
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}));

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/inventarioService', () => ({
  descontarStockInsumosPorVenta: mocks.descontarStockInsumosPorVenta,
}));
vi.mock('@/services/productosService', () => ({
  getProductos: vi.fn().mockResolvedValue([]),
  getCombos: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: mocks.registrarEventoAuditoriaSilencioso,
}));

import {
  configurarCuentaCorriente,
  registrarAbonoCartera,
  registrarConsumoCredito,
} from '../carteraService';

describe('carteraService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('habilita una nueva cuenta corriente con aislamiento multi-tenant y sincroniza cliente', async () => {
    mocks.getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    mocks.setDoc.mockResolvedValueOnce(undefined);
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'laparada' }),
    });
    mocks.updateDoc.mockResolvedValueOnce(undefined);

    const cuenta = await configurarCuentaCorriente('laparada', {
      clienteId: 'cli_1',
      clienteNombre: 'Laura Gómez',
      clienteTelefono: '3105551111',
      cupoCredito: 300000,
      plazoDias: 15,
      empresa: 'Estudio Creativo',
    });

    expect(cuenta.negocioId).toBe('laparada');
    expect(cuenta.cupoCredito).toBe(300000);
    expect(cuenta.saldoActual).toBe(0);
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    expect(mocks.updateDoc).toHaveBeenCalledTimes(1);
  });

  it('registra un consumo a crédito transaccionalmente y rechaza sobregiros o cross-tenant', async () => {
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'cc_laparada_cli_1',
          data: () => ({
            negocioId: 'laparada',
            clienteId: 'cli_1',
            clienteNombre: 'Laura Gómez',
            clienteTelefono: '3105551111',
            cupoCredito: 200000,
            saldoActual: 50000,
            plazoDias: 15,
            estado: 'activa',
            totalConsumosHistorico: 50000,
            totalAbonosHistorico: 0,
            cantidadConsumos: 1,
            cantidadAbonos: 0,
          }),
        }),
        update: txUpdate,
        set: txSet,
      };
      return callback(tx);
    });
    mocks.getDoc.mockResolvedValueOnce({ exists: () => false });

    const res = await registrarConsumoCredito('laparada', {
      cuentaCorrienteId: 'cc_laparada_cli_1',
      monto: 40000,
      origen: 'pos',
    });

    expect(res.cuenta.saldoActual).toBe(90000);
    expect(res.movimiento.tipo).toBe('consumo_credito');
    expect(res.movimiento.saldoPrevio).toBe(50000);
    expect(res.movimiento.saldoResultante).toBe(90000);
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(txSet).toHaveBeenCalledTimes(1);

    // Intento de sobregiro rechazado
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'cc_laparada_cli_1',
          data: () => ({
            negocioId: 'laparada',
            clienteId: 'cli_1',
            clienteNombre: 'Laura Gómez',
            clienteTelefono: '3105551111',
            cupoCredito: 100000,
            saldoActual: 90000,
            plazoDias: 15,
            estado: 'activa',
          }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      };
      return callback(tx);
    });

    await expect(
      registrarConsumoCredito('laparada', {
        cuentaCorrienteId: 'cc_laparada_cli_1',
        monto: 20000,
        origen: 'pos',
      })
    ).rejects.toThrow(/Cupo insuficiente/);

    // Intento cross-tenant rechazado
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'cc_otro_cli_1',
          data: () => ({
            negocioId: 'otro_negocio',
            clienteId: 'cli_1',
            cupoCredito: 100000,
            saldoActual: 0,
            estado: 'activa',
          }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      };
      return callback(tx);
    });

    await expect(
      registrarConsumoCredito('laparada', {
        cuentaCorrienteId: 'cc_otro_cli_1',
        monto: 10000,
        origen: 'pos',
      })
    ).rejects.toThrow(/no pertenece al negocio activo/);
  });

  it('registra abono offline en efectivo/transferencia y rechaza abonos superiores al saldo', async () => {
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'cc_laparada_cli_1',
          data: () => ({
            negocioId: 'laparada',
            clienteId: 'cli_1',
            clienteNombre: 'Laura Gómez',
            clienteTelefono: '3105551111',
            cupoCredito: 200000,
            saldoActual: 60000,
            plazoDias: 15,
            estado: 'activa',
            totalConsumosHistorico: 60000,
            totalAbonosHistorico: 0,
            cantidadConsumos: 1,
            cantidadAbonos: 0,
          }),
        }),
        update: txUpdate,
        set: txSet,
      };
      return callback(tx);
    });
    mocks.getDoc.mockResolvedValueOnce({ exists: () => false });

    const res = await registrarAbonoCartera('laparada', {
      cuentaCorrienteId: 'cc_laparada_cli_1',
      monto: 60000,
      metodoPago: 'transferencia',
      referenciaTransferencia: 'Nequi #9988',
    });

    expect(res.cuenta.saldoActual).toBe(0);
    expect(res.movimiento.tipo).toBe('abono');
    expect(res.movimiento.metodoPago).toBe('transferencia');
    expect(res.movimiento.saldoResultante).toBe(0);

    // Abono superior al saldo rechazado
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'cc_laparada_cli_1',
          data: () => ({
            negocioId: 'laparada',
            clienteId: 'cli_1',
            saldoActual: 30000,
            cupoCredito: 200000,
            estado: 'activa',
          }),
        }),
        update: vi.fn(),
        set: vi.fn(),
      };
      return callback(tx);
    });

    await expect(
      registrarAbonoCartera('laparada', {
        cuentaCorrienteId: 'cc_laparada_cli_1',
        monto: 50000,
        metodoPago: 'efectivo',
      })
    ).rejects.toThrow(/no puede superar el saldo pendiente/);
  });
});
