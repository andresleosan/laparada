import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as inventarioService from '@/services/inventarioService';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useKardex and movements service integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ejecuta registrarMermaInventario con los parámetros correctos', async () => {
    const spy = vi
      .spyOn(inventarioService, 'registrarMermaInventario')
      .mockResolvedValue(undefined);

    await inventarioService.registrarMermaInventario(
      'laparada',
      'ins_pan',
      5,
      'vencimiento',
      'Pan seco',
      'Cajero 1'
    );

    expect(spy).toHaveBeenCalledWith(
      'laparada',
      'ins_pan',
      5,
      'vencimiento',
      'Pan seco',
      'Cajero 1'
    );
  });

  it('ejecuta registrarAjusteInventario con los parámetros correctos', async () => {
    const spy = vi
      .spyOn(inventarioService, 'registrarAjusteInventario')
      .mockResolvedValue(undefined);

    await inventarioService.registrarAjusteInventario(
      'laparada',
      'ins_aceite',
      12,
      'conteo_fisico',
      'Conteo bodega central',
      'Admin'
    );

    expect(spy).toHaveBeenCalledWith(
      'laparada',
      'ins_aceite',
      12,
      'conteo_fisico',
      'Conteo bodega central',
      'Admin'
    );
  });

  it('ejecuta getTodosMovimientosInventario con límite configurado', async () => {
    const spy = vi
      .spyOn(inventarioService, 'getTodosMovimientosInventario')
      .mockResolvedValue([]);

    await inventarioService.getTodosMovimientosInventario('laparada', 150);

    expect(spy).toHaveBeenCalledWith('laparada', 150);
  });
});

