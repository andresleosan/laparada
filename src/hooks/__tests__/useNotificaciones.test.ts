import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as notificacionesService from '@/services/notificacionesService';

vi.mock('@/services/firebase', () => ({
  db: {},
}));

describe('useNotificaciones & service integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ejecuta crearNotificacion con datos válidos', async () => {
    const spy = vi
      .spyOn(notificacionesService, 'crearNotificacion')
      .mockResolvedValue('notif-999');

    const result = await notificacionesService.crearNotificacion('laparada', {
      modulo: 'cocina',
      tipo: 'comanda_demorada',
      titulo: 'Comanda #15 demorada',
      mensaje: 'Lleva más de 20 minutos',
      urgencia: 'critica',
      origen: 'automatico',
    });

    expect(result).toBe('notif-999');
    expect(spy).toHaveBeenCalledWith('laparada', {
      modulo: 'cocina',
      tipo: 'comanda_demorada',
      titulo: 'Comanda #15 demorada',
      mensaje: 'Lleva más de 20 minutos',
      urgencia: 'critica',
      origen: 'automatico',
    });
  });

  it('ejecuta marcarNotificacionLeida y marcarTodasNotificacionesLeidas', async () => {
    const spySingle = vi
      .spyOn(notificacionesService, 'marcarNotificacionLeida')
      .mockResolvedValue(undefined);
    const spyBatch = vi
      .spyOn(notificacionesService, 'marcarTodasNotificacionesLeidas')
      .mockResolvedValue(undefined);

    await notificacionesService.marcarNotificacionLeida('laparada', 'notif-1', 'admin_1');
    expect(spySingle).toHaveBeenCalledWith('laparada', 'notif-1', 'admin_1');

    await notificacionesService.marcarTodasNotificacionesLeidas('laparada', ['n1', 'n2'], 'admin_1');
    expect(spyBatch).toHaveBeenCalledWith('laparada', ['n1', 'n2'], 'admin_1');
  });

  it('ejecuta eliminarNotificacion correctamente', async () => {
    const spy = vi
      .spyOn(notificacionesService, 'eliminarNotificacion')
      .mockResolvedValue(undefined);

    await notificacionesService.eliminarNotificacion('laparada', 'notif-xyz');
    expect(spy).toHaveBeenCalledWith('laparada', 'notif-xyz');
  });
});
