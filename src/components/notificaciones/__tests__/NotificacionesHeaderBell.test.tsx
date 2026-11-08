import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NotificacionesHeaderBell } from '../NotificacionesHeaderBell';

let mockHookReturn = {
  notificaciones: [],
  notificacionesFiltradas: [],
  metricas: {
    total: 3,
    noLeidas: 3,
    criticas: 1,
    altas: 2,
    medias: 0,
    bajas: 0,
    porModulo: {
      pedidos: 1,
      cocina: 1,
      inventario: 1,
      salon: 0,
      caja: 0,
      sistema: 0,
    },
  },
  noLeidasCount: 3,
  criticasCount: 1,
  sonidoHabilitado: true,
  toggleSonido: vi.fn(),
  probarSonido: vi.fn(),
  marcarLeida: vi.fn(),
  marcarTodasLeidas: vi.fn(),
  eliminar: vi.fn(),
  crearAlerta: vi.fn(),
  cargando: false,
  error: null,
  filtros: {},
  setFiltros: vi.fn(),
};

vi.mock('@/hooks/useNotificaciones', () => ({
  useNotificaciones: () => mockHookReturn,
}));

describe('NotificacionesHeaderBell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza la campana con badge de alertas pendientes', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <NotificacionesHeaderBell />
      </MemoryRouter>
    );

    expect(html).toContain('Campana de notificaciones');
    expect(html).toContain('3'); // badge no leídas
  });

  it('renderiza la campana sin badge cuando no hay alertas pendientes', () => {
    mockHookReturn = {
      ...mockHookReturn,
      noLeidasCount: 0,
      criticasCount: 0,
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <NotificacionesHeaderBell />
      </MemoryRouter>
    );

    expect(html).toContain('sin alertas pendientes');
    expect(html).not.toContain('bg-amber-600');
  });
});
