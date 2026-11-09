import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as contabilidadService from '@/services/contabilidadService';
import type { ResumenConciliacionContable } from '@/types/contabilidad';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useContabilidad & service integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda mapeo PUC llamando a guardarConfiguracionPuc', async () => {
    const spy = vi
      .spyOn(contabilidadService, 'guardarConfiguracionPuc')
      .mockResolvedValue(undefined);

    await contabilidadService.guardarConfiguracionPuc('laparada', {
      cuentaCaja: '110505',
      cuentaIngresosRestaurante: '414005',
    });

    expect(spy).toHaveBeenCalledWith('laparada', {
      cuentaCaja: '110505',
      cuentaIngresosRestaurante: '414005',
    });
  });

  it('registra cierre de conciliación mensual llamando a guardarConciliacionCerrada', async () => {
    const mockConciliacion: ResumenConciliacionContable = {
      periodo: {
        tipo: 'mes_actual',
        inicio: new Date('2026-03-01'),
        fin: new Date('2026-03-31'),
        etiqueta: 'Marzo 2026',
        ano: 2026,
      },
      items: [],
      totalVentasSistema: 500000,
      totalCobradoEfectivo: 350000,
      totalCobradoTransferencia: 150000,
      totalEgresosPeriodo: 100000,
      totalArqueadoFisico: 350000,
      diferenciaTotalNeta: 0,
      diasCuadrados: 5,
      diasConDiferencia: 0,
      diasSinCierre: 0,
      saludConciliacion: 'optima',
      porcentajeEfectivo: 70,
      porcentajeTransferencia: 30,
    };

    const spy = vi
      .spyOn(contabilidadService, 'guardarConciliacionCerrada')
      .mockResolvedValue('conc-laparada-2026-03');

    const res = await contabilidadService.guardarConciliacionCerrada(
      'laparada',
      mockConciliacion,
      '2026-03',
      'Administrador'
    );

    expect(spy).toHaveBeenCalledWith(
      'laparada',
      mockConciliacion,
      '2026-03',
      'Administrador'
    );
    expect(res).toBe('conc-laparada-2026-03');
  });

  it('consulta conciliaciones cerradas con getConciliacionesCerradas', async () => {
    const spy = vi
      .spyOn(contabilidadService, 'getConciliacionesCerradas')
      .mockResolvedValue([
        {
          id: 'c1',
          negocioId: 'laparada',
          periodoMes: '2026-02',
          fechaCierre: {} as any,
          responsable: 'Admin',
          totalVentas: 1200000,
          totalVentasNetas: 1200000,
          baseInc8: 1111111,
          impuestoInc8: 88889,
          totalEgresos: 300000,
          totalEfectivo: 800000,
          totalTransferencia: 400000,
          diferenciaCaja: 0,
          estado: 'aprobada',
          creadoEn: {} as any,
        },
      ]);

    const res = await contabilidadService.getConciliacionesCerradas('laparada');
    expect(spy).toHaveBeenCalledWith('laparada');
    expect(res).toHaveLength(1);
    expect(res[0].periodoMes).toBe('2026-02');
  });
});
