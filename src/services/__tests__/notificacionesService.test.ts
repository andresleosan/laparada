import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db, _col, id) => ({ id })),
  updateDoc: firestoreMocks.updateDoc,
  deleteDoc: firestoreMocks.deleteDoc,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  writeBatch: firestoreMocks.writeBatch,
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  crearNotificacion,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  eliminarNotificacion,
  getNotificacionesRecientes,
  onNotificacionesChange,
} from '../notificacionesService';

describe('notificacionesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('crearNotificacion', () => {
    it('crea una notificación operativa validando título y asignando defaults', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'notif-123' });

      const id = await crearNotificacion('laparada', {
        modulo: 'cocina',
        tipo: 'comanda_demorada',
        titulo: 'Comanda #5 demorada',
        mensaje: 'Lleva más de 15 minutos',
        urgencia: 'alta',
        enlace: '/cocina',
        origen: 'automatico',
      });

      expect(id).toBe('notif-123');
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      const payload = firestoreMocks.addDoc.mock.calls[0][1];
      expect(payload.negocioId).toBe('laparada');
      expect(payload.modulo).toBe('cocina');
      expect(payload.titulo).toBe('Comanda #5 demorada');
      expect(payload.urgencia).toBe('alta');
      expect(payload.leida).toBe(false);
      expect(typeof payload.fecha).toBe('string');
    });

    it('falla si el título está vacío', async () => {
      await expect(
        crearNotificacion('laparada', {
          modulo: 'cocina',
          tipo: 'comanda_demorada',
          titulo: '   ',
          mensaje: 'Lleva más de 15 minutos',
          urgencia: 'alta',
          origen: 'automatico',
        })
      ).rejects.toThrow('El título de la notificación es obligatorio');
    });
  });

  describe('marcarNotificacionLeida', () => {
    it('actualiza el documento marcándolo como leído con timestamp y usuario', async () => {
      firestoreMocks.updateDoc.mockResolvedValueOnce(undefined);

      await marcarNotificacionLeida('laparada', 'notif-123', 'admin_uid');

      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      const updateData = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(updateData.negocioId).toBe('laparada');
      expect(updateData.leida).toBe(true);
      expect(updateData.leidaPor).toBe('admin_uid');
      expect(typeof updateData.leidaEn).toBe('string');
    });
  });

  describe('marcarTodasNotificacionesLeidas', () => {
    it('ejecuta un batch commit para marcar múltiples notificaciones', async () => {
      const mockBatch = {
        update: vi.fn(),
        commit: vi.fn().mockResolvedValueOnce(undefined),
      };
      firestoreMocks.writeBatch.mockReturnValueOnce(mockBatch);

      await marcarTodasNotificacionesLeidas('laparada', ['n1', 'n2', 'n3'], 'supervisor');

      expect(mockBatch.update).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('eliminarNotificacion', () => {
    it('elimina la notificación de Firestore', async () => {
      firestoreMocks.deleteDoc.mockResolvedValueOnce(undefined);

      await eliminarNotificacion('laparada', 'notif-999');

      expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('getNotificacionesRecientes', () => {
    it('recupera las notificaciones mapeadas con su ID', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'n1',
            data: () => ({
              negocioId: 'laparada',
              modulo: 'cocina',
              titulo: 'Alerta KDS',
              leida: false,
            }),
          },
        ],
      });

      const lista = await getNotificacionesRecientes('laparada');
      expect(lista).toHaveLength(1);
      expect(lista[0].id).toBe('n1');
      expect(lista[0].titulo).toBe('Alerta KDS');
    });
  });

  describe('onNotificacionesChange', () => {
    it('registra listener reactivo con snapshot', () => {
      const unsubscribeMock = vi.fn();
      firestoreMocks.onSnapshot.mockReturnValueOnce(unsubscribeMock);

      const callback = vi.fn();
      const unsub = onNotificacionesChange('laparada', callback);

      expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);
      expect(unsub).toBe(unsubscribeMock);
    });
  });
});
