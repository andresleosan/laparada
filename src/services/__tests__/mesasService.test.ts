import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ id: String(parts[parts.length - 1]), path: parts.slice(1).join('/') })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, name) => ({ id: name })),
  doc: firestoreMocks.doc,
  addDoc: firestoreMocks.addDoc,
  updateDoc: firestoreMocks.updateDoc,
  deleteDoc: firestoreMocks.deleteDoc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock('../firebase', () => ({ db: {} }));

const mockRegistrarVenta = vi.fn().mockResolvedValue('venta_mesa_123');
vi.mock('../ventasService', () => ({
  registrarVenta: (...args: unknown[]) => mockRegistrarVenta(...args),
}));

import {
  abrirCuentaMesa,
  actualizarMesa,
  agregarRondaACuenta,
  cancelarCuentaMesa,
  cobrarYFinalizarMesa,
  crearMesa,
  eliminarMesa,
  getMesas,
  solicitarPrecierreMesa,
} from '../mesasService';

describe('mesasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMesas', () => {
    it('obtiene las mesas del negocio ordenadas por número', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          { id: 'm1', data: () => ({ numero: 1, nombre: 'Mesa 1', estado: 'libre', negocioId: 'tenant_1' }) },
          { id: 'm2', data: () => ({ numero: 2, nombre: 'Mesa 2', estado: 'ocupada', negocioId: 'tenant_1' }) },
        ],
      });

      const res = await getMesas('tenant_1');
      expect(res).toHaveLength(2);
      expect(res[0].id).toBe('m1');
      expect(res[1].numero).toBe(2);
    });
  });

  describe('crearMesa', () => {
    it('crea una mesa libre con negocioId y valores normalizados', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'nueva_m1' });

      const id = await crearMesa('tenant_1', {
        numero: 5,
        nombre: 'Mesa Terraza 5',
        capacidad: 6,
        zona: 'Terraza',
      });

      expect(id).toBe('nueva_m1');
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          numero: 5,
          nombre: 'Mesa Terraza 5',
          capacidad: 6,
          zona: 'Terraza',
          estado: 'libre',
          negocioId: 'tenant_1',
        })
      );
    });
  });

  describe('actualizarMesa', () => {
    it('actualiza atributos de una mesa del negocio activo', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'tenant_1', nombre: 'Mesa 1' }),
      });

      await actualizarMesa('tenant_1', 'm1', { nombre: 'Mesa VIP 1', capacidad: 8 });

      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          nombre: 'Mesa VIP 1',
          capacidad: 8,
        })
      );
    });

    it('rechaza actualización si pertenece a otro negocio', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'otro_tenant' }),
      });

      await expect(
        actualizarMesa('tenant_1', 'm1', { nombre: 'Intento hack' })
      ).rejects.toThrow(/negocio activo/i);
    });
  });

  describe('eliminarMesa', () => {
    it('elimina la mesa si se encuentra en estado libre', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'tenant_1', estado: 'libre' }),
      });

      await eliminarMesa('tenant_1', 'm1');
      expect(firestoreMocks.deleteDoc).toHaveBeenCalled();
    });

    it('impide eliminar una mesa si está ocupada', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'tenant_1', estado: 'ocupada' }),
      });

      await expect(eliminarMesa('tenant_1', 'm1')).rejects.toThrow(/cuenta activa/i);
    });
  });

  describe('abrirCuentaMesa', () => {
    it('abre cuenta para mesa libre y cambia su estado a ocupada', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          numero: 3,
          nombre: 'Mesa 3',
          estado: 'libre',
          negocioId: 'tenant_1',
        }),
      });
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'cuenta_777' });

      const cuentaId = await abrirCuentaMesa('tenant_1', {
        mesaId: 'm3',
        comensales: 4,
        mesero: 'David',
        clienteNombre: 'Familia Torres',
      });

      expect(cuentaId).toBe('cuenta_777');
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cuentas_mesas' }),
        expect.objectContaining({
          mesaId: 'm3',
          mesaNumero: 3,
          estado: 'abierta',
          comensales: 4,
          mesero: 'David',
          total: 0,
        })
      );
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'ocupada',
          cuentaActivaId: 'cuenta_777',
          comensales: 4,
          mesero: 'David',
        })
      );
    });
  });

  describe('agregarRondaACuenta', () => {
    it('agrega ítems a la cuenta y despacha a cocina (KDS) cuando se solicita', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          mesaId: 'm3',
          mesaNumero: 3,
          mesaNombre: 'Mesa 3',
          negocioId: 'tenant_1',
          estado: 'abierta',
          rondas: [],
          items: [],
          total: 0,
        }),
      });
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'comanda_kds_1' });

      const ronda = await agregarRondaACuenta('tenant_1', 'cuenta_777', {
        items: [
          { tipo: 'producto', referenciaId: 'p1', nombre: 'Panceroti Mixto', cantidad: 2, precioUnitario: 12000, subtotal: 24000 },
        ],
        notas: 'Sin picante',
        enviarAKDS: true,
      });

      expect(ronda.numero).toBe(1);
      expect(ronda.enviadoCocina).toBe(true);
      expect(ronda.comandaId).toBe('comanda_kds_1');

      // Se guardó comanda en colección domicilios para KDS
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'domicilios' }),
        expect.objectContaining({
          clienteNombre: 'Mesa 3 · Ronda 1',
          total: 24000,
          estado: 'pendiente',
        })
      );

      // Se actualizó la cuenta con el total
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          total: 24000,
        })
      );
    });
  });

  describe('solicitarPrecierreMesa', () => {
    it('cambia estado de mesa y cuenta a por_cobrar', async () => {
      firestoreMocks.getDoc
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ negocioId: 'tenant_1' }) })
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ negocioId: 'tenant_1' }) });

      await solicitarPrecierreMesa('tenant_1', 'm3', 'cuenta_777');

      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ estado: 'por_cobrar' })
      );
    });
  });

  describe('cobrarYFinalizarMesa', () => {
    it('registra la venta, marca comanda en cocina, marca cuenta como cobrada y libera la mesa', async () => {
      firestoreMocks.getDoc
        .mockResolvedValueOnce({ exists: () => true, data: () => ({ negocioId: 'tenant_1' }) })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({
            mesaId: 'm3',
            mesaNombre: 'Mesa 3',
            negocioId: 'tenant_1',
            rondas: [{ comandaId: 'comanda_kds_1' }],
            items: [
              { tipo: 'producto', referenciaId: 'p1', nombre: 'Burger', cantidad: 2, precioUnitario: 20000, subtotal: 40000 },
            ],
            total: 40000,
          }),
        });

      const ticket = await cobrarYFinalizarMesa('tenant_1', {
        mesaId: 'm3',
        cuentaId: 'cuenta_777',
        metodoPago: 'efectivo',
        montoRecibido: 50000,
        negocioNombre: 'La Parada Grill',
      });

      expect(mockRegistrarVenta).toHaveBeenCalledWith(
        'tenant_1',
        expect.any(Array),
        40000,
        'efectivo',
        undefined,
        undefined,
        undefined,
        'mostrador',
        undefined,
        undefined
      );

      expect(ticket.ventaId).toBe('venta_mesa_123');
      expect(ticket.cambio).toBe(10000);
      expect(ticket.mesaNombre).toBe('Mesa 3');

      // Se liberó la mesa
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'libre',
          cuentaActivaId: null,
          totalActual: 0,
        })
      );
    });
  });

  describe('cancelarCuentaMesa', () => {
    it('marca la cuenta como cancelada y libera la mesa a libre', async () => {
      await cancelarCuentaMesa('tenant_1', 'm3', 'cuenta_777', 'Error de pedido');

      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'cancelada',
          notasCancelacion: 'Error de pedido',
        })
      );
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          estado: 'libre',
          cuentaActivaId: null,
        })
      );
    });
  });
});
