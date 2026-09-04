import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import {
  getMobilePrimaryItems,
  getVisibleAdminNavigation,
  isAdminRouteActive,
} from './adminNavigation';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { esSuperAdmin, usuarioNegocio } = useNegocio();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const access = {
    isAdmin: usuarioNegocio?.rol === 'admin',
    isSuperAdmin: esSuperAdmin,
  };
  const primaryItems = getMobilePrimaryItems(access);
  const primaryPaths = new Set(primaryItems.map((item) => item.path));
  const menuGroups = getVisibleAdminNavigation(access).map((group) => ({
    ...group,
    items: group.items.filter((item) => !primaryPaths.has(item.path)),
  }));

  useEffect(() => {
    if (!menuAbierto) return;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuAbierto(false);
    };
    desktopQuery.addEventListener('change', closeOnDesktop);
    return () => desktopQuery.removeEventListener('change', closeOnDesktop);
  }, [menuAbierto]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setLoggingOut(false);
    }
  };

  return (
    <>
      {menuAbierto && (
        <StorefrontDialog
          labelledBy="admin-more-title"
          onClose={() => setMenuAbierto(false)}
          returnFocusSelector="#admin-more-trigger"
          className="fixed inset-0 z-[70] flex items-end bg-black/45 p-3 backdrop-blur-sm lg:hidden"
        >
          <section className="max-h-[82dvh] w-full overflow-y-auto rounded-[1.5rem] border border-[#ded8cc] bg-[#fffdf8] p-4 text-[#201f1b] shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#e5e0d6] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8a6d1d]">Navegación</p>
                <h2 id="admin-more-title" className="font-display text-xl font-black">Todos los módulos</h2>
              </div>
              <button
                type="button"
                onClick={() => setMenuAbierto(false)}
                className="grid h-11 w-11 place-items-center rounded-full border border-[#ded8cc] bg-white text-[#5f5a50]"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav aria-label="Más módulos" className="space-y-5">
              {menuGroups.map((group) => (
                group.items.length > 0 && (
                  <div key={group.label}>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#817b70]">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isAdminRouteActive(location.pathname, item.path);

                        return (
                          <Link
                            key={`${group.label}-${item.path}`}
                            to={item.path}
                            onClick={() => setMenuAbierto(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${
                              isActive
                                ? 'border-[#c9a84c] bg-[#f8efd0] text-[#5f4a0d]'
                                : 'border-[#e5e0d6] bg-white text-[#3f3c35]'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{item.shortTitle}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </nav>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#201f1b] px-4 text-sm font-bold text-white disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
            </button>
          </section>
        </StorefrontDialog>
      )}

      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#171713]/[0.97] px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 text-white shadow-[0_-16px_35px_rgba(23,23,19,0.18)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = isAdminRouteActive(location.pathname, item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${
                  isActive ? 'bg-[#c9a84c] text-[#171713]' : 'text-white/[0.76]'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.shortTitle}</span>
              </Link>
            );
          })}
          <button
            id="admin-more-trigger"
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-expanded={menuAbierto}
            aria-haspopup="dialog"
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${
              menuAbierto ? 'bg-[#c9a84c] text-[#171713]' : 'text-white/[0.76]'
            }`}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            <span>Más</span>
          </button>
        </div>
      </nav>
    </>
  );
}
