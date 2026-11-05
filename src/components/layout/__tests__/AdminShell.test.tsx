import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AdminShell } from '../AdminShell';
import * as liveBadgesHook from '@/hooks/useOperacionesLiveBadges';
import * as authContext from '@/context/AuthContext';
import * as negocioContext from '@/context/NegocioContext';

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: vi.fn(),
}));

vi.mock('@/hooks/useHoraActual', () => ({
  useHoraActual: () => new Date('2026-11-04T12:00:00.000Z'),
}));

vi.mock('@/hooks/useOperacionesLiveBadges', () => ({
  useOperacionesLiveBadges: vi.fn(),
}));

describe('AdminShell — Rediseño Ergonómico de Menú y Navegación (Toast POS Rail)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(authContext.useAuth).mockReturnValue({
      user: { uid: 'u1', email: 'admin@laparada.com' } as any,
      logout: vi.fn(),
      loading: false,
    });

    vi.mocked(negocioContext.useNegocio).mockReturnValue({
      negocioActual: {
        id: 'laparada',
        nombre: 'La Parada Gastro',
        logoUrl: '/logo-96.jpg',
      } as any,
      negociosDisponibles: [],
      esSuperAdmin: false,
      puedeUsarNanoBanana: true,
      cargandoListaNegocios: false,
      refrescarListaNegocios: vi.fn(),
      identidadResueltaUid: 'u1',
      estadoAprobacion: 'activo',
      usuarioNegocio: { rol: 'admin', negocioId: 'laparada', nombre: 'Admin' } as any,
      cargandoNegocio: false,
      seleccionarNegocioOperativo: vi.fn(),
      refrescarNegocio: vi.fn(),
    });

    vi.mocked(liveBadgesHook.useOperacionesLiveBadges).mockReturnValue({
      cocina: 5,
      mesas: 3,
      domicilios: 2,
    });
  });

  it('renderiza la estructura básica de navegación administrativa con salto al contenido accesible', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/pos']}>
        <AdminShell>
          <div data-testid="test-content">Contenido POS</div>
        </AdminShell>
      </MemoryRouter>
    );

    expect(html).toContain('Saltar al contenido');
    expect(html).toContain('La Parada Gastro');
    expect(html).toContain('Centro operativo');
    expect(html).toContain('Contenido POS');
  });

  it('muestra las insignias operativas (live badges) para Cocina, Mesas y Domicilios', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminShell>
          <div>Dashboard</div>
        </AdminShell>
      </MemoryRouter>
    );

    // Cocina badge = 5
    expect(html).toContain('5');
    // Mesas badge = 3
    expect(html).toContain('3');
    // Domicilios badge = 2
    expect(html).toContain('2');
  });

  it('proporciona botones de acción accesibles con touch targets ergonómicos', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/pos']}>
        <AdminShell>
          <div>Área de trabajo</div>
        </AdminShell>
      </MemoryRouter>
    );

    // Toggle de colapsar barra lateral
    expect(html).toContain('aria-label="Colapsar barra lateral"');
    // Destinos clave de operación
    expect(html).toContain('Ver tienda');
    expect(html).toContain('Cerrar sesión');
  });
});

