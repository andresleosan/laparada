import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  },
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  registrarEventoAuditoria,
  getBitacoraAuditoria,
} from '../auditoriaService';

describe('auditoriaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra un evento de auditoría con huella forense, severidad automática y aislamiento multi-tenant', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'aud-doc-99' });

    const id = await registrarEventoAuditoria({
      negocioId: 'laparada',
      categoria: 'anulacion_venta',
      titulo: 'Venta Anulada #A1B2C3',
      descripcion: 'Anulación de venta por error de digitación',
      motivo: 'Error de digitación',
      montoImpacto: 65000,
      responsableNombre: 'Andrés Admin',
      responsableRol: 'admin',
      entidadTipo: 'venta',
      referenciaId: 'venta_a1b2c3',
    });

    expect(id).toBe('aud-doc-99');
    expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = firestoreMocks.addDoc.mock.calls[0][1];
    expect(payload.negocioId).toBe('laparada');
    expect(payload.severidad).toBe('critica');
    expect(payload.origenRegistro).toBe('bitacora_inmutable');
    expect(payload.huellaForense).toMatch(/^AUD-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(payload.codigoVisible).toBe('#A1B2C3');
  });

  it('rechaza el registro si negocioId es inválido o el título está vacío', async () => {
    await expect(
      registrarEventoAuditoria({
        negocioId: '',
        categoria: 'acceso_personal',
        titulo: 'Acceso',
        descripcion: 'Test',
        entidadTipo: 'personal',
        referenciaId: 'ref_1',
      })
    ).rejects.toThrow();

    await expect(
      registrarEventoAuditoria({
        negocioId: 'laparada',
        categoria: 'acceso_personal',
        titulo: '   ',
        descripcion: 'Test',
        entidadTipo: 'personal',
        referenciaId: 'ref_1',
      })
    ).rejects.toThrow('El título del evento de auditoría es obligatorio');
  });

  it('consulta la bitácora de auditoría del negocio activo', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'ev-1',
          data: () => ({
            negocioId: 'laparada',
            categoria: 'cortesia_descuento',
            titulo: 'Cortesía 100%',
            montoImpacto: 18000,
          }),
        },
      ],
    });

    const res = await getBitacoraAuditoria('laparada', 50);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('ev-1');
    expect(res[0].negocioId).toBe('laparada');
  });
});
