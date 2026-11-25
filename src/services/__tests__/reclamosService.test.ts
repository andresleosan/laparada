import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_db: unknown, _col: string, id: string) => ({ id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
}));

const bonosMocks = vi.hoisted(() => ({
  emitirBonoPrepago: vi.fn(),
}));

const cajaMocks = vi.hoisted(() => ({
  registrarMovimientoCaja: vi.fn(),
}));

const domMocks = vi.hoisted(() => ({
  crearDomicilioDesdePos: vi.fn(),
}));

const auditMocks = vi.hoisted(() => ({
  registrarEventoAuditoriaSilencioso: vi.fn(),
}));

const notifMocks = vi.hoisted(() => ({
  crearAlertaSilenciosa: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  deleteDoc: firestoreMocks.deleteDoc,
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  limit: vi.fn(() => ({})),
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  Timestamp: {
    now: vi.fn(() => ({
      seconds: 1795503600,
      nanoseconds: 0,
      toDate: () => new Date(1795503600 * 1000),
    })),
  },
  updateDoc: firestoreMocks.updateDoc,
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('@/services/bonosService', () => ({
  emitirBonoPrepago: bonosMocks.emitirBonoPrepago,
}));

vi.mock('@/services/movimientosCajaService', () => ({
  registrarMovimientoCaja: cajaMocks.registrarMovimientoCaja,
}));

vi.mock('@/services/domiciliosService', () => ({
  crearDomicilioDesdePos: domMocks.crearDomicilioDesdePos,
}));

vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: auditMocks.registrarEventoAuditoriaSilencioso,
}));

vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: notifMocks.crearAlertaSilenciosa,
}));

import {
  registrarReclamoPqrs,
  resolverReclamoPqrs,
} from '../reclamosService';

