import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date('2026-11-03T20:00:00Z') })),
    fromDate: vi.fn((d: Date) => ({ toDate: () => d })),
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
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  limit: vi.fn((num) => ({ limit: num })),
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock('@/services/firebase', () => ({ db: {} }));

import {
  actualizarCliente,
  crearCliente,
  eliminarCliente,
  getClientePorTelefono,
  getClientes,
  getHistorialVentasCliente,
  registrarCompraCliente,
} from '../clientesService';

describe('clientesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClientes', () => {
    it('obtiene la lista de clientes del local mapeando correctamente los campos', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'c-1',
            data: () => ({
              negocioId: 'laparada',
              nombre: 'Juan Pérez',
              telefono: '3001234567',
              direcciones: ['Cra 5 #12-34'],
              barrio: 'Centro',
              totalPedidos: 5,
              totalConsumido: 125000,
              primerPedidoEn: new Date('2026-01-01'),
              ultimoPedidoEn: new Date('2026-11-01'),
              origenRegistro: 'pos',
            }),
          },
        ],
      });

      const clientes = await getClientes('laparada');
      expect(clientes).toHaveLength(1);
      expect(clientes[0].nombre).toBe('Juan Pérez');
      expect(clientes[0].totalPedidos).toBe(5);
      expect(clientes[0].totalConsumido).toBe(125000);
    });

    it('rechaza consulta sin negocioId válido', async () => {
      await expect(getClientes('')).rejects.toThrow();
    });
  });

  describe('getClientePorTelefono', () => {
    it('retorna null si el teléfono está vacío', async () => {
      const resultado = await getClientePorTelefono('laparada', '');
      expect(resultado).toBeNull();
    });

    it('busca y retorna el cliente si existe en el tenant', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'c-1',
            data: () => ({
              negocioId: 'laparada',
              nombre: 'María Gómez',
              telefono: '3109876543',
              direcciones: [],
              totalPedidos: 2,
              totalConsumido: 45000,
            }),
          },
        ],
      });

      const cliente = await getClientePorTelefono('laparada', '+57 310 987 6543');
      expect(cliente).not.toBeNull();
      expect(cliente?.nombre).toBe('María Gómez');
    });
  });

  describe('registrarCompraCliente', () => {
    it('crea un nuevo cliente con "lo de siempre" si no existía previamente', async () => {
      // getClientePorTelefono retorna vacío
      firestoreMocks.getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'nuevo-c-1' });

      const resultado = await registrarCompraCliente('laparada', {
        telefono: '3151112233',
        nombre: 'Carlos Ruiz',
        direccion: 'Calle 10 #15-20',
        barrio: 'Caobos',
        monto: 35000,
        items: [
          {
            tipo: 'producto',
            referenciaId: 'p1',
            nombre: 'Hamburguesa La Parada',
            cantidad: 2,
            precioUnitario: 17500,
            subtotal: 35000,
          },
        ],
        origen: 'pos',
      });

      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      const callData = firestoreMocks.addDoc.mock.calls[0][1];
      expect(callData.negocioId).toBe('laparada');
      expect(callData.telefono).toBe('3151112233');
      expect(callData.nombre).toBe('Carlos Ruiz');
      expect(callData.totalPedidos).toBe(1);
      expect(callData.totalConsumido).toBe(35000);
      expect(callData.loDeSiempre).toBeDefined();
      expect(callData.loDeSiempre.items).toHaveLength(1);
      expect(resultado?.id).toBe('nuevo-c-1');
    });

    it('actualiza pedidos, consumo total y "lo de siempre" si el cliente ya existe', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'c-existente',
            data: () => ({
              negocioId: 'laparada',
              nombre: 'Carlos Ruiz',
              telefono: '3151112233',
              direcciones: ['Calle 10 #15-20'],
              totalPedidos: 2,
              totalConsumido: 50000,
            }),
          },
        ],
      });

      await registrarCompraCliente('laparada', {
        telefono: '3151112233',
        monto: 20000,
        items: [
          {
            tipo: 'combo',
            referenciaId: 'c1',
            nombre: 'Combo Familiar',
            cantidad: 1,
            precioUnitario: 20000,
            subtotal: 20000,
          },
        ],
        origen: 'pos',
      });

      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      const updateData = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(updateData.totalPedidos).toBe(3);
      expect(updateData.totalConsumido).toBe(70000);
      expect(updateData.loDeSiempre.items[0].nombre).toBe('Combo Familiar');
    });
  });

  describe('crearCliente manual', () => {
    it('falla si ya existe un cliente con ese teléfono', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'dup', data: () => ({ negocioId: 'laparada', telefono: '3001234567' }) }],
      });

      await expect(
        crearCliente('laparada', {
          nombre: 'Duplicado',
          telefono: '3001234567',
        })
      ).rejects.toThrow(/ya existe/i);
    });

    it('crea el cliente exitosamente si el teléfono es nuevo', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'nuevo-1' });

      const nuevo = await crearCliente('laparada', {
        nombre: 'Nuevo Cliente',
        telefono: '3209998877',
        direccion: 'Av 5 #10-10',
        barrio: 'Guaimaral',
        notas: 'Cliente corporativo',
      });

      expect(nuevo.id).toBe('nuevo-1');
      expect(nuevo.nombre).toBe('Nuevo Cliente');
      expect(nuevo.telefono).toBe('3209998877');
    });
  });

  describe('actualizarCliente y eliminarCliente', () => {
    it('impide actualizar un cliente de otro negocio', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'otro-negocio' }),
      });

      await expect(
        actualizarCliente('laparada', 'c-ajeno', { nombre: 'Intento' })
      ).rejects.toThrow(/no pertenece al negocio/i);
    });

    it('impide eliminar un cliente de otro negocio', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'otro-negocio' }),
      });

      await expect(eliminarCliente('laparada', 'c-ajeno')).rejects.toThrow(
        /no pertenece al negocio/i
      );
    });

    it('elimina cliente del propio negocio correctamente', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ negocioId: 'laparada' }),
      });

      await eliminarCliente('laparada', 'c-propio');
      expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHistorialVentasCliente', () => {
    it('obtiene las ventas filtradas por negocio y teléfono', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'v-101',
            data: () => ({
              negocioId: 'laparada',
              clienteTelefono: '3001234567',
              total: 25000,
              items: [],
            }),
          },
        ],
      });

      const historial = await getHistorialVentasCliente('laparada', '300 123 4567');
      expect(historial).toHaveLength(1);
      expect(historial[0].id).toBe('v-101');
      expect(historial[0].total).toBe(25000);
    });
  });
});

