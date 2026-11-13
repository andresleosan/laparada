import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { EsperaPage } from '../EsperaPage';
import type { TurnoEspera } from '@/types/espera';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
  }),
}));

vi.mock('@/hooks/useMesas', () => ({
  useMesas: () => ({
    mesas: [
      {
        id: 'm1',
        numero: 1,
        nombre: 'Mesa 1',
        capacidad: 4,
        zona: 'Salón Principal',
        estado: 'libre',
        negocioId: 'laparada',
      },
    ],
    zonasDisponibles: ['Salón Principal', 'Terraza'],
    totalLibres: 1,
    loading: false,
  }),
}));

vi.mock('@/hooks/useMeseros', () => ({
  useMeseros: () => ({
    meserosOpciones: [{ id: 'mes-1', nombre: 'Carlos' }],
  }),
}));

const mockTurnos: TurnoEspera[] = [
  {
    id: 'esp-1',
    negocioId: 'laparada',
    codigoTurno: 'E-01',
    clienteNombre: 'Camila Rojas',
    clienteTelefono: '573001112233',
    personas: 4,
    zonaPreferida: 'Salón Principal',
    estado: 'esperando',
    tiempoEstimadoMin: 0,
    creadoEn: { seconds: 1794596000, nanoseconds: 0 },
  },
];

vi.mock('@/hooks/useListaEspera', () => ({
  useListaEspera: () => ({
    turnosHoy: mockTurnos,
    turnosActivos: mockTurnos,
    turnosSentados: [],
    turnosCerrados: [],
    loading: false,
    error: null,
    tiempoEstimadoBase: 0,
    estimarParaGrupo: () => 0,
    registrarWalkIn: vi.fn(),
    notificarWhatsApp: vi.fn(),
    marcarNotificado: vi.fn(),
    sentarEnMesa: vi.fn(),
    cancelarTurno: vi.fn(),
    marcarNoShow: vi.fn(),
  }),
}));

describe('EsperaPage', () => {
  it('renderiza la lista de espera con sugerencia inteligente de mesa libre y botón de WhatsApp', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <EsperaPage />
      </MemoryRouter>
    );

    expect(html).toContain('Lista de Espera &amp; Walk-ins');
    expect(html).toContain('E-01');
    expect(html).toContain('Camila Rojas');
    expect(html).toContain('Tu Mesa Está Lista');
    expect(html).toContain('Mesa 1 (4 sillas) está libre');
  });
});
