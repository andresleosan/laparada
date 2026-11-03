import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'reservas' })),
  doc: firestoreMocks.doc,
  addDoc: firestoreMocks.addDoc,
  updateDoc: firestoreMocks.updateDoc,
  deleteDoc: firestoreMocks.deleteDoc,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn((field, dir) => ({ field, dir })),
  query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
  where: vi.fn((field, op, value) => ({ field, op, value })),
  limit: vi.fn((num) => ({ limit: num })),
  serverTimestamp: firestoreMocks.serverTimestamp,
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  actualizarEstadoReserva,
  crearReserva,
  eliminarReserva,
  getReservas,
  suscribirReservas,
  validarDatosReserva,
} from '../reservasService';
import type { NuevaReservaInput } from '@/types/reserva';

describe('reservasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseInput: NuevaReservaInput = {
    clienteNombre: 'Carlos Morales',
    clienteTelefono: '3151234567',
    fechaHoraReserva: '2026-11-03T20:00',
    personas: 4,
    notas: 'Mesa cerca al balcón',
    estado: 'pendiente',
    origen: 'whatsapp',
  };

  describe('validarDatosReserva', () => {
    it('valida datos correctos sin arrojar error', () => {
      expect(() => validarDatosReserva(baseInput)).not.toThrow();
    });

    it('rechaza nombres demasiado cortos o vacíos', () => {
      expect(() =>
        validarDatosReserva({ ...baseInput, clienteNombre: 'A' })
      ).toThrow(/nombre del cliente/i);
      expect(() =>
        validarDatosReserva({ ...baseInput, clienteNombre: '' })
      ).toThrow(/nombre del cliente/i);
    });

    it('rechaza teléfonos con longitud inválida', () => {
      expect(() =>
        validarDatosReserva({ ...baseInput, clienteTelefono: '123' })
      ).toThrow(/teléfono del cliente/i);
    });

    it('rechaza comensales menores a 1 o mayores a 50', () => {
      expect(() =>
        validarDatosReserva({ ...baseInput, personas: 0 })
      ).toThrow(/cantidad de personas/i);
      expect(() =>
        validarDatosReserva({ ...baseInput, personas: 51 })
      ).toThrow(/cantidad de personas/i);
    });

    it('rechaza estados desconocidos', () => {
      expect(() =>
        validarDatosReserva({
          ...baseInput,
          // @ts-expect-error probando valor inválido
          estado: 'invalido',
        })
      ).toThrow(/estado de la reserva/i);
    });
  });

  describe('crearReserva', () => {
    it('guarda la reserva con aislamiento de tenantId y serverTimestamp', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'res-123' });

      const id = await crearReserva('laparada', baseInput);

      expect(id).toBe('res-123');
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          negocioId: 'laparada',
          clienteNombre: 'Carlos Morales',
          clienteTelefono: '3151234567',
          personas: 4,
          estado: 'pendiente',
          origen: 'whatsapp',
          creadoEn: { _methodName: 'serverTimestamp' },
          actualizadoEn: { _methodName: 'serverTimestamp' },
        })
      );
    });

    it('falla si el negocioId es inválido', async () => {
      await expect(crearReserva('   ', baseInput)).rejects.toThrow(
        /identificador válido/i
      );
    });
  });

  describe('actualizarEstadoReserva', () => {
    it('actualiza el estado a confirmada', async () => {
      firestoreMocks.updateDoc.mockResolvedValueOnce(undefined);

      await actualizarEstadoReserva('laparada', 'res-123', 'confirmada');

      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'reservas', 'res-123');
      expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
        { path: 'reservas/res-123' },
        expect.objectContaining({
          estado: 'confirmada',
          actualizadoEn: { _methodName: 'serverTimestamp' },
        })
      );
    });

    it('rechaza estados inválidos o ID vacío', async () => {
      await expect(
        // @ts-expect-error probando estado erróneo
        actualizarEstadoReserva('laparada', 'res-123', 'cerrada')
      ).rejects.toThrow(/estado indicado/i);

      await expect(
        actualizarEstadoReserva('laparada', '', 'confirmada')
      ).rejects.toThrow(/ID de la reserva es obligatorio/i);
    });
  });

  describe('eliminarReserva', () => {
    it('elimina el documento de Firestore', async () => {
      firestoreMocks.deleteDoc.mockResolvedValueOnce(undefined);

      await eliminarReserva('laparada', 'res-123');

      expect(firestoreMocks.doc).toHaveBeenCalledWith({}, 'reservas', 'res-123');
      expect(firestoreMocks.deleteDoc).toHaveBeenCalledWith({
        path: 'reservas/res-123',
      });
    });
  });

  describe('getReservas y suscribirReservas', () => {
    it('obtiene reservas mapeadas con su ID', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'res-1',
            data: () => ({
              negocioId: 'laparada',
              clienteNombre: 'Ana',
              clienteTelefono: '3001112233',
              fechaHoraReserva: '2026-11-03T19:00',
              personas: 2,
              estado: 'confirmada',
              origen: 'web',
            }),
          },
        ],
      });

      const items = await getReservas('laparada', { estado: 'confirmada' });
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        id: 'res-1',
        clienteNombre: 'Ana',
        estado: 'confirmada',
      });
    });

    it('suscribe a cambios en tiempo real vía onSnapshot', () => {
      const unsubscribeMock = vi.fn();
      firestoreMocks.onSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          docs: [
            {
              id: 'res-2',
              data: () => ({
                negocioId: 'laparada',
                clienteNombre: 'Pedro',
                clienteTelefono: '3009998877',
                fechaHoraReserva: '2026-11-03T21:00',
                personas: 6,
                estado: 'pendiente',
                origen: 'pos',
              }),
            },
          ],
        });
        return unsubscribeMock;
      });

      const onUpdate = vi.fn();
      const unsub = suscribirReservas('laparada', onUpdate);

      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'res-2', clienteNombre: 'Pedro' }),
      ]);
      expect(typeof unsub).toBe('function');
    });
  });
});

