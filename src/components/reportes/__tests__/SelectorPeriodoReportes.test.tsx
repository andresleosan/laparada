import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SelectorPeriodoReportes } from '../SelectorPeriodoReportes';

describe('SelectorPeriodoReportes component', () => {
  it('renderiza todas las opciones de período con objetivos táctiles y aria-pressed', () => {
    const fn = vi.fn();
    const html = renderToStaticMarkup(
      <SelectorPeriodoReportes
        periodoActual="30dias"
        etiquetaPeriodo="Últimos 30 días"
        onCambiarPeriodo={fn}
      />
    );

    expect(html).toContain('Últimos 30 días');
    expect(html).toContain('Hoy');
    expect(html).toContain('Últimos 7 días');
    expect(html).toContain('Este Mes');
    expect(html).toContain('Mes Anterior');
    expect(html).toContain('Personalizado');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('min-h-[44px]');
  });
});

