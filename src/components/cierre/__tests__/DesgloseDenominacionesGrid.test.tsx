import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { DesgloseDenominacionesGrid } from '../DesgloseDenominacionesGrid';

describe('DesgloseDenominacionesGrid', () => {
  it('renderiza las secciones de billetes y monedas colombianas', () => {
    const html = renderToStaticMarkup(
      <DesgloseDenominacionesGrid denominaciones={{}} onChange={vi.fn()} />
    );

    expect(html).toContain('Billetes Colombianos (COP)');
    expect(html).toContain('Monedas Colombianas (COP)');
    expect(html).toContain('$100.000');
    expect(html).toContain('$50.000');
    expect(html).toContain('$20.000');
    expect(html).toContain('$10.000');
    expect(html).toContain('$5.000');
    expect(html).toContain('$2.000');
    expect(html).toContain('$1.000');
    expect(html).toContain('$500');
  });

  it('renderiza las cantidades y subtotales cuando se proporcionan valores', () => {
    const html = renderToStaticMarkup(
      <DesgloseDenominacionesGrid
        denominaciones={{ b50k: 2, m1000: 5 }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('value="2"');
    expect(html).toContain('value="5"');
    expect(html).toContain('Limpiar conteo');
    expect(html).toContain('aria-label="Disminuir billetes de $50.000"');
    expect(html).toContain('aria-label="Aumentar billetes de $50.000"');
  });

  it('no muestra el botón de limpiar conteo si todas las denominaciones están en 0', () => {
    const html = renderToStaticMarkup(
      <DesgloseDenominacionesGrid denominaciones={{}} onChange={vi.fn()} />
    );

    expect(html).not.toContain('Limpiar conteo');
  });
});
