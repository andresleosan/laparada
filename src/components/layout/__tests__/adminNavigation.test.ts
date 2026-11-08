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
    expect(paths).toContain('/mesas');
    expect(paths).toContain('/pedidos');
    expect(paths).toContain('/domicilios');
    expect(paths).toContain('/repartidor');
    expect(paths).toContain('/cocina');
    expect(paths).toContain('/reservas');
    expect(paths).toContain('/clientes');
    expect(paths).not.toContain('/productos');
    expect(paths).not.toContain('/inventario');
    expect(paths).not.toContain('/bot');
    expect(paths).not.toContain('/admin-settings');
    expect(paths).not.toContain('/super-admin/negocios');
  });

  it.each([
    { isAdmin: false, isSuperAdmin: false, canConfigure: false, canManageSaaS: false },
    { isAdmin: true, isSuperAdmin: false, canConfigure: true, canManageSaaS: false },
    { isAdmin: false, isSuperAdmin: true, canConfigure: true, canManageSaaS: true },
    { isAdmin: true, isSuperAdmin: true, canConfigure: true, canManageSaaS: true },
  ])('filtra destinos de administración y superadministración correctamente: %j', (access) => {
    const paths = getVisibleAdminNavigation(access)
      .flatMap((group) => group.items.map((item) => item.path));

    expect(paths.includes('/super-admin/negocios')).toBe(access.canManageSaaS);
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
    expect(getMobilePrimaryItems({ isAdmin: false, isSuperAdmin: false, isDelivery: true }).map((item) => item.path)).toEqual([
      '/repartidor',
      '/domicilios',
      '/pedidos',
      '/admin',
    ]);
    expect(getMobilePrimaryItems({ isAdmin: false, isSuperAdmin: false, isCook: true }).map((item) => item.path)).toEqual([
      '/cocina',
      '/pedidos',
      '/admin',
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

  it('reconoce el portal del repartidor y su alias /mis-entregas', () => {
    expect(getAdminRouteMeta('/repartidor')).toMatchObject({
      title: 'Portal Repartidor',
      section: 'Operación',
    });
    expect(getAdminRouteMeta('/mis-entregas')).toMatchObject({
      title: 'Portal Repartidor',
      section: 'Operación',
    });
    expect(isAdminRouteActive('/mis-entregas', '/repartidor')).toBe(true);
  });

  it('reconoce el directorio de clientes en el módulo de gestión', () => {
    expect(getAdminRouteMeta('/clientes')).toMatchObject({
      title: 'Directorio de Clientes',
      section: 'Gestión',
    });
    expect(isAdminRouteActive('/clientes', '/clientes')).toBe(true);
  });

  it('reconoce la pantalla de cocina KDS y su alias /kds', () => {
    expect(getAdminRouteMeta('/cocina')).toMatchObject({
      title: 'Pantalla de cocina (KDS)',
      section: 'Operación',
      badgeKey: 'cocina',
    });
    expect(getAdminRouteMeta('/kds')).toMatchObject({
      title: 'Pantalla de cocina (KDS)',
      section: 'Operación',
      badgeKey: 'cocina',
    });
    expect(isAdminRouteActive('/kds', '/cocina')).toBe(true);
  });

  it('reconoce el módulo de mesas y salón con su alias /salon y badgeKey', () => {
    expect(getAdminRouteMeta('/mesas')).toMatchObject({
      title: 'Modo mesas y salón',
      section: 'Operación',
      badgeKey: 'mesas',
    });
    expect(getAdminRouteMeta('/salon')).toMatchObject({
      title: 'Modo mesas y salón',
      section: 'Operación',
      badgeKey: 'mesas',
    });
    expect(isAdminRouteActive('/salon', '/mesas')).toBe(true);
  });

  it('asigna badgeKey a domicilios para visualización en vivo', () => {
    expect(getAdminRouteMeta('/domicilios')).toMatchObject({
      title: 'Domicilios',
      section: 'Operación',
      badgeKey: 'domicilios',
    });
  });

  it('reconoce el módulo de personal y nómina con su alias /nomina en Gestión', () => {
    expect(getAdminRouteMeta('/personal')).toMatchObject({
      title: 'Personal, Turnos y Nómina',
      section: 'Gestión',
      access: 'admin',
    });
    expect(getAdminRouteMeta('/nomina')).toMatchObject({
      title: 'Personal, Turnos y Nómina',
      section: 'Gestión',
    });
    expect(isAdminRouteActive('/nomina', '/personal')).toBe(true);
  });

  it('reconoce el centro de auditoría y bitácora forense en Análisis con acceso exclusivo admin', () => {
    expect(getAdminRouteMeta('/auditoria')).toMatchObject({
      title: 'Auditoría y Bitácora Forense',
      section: 'Análisis',
      access: 'admin',
    });
    expect(getAdminRouteMeta('/seguridad')).toMatchObject({
      title: 'Auditoría y Bitácora Forense',
      section: 'Análisis',
    });
    expect(isAdminRouteActive('/seguridad', '/auditoria')).toBe(true);
    expect(isAdminRouteActive('/bitacora', '/auditoria')).toBe(true);
  });
});
