import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as satisfaccionService from '@/services/satisfaccionService';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useSatisfaccion & service integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('guarda configuración de satisfacción llamando a guardarConfiguracionSatisfaccion', async () => {
    const spy = vi
      .spyOn(satisfaccionService, 'guardarConfiguracionSatisfaccion')
      .mockResolvedValue(undefined);

    await satisfaccionService.guardarConfiguracionSatisfaccion('laparada', {
      googleBusinessUrl: 'https://g.page/r/laparada/review',
      telefonoAtencionQuejas: '3001234567',
      habilitarRedireccionGoogle: true,
    });

    expect(spy).toHaveBeenCalledWith('laparada', {
      googleBusinessUrl: 'https://g.page/r/laparada/review',
      telefonoAtencionQuejas: '3001234567',
      habilitarRedireccionGoogle: true,
    });
  });

  it('actualiza el estado de una encuesta con notas internas', async () => {
    const spy = vi
      .spyOn(satisfaccionService, 'actualizarEstadoEncuesta')
      .mockResolvedValue(undefined);

    await satisfaccionService.actualizarEstadoEncuesta('laparada', 'enc-1', {
      estado: 'resuelta',
      notasInternas: 'Solucionado con el cliente',
      contactadoPorWhatsApp: true,
    });

    expect(spy).toHaveBeenCalledWith('laparada', 'enc-1', {
      estado: 'resuelta',
      notasInternas: 'Solucionado con el cliente',
      contactadoPorWhatsApp: true,
    });
  });

  it('elimina encuesta correctamente', async () => {
    const spy = vi
      .spyOn(satisfaccionService, 'eliminarEncuesta')
      .mockResolvedValue(undefined);

    await satisfaccionService.eliminarEncuesta('laparada', 'enc-1');
    expect(spy).toHaveBeenCalledWith('laparada', 'enc-1');
  });
});
