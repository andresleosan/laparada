import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InventarioPage } from '../InventarioPage';

vi.mock('@/hooks/useInventario', () => ({
  useInventario: () => ({
    insumos: [
      {
        id: 'ins_carne',
        nombre: 'Carne Hamburguesa',
        stockActual: 20,
        stockMinimo: 5,
        unidad: 'unidades',
        negocioId: 'laparada',
        creadoEn: {},
        actualizadoEn: {},
      },
      {
        id: 'ins_queso',
        nombre: 'Queso Cheddar',
        stockActual: 2,
        stockMinimo: 10,
        unidad: 'kg',
        negocioId: 'laparada',
        creadoEn: {},
        actualizadoEn: {},
      },
    ],
    insumosConBajoStock: [
      {
        id: 'ins_queso',
        nombre: 'Queso Cheddar',
        stockActual: 2,
        stockMinimo: 10,
        unidad: 'kg',
        negocioId: 'laparada',
        creadoEn: {},
        actualizadoEn: {},
      },
    ],
    loading: false,
    error: null,
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
    registrarEntrada: vi.fn(),
    registrarSalida: vi.fn(),
    registrarMerma: vi.fn(),
    registrarAjuste: vi.fn(),
    historial: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useKardex', () => ({
  useKardex: () => ({
    movimientos: [],
    movimientosFiltrados: [
      {
        id: 'mov_1',
        insumoId: 'ins_carne',
        insumoNombre: 'Carne Hamburguesa',
        cantidad: 30,
        costo: 60000,
        costoUnitario: 2000,
        proveedor: 'Carnes San José',
        fecha: { toDate: () => new Date('2026-11-04T10:00:00Z') },
        tipoMovimiento: 'entrada',
        stockPrevio: 0,
        stockResultante: 30,
        unidadMedida: 'unidades',
      },
    ],
    metricas: {
      totalEntradasCantidad: 30,
      totalEntradasCostoCOP: 60000,
      totalSalidasVentaCantidad: 0,
      totalMermasCantidad: 0,
      totalMermasValorCOP: 0,
      totalAjustesNetosCantidad: 0,
      cantidadMovimientos: 1,
      valorTotalBodegaCOP: 60000,
    },
    loading: false,
    error: null,
    filtros: { insumoId: 'todos', tipoMovimiento: 'todos', rangoFecha: 'todos', busqueda: '' },
    setFiltros: vi.fn(),
    resetFiltros: vi.fn(),
    registrarEntrada: vi.fn(),
    registrarSalida: vi.fn(),
    registrarMerma: vi.fn(),
    registrarAjuste: vi.fn(),
    exportarCsv: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe('InventarioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera con título de Kardex Contable y pestañas principales', () => {
    const html = renderToStaticMarkup(<InventarioPage />);

    expect(html).toContain('Inventario &amp; Kardex Contable');
    expect(html).toContain('Insumos (2)');
    expect(html).toContain('Kardex de Movimientos (1)');
    expect(html).toContain('Bajo stock (1)');
    expect(html).toContain('Carne Hamburguesa');
    expect(html).toContain('Queso Cheddar');
  });

  it('muestra botones de acción rápida en cada tarjeta (Entrada, Salida, Merma, Kardex)', () => {
    const html = renderToStaticMarkup(<InventarioPage />);

    expect(html).toContain('Entrada');
    expect(html).toContain('Salida');
    expect(html).toContain('Merma');
    expect(html).toContain('Kardex');
    expect(html).toContain('Movimiento / Ajuste');
  });
});

