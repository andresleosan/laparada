import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// El render del acceso no debe inicializar servicios Firebase ni depender de
// credenciales; los manejadores de autenticación no se ejecutan en este test.
vi.mock('@/services/firebase', () => ({ auth: null }));
vi.mock('@/services/negociosService', () => ({ getPerfilUsuarioYNegocio: vi.fn() }));

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('dirige la gestión comercial a ALS Dev Studio desde el acceso', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/login">
        <LoginPage />
      </StaticRouter>
    );
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
    const commercialLink = links.find(([, , content]) => (
      content.includes('Gestiona tu negocio con ALS Dev Studio')
    ));

    expect(commercialLink?.[1]).toBe('https://www.alsdevstudio.com/');
    expect(links.map(([, href]) => href)).not.toContain('/registro-negocio');
  });
});
