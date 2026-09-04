import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BarChart } from './BarChart';

describe('alternativa accesible del gráfico de barras', () => {
  it('expone el título y los valores completos del gráfico', () => {
    const html = renderToStaticMarkup(
      <BarChart
        data={[
          { label: 'Tequeños', value: 12 },
          { label: 'Combos', value: 4 },
        ]}
      />
    );

    expect(html).toContain('<title');
    expect(html).toContain('Gráfico de barras');
    expect(html).toContain('<desc');
    expect(html).toContain('Tequeños: 12; Combos: 4');
    expect(html).toMatch(/aria-labelledby="[^"]+ [^"]+"/);
  });
});
