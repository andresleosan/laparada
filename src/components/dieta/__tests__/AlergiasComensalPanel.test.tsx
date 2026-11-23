import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALERGIAS_COMENSAL_VACIAS, AlergiasComensalPanel } from '../AlergiasComensalPanel';

describe('AlergiasComensalPanel', () => {
  it('muestra estado colapsado sin alertas cuando no hay alergias registradas', () => {
    const html = renderToStaticMarkup(
      <AlergiasComensalPanel valor={ALERGIAS_COMENSAL_VACIAS} onChange={vi.fn()} />
    );

    expect(html).toContain('Alergias del comensal');
    expect(html).toContain('+ Registrar');
    expect(html).not.toContain('role="alert"');
  });

  it('renderiza alergias registradas, nota y alerta de conflictos en platos', () => {
    const html = renderToStaticMarkup(
      <AlergiasComensalPanel
        valor={{ alergenos: ['mani', 'lacteos'], nota: 'Severa' }}
        onChange={vi.fn()}
        conflictos={[{ itemIndex: 0, nombre: 'Tequeños', alergenos: ['lacteos'] }]}
      />
    );

    expect(html).toContain('Lácteos, Maní');
    expect(html).toContain('value="Severa"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Tequeños');
    expect(html).toContain('Lácteos');
    expect(html).toContain('Quitar alergias registradas');
  });
});
