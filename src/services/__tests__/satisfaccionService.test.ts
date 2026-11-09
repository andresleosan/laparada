import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db, _col, id) => ({ id })),
  updateDoc: firestoreMocks.updateDoc,
  deleteDoc: firestoreMocks.deleteDoc,
  getDocs: firestoreMocks.getDocs,
  getDoc: firestoreMocks.getDoc,
  setDoc: firestoreMocks.setDoc,
  onSnapshot: firestoreMocks.onSnapshot,
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('../notificacionesService', () => ({
  crearAlertaSilenciosa: vi.fn(),
}));

import {
  guardarEncuestaSatisfaccion,
  getEncuestasSatisfaccion,
  onEncuestasSatisfaccionChange,
  actualizarEstadoEncuesta,
  eliminarEncuesta,
  getConfiguracionSatisfaccion,
  guardarConfiguracionSatisfaccion,
  onConfiguracionSatisfaccionChange,
} from '../satisfaccionService';
import { crearAlertaSilenciosa } from '../notificacionesService';

describe('satisfaccionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('guardarEncuestaSatisfaccion', () => {
    it('guarda una encuesta de 5 estrellas sin disparar alerta de queja', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'enc-new-1' });

      const id = await guardarEncuestaSatisfaccion('laparada', {
        calificacion: 5,
        canal: 'mesa',
        mesaNombre: 'Mesa 2',
        clienteNombre: 'Maria',
        tags: ['sabor_increible'],
        comentario: 'Excelente',
      });

      expect(id).toBe('enc-new-1');
      expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
      const payload = firestoreMocks.addDoc.mock.calls[0][1];
      expect(payload.negocioId).toBe('laparada');
      expect(payload.calificacion).toBe(5);
      expect(payload.tipoNps).toBe('promotor');
      expect(payload.esQueja).toBe(false);
      expect(crearAlertaSilenciosa).not.toHaveBeenCalled();
    });

    it('guarda una encuesta critica (1 estrella) y dispara alerta operativa silenciosa', async () => {
      firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'enc-queja-1' });

      const id = await guardarEncuestaSatisfaccion('laparada', {
        calificacion: 1,
        canal: 'domicilio',
        clienteNombre: 'Carlos',
        tags: ['comida_fria'],
        comentario: 'Llego tarde',
      });

      expect(id).toBe('enc-queja-1');
      const payload = firestoreMocks.addDoc.mock.calls[0][1];
      expect(payload.esQueja).toBe(true);
      expect(payload.tipoNps).toBe('detractor');
      expect(crearAlertaSilenciosa).toHaveBeenCalledTimes(1);
      const alerta = vi.mocked(crearAlertaSilenciosa).mock.calls[0][1];
      expect(alerta.urgencia).toBe('critica');
      expect(alerta.titulo).toContain('Queja de comensal');
    });
  });

  describe('getEncuestasSatisfaccion y onEncuestasSatisfaccionChange', () => {
    it('obtiene encuestas ordenadas descendentemente por fecha', async () => {
      firestoreMocks.getDocs.mockResolvedValueOnce({
        docs: [
          {
            id: 'e1',
            data: () => ({
              negocioId: 'laparada',
              calificacion: 4,
              creadoEn: '2026-11-08T10:00:00Z',
            }),
          },
          {
            id: 'e2',
            data: () => ({
              negocioId: 'laparada',
              calificacion: 5,
              creadoEn: '2026-11-08T12:00:00Z',
            }),
          },
        ],
      });

      const res = await getEncuestasSatisfaccion('laparada');
      expect(res.length).toBe(2);
      expect(res[0].id).toBe('e2'); // e2 es mas reciente
    });

    it('suscribe a cambios en tiempo real', () => {
      const unsub = vi.fn();
      firestoreMocks.onSnapshot.mockReturnValueOnce(unsub);

      const callback = vi.fn();
      const resUnsub = onEncuestasSatisfaccionChange('laparada', callback);

      expect(firestoreMocks.onSnapshot).toHaveBeenCalledTimes(1);
      expect(resUnsub).toBe(unsub);
    });
  });

  describe('actualizarEstadoEncuesta y eliminarEncuesta', () => {
    it('actualiza estado y notas internas', async () => {
      firestoreMocks.updateDoc.mockResolvedValueOnce(undefined);

      await actualizarEstadoEncuesta('laparada', 'enc-1', {
        estado: 'resuelta',
        notasInternas: 'Se contacto al cliente y se le entrego cortesia',
        contactadoPorWhatsApp: true,
      });

      expect(firestoreMocks.updateDoc).toHaveBeenCalledTimes(1);
      const updateData = firestoreMocks.updateDoc.mock.calls[0][1];
      expect(updateData.estado).toBe('resuelta');
      expect(updateData.contactadoPorWhatsApp).toBe(true);
    });

    it('elimina encuesta correctamente', async () => {
      firestoreMocks.deleteDoc.mockResolvedValueOnce(undefined);
      await eliminarEncuesta('laparada', 'enc-1');
      expect(firestoreMocks.deleteDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuracion de satisfaccion', () => {
    it('obtiene configuracion por defecto si el documento no existe', async () => {
      firestoreMocks.getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const conf = await getConfiguracionSatisfaccion('laparada');
      expect(conf.negocioId).toBe('laparada');
      expect(conf.habilitarRedireccionGoogle).toBe(true);
    });

    it('guarda configuracion con merge', async () => {
      firestoreMocks.setDoc.mockResolvedValueOnce(undefined);

      await guardarConfiguracionSatisfaccion('laparada', {
        googleBusinessUrl: 'https://g.page/r/test/review',
        telefonoAtencionQuejas: '3001234567',
      });

      expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
      const payload = firestoreMocks.setDoc.mock.calls[0][1];
      expect(payload.googleBusinessUrl).toBe('https://g.page/r/test/review');
      expect(payload.telefonoAtencionQuejas).toBe('3001234567');
    });

    it('suscribe a la configuracion en tiempo real', () => {
      const unsub = vi.fn();
      firestoreMocks.onSnapshot.mockReturnValueOnce(unsub);

      const cb = vi.fn();
      const res = onConfiguracionSatisfaccionChange('laparada', cb);
      expect(res).toBe(unsub);
    });
  });
});
