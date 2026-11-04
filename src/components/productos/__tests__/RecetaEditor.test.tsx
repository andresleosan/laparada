import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecetaEditor } from '../RecetaEditor';
import type { Insumo, InsumoReceta } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('RecetaEditor Component', () => {
  const mockNow = Timestamp.now();

  const mockInsumos: Insumo[] = [
    {
      id: 'ins_queso',
      nombre: 'Queso Costeño',
      stockActual: 10,
      stockMinimo: 2,
      unidad: 'kg',
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
    {
      id: 'ins_harina',
      nombre: 'Harina de Trigo',
      stockActual: 50,
      stockMinimo: 10,
      unidad: 'kg',
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
  ];

  it('muestra mensaje cuando la receta está vacía', () => {
    const html = renderToStaticMarkup(
      <RecetaEditor
        receta={[]}
        onChange={vi.fn()}
        insumos={mockInsumos}
      />
    );

    expect(html).toContain('Escandallo / Receta de Insumos');
    expect(html).toContain('No hay insumos asignados a este producto');
    expect(html).toContain('Queso Costeño (10 kg)');
    expect(html).toContain('Harina de Trigo (50 kg)');
  });

  it('renderiza la lista de insumos de la receta con cantidades y badges de porciones', () => {
    const mockReceta: InsumoReceta[] = [
      {
        insumoId: 'ins_queso',
        nombreSnapshot: 'Queso Costeño',
        cantidad: 0.05,
        unidadSnapshot: 'kg',
      },
    ];

    const html = renderToStaticMarkup(
      <RecetaEditor
        receta={mockReceta}
        onChange={vi.fn()}
        insumos={mockInsumos}
      />
    );

    expect(html).toContain('Insumos requeridos por porción (1):');
    expect(html).toContain('Queso Costeño');
    expect(html).toContain('0.05 kg');
    expect(html).toContain('En bodega: 10 kg');
    // 10 / 0.05 = 200 porciones
    expect(html).toContain('200 porciones');
    expect(html).toContain('Stock OK');
  });

  it('indica visualmente cuando un insumo está agotado o con stock bajo', () => {
    const mockInsumosAgotados: Insumo[] = [
      {
        id: 'ins_queso',
        nombre: 'Queso Costeño',
        stockActual: 0,
        stockMinimo: 2,
        unidad: 'kg',
        negocioId: 'laparada',
        creadoEn: mockNow,
        actualizadoEn: mockNow,
      },
    ];

    const mockReceta: InsumoReceta[] = [
      {
        insumoId: 'ins_queso',
        nombreSnapshot: 'Queso Costeño',
        cantidad: 0.05,
        unidadSnapshot: 'kg',
      },
    ];

    const html = renderToStaticMarkup(
      <RecetaEditor
        receta={mockReceta}
        onChange={vi.fn()}
        insumos={mockInsumosAgotados}
      />
    );

    expect(html).toContain('Agotado');
    expect(html).toContain('0 porciones');
  });
});
