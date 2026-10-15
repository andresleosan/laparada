import { describe, expect, it } from 'vitest';
import {
  getAdminRouteMeta,
  getMobilePrimaryItems,
  getVisibleAdminNavigation,
  isAdminRouteActive,
} from '../adminNavigation';

describe('adminNavigation', () => {
  it('impide que un cajero reciba destinos exclusivos de administración o superadministración', () => {
    const groups = getVisibleAdminNavigation({ isAdmin: false, isSuperAdmin: false });
    const paths = groups.flatMap((group) => group.items.map((item) => item.path));

    expect(paths).toContain('/pos');
    expect(paths).toContain('/pedidos');
    expect(paths).not.toContain('/productos');
    expect(paths).not.toContain('/inventario');
    expect(paths).not.toContain('/bot');
    expect(paths).not.toContain('/admin-settings');
    expect(paths).not.toContain('/superadmin/negocios');
  });

  it.each([
    { isAdmin: false, isSuperAdmin: false, canConfigure: false },
    { isAdmin: true, isSuperAdmin: false, canConfigure: true },
    { isAdmin: false, isSuperAdmin: true, canConfigure: true },
    { isAdmin: true, isSuperAdmin: true, canConfigure: true },
  ])('omite la gestión global de negocios y conserva la configuración autorizada: %j', (access) => {
    const paths = getVisibleAdminNavigation(access)
      .flatMap((group) => group.items.map((item) => item.path));

    expect(paths).not.toContain('/superadmin/negocios');
    expect(paths.includes('/admin-settings')).toBe(access.canConfigure);
  });

  it('mantiene pocos destinos primarios en móvil y deja el resto para Más', () => {
    expect(getMobilePrimaryItems({ isAdmin: true, isSuperAdmin: false }).map((item) => item.path)).toEqual([
      '/admin',
      '/pos',
      '/pedidos',
      '/productos',
    ]);
    expect(getMobilePrimaryItems({ isAdmin: false, isSuperAdmin: false }).map((item) => item.path)).toEqual([
      '/admin',
      '/pos',
      '/pedidos',
      '/domicilios',
    ]);
  });

  it('trata pedidos y whatsapp como dos rutas del mismo módulo', () => {
    expect(getAdminRouteMeta('/whatsapp')).toMatchObject({
      title: 'Pedidos',
      section: 'Operación',
    });
    expect(isAdminRouteActive('/whatsapp', '/pedidos')).toBe(true);
    expect(isAdminRouteActive('/pedidos', '/pedidos')).toBe(true);
    expect(isAdminRouteActive('/ventas', '/pedidos')).toBe(false);
  });
});
