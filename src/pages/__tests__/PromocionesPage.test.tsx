import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { PromocionesPage } from '../PromocionesPage';
import type { Promocion } from '@/types/promocion';

const mockPromos: Promocion[] = [
  {
    id: 'promo-1',
    negocioId: 'laparada',
    nombre: 'Happy Hour Cervezas 2x1',
    tipo: 'dos_por_uno',
    canales: ['todos'],
    activo: true,
    diasSemana: [4, 5, 6],
    horaInicio: '17:00',
    horaFin: '21:00',
    tipoDescuento: 'dos_por_uno',
    valorDescuento: 100,
    creadoEn: '2026-11-01',
  },
  {
    id: 'promo-2',
    negocioId: 'laparada',
    nombre: 'Cupón Bienvenida $10.000',
    tipo: 'cupon_descuento',
    codigoCupon: 'BIENVENIDO10',
    canales: ['todos'],
    activo: true,
    diasSemana: [],
    tipoDescuento: 'monto_fijo',
    valorDescuento: 10000,
    montoMinimoSubtotal: 30000,
    creadoEn: '2026-11-01',
  },
];

let mockUsePromocionesReturn = {
  promociones: mockPromos,
  promocionesFiltradas: mockPromos,
  promocionesVigentes: [mockPromos[0]],
  happyHoursEnVivo: [mockPromos[0]],
  kpis: {
    totalPromociones: 2,
    activas: 2,
    happyHoursEnVivo: 1,
    cuponesActivos: 1,
    totalCanjesCupones: 15,
  },
  cargando: false,
  error: null as string | null,
  reloj: new Date(2026, 10, 5, 18, 0, 0),
  tab: 'todas' as const,
  setTab: vi.fn(),
  canalFiltro: 'todos' as const,
  setCanalFiltro: vi.fn(),
  busqueda: '',
  setBusqueda: vi.fn(),
  negocioNombre: 'La Parada Gastrobar',
  negocioSlug: 'laparada',
  crearPromocionAction: vi.fn(),
  actualizarPromocionAction: vi.fn(),
  toggleActivarAction: vi.fn(),
  eliminarPromocionAction: vi.fn(),
  registrarUsoCuponAction: vi.fn(),
  evaluarCarrito: vi.fn(),
  validarCupon: vi.fn(),
  descargarCsv: vi.fn(),
};

vi.mock('@/hooks/usePromociones', () => ({
  usePromociones: () => mockUsePromocionesReturn,
}));

vi.mock('@/hooks/useCategorias', () => ({
  useCategorias: () => ({
    categorias: [{ id: 'cat-1', nombre: 'Hamburguesas', activo: true, negocioId: 'laparada' }],
    loading: false,
  }),
}));

vi.mock('@/hooks/useProductos', () => ({
  useProductos: () => ({
    productos: [],
    combos: [],
    loading: false,
  }),
}));

describe('PromocionesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza título, KPIs y pestañas de navegación', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PromocionesPage />
      </MemoryRouter>
    );

    expect(html).toContain('Promociones &amp; Happy Hour');
    expect(html).toContain('Automatizadas');
    expect(html).toContain('Total Promociones');
    expect(html).toContain('Happy Hour en Vivo');
    expect(html).toContain('Cupones Canjeados');
    expect(html).toContain('Nueva Promoción');
    expect(html).toContain('Exportar Excel');
  });

  it('renderiza las tarjetas de promociones filtradas', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PromocionesPage />
      </MemoryRouter>
    );

    expect(html).toContain('Happy Hour Cervezas 2x1');
    expect(html).toContain('Cupón Bienvenida $10.000');
    expect(html).toContain('BIENVENIDO10');
  });

  it('renderiza estado vacío amigable cuando no hay promociones', () => {
    mockUsePromocionesReturn = {
      ...mockUsePromocionesReturn,
      promocionesFiltradas: [],
      kpis: {
        totalPromociones: 0,
        activas: 0,
        happyHoursEnVivo: 0,
        cuponesActivos: 0,
        totalCanjesCupones: 0,
      },
      happyHoursEnVivo: [],
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <PromocionesPage />
      </MemoryRouter>
    );

    expect(html).toContain('No hay promociones en esta sección');
    expect(html).toContain('Crear Primera Promoción');
  });
});
