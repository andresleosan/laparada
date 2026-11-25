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

const gastosMocks = vi.hoisted(() => ({
  registrarGastoDetallado: vi.fn(),
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
    now: vi.fn(() => ({ seconds: 1795500000, nanoseconds: 0 })),
  },
  updateDoc: firestoreMocks.updateDoc,
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('@/services/gastosService', () => ({
  registrarGastoDetallado: gastosMocks.registrarGastoDetallado,
}));

vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: auditMocks.registrarEventoAuditoriaSilencioso,
}));

vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: notifMocks.crearAlertaSilenciosa,
}));

import {
  crearEquipoMantenimiento,
  inicializarPlantillaEquiposMantenimiento,
  registrarOrdenMantenimiento,
  reportarFallaEquipo,
} from '../mantenimientoService';

describe('mantenimientoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crea un equipo activo validando tenant, fecha ISO y sin campo id en payload', async () => {
    await expect(
      crearEquipoMantenimiento({
        negocioId: 'laparada',
        nombre: 'Extintor Tipo K',
        categoria: 'extintor',
        ubicacion: 'Cocina',
        fechaRecargaVenceIso: '24/11/2026',
      })
    ).rejects.toThrow(/YYYY-MM-DD/i);

    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'eq-new-1' });
    const creado = await crearEquipoMantenimiento({
      negocioId: 'laparada',
      nombre: 'Extintor Tipo K 6L',
      categoria: 'extintor',
      ubicacion: 'Junto a freidoras',
      tipoAgenteExtintor: 'tipo_k',
      capacidadExtintor: '6 Litros',
      fechaRecargaVenceIso: '2027-06-30',
      creadoPor: 'Andrés',
    });

    expect(creado.id).toBe('eq-new-1');
    expect(creado.codigoActivo).toBe('SEG-001');
    const payload = firestoreMocks.addDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('id');
    expect(payload.negocioId).toBe('laparada');
    expect(payload.costoAcumuladoCOP).toBe(0);
  });

  it('inicializa los 6 equipos de plantilla sin duplicar códigos ya existentes', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'eq-existing',
          data: () => ({
            negocioId: 'laparada',
            codigoActivo: 'COC-001',
            nombre: 'Freidora Industrial #1',
          }),
        },
      ],
    });
    firestoreMocks.addDoc.mockResolvedValue({ id: 'eq-tpl' });

    const res = await inicializarPlantillaEquiposMantenimiento('laparada', 'Admin');
    expect(res.creadosCount).toBe(5);
    expect(res.totalExistentes).toBe(6);
  });

  it('registra una orden de mantenimiento, concilia en /gastos, resuelve falla y audita', async () => {
    firestoreMocks.getDoc
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'eq-1',
        data: () => ({
          negocioId: 'laparada',
          codigoActivo: 'COC-001',
          nombre: 'Freidora Industrial #1',
          categoria: 'coccion',
          frecuenciaPreventivoDias: 90,
          costoAcumuladoCOP: 50000,
          totalIntervenciones: 1,
          activo: true,
        }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'falla-1',
        data: () => ({
          negocioId: 'laparada',
        }),
      });

    gastosMocks.registrarGastoDetallado.mockResolvedValueOnce({ id: 'gasto-mant-1' });
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'ord-1' });

    const orden = await registrarOrdenMantenimiento({
      negocioId: 'laparada',
      equipoId: 'eq-1',
      tipo: 'correctivo',
      descripcionTrabajo: 'Cambio de termostato y limpieza de quemador',
      fechaIso: '2026-11-24',
      tecnicoNombre: 'TecniCocinas Cúcuta',
      numeroFactura: 'FV-889',
      costoCOP: 160000,
      conciliarEnGastos: true,
      origenFondoGasto: 'caja_menor',
      metodoPagoGasto: 'efectivo',
      fallaRelacionadaId: 'falla-1',
      responsableNombre: 'Andrés',
    });

    expect(orden.id).toBe('ord-1');
    expect(orden.conciliadoConGasto).toBe(true);
    expect(orden.gastoId).toBe('gasto-mant-1');

    expect(gastosMocks.registrarGastoDetallado).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        categoria: 'mantenimiento',
        monto: 160000,
        origenFondo: 'caja_menor',
        metodoPago: 'efectivo',
      })
    );

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { id: 'eq-1' },
      expect.objectContaining({
        estadoOperativo: 'operativo',
        costoAcumuladoCOP: 210000,
        totalIntervenciones: 2,
        ultimoMantenimientoIso: '2026-11-24',
      })
    );

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { id: 'falla-1' },
      expect.objectContaining({
        estado: 'resuelta',
        ordenMantenimientoId: 'ord-1',
      })
    );

    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalled();
  });

  it('reporta falla desde KDS, marca equipo fuera de servicio y emite alerta crítica', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'eq-freidora',
      data: () => ({
        negocioId: 'laparada',
        codigoActivo: 'COC-001',
        nombre: 'Freidora Industrial #1',
        categoria: 'coccion',
      }),
    });
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'falla-kds-1' });

    const falla = await reportarFallaEquipo({
      negocioId: 'laparada',
      equipoId: 'eq-freidora',
      equipoNombre: 'Freidora Industrial #1',
      categoriaEquipo: 'coccion',
      estacionCocina: 'fritura',
      severidad: 'critica',
      detieneOperacion: true,
      descripcion: 'No enciende piloto y huele a gas al abrir válvula',
      origenReporte: 'cocina_kds',
      reportadoPor: 'Juan Cocinero',
      reportadoRol: 'cocinero',
      fechaIso: '2026-11-24',
    });

    expect(falla.id).toBe('falla-kds-1');
    expect(falla.estado).toBe('abierta');
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      { id: 'eq-freidora' },
      expect.objectContaining({
        estadoOperativo: 'fuera_servicio',
      })
    );
    expect(notifMocks.crearAlertaSilenciosa).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        modulo: 'cocina',
        urgencia: 'critica',
        enlace: '/mantenimiento',
      })
    );
  });

  it('bloquea acceso cross-tenant cuando el equipo pertenece a otro negocio', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'eq-otro',
      data: () => ({
        negocioId: 'otro-local',
        nombre: 'Equipo Ajeno',
      }),
    });

    await expect(
      reportarFallaEquipo({
        negocioId: 'laparada',
        equipoId: 'eq-otro',
        equipoNombre: 'Equipo Ajeno',
        categoriaEquipo: 'coccion',
        severidad: 'alta',
        detieneOperacion: false,
        descripcion: 'Falla simulada',
        origenReporte: 'cocina_kds',
        reportadoPor: 'Cocinero',
      })
    ).rejects.toThrow(/otro negocio/i);
  });
});