describe('reclamosService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('radica un reclamo crítico sin campo id, emite alerta y registra auditoría', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'rec-new-1' });

    const creado = await registrarReclamoPqrs({
      negocioId: 'laparada',
      tipo: 'garantia_pedido',
      canal: 'domicilio',
      causaRaiz: 'pedido_incompleto',
      prioridad: 'critica',
      clienteNombre: 'Mariana Torres',
      clienteTelefono: '3104445566',
      direccionEntrega: 'Calle 10 # 4-20',
      barrioEntrega: 'Centro',
      montoPedidoCOP: 42000,
      descripcion: 'Faltaron dos gaseosas y una porción de tequeños en la entrega.',
      fechaIso: '2026-11-24',
      registradoPor: 'Cajero POS',
      registradoRol: 'cajero',
    });

    expect(creado.id).toBe('rec-new-1');
    expect(creado.codigoRadicado).toBe('PQR-20261124-001');
    expect(creado.slaObjetivoMin).toBe(30);

    const payload = firestoreMocks.addDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('id');
    expect(payload.negocioId).toBe('laparada');
    expect(payload.estado).toBe('abierto');

    expect(notifMocks.crearAlertaSilenciosa).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        modulo: 'pedidos',
        urgencia: 'critica',
        enlace: '/reclamos',
      })
    );
    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalled();
  });

  it('resuelve con bono de cortesía en /bonos y persiste código trazable', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'rec-1',
      data: () => ({
        negocioId: 'laparada',
        codigoRadicado: 'PQR-20261124-001',
        clienteNombre: 'Mariana Torres',
        clienteTelefono: '3104445566',
        estado: 'abierto',
        slaObjetivoMin: 60,
        creadoEn: {
          seconds: 1795500000,
          toDate: () => new Date(1795500000 * 1000),
        },
      }),
    });

    bonosMocks.emitirBonoPrepago.mockResolvedValueOnce({
      bono: { id: 'bono-1', codigo: 'VAL-2026-CORT01' },
      movimiento: { id: 'mov-bono-1' },
    });

    const resuelto = await resolverReclamoPqrs('laparada', 'rec-1', {
      tipoResolucion: 'bono_cortesia',
      montoCompensacionCOP: 15000,
      resolucionNotas: 'Se emite vale de cortesía por faltante de salsa y bebida.',
      resueltoPor: 'Andrés',
      vigenciaBonoDias: 30,
    });

    expect(bonosMocks.emitirBonoPrepago).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        tipo: 'vale_consumo',
        montoInicial: 15000,
        metodoPago: 'efectivo',
      })
    );
    expect(resuelto.estado).toBe('resuelto');
    expect(resuelto.bonoCortesiaCodigo).toBe('VAL-2026-CORT01');
    expect(resuelto.cumplioSla).toBe(true);
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { id: 'rec-1' },
      expect.objectContaining({
        estado: 'resuelto',
        tipoResolucion: 'bono_cortesia',
        bonoCortesiaCodigo: 'VAL-2026-CORT01',
      })
    );
  });

  it('resuelve con devolución en caja menor (/caja) o reenvío a $0 (/domicilios)', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'rec-caja',
      data: () => ({
        negocioId: 'laparada',
        codigoRadicado: 'PQR-20261124-002',
        clienteNombre: 'Luis Gómez',
        estado: 'en_gestion',
        slaObjetivoMin: 60,
        creadoEn: {
          seconds: 1795500000,
          toDate: () => new Date(1795500000 * 1000),
        },
      }),
    });
    cajaMocks.registrarMovimientoCaja.mockResolvedValueOnce({
      id: 'mov-caja-1',
      codigoComprobante: 'CMN-0005',
    });

    const resCaja = await resolverReclamoPqrs('laparada', 'rec-caja', {
      tipoResolucion: 'devolucion_caja',
      montoCompensacionCOP: 22000,
      resolucionNotas: 'Devolución en efectivo autorizada por producto en mal estado.',
      resueltoPor: 'Cajero',
      autorizadoPor: 'Admin',
    });

    expect(cajaMocks.registrarMovimientoCaja).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        tipo: 'egreso_caja_menor',
        monto: 22000,
      })
    );
    expect(resCaja.movimientoCajaCodigo).toBe('CMN-0005');

    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'rec-dom',
      data: () => ({
        negocioId: 'laparada',
        codigoRadicado: 'PQR-20261124-003',
        clienteNombre: 'Ana Ruiz',
        clienteTelefono: '3159998877',
        direccionEntrega: 'Av 0 # 15-20',
        barrioEntrega: 'La Playa',
        estado: 'abierto',
        slaObjetivoMin: 60,
        creadoEn: {
          seconds: 1795500000,
          toDate: () => new Date(1795500000 * 1000),
        },
      }),
    });
    domMocks.crearDomicilioDesdePos.mockResolvedValueOnce('dom-reenvio-99');

    const resReenvio = await resolverReclamoPqrs('laparada', 'rec-dom', {
      tipoResolucion: 'reenvio_domicilio',
      montoCompensacionCOP: 12000,
      resolucionNotas: 'Reenvío inmediato de tequeños calientes por garantía.',
      resueltoPor: 'Admin',
    });

    expect(domMocks.crearDomicilioDesdePos).toHaveBeenCalledWith(
      'laparada',
      expect.any(Array),
      0,
      'efectivo',
      'Ana Ruiz',
      '',
      '3159998877',
      'Av 0 # 15-20',
      'La Playa',
      expect.objectContaining({ costoEnvio: 0 })
    );
    expect(resReenvio.reenvioDomicilioId).toBe('dom-reenvio-99');
  });

  it('bloquea acceso cross-tenant al intentar resolver un reclamo de otro negocio', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'rec-ajeno',
      data: () => ({
        negocioId: 'otro-local',
        estado: 'abierto',
      }),
    });

    await expect(
      resolverReclamoPqrs('laparada', 'rec-ajeno', {
        tipoResolucion: 'disculpa_seguimiento',
        resolucionNotas: 'Intento indebido',
        resueltoPor: 'Admin',
      })
    ).rejects.toThrow(/otro negocio/i);
  });
});
