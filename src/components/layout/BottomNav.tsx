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
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/ventas', icon: ShoppingBag, label: 'Ventas' },
  { path: '/gastos', icon: Zap, label: 'Gastos' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/inventario', icon: Package, label: 'Inventario' },
  { path: '/domicilios', icon: Truck, label: 'Domicilios' },
  { path: '#menu', icon: Menu, label: 'Más' },
];

// Elementos en el menú lateral (opciones adicionales)
const submenuItems: NavItem[] = [
  { path: '/analytics', icon: BarChart3, label: 'Analytics IA' },
  { path: '/phase10', icon: Brain, label: 'Phase 10 BI' },
  { path: '/pagos', icon: DollarSign, label: 'Pagos' },
  { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { path: '/bot', icon: Settings, label: 'Configuración' },
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
      {/* Menú lateral */}
      {menuAbierto && (
        <div
          className="fixed bottom-14 left-0 top-0 w-60 border-r border-neutral-700 bg-neutral-900 z-40 overflow-y-auto safe-area-inset-left pt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pb-4">
            <h3 className="font-semibold text-white text-sm">Más opciones</h3>
            <button onClick={() => setMenuAbierto(false)} className="text-neutral-500 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1 px-2">
            {submenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuAbierto(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                    ${
                      isActive
                        ? 'bg-gold-400/20 text-gold-400'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}

            {/* Separador */}
            <div className="my-2 border-t border-neutral-700" />

            {/* Botón Cerrar Sesión */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-50 text-sm"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{loggingOut ? 'Cerrando...' : 'Cerrar sesión'}</span>
            </button>
          </nav>
        </div>
      )}

      {/* Overlay */}
      {menuAbierto && (
        <div
          className="fixed bottom-14 left-0 top-0 right-0 bg-black/30 z-30"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Bottom Navigation - Compacta */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-700 bg-gradient-to-t from-neutral-950 to-neutral-900 safe-area-inset-bottom z-50 shadow-lg">
        <div className="flex h-14 items-stretch justify-between overflow-x-auto scrollbar-hide">
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
                    flex flex-col items-center justify-center gap-0.5 flex-shrink-0 px-3
                    transition-colors duration-200 min-w-max
                    ${
                      isActive
                        ? 'text-gold-400 bg-neutral-800/50'
                        : 'text-neutral-500 hover:text-gold-400/70'
                    }
                  `}
                  aria-label={item.label}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-0.5 flex-shrink-0 px-3
                  transition-colors duration-200 min-w-max
                  ${
                    isActive
                      ? 'text-gold-400 bg-neutral-800/50'
                      : 'text-neutral-500 hover:text-gold-400/70'
                  }
                `}
                aria-label={item.label}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
