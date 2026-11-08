import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KioscoWelcomeScreen } from '../KioscoWelcomeScreen';

describe('KioscoWelcomeScreen', () => {
  it('renderiza el título del restaurante y las opciones de servicio', () => {
    const handleSelect = vi.fn();
    const html = renderToStaticMarkup(
      <KioscoWelcomeScreen
        negocioNombre="La Parada Gourmet"
        onSelectModalidad={handleSelect}
      />
    );

    expect(html).toContain('La Parada Gourmet');
    expect(html).toContain('Comer Aquí');
    expect(html).toContain('Para Llevar');
    expect(html).toContain('Terminal de Autoservicio');
  });

  it('incluye botones con atributos de accesibilidad para Salón y Llevar', () => {
    const handleSelect = vi.fn();
    const html = renderToStaticMarkup(
      <KioscoWelcomeScreen
        negocioNombre="La Parada"
        onSelectModalidad={handleSelect}
      />
    );

    expect(html).toContain('aria-label="Pedir para comer aquí en el salón"');
    expect(html).toContain('aria-label="Pedir para llevar a casa"');
  });
});
