import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
}));

const auditoriaMocks = vi.hoisted(() => ({
  registrarEventoAuditoriaSilencioso: vi.fn(),
}));

const notificacionesMocks = vi.hoisted(() => ({
  crearAlertaSilenciosa: vi.fn(),
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
    fromDate: vi.fn((d) => ({ toDate: () => d })),
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  },
}));

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/auditoriaService', () => auditoriaMocks);
vi.mock('@/services/notificacionesService', () => notificacionesMocks);

import {
  getMovimientosCajaHoy,
  registrarCorteX,
  registrarMovimientoCaja,
} from '../movimientosCajaService';

describe('movimientosCajaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra sangría a caja fuerte con código consecutivo, auditoría forense y alerta', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'mov-sng-1' });

    const mov = await registrarMovimientoCaja(
      {
        negocioId: 'laparada',
        tipo: 'sangria_caja_fuerte',
        monto: 250000,
        motivo: 'Retiro a caja fuerte por exceso de efectivo',
        responsableNombre: 'Andrés Cajero',
        autorizadoPor: 'Admin Turno',
        referencia: 'Sobre #12',
      },
      []
    );

    expect(mov.id).toBe('mov-sng-1');
    expect(mov.codigoComprobante).toBe('SNG-0001');
    expect(firestoreMocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = firestoreMocks.addDoc.mock.calls[0][1];
    expect(payload.negocioId).toBe('laparada');
    expect(payload.monto).toBe(250000);
    expect(payload).not.toHaveProperty('id');

    expect(auditoriaMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledTimes(1);
    expect(notificacionesMocks.crearAlertaSilenciosa).toHaveBeenCalledTimes(1);
  });

  it('rechaza montos <= 0 o motivos vacíos o negocioId inválido', async () => {
    await expect(
      registrarMovimientoCaja({
        negocioId: '',
        tipo: 'ingreso_sencillo',
        monto: 10000,
        motivo: 'Sencillo',
        responsableNombre: 'Cajero',
      })
    ).rejects.toThrow();

    await expect(
      registrarMovimientoCaja({
        negocioId: 'laparada',
        tipo: 'ingreso_sencillo',
        monto: 0,
        motivo: 'Sencillo',
        responsableNombre: 'Cajero',
      })
    ).rejects.toThrow('mayor a $0');

    await expect(
      registrarMovimientoCaja({
        negocioId: 'laparada',
        tipo: 'egreso_caja_menor',
        monto: 15000,
        motivo: ' ',
        responsableNombre: 'Cajero',
      })
    ).rejects.toThrow('motivo claro');
  });

  it('registra Corte X de relevo y emite alerta cuando hay descuadre', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'corte-x-1' });

    const corte = await registrarCorteX({
      negocioId: 'laparada',
      cajeroSaliente: 'Luisa',
      cajeroEntrante: 'Mateo',
      efectivoInicial: 100000,
      ventasEfectivo: 200000,
      ventasTransferencia: 50000,
      ingresosSencillo: 20000,
      sangriasCajaFuerte: 100000,
      egresosCajaMenor: 10000,
      gastosOperativos: 0,
      efectivoEsperado: 210000,
      arqueo: {
        denominaciones: { b50k: 4 },
        totalBilletes: 200000,
        totalMonedas: 0,
        totalFisico: 200000,
        efectivoEsperado: 210000,
        diferencia: -10000,
        estadoCuadre: 'faltante',
      },
    });

    expect(corte.id).toBe('corte-x-1');
    expect(corte.codigoCorte).toBe('CX-0001');
    expect(auditoriaMocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledWith(
      expect.objectContaining({
        categoria: 'descuadre_caja',
        montoImpacto: 10000,
      })
    );
    expect(notificacionesMocks.crearAlertaSilenciosa).toHaveBeenCalledTimes(1);
  });

  it('consulta movimientos de caja de hoy con aislamiento multi-tenant', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'm1',
          data: () => ({
            negocioId: 'laparada',
            tipo: 'ingreso_sencillo',
            monto: 50000,
            motivo: 'Cambio',
            codigoComprobante: 'SEN-0001',
          }),
        },
      ],
    });

    const lista = await getMovimientosCajaHoy('laparada');
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe('m1');
  });
});
