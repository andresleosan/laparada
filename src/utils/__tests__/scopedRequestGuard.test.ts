import { describe, expect, it } from 'vitest';
import { createScopedRequestGuard } from '../scopedRequestGuard';

describe('createScopedRequestGuard', () => {
  it('solo considera vigente la solicitud más reciente del mismo alcance', () => {
    const guard = createScopedRequestGuard();
    const anterior = guard.begin('negocio-a:noche');
    const reciente = guard.begin('negocio-a:noche');

    expect(guard.isCurrent(anterior, 'negocio-a:noche')).toBe(false);
    expect(guard.isCurrent(reciente, 'negocio-a:noche')).toBe(true);
  });

  it('rechaza una respuesta cuando cambió el alcance activo', () => {
    const guard = createScopedRequestGuard();
    const solicitud = guard.begin('negocio-a:manana');

    expect(guard.isCurrent(solicitud, 'negocio-b:manana')).toBe(false);
  });

  it('permite invalidar solicitudes pendientes al desmontar o cambiar de carga', () => {
    const guard = createScopedRequestGuard();
    const solicitud = guard.begin('negocio-a:ambas');

    guard.invalidate();

    expect(guard.isCurrent(solicitud, 'negocio-a:ambas')).toBe(false);
  });
});
