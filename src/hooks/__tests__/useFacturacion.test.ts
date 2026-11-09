import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as facturacionService from '@/services/facturacionService';
import type { ConfiguracionFiscal } from '@/types';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useFacturacion & service integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda configuración fiscal llamando a guardarConfiguracionFiscal', async () => {
    const spy = vi
      .spyOn(facturacionService, 'guardarConfiguracionFiscal')
      .mockResolvedValue(undefined);

    await facturacionService.guardarConfiguracionFiscal('laparada', {
      razonSocial: 'COMERCIALIZADORA SAS',
      nit: '901.123.456',
    });

    expect(spy).toHaveBeenCalledWith('laparada', {
      razonSocial: 'COMERCIALIZADORA SAS',
      nit: '901.123.456',
    });
  });

  it('asigna consecutivo fiscal llamando a asignarSiguienteConsecutivoPos', async () => {
    const fakeResolucion = {
      numeroResolucion: '18764000',
      fechaExpedicion: '2026-01-01',
      fechaVencimiento: '2027-01-01',
      prefijo: 'POS',
      rangoInicial: 1,
      rangoFinal: 10000,
      consecutivoActual: 154,
    };

    const spy = vi
      .spyOn(facturacionService, 'asignarSiguienteConsecutivoPos')
      .mockResolvedValue({
        consecutivoFiscal: 'POS-00154',
        folioNumero: 154,
        resolucion: fakeResolucion,
      });

    const res = await facturacionService.asignarSiguienteConsecutivoPos('laparada');
    expect(res.consecutivoFiscal).toBe('POS-00154');
    expect(res.folioNumero).toBe(154);
    expect(spy).toHaveBeenCalledWith('laparada');
  });

  it('recupera configuración fiscal llamando a getConfiguracionFiscal', async () => {
    const mockConfig: ConfiguracionFiscal = {
      negocioId: 'laparada',
      habilitado: true,
      razonSocial: 'LA PARADA TEST',
      nombreComercial: 'LA PARADA',
      nit: '901.000.111',
      dv: '1',
      tipoDocumentoIdentidad: 'NIT',
      regimenFiscal: 'responsable_inc',
      responsabilidad: 'INC 8%',
      direccionFiscal: 'Av. 0 # 10-20',
      municipio: 'Cúcuta',
      departamento: 'Norte de Santander',
      telefonoContacto: '310 000 0000',
      tarifaDefault: { tipo: 'inc', porcentaje: 8, nombre: 'INC 8%' },
      preciosIncluyenImpuesto: true,
      resolucion: {
        numeroResolucion: '18764000',
        fechaExpedicion: '2026-01-01',
        fechaVencimiento: '2027-01-01',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 10000,
        consecutivoActual: 1,
      },
      alertas: { diasAnticipacionVencimiento: 30, consecutivosMinimosRestantes: 100 },
    };

    const spy = vi
      .spyOn(facturacionService, 'getConfiguracionFiscal')
      .mockResolvedValue(mockConfig);

    const config = await facturacionService.getConfiguracionFiscal('laparada');
    expect(config.razonSocial).toBe('LA PARADA TEST');
    expect(spy).toHaveBeenCalledWith('laparada');
  });
});
