import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));
vi.mock('@/services/negociosService', () => ({
  getTodosNegocios: vi.fn(() => Promise.resolve([])),
  aprobarNegocio: vi.fn(),
  renovarSuscripcionNegocio: vi.fn(),
  cambiarEstadoNegocio: vi.fn(),
}));

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    esSuperAdmin: true,
    negociosDisponibles: [{ id: 'laparada', nombre: 'La Parada' }],
    seleccionarNegocioOperativo: vi.fn(),
  }),
}));

import { SuperAdminNegociosPage } from '../SuperAdminNegociosPage';

describe('SuperAdminNegociosPage', () => {
  it('renderiza el centro de control SuperAdmin con los 4 indicadores y filtros', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/super-admin/negocios">
        <SuperAdminNegociosPage />
      </StaticRouter>
    );

    expect(html).toContain('Centro de Control SuperAdmin');
    expect(html).toContain('Locales Activos');
    expect(html).toContain('Solicitudes Pendientes');
    expect(html).toContain('Por Vencer o Vencidos');
    expect(html).toContain('Respuestas IA Consumidas');
    expect(html).toContain('Filtrar solicitudes y locales');
  });
});
