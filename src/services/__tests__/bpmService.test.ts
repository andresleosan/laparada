import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn((_db: unknown, _col: string, id: string) => ({ id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
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
  runTransaction: firestoreMocks.runTransaction,
  setDoc: firestoreMocks.setDoc,
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1795500000, nanoseconds: 0 })),
  },
  updateDoc: firestoreMocks.updateDoc,
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: auditMocks.registrarEventoAuditoriaSilencioso,
}));

vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: notifMocks.crearAlertaSilenciosa,
}));

import {
  COLECCION_CHECKLISTS_BPM,
  COLECCION_TEMPERATURAS_BPM,
  eliminarRegistroBpm,
  getConfiguracionBpm,
  guardarChecklistTurnoBpm,
  guardarConfiguracionBpm,
  registrarEventoAceiteBpm,
  registrarTemperaturaBpm,
  resolverDesviacionTemperaturaBpm,
} from '../bpmService';
import {
  crearItemsDesdePlantilla,
  PLANTILLA_CHECKLIST_APERTURA_DEFAULT,
} from '@/utils/bpmUtils';

describe('bpmService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve configuración BPM por defecto cuando aún no existe en Firestore', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => false });

    const config = await getConfiguracionBpm('laparada');
    expect(config.negocioId).toBe('laparada');
    expect(config.equiposFrio.length).toBeGreaterThanOrEqual(4);
    expect(config.freidoras.length).toBeGreaterThanOrEqual(2);
    expect(config.plantillaApertura).toHaveLength(10);
    expect(config.plantillaCierre).toHaveLength(10);
  });

  it('registrarTemperaturaBpm exige acción correctiva en crítico y emite alerta + auditoría sin campo id', async () => {
    await expect(
      registrarTemperaturaBpm('laparada', {
        equipoId: 'eq-nevera-carnes',
        equipoNombre: 'Nevera Principal Carnes & Quesos',
        tipoEquipo: 'refrigeracion',
        franja: 'apertura',
        temperaturaC: 9.8,
        responsableNombre: 'Andrés',
      })
    ).rejects.toThrow(/acción correctiva/i);

    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'temp-crit-1' });
    const res = await registrarTemperaturaBpm('laparada', {
      equipoId: 'eq-nevera-carnes',
      equipoNombre: 'Nevera Principal Carnes & Quesos',
      tipoEquipo: 'refrigeracion',
      franja: 'mediodia',
      fechaIso: '2026-11-24',
      temperaturaC: 9.8,
      accionCorrectiva: 'Trasladar carnes a nevera de respaldo y revisar empaque',
      responsableNombre: 'Andrés',
      responsableRol: 'admin',
    });

    expect(res).toEqual({ id: 'temp-crit-1', estadoConformidad: 'critico' });
    const payload = firestoreMocks.addDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('id');
    expect(payload.negocioId).toBe('laparada');
    expect(payload.resuelto).toBe(false);
    expect(notifMocks.crearAlertaSilenciosa).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        modulo: 'cocina',
        urgencia: 'critica',
        enlace: '/bpm',
      })
    );
    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledWith(
      expect.objectContaining({
        negocioId: 'laparada',
        categoria: 'ajuste_inventario',
        severidad: 'critica',
        referenciaId: 'temp-crit-1',
      })
    );
  });

  it('resolverDesviacionTemperaturaBpm valida pertenencia al tenant y actualiza acción correctiva', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'otro-tenant' }),
    });

    await expect(
      resolverDesviacionTemperaturaBpm('laparada', 'temp-1', {
        accionCorrectiva: 'Ajuste termostato',
        resueltoPor: 'Andrés',
      })
    ).rejects.toThrow(/otro negocio/i);

    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'laparada' }),
    });
    await resolverDesviacionTemperaturaBpm('laparada', 'temp-1', {
      accionCorrectiva: 'Se cerró puerta y estabilizó en 2.5 °C',
      resueltoPor: 'Andrés',
    });

    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resuelto: true,
        resueltoPor: 'Andrés',
      })
    );
  });

  it('registrarEventoAceiteBpm alerta y audita cuando inspección marca cambio inmediato', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'oil-1' });

    const res = await registrarEventoAceiteBpm('laparada', {
      freidoraId: 'fre-1',
      freidoraNombre: 'Freidora #1',
      tipoEvento: 'inspeccion_calidad',
      colorAceite: 'quemado_rechazar',
      humoBajoPunto: true,
      fechaIso: '2026-11-24',
      responsableNombre: 'Camilo Cocinero',
    });

    expect(res).toEqual({ id: 'oil-1', estadoAceite: 'cambiar_inmediato' });
    expect(notifMocks.crearAlertaSilenciosa).toHaveBeenCalledWith(
      'laparada',
      expect.objectContaining({
        tipo: 'bpm_cambio_aceite_urgente',
        urgencia: 'critica',
      })
    );
    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalled();
  });

  it('guardarChecklistTurnoBpm impide finalizar con pendientes y persiste con ID determinístico por turno/fecha', async () => {
    const itemsPendientes = crearItemsDesdePlantilla(PLANTILLA_CHECKLIST_APERTURA_DEFAULT);
    await expect(
      guardarChecklistTurnoBpm('laparada', {
        tipo: 'apertura',
        fechaIso: '2026-11-24',
        items: itemsPendientes,
        responsableNombre: 'Andrés',
        finalizar: true,
      })
    ).rejects.toThrow(/Faltan 10 punto/i);

    const itemsConHallazgo = itemsPendientes.map((item, idx) => ({
      ...item,
      estado: idx === 0 ? ('no_cumple' as const) : ('cumple' as const),
      ...(idx === 0 ? { observacion: 'Falta jabón en barra' } : {}),
    }));

    const mockTx = {
      get: vi.fn().mockResolvedValueOnce({ exists: () => false }),
      set: vi.fn(),
      update: vi.fn(),
    };
    firestoreMocks.runTransaction.mockImplementation(async (_db, cb) => cb(mockTx));

    const out = await guardarChecklistTurnoBpm('laparada', {
      tipo: 'apertura',
      fechaIso: '2026-11-24',
      items: itemsConHallazgo,
      responsableNombre: 'Andrés',
      finalizar: true,
    });

    expect(out).toEqual({
      id: 'laparada_2026-11-24_apertura',
      estado: 'con_hallazgos',
      porcentajeCumplimiento: 90,
    });
    expect(mockTx.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        tipo: 'apertura',
        fechaIso: '2026-11-24',
        hallazgosCriticosCount: 1,
      })
    );
    expect(notifMocks.crearAlertaSilenciosa).toHaveBeenCalled();
    expect(auditMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalled();
  });

  it('guardarConfiguracionBpm valida rangos y eliminarRegistroBpm verifica pertenencia multi-tenant', async () => {
    await expect(
      guardarConfiguracionBpm('laparada', {
        equiposFrio: [
          {
            id: 'eq-1',
            nombre: 'Nevera Mal Rango',
            tipo: 'refrigeracion',
            ubicacion: 'Cocina',
            tempMinOptimaC: 10,
            tempMaxOptimaC: 2,
            activo: true,
          },
        ],
      })
    ).rejects.toThrow(/mínimo mayor al máximo/i);

    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ negocioId: 'laparada' }),
    });
    await eliminarRegistroBpm('laparada', COLECCION_TEMPERATURAS_BPM, 'reg-1');
    expect(firestoreMocks.deleteDoc).toHaveBeenCalled();

    expect(COLECCION_CHECKLISTS_BPM).toBe('checklists_bpm');
  });
});
