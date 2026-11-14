import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemIngenieriaMenu, ResumenIngenieriaMenu } from '@/types';
import { IngenieriaMenuPage } from '../IngenieriaMenuPage';
import { useIngenieriaMenu } from '@/hooks/useIngenieriaMenu';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada Gourmet' },
  }),
}));

vi.mock('@/hooks/useIngenieriaMenu', () => ({
  useIngenieriaMenu: vi.fn(),
}));

const mockItemEstrella: ItemIngenieriaMenu = {
  id: 'prod-1',
  tipo: 'producto',
  nombre: 'Tequeños Especiales x6',
  categoria: 'Entradas',
  disponible: true,
  destacado: true,
  precioVenta: 18000,
  costoUnitarioCOP: 4500,
  origenCosteo: 'receta',
  tieneCosteo: true,
  costeoIncompleto: false,
  insumosSinCosto: [],
  desgloseIngredientes: [
    {
      insumoId: 'ins-1',
      nombre: 'Queso Costeño',
      cantidad: 0.15,
      unidad: 'kg',
      costoUnitarioInsumo: 30000,
      fuenteCosto: 'kardex',
      subtotalCostoCOP: 4500,
      participacionCostoPct: 100,
      tieneCosto: true,
    },
  ],
  margenContribucionUnitario: 13500,
  foodCostPct: 25,
  margenBrutoPct: 75,
  unidadesVendidas: 120,
  menuMixPct: 60,
  ingresosRealesCOP: 2160000,
  costoTotalPeriodoCOP: 540000,
  contribucionTotalCOP: 1620000,
  cuadrante: 'estrella',
  popularidadAlta: true,
  rentabilidadAlta: true,
  precioSugeridoObjetivoCOP: 15000,
  diferenciaPrecioSugeridoCOP: -3000,
  recomendacionAccion: 'Protege la receta estándar y mantén visibilidad destacada.',
};

const mockItemSinCosteo: ItemIngenieriaMenu = {
  id: 'combo-1',
  tipo: 'combo',
  nombre: 'Combo Parada Familiar',
  categoria: 'Combos',
  disponible: true,
  destacado: false,
  precioVenta: 45000,
  costoUnitarioCOP: 0,
  origenCosteo: 'sin_costeo',
  tieneCosteo: false,
  costeoIncompleto: false,
  insumosSinCosto: [],
  desgloseIngredientes: [],
  margenContribucionUnitario: 0,
  foodCostPct: 0,
  margenBrutoPct: 0,
  unidadesVendidas: 15,
  menuMixPct: 7.5,
  ingresosRealesCOP: 675000,
  costoTotalPeriodoCOP: 0,
  contribucionTotalCOP: 0,
  cuadrante: 'sin_costeo',
  popularidadAlta: false,
  rentabilidadAlta: false,
  precioSugeridoObjetivoCOP: 0,
  diferenciaPrecioSugeridoCOP: 0,
  recomendacionAccion: 'Agrega receta o costo directo de referencia.',
};

function createResumenBase(overrides: Partial<ResumenIngenieriaMenu> = {}): ResumenIngenieriaMenu {
  return {
    periodo: {
      tipo: '30dias',
      etiqueta: 'Últimos 30 días',
      inicio: new Date('2026-10-01T00:00:00Z'),
      fin: new Date('2026-10-31T23:59:59Z'),
    },
    foodCostObjetivoPct: 30,
    redondeo: '500',
    tasaImpuestoIncluidoPct: 0,
    totalItemsCatalogo: 2,
    itemsCosteados: 1,
    itemsSinCosteo: 1,
    itemsCosteoIncompleto: 0,
    totalUnidadesVendidas: 135,
    ingresosTotalesCOP: 2835000,
    costoTotalPeriodoCOP: 540000,
    contribucionTotalPeriodoCOP: 1620000,
    foodCostPromedioPonderadoPct: 25,
    margenContribucionPromedioPonderadoCOP: 13500,
    umbralPopularidadUnidades: 50,
    umbralMenuMixPct: 35,
    umbralMargenContribucionCOP: 13500,
    conteoCuadrantes: {
      estrella: 1,
      caballo_batalla: 0,
      rompecabezas: 0,
      perro: 0,
      sin_costeo: 1,
    },
    items: [mockItemEstrella, mockItemSinCosteo],
    ...overrides,
  };
}

