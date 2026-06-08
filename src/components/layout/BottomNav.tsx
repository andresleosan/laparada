// src/components/layout/BottomNav.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const mainItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/pos', icon: ShoppingCart, label: 'POS' },
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/domicilios', icon: Truck, label: 'Domicilios' },
  { path: '#menu', icon: Menu, label: 'Más' },
];

const submenuItems: NavItem[] = [
  { path: '/ventas', icon: ShoppingBag, label: 'Ventas' },
  { path: '/gastos', icon: Zap, label: 'Gastos' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/pagos', icon: DollarSign, label: 'Pagos' },
  { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
  { path: '/inventario', icon: Package, label: 'Inventario' },
  { path: '/bot', icon: Settings, label: 'Configuración' },
];

export function BottomNav() {
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <>
      {/* Menú lateral */}
      {menuAbierto && (
        <div
          className="fixed bottom-16 left-0 top-0 w-64 border-r border-neutral-700 bg-neutral-900 z-40 overflow-y-auto safe-area-inset-left pt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pb-4">
            <h3 className="font-semibold text-white">Más opciones</h3>
            <button onClick={() => setMenuAbierto(false)} className="text-neutral-500 hover:text-white">
              <X size={20} />
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
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${
                      isActive
                        ? 'bg-gold/20 text-gold'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Overlay */}
      {menuAbierto && (
        <div
          className="fixed bottom-16 left-0 top-0 right-0 bg-black/20 z-30"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-700 bg-neutral-900 safe-area-inset-bottom z-50">
        <div className="flex h-16 items-center justify-around">
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
                    flex flex-col items-center justify-center gap-1 flex-1 h-full
                    transition-colors duration-200
                    ${
                      isActive
                        ? 'text-gold bg-neutral-800/50'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }
                  `}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center justify-center gap-1 flex-1 h-full
                  transition-colors duration-200
                  ${
                    isActive
                      ? 'text-gold bg-neutral-800/50'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }
                `}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
