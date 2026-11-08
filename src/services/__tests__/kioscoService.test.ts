import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date('2026-11-07T20:00:00Z') })),
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
    cb({ docs: [] });
    return vi.fn();
  }),
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/clientesService', () => ({
  registrarCompraCliente: vi.fn().mockResolvedValue(undefined),
}));

import {
  crearPedidoKiosco,
  getUltimoTurnoDelDia,
  marcarPedidoKioscoPagado,
  getPedidosKioscoPendientes,
  onPedidosKioscoPendientesChange,
} from '../kioscoService';

describe('kioscoService', () => {
  const tenantId = 'laparada';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUltimoTurnoDelDia', () => {
    it('retorna el número más alto encontrado en los últimos turnos de la jornada', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          { data: () => ({ numeroTurno: 'K-014' }) },
          { data: () => ({ numeroTurno: 'K-013' }) },
        ],
        size: 2,
      });

      const res = await getUltimoTurnoDelDia(tenantId);
      expect(res).toBe(14);
    });

    it('retorna 0 si no hay pedidos previos hoy', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [],
        size: 0,
      });

      const res = await getUltimoTurnoDelDia(tenantId);
      expect(res).toBe(0);
    });
  });

  describe('crearPedidoKiosco', () => {
    it('crea exitosamente el pedido en Firestore con número de turno correlativo', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [{ data: () => ({ numeroTurno: 'K-005' }) }],
        size: 1,
      });
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'pedido_kiosco_123' });

      const res = await crearPedidoKiosco(tenantId, {
        negocioId: tenantId,
        clienteNombre: 'María Gómez',
        clienteTelefono: '3001234567',
        tipoServicio: 'salon',
        mesaNumero: '2',
        items: [
          {
            tipo: 'producto',
            referenciaId: 'p1',
            nombre: 'Hamburguesa La Parada',
            cantidad: 2,
            precioUnitario: 22000,
            subtotal: 44000,
            modificadores: ['Sin cebolla'],
          },
        ],
        notas: 'Servir con salsas aparte',
      });

      expect(res.id).toBe('pedido_kiosco_123');
      expect(res.numeroTurno).toBe('K-006');
      expect(res.total).toBe(44000);

      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          negocioId: tenantId,
          clienteNombre: 'María Gómez',
          origen: 'kiosco',
          estado: 'pendiente',
          pagado: false,
          numeroTurno: 'K-006',
          tipoServicio: 'salon',
          mesaNumero: '2',
          total: 44000,
        })
      );
    });

    it('falla si el nombre del cliente o los items están vacíos', async () => {
      await expect(
        crearPedidoKiosco(tenantId, {
          negocioId: tenantId,
          clienteNombre: '',
          tipoServicio: 'para_llevar',
          items: [{ cantidad: 1, precioUnitario: 1000 } as any],
        })
      ).rejects.toThrow('El nombre del cliente es obligatorio');

      await expect(
        crearPedidoKiosco(tenantId, {
          negocioId: tenantId,
          clienteNombre: 'Carlos',
          tipoServicio: 'para_llevar',
          items: [],
        })
      ).rejects.toThrow('El pedido debe contener al menos un producto');
    });
  });

  describe('marcarPedidoKioscoPagado', () => {
    it('actualiza el pedido a pagado y lo avanza a en_preparacion', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: tenantId, estado: 'pendiente' }),
      });

      await marcarPedidoKioscoPagado(tenantId, 'pedido_123', 'efectivo');

      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pagado: true,
          metodoPago: 'efectivo',
          estado: 'en_preparacion',
        })
      );
    });

    it('bloquea si el pedido pertenece a otro negocio', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'otro_local' }),
      });

      await expect(
        marcarPedidoKioscoPagado(tenantId, 'pedido_ajeno', 'efectivo')
      ).rejects.toThrow('El pedido no pertenece al negocio activo');
    });
  });

  describe('getPedidosKioscoPendientes y listener', () => {
    it('obtiene los pedidos de kiosco pendientes mapeados', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'k1',
            data: () => ({ clienteNombre: 'Pedro', total: 20000, numeroTurno: 'K-001' }),
          },
        ],
      });

      const res = await getPedidosKioscoPendientes(tenantId);
      expect(res.length).toBe(1);
      expect(res[0].id).toBe('k1');
      expect(res[0].clienteNombre).toBe('Pedro');
    });

    it('onPedidosKioscoPendientesChange suscribe correctamente', () => {
      const cb = vi.fn();
      const unsub = onPedidosKioscoPendientesChange(tenantId, cb);
      expect(typeof unsub).toBe('function');
      expect(cb).toHaveBeenCalled();
    });
  });
});
