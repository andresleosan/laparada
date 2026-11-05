import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EntradaInventario, FiltrosKardex, Insumo } from '@/types';
import { KardexMovimientosView } from '../KardexMovimientosView';

describe('KardexMovimientosView Component', () => {
  const mockInsumos: Insumo[] = [
    {
      id: 'ins_pan',
      nombre: 'Pan Brioche',
      stockActual: 30,
      stockMinimo: 10,
      unidad: 'unidades',
      negocioId: 'laparada',
      creadoEn: {} as any,
      actualizadoEn: {} as any,
    },
  ];

  const mockMovimientos: EntradaInventario[] = [
    {
      id: 'mov_1',
      negocioId: 'laparada',
      insumoId: 'ins_pan',
      insumoNombre: 'Pan Brioche',
      cantidad: 50,
      costo: 75000,
      costoUnitario: 1500,
      proveedor: 'Panadería Central',
      fecha: {
        toDate: () => new Date('2026-11-04T12:00:00Z'),
      } as any,
      tipoMovimiento: 'entrada',
      stockPrevio: 0,
      stockResultante: 50,
      unidadMedida: 'unidades',
    },
    {
      id: 'mov_2',
      negocioId: 'laparada',
      insumoId: 'ins_pan',
      insumoNombre: 'Pan Brioche',
      cantidad: -2,
      costo: 0,
      proveedor: 'Merma: vencimiento',
      motivo: 'vencimiento',
      fecha: {
        toDate: () => new Date('2026-11-04T14:00:00Z'),
      } as any,
      tipoMovimiento: 'merma',
      stockPrevio: 50,
      stockResultante: 48,
      notas: 'Panes aplastados',
      unidadMedida: 'unidades',
    },
  ];

  const filtrosBase: FiltrosKardex = {
    insumoId: 'todos',
    tipoMovimiento: 'todos',
    rangoFecha: 'todos',
    busqueda: '',
  };

  it('renderiza tarjetas KPI y filas de tabla de movimientos', () => {
    const html = renderToStaticMarkup(
      <KardexMovimientosView
        movimientos={mockMovimientos}
        insumos={mockInsumos}
        loading={false}
        error={null}
        filtros={filtrosBase}
        setFiltros={vi.fn()}
        resetFiltros={vi.fn()}
        onExportarCsv={vi.fn()}
        onAbrirNuevoMovimiento={vi.fn()}
      />
    );

    expect(html).toContain('Valuación Bodega');
    expect(html).toContain('Compras / Entradas');
    expect(html).toContain('Mermas &amp; Bajas');
    expect(html).toContain('Pan Brioche');
    expect(html).toContain('Panadería Central');
    expect(html).toContain('Merma: vencimiento');
    expect(html).toContain('Exportar Excel (CSV)');
  });

  it('muestra estado vacío amigable cuando la lista de movimientos está vacía', () => {
    const html = renderToStaticMarkup(
      <KardexMovimientosView
        movimientos={[]}
        insumos={mockInsumos}
        loading={false}
        error={null}
        filtros={filtrosBase}
        setFiltros={vi.fn()}
        resetFiltros={vi.fn()}
        onExportarCsv={vi.fn()}
        onAbrirNuevoMovimiento={vi.fn()}
      />
    );

    expect(html).toContain('Sin movimientos en el Kardex');
    expect(html).toContain('Limpiar filtros');
  });
});

