import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));
vi.mock('@/services/negociosService', () => ({
  solicitarRegistroNegocio: vi.fn(),
}));

import { RegistroNegocioPage } from '../RegistroNegocioPage';

describe('RegistroNegocioPage', () => {
  it('renderiza el formulario de alta con los 4 planes SaaS offline disponibles', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/registro-negocio">
        <RegistroNegocioPage />
      </StaticRouter>
    );

    expect(html).toContain('Registra tu Restaurante o Puesto');
    expect(html).toContain('Selecciona tu Plan Deseado');
    expect(html).toContain('Prueba 3 días');
    expect(html).toContain('Semanal (7 días)');
    expect(html).toContain('Quincenal (15 días)');
    expect(html).toContain('Mensual (30 días)');
    expect(html).toContain('WhatsApp de Contacto');
    expect(html).toContain('Solicitar Activación de Cuenta');
  });
});
