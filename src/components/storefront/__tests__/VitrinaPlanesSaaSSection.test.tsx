import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { VitrinaPlanesSaaSSection } from '../VitrinaPlanesSaaSSection';

describe('VitrinaPlanesSaaSSection', () => {
  it('renderiza los 4 planes SaaS para restaurantes y puestos', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <VitrinaPlanesSaaSSection />
      </MemoryRouter>
    );

    expect(html).toContain('¿Tienes un Restaurante o Puesto de Comida?');
    expect(html).toContain('Prueba 3 días');
    expect(html).toContain('Semanal (7 días)');
    expect(html).toContain('Quincenal (15 días)');
    expect(html).toContain('Mensual (30 días)');
    expect(html).toContain('5.000');
    expect(html).toContain('19.900');
    expect(html).toContain('34.900');
    expect(html).toContain('59.900');
  });

  it('incluye enlaces para iniciar registro con cada plan', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <VitrinaPlanesSaaSSection />
      </MemoryRouter>
    );

    expect(html).toContain('/registro-negocio?plan=prueba_3d');
    expect(html).toContain('/registro-negocio?plan=semanal_7d');
    expect(html).toContain('/registro-negocio?plan=quincenal_15d');
    expect(html).toContain('/registro-negocio?plan=mensual_30d');
  });
});

