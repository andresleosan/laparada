import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  runTransaction: vi.fn(),
  doc: vi.fn((_db: unknown, col: string, id?: string) => ({
    col,
    id: id || `auto_${Math.random().toString(36).slice(2, 8)}`,
  })),
  collection: vi.fn((_db: unknown, col: string) => ({ col })),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((...args: unknown[]) => args),
  descontarStockInsumosPorVenta: vi.fn(),
  registrarCompraCliente: vi.fn().mockResolvedValue(undefined),
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
vi.mock('@/services/clientesService', () => ({
  registrarCompraCliente: mocks.registrarCompraCliente,
}));
vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: mocks.registrarEventoAuditoriaSilencioso,
}));

import {
  cambiarEstadoBono,
  emitirBonoPrepago,
  recargarSaldoBono,
  redimirSaldoBono,
  registrarVentaConBonoAtomica,
} from '../bonosService';

describe('bonosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emite un bono offline con código único determinista y rechaza códigos duplicados o montos <= 0', async () => {
    const txSet = vi.fn();

    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ exists: () => false }),
        set: txSet,
        update: vi.fn(),
      };
      return callback(tx);
    });

    const res = await emitirBonoPrepago('laparada', {
      tipo: 'bono_regalo',
      codigoPersonalizado: 'BON-2026-GIFT01',
      titularNombre: 'Lucía Pérez',
      titularTelefono: '3112223344',
      montoInicial: 80000,
      metodoPago: 'transferencia',
      referenciaTransferencia: 'Nequi 4411',
      vigenciaDias: 90,
      recargable: true,
    });

    expect(res.bono.id).toBe('bono_laparada_BON-2026-GIFT01');
    expect(res.bono.saldoActual).toBe(80000);
    expect(res.bono.negocioId).toBe('laparada');
    expect(res.movimiento.tipo).toBe('emision');
    expect(txSet).toHaveBeenCalledTimes(2);
    // Verifica que no se escriba campo id mutable dentro de los docs
    expect(txSet.mock.calls[0][1]).not.toHaveProperty('id');
    expect(txSet.mock.calls[1][1]).not.toHaveProperty('id');

    // Rechaza duplicado
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ exists: () => true }),
        set: vi.fn(),
        update: vi.fn(),
      };
      return callback(tx);
    });

    await expect(
      emitirBonoPrepago('laparada', {
        tipo: 'bono_regalo',
        codigoPersonalizado: 'BON-2026-GIFT01',
        titularNombre: 'Lucía Pérez',
        montoInicial: 50000,
        metodoPago: 'efectivo',
      })
    ).rejects.toThrow(/Ya existe un bono/);

    await expect(
      emitirBonoPrepago('laparada', {
        tipo: 'vale_consumo',
        titularNombre: 'Juan',
        montoInicial: 0,
        metodoPago: 'efectivo',
      })
    ).rejects.toThrow(/mayor a \$0/);
  });

  it('recarga saldo en tarjeta prepago y rechaza tarjetas bloqueadas, no recargables o cross-tenant', async () => {
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_laparada_PRE-1',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'PRE-2026-000001',
            tipo: 'tarjeta_prepago',
            titularNombre: 'Andrés',
            montoInicial: 50000,
            saldoActual: 0,
            totalCargadoHistorico: 50000,
            totalRedimidoHistorico: 50000,
            cantidadRecargas: 0,
            cantidadRedenciones: 1,
            recargable: true,
            estado: 'agotado',
            metodoPagoEmision: 'efectivo',
          }),
        }),
        update: txUpdate,
        set: txSet,
      };
      return callback(tx);
    });

    const res = await recargarSaldoBono('laparada', {
      bonoId: 'bono_laparada_PRE-1',
      monto: 40000,
      metodoPago: 'efectivo',
      extenderVigenciaDias: 30,
    });

    expect(res.bono.saldoActual).toBe(40000);
    expect(res.bono.estado).toBe('activo');
    expect(res.movimiento.tipo).toBe('recarga');
    expect(txUpdate).toHaveBeenCalledTimes(1);
    expect(txSet).toHaveBeenCalledTimes(1);

    // Rechaza si está bloqueado
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_laparada_PRE-1',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'PRE-2026-000001',
            tipo: 'tarjeta_prepago',
            titularNombre: 'Andrés',
            montoInicial: 50000,
            saldoActual: 10000,
            recargable: true,
            estado: 'bloqueado',
            motivoBloqueo: 'Reportada perdida',
          }),
        }),
      };
      return callback(tx);
    });

    await expect(
      recargarSaldoBono('laparada', {
        bonoId: 'bono_laparada_PRE-1',
        monto: 20000,
        metodoPago: 'efectivo',
      })
    ).rejects.toThrow(/Reportada perdida/);

    // Rechaza cross-tenant
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_otro_1',
          data: () => ({
            negocioId: 'otro_local',
            codigo: 'PRE-1',
            saldoActual: 10000,
            recargable: true,
            estado: 'activo',
          }),
        }),
      };
      return callback(tx);
    });

    await expect(
      recargarSaldoBono('laparada', {
        bonoId: 'bono_otro_1',
        monto: 20000,
        metodoPago: 'efectivo',
      })
    ).rejects.toThrow(/no pertenece al negocio activo/);
  });

  it('redime parcial y totalmente dejando estado agotado, y rechaza bonos vencidos', async () => {
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_1',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'BON-2026-111111',
            tipo: 'bono_regalo',
            titularNombre: 'Sofía',
            montoInicial: 50000,
            saldoActual: 50000,
            totalCargadoHistorico: 50000,
            totalRedimidoHistorico: 0,
            cantidadRecargas: 0,
            cantidadRedenciones: 0,
            recargable: false,
            estado: 'activo',
            fechaVencimiento: new Date('2027-01-01T00:00:00Z'),
          }),
        }),
        update: txUpdate,
        set: txSet,
      };
      return callback(tx);
    });

    const total = await redimirSaldoBono('laparada', {
      bonoId: 'bono_1',
      montoARedimir: 50000,
      origen: 'pos',
    });

    expect(total.bono.saldoActual).toBe(0);
    expect(total.bono.estado).toBe('agotado');
    expect(total.movimiento.saldoResultante).toBe(0);

    // Rechaza bono vencido
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_venc',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'BON-2026-VENC',
            tipo: 'bono_regalo',
            titularNombre: 'Pedro',
            montoInicial: 50000,
            saldoActual: 50000,
            estado: 'activo',
            fechaVencimiento: new Date('2026-10-01T00:00:00Z'),
          }),
        }),
      };
      return callback(tx);
    });

    await expect(
      redimirSaldoBono('laparada', {
        bonoId: 'bono_venc',
        montoARedimir: 15000,
        origen: 'pos',
      })
    ).rejects.toThrow(/venció/);
  });

  it('ejecuta venta atómica con bono cubriendo parcial + excedente y permite cambio de estado', async () => {
    const txUpdate = vi.fn();
    const txSet = vi.fn();

    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_mix',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'BON-2026-MIX001',
            tipo: 'bono_regalo',
            titularNombre: 'Camila',
            titularTelefono: '3001112233',
            montoInicial: 30000,
            saldoActual: 30000,
            totalCargadoHistorico: 30000,
            totalRedimidoHistorico: 0,
            cantidadRecargas: 0,
            cantidadRedenciones: 0,
            recargable: true,
            estado: 'activo',
          }),
        }),
        update: txUpdate,
        set: txSet,
      };
      return callback(tx);
    });

    const ventaRes = await registrarVentaConBonoAtomica('laparada', {
      bonoId: 'bono_mix',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Burger Doble',
          cantidad: 2,
          precioUnitario: 25000,
          subtotal: 50000,
        },
      ],
      subtotal: 50000,
      total: 50000,
      metodoPagoExcedente: 'transferencia',
    });

    expect(ventaRes.montoRedimido).toBe(30000);
    expect(ventaRes.excedentePagado).toBe(20000);
    expect(ventaRes.bono.saldoActual).toBe(0);
    expect(ventaRes.bono.estado).toBe('agotado');
    expect(txSet).toHaveBeenCalledTimes(2); // ventas + movimientos_bonos
    expect(txSet.mock.calls[0][1]).not.toHaveProperty('id');
    expect(txSet.mock.calls[0][1].bonoCodigo).toBe('BON-2026-MIX001');
    expect(txSet.mock.calls[1][1].tipo).toBe('redencion');

    // Cambio de estado: bloquear
    mocks.runTransaction.mockImplementationOnce(async (_db, callback) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          id: 'bono_mix',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'BON-2026-MIX001',
            tipo: 'bono_regalo',
            titularNombre: 'Camila',
            montoInicial: 30000,
            saldoActual: 10000,
            estado: 'activo',
          }),
        }),
        update: txUpdate,
        set: txSet,
      };
      return callback(tx);
    });

    const bloq = await cambiarEstadoBono('laparada', {
      bonoId: 'bono_mix',
      accion: 'bloquear',
      motivo: 'Extraviado por cliente',
    });
    expect(bloq.bono.estado).toBe('bloqueado');
    expect(bloq.movimiento.tipo).toBe('bloqueo');
  });
});
