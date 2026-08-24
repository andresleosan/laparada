// src/components/layout/BottomNav.tsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Package,
  Truck,
  Menu,
  X,
  BarChart3,
  DollarSign,
  MessageCircle,
  ShoppingBag,
  Zap,
  Settings,
  Brain,
  LogOut,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

// Elementos principales en la barra
const mainItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'POS' },
  { path: '/ventas', icon: ShoppingBag, label: 'Ventas' },
  { path: '/domicilios', icon: Truck, label: 'Domicilios' },
  { path: '#menu', icon: Menu, label: 'Más' },
];

// Elementos en el menú lateral (opciones adicionales)
const submenuItems: NavItem[] = [
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/gastos', icon: Zap, label: 'Gastos' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/inventario', icon: Package, label: 'Inventario' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics IA' },
  { path: '/phase10', icon: Brain, label: 'Phase 10 BI' },
  { path: '/pagos', icon: DollarSign, label: 'Pagos' },
  { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { path: '/bot', icon: Settings, label: 'Configuración Bot' },
  { path: '/admin-settings', icon: Lock, label: 'Seguridad Admin' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
      {/* Overlay de fondo */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Barra de Navegación y Popover */}
      <div className="fixed bottom-0 md:bottom-3 left-0 right-0 z-50 pointer-events-none flex justify-center px-2 sm:px-4 safe-area-inset-bottom">
        <div className="relative w-full max-w-md md:max-w-xl flex flex-col items-end">
          {/* Menú flotante alineado directamente sobre el botón "Más" */}
          {menuAbierto && (
            <div
              className="pointer-events-auto mb-2 w-72 sm:w-80 border border-neutral-800 bg-neutral-900/98 backdrop-blur-xl z-50 overflow-hidden rounded-2xl shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800">
                <h3 className="font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <Menu size={14} className="text-gold-400" />
                  Módulos del Sistema
                </h3>
                <button
                  onClick={() => setMenuAbierto(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              <nav className="grid grid-cols-2 gap-1 py-2 max-h-[60vh] overflow-y-auto">
                {submenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuAbierto(false)}
                      className={`
                        flex items-center gap-2 px-2.5 py-2 rounded-xl transition-all text-xs font-medium
                        ${
                          isActive
                            ? 'bg-gold-400/20 text-gold-400 border border-gold-400/30'
                            : 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Separador */}
              <div className="my-1 border-t border-neutral-800" />

              {/* Botón Cerrar Sesión */}
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-colors text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-50 text-xs font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
              </button>
            </div>
          )}

          {/* Bottom Navigation Dock */}
          <nav className="pointer-events-auto w-full md:rounded-2xl border-t md:border border-neutral-800 bg-neutral-950/95 md:bg-neutral-900/95 backdrop-blur-md shadow-2xl transition-all">
            <div className="flex h-14 items-center justify-around px-2">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '#menu' ? menuAbierto : location.pathname === item.path;

              if (item.path === '#menu') {
                return (
                  <button
                    key={item.path}
                    onClick={() => setMenuAbierto(!menuAbierto)}
                    className={`
                      flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl
                      transition-all duration-200 min-w-max flex-1 max-w-[5rem]
                      ${
                        isActive
                          ? 'text-gold-400 bg-gold-400/10 font-bold'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                      }
                    `}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-xl
                    transition-all duration-200 min-w-max flex-1 max-w-[5rem]
                    ${
                      isActive
                        ? 'text-gold-400 bg-gold-400/10 font-bold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/40'
                    }
                  `}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[11px] font-medium truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  </>
  );
}
