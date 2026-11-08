import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { NotificacionesPage } from '../NotificacionesPage';
import type { NotificacionOperativa } from '@/types/notificacion';

const mockNotifs: NotificacionOperativa[] = [
  {
    id: 'n1',
    negocioId: 'laparada',
    modulo: 'cocina',
    tipo: 'comanda_muy_demorada',
    titulo: 'Comanda Demorada Mesa 2',
    mensaje: 'Más de 20 minutos esperando plato fuerte',
    urgencia: 'critica',
    leida: false,
    fecha: '2026-11-08T02:00:00.000Z',
    origen: 'automatico',
    enlace: '/cocina',
  },
  {
    id: 'n2',
    negocioId: 'laparada',
    modulo: 'inventario',
    tipo: 'stock_minimo',
    titulo: 'Stock Bajo: Tocineta Ahumada',
    mensaje: 'Quedan 3 paquetes en bodega',
    urgencia: 'alta',
    leida: false,
    fecha: '2026-11-08T02:15:00.000Z',
    origen: 'automatico',
    enlace: '/inventario',
  },
];

let mockHookState = {
  notificaciones: mockNotifs,
  notificacionesFiltradas: mockNotifs,
  metricas: {
    total: 2,
    noLeidas: 2,
    criticas: 1,
    altas: 1,
    medias: 0,
    bajas: 0,
    porModulo: {
      pedidos: 0,
      cocina: 1,
      inventario: 1,
      salon: 0,
      caja: 0,
      sistema: 0,
    },
  },
  noLeidasCount: 2,
  criticasCount: 1,
  cargando: false,
  error: null,
  filtros: {
    modulo: 'todos',
    urgencia: 'todas',
    estado: 'todas',
    busqueda: '',
  },
  setFiltros: vi.fn(),
  sonidoHabilitado: true,
  toggleSonido: vi.fn(),
  probarSonido: vi.fn(),
  marcarLeida: vi.fn(),
  marcarTodasLeidas: vi.fn(),
  eliminar: vi.fn(),
  crearAlerta: vi.fn(),
};

vi.mock('@/hooks/useNotificaciones', () => ({
  useNotificaciones: () => mockHookState,
}));

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada Gastrobar' },
  }),
}));

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('NotificacionesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza título, 4 KPIs y lista de notificaciones', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <NotificacionesPage />
      </MemoryRouter>
    );

    expect(html).toContain('Centro de Notificaciones Operativas');
    expect(html).toContain('Total Alertas');
    expect(html).toContain('Pendientes');
    expect(html).toContain('Críticas en Fuego');
    expect(html).toContain('Alta Urgencia');
    expect(html).toContain('Comanda Demorada Mesa 2');
    expect(html).toContain('Stock Bajo: Tocineta Ahumada');
    expect(html).toContain('Cocina &amp; KDS');
    expect(html).toContain('Bodega &amp; Stock');
  });

  it('renderiza estado vacío cuando no hay notificaciones que coincidan con los filtros', () => {
    mockHookState = {
      ...mockHookState,
      notificacionesFiltradas: [],
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <NotificacionesPage />
      </MemoryRouter>
    );

    expect(html).toContain('No hay alertas que coincidan');
    expect(html).toContain('Restablecer filtros');
  });
});
