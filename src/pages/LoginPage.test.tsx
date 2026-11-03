import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// El render del acceso no debe inicializar servicios Firebase ni depender de
// credenciales; los manejadores de autenticación no se ejecutan en este test.
vi.mock('@/services/firebase', () => ({ auth: null }));
vi.mock('@/services/negociosService', () => ({ getPerfilUsuarioYNegocio: vi.fn() }));

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('incluye enlace a registro de nuevos negocios para restaurantes y puestos', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/login">
        <LoginPage />
      </StaticRouter>
    );
    const links = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
    const registerLink = links.find(([, href]) => href === '/registro-negocio');

    expect(registerLink).toBeDefined();
    expect(registerLink?.[1]).toBe('/registro-negocio');
  });
});
