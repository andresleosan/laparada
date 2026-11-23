import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FiltroDieteticoBar } from '../FiltroDieteticoBar';
import { FILTRO_DIETETICO_VACIO } from '@/utils/alergenosUtils';

describe('FiltroDieteticoBar', () => {
  it('renderiza opciones dietéticas sin botón Limpiar cuando no hay filtros activos', () => {
    const html = renderToStaticMarkup(
      <FiltroDieteticoBar filtro={FILTRO_DIETETICO_VACIO} onChange={vi.fn()} />
    );

    expect(html).toContain('Vegetariano');
    expect(html).toContain('Tengo alergias');
    expect(html).toContain('aria-pressed="false"');
    expect(html).not.toContain('Limpiar');
  });

  it('expande panel de alérgenos y muestra conteo cuando hay filtros activos', () => {
    const html = renderToStaticMarkup(
      <FiltroDieteticoBar
        filtro={{ etiquetas: ['vegetariano'], excluirAlergenos: ['mani'] }}
        onChange={vi.fn()}
        totalVisibles={3}
      />
    );

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Sin Maní"');
    expect(html).toContain('Ocultar platos que contengan');
    expect(html).toContain('aria-label="Quitar todos los filtros de dieta y alergias"');
    expect(html).toContain('3 platos cumplen');
  });

  it('muestra mensaje cuando ningún plato cumple los filtros activos', () => {
    const html = renderToStaticMarkup(
      <FiltroDieteticoBar
        filtro={{ etiquetas: ['vegano'], excluirAlergenos: [] }}
        onChange={vi.fn()}
        totalVisibles={0}
      />
    );

    expect(html).toContain('Ningún plato cumple');
  });
});
