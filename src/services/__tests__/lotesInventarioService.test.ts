import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  registrarEventoAuditoriaSilencioso: vi.fn(),
}));

const notifMocks = vi.hoisted(() => ({
  crearAlertaSilenciosa: vi.fn(),
  crearNotificacion: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({ id: 'doc-auto-1' })),
  getDocs: firestoreMocks.getDocs,
  limit: vi.fn(() => ({})),
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  runTransaction: firestoreMocks.runTransaction,
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1795400000, nanoseconds: 0 })),
  },
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: auditMocks.registrarEventoAuditoriaSilencioso,
}));

vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: notifMocks.crearAlertaSilenciosa,
  crearNotificacion: notifMocks.crearNotificacion,
}));

import type { Timestamp } from 'firebase/firestore';
import type { LoteInventario, NotificacionOperativa } from '@/types';
import {
  cambiarCuarentenaLote,
  darDeBajaLoteAMerma,
  registrarLoteInventarioManual,
  sincronizarAlertasSanitariasLotes,
} from '../lotesInventarioService';

describe('lotesInventarioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registrarLoteInventarioManual crea el lote, suma stock al insumo y escribe entrada en Kardex', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValueOnce({
        exists: () => true,
        id: 'ins-queso',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Costeño',
          stockActual: 5,
          unidad: 'kg',
          costoUnitario: 18000,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    const loteId = await registrarLoteInventarioManual('laparada', {
      insumoId: 'ins-queso',
      cantidad: 10,
      costoTotal: 200000,
      proveedor: 'Lácteos El Prado',
      codigoLote: 'LOT-QUESO-01',
      fechaVencimiento: '2026-12-05',
      ubicacionBodega: 'nevera_refrigeracion',
      temperaturaRecepcionC: 3.2,
      registroSanitario: 'INVIMA-1234',
      responsable: 'Admin',
    });

    expect(loteId).toBe('doc-auto-1');
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 15,
        costoUnitario: 20000,
        proveedor: 'Lácteos El Prado',
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledTimes(2);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        insumoId: 'ins-queso',
        codigoLote: 'LOT-QUESO-01',
        cantidadInicial: 10,
        cantidadDisponible: 10,
        costoUnitario: 20000,
        fechaVencimiento: '2026-12-05',
        estado: 'activo',
        temperaturaRecepcionC: 3.2,
        registroSanitario: 'INVIMA-1234',
      })
    );
  });

  it('registrarLoteInventarioManual con soloTrazabilidadStockExistente crea solo el lote sin duplicar stock ni Kardex', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValueOnce({
        exists: () => true,
        id: 'ins-queso',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Costeño',
          stockActual: 12,
          unidad: 'kg',
          costoUnitario: 18000,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await registrarLoteInventarioManual('laparada', {
      insumoId: 'ins-queso',
      cantidad: 12,
      codigoLote: 'LOT-EXIST-01',
      fechaVencimiento: '2026-11-28',
      soloTrazabilidadStockExistente: true,
    });

    expect(mockTransaction.update).not.toHaveBeenCalled();
    expect(mockTransaction.set).toHaveBeenCalledTimes(1);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        codigoLote: 'LOT-EXIST-01',
        cantidadInicial: 12,
        cantidadDisponible: 12,
      })
    );
  });

  it('darDeBajaLoteAMerma descuenta el lote y el insumo, escribe Kardex de merma, auditoría y alerta', async () => {
    const mockTransaction = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'lote-venc-1',
          data: () => ({
            negocioId: 'laparada',
            insumoId: 'ins-carne',
            insumoNombre: 'Carne Artesanal',
            unidadMedida: 'unidades',
            codigoLote: 'LOT-CARNE-99',
            cantidadInicial: 10,
            cantidadDisponible: 4,
            cantidadConsumida: 6,
            cantidadMerma: 0,
            costoUnitario: 5000,
            fechaVencimiento: '2026-11-20',
            estado: 'activo',
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-carne',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Carne Artesanal',
            stockActual: 14,
            unidad: 'unidades',
            costoUnitario: 5000,
          }),
        }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    const res = await darDeBajaLoteAMerma('laparada', {
      loteId: 'lote-venc-1',
      motivo: 'vencimiento',
      notas: 'Lote vencido retirado de nevera',
      responsable: 'Chef Andres',
    });

    expect(res.cantidadBaja).toBe(4);
    expect(res.costoPerdidoCOP).toBe(20000);
    expect(res.codigoLote).toBe('LOT-CARNE-99');

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        cantidadDisponible: 0,
        cantidadMerma: 4,
        estado: 'vencido_baja',
        motivoBaja: 'vencimiento',
      })
    );
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 10,
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tipoMovimiento: 'merma',
        cantidad: -4,
        costo: 20000,
        loteInventarioId: 'lote-venc-1',
        codigoLote: 'LOT-CARNE-99',
        fechaVencimientoLote: '2026-11-20',
      })
    );
    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledTimes(1);
    expect(notifMocks.crearAlertaSilenciosa).toHaveBeenCalledTimes(1);
  });

  it('cambiarCuarentenaLote alterna el estado entre activo y cuarentena y audita', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValueOnce({
        exists: () => true,
        id: 'lote-q-1',
        data: () => ({
          negocioId: 'laparada',
          insumoNombre: 'Salsa Tártara',
          codigoLote: 'LOT-SALSA-1',
          cantidadDisponible: 3,
          estado: 'activo',
        }),
      }),
      update: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await cambiarCuarentenaLote('laparada', 'lote-q-1', true, 'Revisión pH', 'Admin');

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        estado: 'cuarentena',
      })
    );
    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledTimes(1);
  });

  it('sincronizarAlertasSanitariasLotes deduplica por claveSanitaria diaria', async () => {
    const ahora = new Date('2026-11-23T18:00:00Z');
    const ts = { seconds: 1795400000, nanoseconds: 0 } as unknown as Timestamp;
    const lotes: LoteInventario[] = [
      {
        id: 'lote-v1',
        negocioId: 'laparada',
        insumoId: 'ins-1',
        insumoNombre: 'Queso',
        unidadMedida: 'kg',
        codigoLote: 'LOT-V1',
        cantidadInicial: 5,
        cantidadDisponible: 5,
        cantidadConsumida: 0,
        costoUnitario: 15000,
        costoTotalInicial: 75000,
        proveedor: 'Prov',
        fechaIngreso: ts,
        fechaVencimiento: '2026-11-20',
        estado: 'activo',
        origen: 'compra_entrada',
        creadoEn: ts,
        actualizadoEn: ts,
      },
      {
        id: 'lote-c1',
        negocioId: 'laparada',
        insumoId: 'ins-2',
        insumoNombre: 'Tomate',
        unidadMedida: 'kg',
        codigoLote: 'LOT-C1',
        cantidadInicial: 4,
        cantidadDisponible: 4,
        cantidadConsumida: 0,
        costoUnitario: 5000,
        costoTotalInicial: 20000,
        proveedor: 'Prov',
        fechaIngreso: ts,
        fechaVencimiento: '2026-11-25',
        estado: 'activo',
        origen: 'compra_entrada',
        creadoEn: ts,
        actualizadoEn: ts,
      },
    ];

    const existentes: NotificacionOperativa[] = [
      {
        id: 'notif-prev',
        negocioId: 'laparada',
        modulo: 'inventario',
        tipo: 'lote_vencido',
        titulo: 'Existente',
        mensaje: 'Ya emitida hoy',
        urgencia: 'critica',
        leida: false,
        fecha: '2026-11-23T12:00:00.000Z',
        origen: 'automatico',
        metadata: {
          claveSanitaria: 'lote-v1_vencido_2026-11-23',
        },
      },
    ];

    notifMocks.crearNotificacion.mockResolvedValue('notif-nueva');

    const res = await sincronizarAlertasSanitariasLotes('laparada', lotes, existentes, ahora);
    expect(res.emitidas).toBe(1);
    expect(notifMocks.crearNotificacion).toHaveBeenCalledTimes(1);
    expect(notifMocks.crearNotificacion).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        modulo: 'inventario',
        tipo: 'lote_critico_3d',
      })
    );
  });
});
