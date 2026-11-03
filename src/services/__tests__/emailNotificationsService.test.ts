import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  obtenerResumenDiarioActual,
  enviarResumenDiarioPorCorreo,
  notificarSuscripcion,
  getNotificacionesCorreoDeNegocio,
} from '../emailNotificationsService';
import * as functionsModule from 'firebase/functions';
import * as firestoreModule from 'firebase/firestore';

vi.mock('../firebase', () => ({
  db: {},
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: () => ({ seconds: 1700000000, nanoseconds: 0 }),
  },
}));

describe('emailNotificationsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtenerResumenDiarioActual llama a la función Cloud con el tenantId requerido', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        negocioId: 'laparada',
        nombreNegocio: 'La Parada',
        datos: {
          totalVentasCOP: 250000,
          cantidadVentas: 15,
        },
      },
    });

    vi.mocked(functionsModule.httpsCallable).mockReturnValue(
      mockCallable as unknown as ReturnType<typeof functionsModule.httpsCallable>
    );

    const resultado = await obtenerResumenDiarioActual('laparada');
    expect(mockCallable).toHaveBeenCalledWith({ negocioId: 'laparada', fecha: undefined });
    expect(resultado.negocioId).toBe('laparada');
    expect(resultado.datos.totalVentasCOP).toBe(250000);
  });

  it('enviarResumenDiarioPorCorreo llama a enviarResumenDiarioManual', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        exito: true,
        estado: 'enviado',
        destinatario: 'alsdevstudio@alsdevstudio.com',
        fechaTexto: 'Martes, 3 de noviembre',
        totalVentasCOP: 250000,
        cantidadVentas: 15,
      },
    });

    vi.mocked(functionsModule.httpsCallable).mockReturnValue(
      mockCallable as unknown as ReturnType<typeof functionsModule.httpsCallable>
    );

    const resultado = await enviarResumenDiarioPorCorreo('laparada');
    expect(mockCallable).toHaveBeenCalledWith({ negocioId: 'laparada', fecha: undefined });
    expect(resultado.exito).toBe(true);
    expect(resultado.destinatario).toBe('alsdevstudio@alsdevstudio.com');
  });

  it('notificarSuscripcion ejecuta callable con tipoAccion y planId', async () => {
    const mockCallable = vi.fn().mockResolvedValue({
      data: {
        exito: true,
        estado: 'enviado',
      },
    });

    vi.mocked(functionsModule.httpsCallable).mockReturnValue(
      mockCallable as unknown as ReturnType<typeof functionsModule.httpsCallable>
    );

    const resultado = await notificarSuscripcion('laparada', 'activacion', 'mensual_30d');
    expect(mockCallable).toHaveBeenCalledWith({
      negocioId: 'laparada',
      tipoAccion: 'activacion',
      planId: 'mensual_30d',
    });
    expect(resultado.exito).toBe(true);
  });

  it('getNotificacionesCorreoDeNegocio consulta Firestore y retorna historial mapeado', async () => {
    const mockDocs = [
      {
        id: 'notif-1',
        data: () => ({
          negocioId: 'laparada',
          tipo: 'resumen_diario',
          destinatario: 'test@negocio.com',
          asunto: 'Resumen Diario',
          estado: 'enviado',
          enviadoEn: { seconds: 1700000000, nanoseconds: 0 },
        }),
      },
    ];

    vi.mocked(firestoreModule.getDocs).mockResolvedValue({
      docs: mockDocs,
    } as unknown as firestoreModule.QuerySnapshot);

    const historial = await getNotificacionesCorreoDeNegocio('laparada', 5);
    expect(historial).toHaveLength(1);
    expect(historial[0].id).toBe('notif-1');
    expect(historial[0].tipo).toBe('resumen_diario');
    expect(historial[0].estado).toBe('enviado');
  });
});

