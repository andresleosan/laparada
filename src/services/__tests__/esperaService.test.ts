import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...parts: unknown[]) => ({ path: parts.slice(1).join('/') })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date('2026-11-13T19:00:00Z'), seconds: 1794596400 })),
    fromDate: vi.fn((d: Date) => ({ toDate: () => d })),
  },
}));

const whatsappMocks = vi.hoisted(() => ({
  enviarMensajeWhatsApp: vi.fn(),
}));

const mesasMocks = vi.hoisted(() => ({
  abrirCuentaMesa: vi.fn(),
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
  onSnapshot: vi.fn((_q, cb) => {
    cb({ docs: [] });
    return vi.fn();
  }),
  Timestamp: firestoreMocks.Timestamp,
}));

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('../whatsappService', () => ({
  enviarMensajeWhatsApp: whatsappMocks.enviarMensajeWhatsApp,
}));
vi.mock('../mesasService', () => ({
  abrirCuentaMesa: mesasMocks.abrirCuentaMesa,
}));

import {
  actualizarEstadoTurnoEspera,
  notificarTurnoWhatsApp,
  registrarTurnoEspera,
  sentarTurnoEnMesa,
} from '../esperaService';
import type { TurnoEspera } from '@/types/espera';

describe('esperaService', () => {
  const tenantId = 'laparada';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra un nuevo turno walk-in con código correlativo y teléfono normalizado', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({ size: 2 });
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'espera-03' });

    const turno = await registrarTurnoEspera(tenantId, {
      clienteNombre: 'Laura Gómez',
      clienteTelefono: '310 555 1234',
      personas: 4,
      zonaPreferida: 'Terraza',
      notas: 'Silla para bebé',
      tiempoEstimadoMin: 20,
    });

    expect(turno.id).toBe('espera-03');
    expect(turno.codigoTurno).toBe('E-03');
    expect(turno.clienteTelefono).toBe('573105551234');
    expect(turno.estado).toBe('esperando');
    expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
    const [, docData] = firestoreMocks.addDoc.mock.calls[0];
    expect(docData.negocioId).toBe(tenantId);
    expect(docData.personas).toBe(4);
  });

  it('envía llamado por WhatsApp y actualiza estado a notificado', async () => {
    whatsappMocks.enviarMensajeWhatsApp.mockResolvedValueOnce('msg-1');

    const turno: TurnoEspera = {
      id: 'esp-1',
      negocioId: tenantId,
      codigoTurno: 'E-01',
      clienteNombre: 'Mateo',
      clienteTelefono: '573001112233',
      personas: 2,
      estado: 'esperando',
      tiempoEstimadoMin: 10,
      creadoEn: { seconds: 1794596000, nanoseconds: 0 },
    };

    const res = await notificarTurnoWhatsApp(tenantId, turno, 'La Parada', {
      id: 'm2',
      numero: 2,
      nombre: 'Mesa 2',
    });

    expect(res.enviadoPorSistema).toBe(true);
    expect(res.mensaje).toContain('Mesa 2');
    expect(whatsappMocks.enviarMensajeWhatsApp).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({
        telefono: '573001112233',
      })
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ estado: 'notificado' })
    );
  });

  it('sienta el turno en una mesa libre abriendo la cuenta de salón', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          negocioId: tenantId,
          codigoTurno: 'E-02',
          clienteNombre: 'Sofía',
          clienteTelefono: '573009998877',
          personas: 3,
          notas: 'Terraza si es posible',
          estado: 'notificado',
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          negocioId: tenantId,
          numero: 5,
          nombre: 'Mesa 5',
          estado: 'libre',
          capacidad: 4,
        }),
      });

    mesasMocks.abrirCuentaMesa.mockResolvedValueOnce('cuenta-55');

    const res = await sentarTurnoEnMesa(tenantId, {
      turnoId: 'esp-2',
      mesaId: 'mesa-5',
      mesero: 'Andrés',
    });

    expect(res).toEqual({
      cuentaMesaId: 'cuenta-55',
      mesaNumero: 5,
      mesaNombre: 'Mesa 5',
    });
    expect(mesasMocks.abrirCuentaMesa).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({
        mesaId: 'mesa-5',
        comensales: 3,
        clienteNombre: 'Sofía',
      })
    );
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        estado: 'sentado',
        mesaAsignadaId: 'mesa-5',
        cuentaMesaId: 'cuenta-55',
      })
    );
  });

  it('rechaza actualizar estado si el turno pertenece a otro negocio', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'otro-tenant', estado: 'esperando' }),
    });

    await expect(
      actualizarEstadoTurnoEspera(tenantId, 'esp-x', 'cancelado')
    ).rejects.toThrow('Turno no encontrado');
  });
});
