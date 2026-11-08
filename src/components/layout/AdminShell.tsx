import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Store,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import { useHoraActual } from '@/hooks/useHoraActual';
import { useOperacionesLiveBadges } from '@/hooks/useOperacionesLiveBadges';
import { formatHora } from '@/utils/dateUtils';
import { BottomNav } from './BottomNav';
import {
  getAdminRouteMeta,
  getVisibleAdminNavigation,
  isAdminRouteActive,
} from './adminNavigation';

interface AdminShellProps {
  children: ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'laparada_sidebar_collapsed';

export function AdminShell({ children }: AdminShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const ahora = useHoraActual();
  const { negocioActual, esSuperAdmin, usuarioNegocio } = useNegocio();
  const liveBadges = useOperacionesLiveBadges();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch (err) {
        console.warn('Error guardando preferencia de barra lateral:', err);
      }
      return next;
    });
  };

  const routeMeta = getAdminRouteMeta(location.pathname);
  const navigation = getVisibleAdminNavigation({
    isAdmin: usuarioNegocio?.rol === 'admin',
    isSuperAdmin: esSuperAdmin,
    isDelivery: usuarioNegocio?.rol === 'domiciliario',
    isCook: usuarioNegocio?.rol === 'cocinero',
  });
  const logoSrc = negocioActual?.logoUrl || '/logo-96.jpg';
  const businessName = negocioActual?.nombre || 'La Parada';
  const roleLabel = esSuperAdmin
    ? 'Superadministrador'
    : usuarioNegocio?.rol === 'admin'
      ? 'Administrador'
      : usuarioNegocio?.rol === 'cocinero'
        ? 'Cocinero'
        : usuarioNegocio?.rol === 'domiciliario'
          ? 'Domiciliario'
          : 'Caja';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStandaloneFullscreen =
    location.pathname.startsWith('/kiosco') ||
    location.pathname.startsWith('/turnos') ||
    location.pathname.startsWith('/llamador');

  if (isStandaloneFullscreen) {
    return <>{children}</>;
  }

  return (
    <div data-admin-shell className="min-h-[100dvh] bg-[#f4f1e8] text-[#201f1b]">
      <a
        href="#admin-main"
        className="fixed left-3 top-3 z-[80] -translate-y-24 rounded-lg bg-[#201f1b] px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      {/* SIDEBAR ERGONÓMICO ESTILO TOAST POS (SLIM RAIL O EXPANDIDO) */}
      <aside
        aria-label="Navegación principal"
        className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-white/10 bg-[#171713] text-white transition-[width] duration-200 ease-in-out lg:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Cabecera del Sidebar con Branding y Toggle Pin */}
        <div
          className={`flex h-20 items-center border-b border-white/10 ${
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              className="group relative flex h-11 w-11 items-center justify-center rounded-xl border border-[#c9a84c]/40 bg-white/[0.04] text-white hover:bg-[#c9a84c]/20 hover:text-[#e2c766] transition-colors"
              aria-label="Expandir barra lateral"
              title="Expandir menú lateral"
            >
              <img
                src={logoSrc}
                alt=""
                className="h-7 w-7 rounded-lg object-cover"
                onError={(event) => {
                  event.currentTarget.src = '/logo-96.jpg';
                }}
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c9a84c] text-[#171713]">
                <ChevronRight className="h-3 w-3 stroke-[3]" />
              </span>
            </button>
          ) : (
            <>
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={logoSrc}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-xl border border-[#c9a84c]/40 object-cover"
                  onError={(event) => {
                    event.currentTarget.src = '/logo-96.jpg';
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-base font-black uppercase tracking-[0.08em] text-[#e2c766]">
                    {businessName}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.7]">
                    Centro operativo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSidebar}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/[0.6] hover:bg-white/[0.08] hover:text-white transition-colors"
                aria-label="Colapsar barra lateral"
                title="Colapsar menú lateral"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Lista de Navegación por Grupos */}
        <nav
          aria-label="Navegación administrativa"
          className={`admin-sidebar-nav flex-1 overflow-y-auto py-4 ${
            isCollapsed ? 'px-2' : 'px-3'
          }`}
        >
          {navigation.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) => !item.external);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className={isCollapsed ? 'mb-4' : 'mb-5'}>
                {/* Separador o Título de Categoría */}
                {isCollapsed ? (
                  groupIdx > 0 && <div className="my-2 mx-auto h-[1px] w-8 bg-white/10" aria-hidden="true" />
                ) : (
                  <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/[0.62]">
                    {group.label}
                  </p>
                )}

                <div className={isCollapsed ? 'space-y-2' : 'space-y-1'}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isAdminRouteActive(location.pathname, item.path);
                    const badgeCount = item.badgeKey ? liveBadges[item.badgeKey] ?? 0 : 0;
                    const hasBadge = badgeCount > 0;

                    if (isCollapsed) {
                      return (
                        <Link
                          key={`${group.label}-${item.path}`}
                          to={item.path}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={hasBadge ? `${item.shortTitle} (${badgeCount} pendientes)` : item.shortTitle}
                          title={`${item.title}${hasBadge ? ` (${badgeCount})` : ''}`}
                          className={`group relative flex h-12 w-12 mx-auto items-center justify-center rounded-xl transition-all ${
                            isActive
                              ? 'bg-[#c9a84c] text-[#171713] shadow-[0_4px_16px_rgba(201,168,76,0.25)]'
                              : 'text-white/[0.78] hover:bg-white/[0.08] hover:text-white'
                          }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />

                          {/* Insignia / Badge flotante en modo colapsado */}
                          {hasBadge && (
                            <span
                              className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-md ring-2 ring-[#171713]"
                              aria-hidden="true"
                            >
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </Link>
                      );
                    }

                    return (
                      <Link
                        key={`${group.label}-${item.path}`}
                        to={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        className={`group flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? 'bg-[#c9a84c] text-[#171713] shadow-[0_8px_24px_rgba(201,168,76,0.18)]'
                            : 'text-white/[0.78] hover:bg-white/[0.07] hover:text-white'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.shortTitle}</span>
                        </div>

                        {/* Insignia / Badge en línea en modo expandido */}
                        {hasBadge && (
                          <span
                            className={`flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold shadow-sm ${
                              isActive
                                ? 'bg-[#171713] text-[#e2c766]'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Pie de Navegación (Tienda y Cerrar Sesión) */}
        <div className={`border-t border-white/10 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed ? (
            <div className="space-y-2">
              <Link
                to="/"
                aria-label="Ver tienda pública"
                title="Ver tienda pública"
                className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl text-white/[0.78] hover:bg-white/[0.08] hover:text-white transition-colors"
              >
                <Store className="h-5 w-5" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl text-white/[0.72] hover:bg-red-500/15 hover:text-red-300 transition-colors"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/"
                className="mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/[0.78] hover:bg-white/[0.07] hover:text-white"
              >
                <Store className="h-[18px] w-[18px]" aria-hidden="true" />
                Ver tienda
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/[0.72] hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL CON MARGEN ADAPTABLE SEGÚN ESTADO DEL RAIL */}
      <div
        className={`flex min-h-[100dvh] flex-col transition-[padding] duration-200 ease-in-out ${
          isCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <header className="sticky top-0 z-40 border-b border-[#d9d3c7] bg-[#fffdf8]/[0.94] backdrop-blur-xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:min-h-20 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={logoSrc}
                alt=""
                className="h-9 w-9 rounded-lg border border-[#c9a84c]/35 object-cover lg:hidden"
                onError={(event) => {
                  event.currentTarget.src = '/logo-96.jpg';
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#756f63]">
                  <span>{routeMeta.section}</span>
                  <span aria-hidden="true">/</span>
                  <span className="truncate text-[#8a6d1d]">{businessName}</span>
                </div>
                <div className="flex min-w-0 items-baseline gap-3">
                  <p className="truncate font-display text-lg font-black text-[#201f1b] sm:text-xl lg:text-2xl">
                    {routeMeta.title}
                  </p>
                  <p className="hidden truncate text-sm text-[#756f63] xl:block">
                    {routeMeta.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-[#ddd7ca] bg-white px-3 py-2 text-xs font-bold text-[#5f5a50] sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#168a5b]" aria-hidden="true" />
                <time dateTime={ahora.toISOString()}>{formatHora(ahora)}</time>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#201f1b] text-white sm:w-auto sm:gap-2 sm:px-3">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <span className="hidden text-xs font-bold sm:inline">{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <main id="admin-main" className="admin-workspace min-w-0 flex-1">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