describe('IngenieriaMenuPage', () => {
  const mockedUseIngenieriaMenu = vi.mocked(useIngenieriaMenu);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza KPIs de rentabilidad, matriz BCG y lista de platos costeados y pendientes', () => {
    mockedUseIngenieriaMenu.mockReturnValue({
      resumen: createResumenBase(),
      insumos: [],
      movimientosKardex: [],
      categoriasDisponibles: ['Entradas', 'Combos'],
      tipoPeriodo: '30dias',
      rangoPeriodo: createResumenBase().periodo,
      foodCostObjetivoPct: 30,
      setFoodCostObjetivoPct: vi.fn(),
      redondeo: '500',
      setRedondeo: vi.fn(),
      considerarImpuesto: false,
      setConsiderarImpuesto: vi.fn(),
      tarifaImpuestoDetectada: 0,
      etiquetaImpuestoDetectado: 'Exento / 0%',
      tipoFiltro: 'todos',
      setTipoFiltro: vi.fn(),
      categoriaFiltro: 'todas',
      setCategoriaFiltro: vi.fn(),
      incluirNoDisponibles: true,
      setIncluirNoDisponibles: vi.fn(),
      loading: false,
      error: null,
      cambiarPeriodo: vi.fn(),
      aplicarNuevoPrecio: vi.fn(),
      guardarCostoReferencia: vi.fn(),
      guardarCostoUnitarioInsumo: vi.fn(),
      alternarDestacadoItem: vi.fn(),
      exportarCsv: vi.fn(),
      refresh: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <IngenieriaMenuPage />
      </MemoryRouter>
    );

    expect(html).toContain('Ingeniería de Menú &amp; Matriz BCG');
    expect(html).toContain('Food Cost Ponderado');
    expect(html).toContain('25%');
    expect(html).toContain('Tequeños Especiales x6');
    expect(html).toContain('Combo Parada Familiar');
    expect(html).toContain('Platos Estrella');
    expect(html).toContain('Por Costear');
    expect(html).toContain('Simular');
    expect(html).toContain('Costear');
  });

  it('muestra alerta de error visible y botón de reintento cuando falla la carga', () => {
    const emptyResumen = createResumenBase({
      totalItemsCatalogo: 0,
      itemsCosteados: 0,
      itemsSinCosteo: 0,
      items: [],
      conteoCuadrantes: {
        estrella: 0,
        caballo_batalla: 0,
        rompecabezas: 0,
        perro: 0,
        sin_costeo: 0,
      },
    });

    mockedUseIngenieriaMenu.mockReturnValue({
      resumen: emptyResumen,
      insumos: [],
      movimientosKardex: [],
      categoriasDisponibles: [],
      tipoPeriodo: '30dias',
      rangoPeriodo: emptyResumen.periodo,
      foodCostObjetivoPct: 30,
      setFoodCostObjetivoPct: vi.fn(),
      redondeo: '500',
      setRedondeo: vi.fn(),
      considerarImpuesto: false,
      setConsiderarImpuesto: vi.fn(),
      tarifaImpuestoDetectada: 0,
      etiquetaImpuestoDetectado: 'Exento / 0%',
      tipoFiltro: 'todos',
      setTipoFiltro: vi.fn(),
      categoriaFiltro: 'todas',
      setCategoriaFiltro: vi.fn(),
      incluirNoDisponibles: true,
      setIncluirNoDisponibles: vi.fn(),
      loading: false,
      error: 'Permiso denegado en consulta de ventas',
      cambiarPeriodo: vi.fn(),
      aplicarNuevoPrecio: vi.fn(),
      guardarCostoReferencia: vi.fn(),
      guardarCostoUnitarioInsumo: vi.fn(),
      alternarDestacadoItem: vi.fn(),
      exportarCsv: vi.fn(),
      refresh: vi.fn(),
    });

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <IngenieriaMenuPage />
      </MemoryRouter>
    );

    expect(html).toContain('Permiso denegado en consulta de ventas');
    expect(html).toContain('Reintentar');
    expect(html).toContain('No hay productos o combos para analizar');
  });
});
