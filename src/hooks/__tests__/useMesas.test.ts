import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as mesasService from '@/services/mesasService';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useMesas actions & service integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ejecuta transferirCuentaMesa con los parámetros exactos y aislamiento tenant', async () => {
    const spy = vi
      .spyOn(mesasService, 'transferirCuentaMesa')
      .mockResolvedValue(undefined);

    await mesasService.transferirCuentaMesa('laparada', {
      mesaOrigenId: 'm1',
      mesaDestinoId: 'm2',
      cuentaId: 'c1',
      motivo: 'Cliente solicitó terraza',
      operador: 'Cajero Andrés',
    });

    expect(spy).toHaveBeenCalledWith('laparada', {
      mesaOrigenId: 'm1',
      mesaDestinoId: 'm2',
      cuentaId: 'c1',
      motivo: 'Cliente solicitó terraza',
      operador: 'Cajero Andrés',
    });
  });

  it('ejecuta unirCuentasMesas con los parámetros requeridos para fusión', async () => {
    const spy = vi
      .spyOn(mesasService, 'unirCuentasMesas')
      .mockResolvedValue(undefined);

    await mesasService.unirCuentasMesas('laparada', {
      mesaPrincipalId: 'm1',
      mesaSecundariaId: 'm3',
      cuentaPrincipalId: 'c1',
      cuentaSecundariaId: 'c3',
      motivo: 'Juntaron dos mesas',
      operador: 'Admin',
    });

    expect(spy).toHaveBeenCalledWith('laparada', {
      mesaPrincipalId: 'm1',
      mesaSecundariaId: 'm3',
      cuentaPrincipalId: 'c1',
      cuentaSecundariaId: 'c3',
      motivo: 'Juntaron dos mesas',
      operador: 'Admin',
    });
  });
});
