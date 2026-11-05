import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/'), id: 'mock-id' })),
  collection: vi.fn((_db, name) => ({ id: name })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date('2026-11-04T20:00:00Z') })),
    fromDate: vi.fn((d: Date) => ({ toDate: () => d })),
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  addDoc: firestoreMocks.addDoc,
  updateDoc: firestoreMocks.updateDoc,
  deleteDoc: firestoreMocks.deleteDoc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  runTransaction: firestoreMocks.runTransaction,
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  onSnapshot: vi.fn(),
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/inventarioService', () => ({
  registrarEntradaInventario: vi.fn().mockResolvedValue('ent-1'),
}));
vi.mock('@/services/gastosService', () => ({
  crearGasto: vi.fn().mockResolvedValue('gas-1'),
}));

import {
  getProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  getFacturasCompra,
  crearFacturaCompra,
  registrarPagoFactura,
  anularFacturaCompra,
} from '../proveedoresService';

describe('proveedoresService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProveedores', () => {
    it('obtiene la lista de proveedores del tenant activo', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'prov-1',
            data: () => ({
              negocioId: 'laparada',
              nombre: 'Panadería La Floresta',
              telefono: '3101234567',
              categoria: 'panaderia',
              diasCreditoHabitual: 15,
              activo: true,
            }),
          },
        ],
      });

      const list = await getProveedores('laparada');
      expect(list).toHaveLength(1);
      expect(list[0].nombre).toBe('Panadería La Floresta');
      expect(list[0].id).toBe('prov-1');
    });
  });

  describe('crearProveedor', () => {
    it('agrega el proveedor con negocioId validado y timestamps', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'nuevo-prov-id' });

      const id = await crearProveedor({
        negocioId: 'laparada',
        nombre: 'Carnes Norte',
        telefono: '3159876543',
        categoria: 'carnes',
        diasCreditoHabitual: 7,
        activo: true,
      });

      expect(id).toBe('nuevo-prov-id');
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          negocioId: 'laparada',
          nombre: 'Carnes Norte',
          diasCreditoHabitual: 7,
        })
      );
    });
  });

  describe('actualizarProveedor', () => {
    it('rechaza actualización si el proveedor no pertenece al tenant', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'otro-negocio' }),
      });

      await expect(
        actualizarProveedor('prov-1', { nombre: 'Cambio' }, 'laparada')
      ).rejects.toThrow('El proveedor no pertenece al negocio activo');
    });

    it('actualiza correctamente si el tenant coincide', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'laparada' }),
      });

      await actualizarProveedor('prov-1', { telefono: '3200000000' }, 'laparada');
      expect(firestoreMocks.updateDoc).toHaveBeenCalled();
    });
  });

  describe('eliminarProveedor', () => {
    it('elimina el proveedor si pertenece al tenant activo', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'laparada' }),
      });

      await eliminarProveedor('prov-1', 'laparada');
      expect(firestoreMocks.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('getFacturasCompra', () => {
    it('retorna facturas de compra del negocio activo', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'fac-1',
            data: () => ({
              negocioId: 'laparada',
              numeroFactura: 'FAC-01',
              total: 100000,
              saldoPendiente: 100000,
              estado: 'pendiente',
            }),
          },
        ],
      });

      const facturas = await getFacturasCompra('laparada');
      expect(facturas).toHaveLength(1);
      expect(facturas[0].numeroFactura).toBe('FAC-01');
    });
  });

  describe('crearFacturaCompra', () => {
    it('crea factura de crédito en estado pendiente con saldo completo', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'fac-credito-id' });

      const id = await crearFacturaCompra({
        negocioId: 'laparada',
        proveedorId: 'prov-1',
        proveedorNombre: 'Carnes Norte',
        numeroFactura: 'FAC-777',
        fechaEmision: firestoreMocks.Timestamp.now() as any,
        fechaVencimiento: firestoreMocks.Timestamp.now() as any,
        condicionPago: 'credito',
        items: [],
        subtotal: 150000,
        total: 150000,
      });

      expect(id).toBe('fac-credito-id');
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'pendiente',
          montoPagado: 0,
          saldoPendiente: 150000,
        })
      );
    });

    it('crea factura de contado en estado pagada con saldo cero y registra pago', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'fac-contado-id' });

      const id = await crearFacturaCompra({
        negocioId: 'laparada',
        proveedorId: 'prov-1',
        proveedorNombre: 'Carnes Norte',
        numeroFactura: 'FAC-888',
        fechaEmision: firestoreMocks.Timestamp.now() as any,
        fechaVencimiento: firestoreMocks.Timestamp.now() as any,
        condicionPago: 'contado',
        items: [],
        subtotal: 80000,
        total: 80000,
        registrarGastoContado: true,
      });

      expect(id).toBe('fac-contado-id');
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'pagada',
          montoPagado: 80000,
          saldoPendiente: 0,
        })
      );
    });
  });

  describe('registrarPagoFactura', () => {
    it('ejecuta transacción, valida monto y actualiza saldo pendiente y estado', async () => {
      const mockFactura = {
        negocioId: 'laparada',
        proveedorId: 'prov-1',
        numeroFactura: 'FAC-500',
        total: 100000,
        montoPagado: 20000,
        saldoPendiente: 80000,
        estado: 'parcial',
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockFactura,
        }),
        update: vi.fn(),
        set: vi.fn(),
      };

      firestoreMocks.runTransaction.mockImplementationOnce(async (_db, cb: any) => {
        return cb(mockTransaction);
      });

      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockFactura,
      });

      const pagoId = await registrarPagoFactura('laparada', 'fac-500', {
        monto: 30000,
        metodoPago: 'efectivo',
        referenciaComprobante: 'REC-01',
      });

      expect(pagoId).toBeDefined();
      expect(mockTransaction.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          montoPagado: 50000,
          saldoPendiente: 50000,
          estado: 'parcial',
        })
      );
    });

    it('rechaza pago si el monto supera el saldo pendiente', async () => {
      const mockFactura = {
        negocioId: 'laparada',
        total: 100000,
        montoPagado: 80000,
        saldoPendiente: 20000,
        estado: 'parcial',
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => mockFactura,
        }),
        update: vi.fn(),
        set: vi.fn(),
      };

      firestoreMocks.runTransaction.mockImplementationOnce(async (_db, cb: any) => {
        return cb(mockTransaction);
      });

      await expect(
        registrarPagoFactura('laparada', 'fac-1', {
          monto: 50000, // 50k > 20k saldo
          metodoPago: 'efectivo',
        })
      ).rejects.toThrow('supera el saldo pendiente');
    });
  });

  describe('anularFacturaCompra', () => {
    it('marca la factura como anulada registrando el motivo', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'laparada' }),
      });

      await anularFacturaCompra('laparada', 'fac-1', 'Factura duplicada por el proveedor');

      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'anulada',
          motivoAnulacion: 'Factura duplicada por el proveedor',
        })
      );
    });
  });
});
