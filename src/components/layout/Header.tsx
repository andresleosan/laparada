// src/components/layout/Header.tsx
import { useLocation, Link } from 'react-router-dom';
import { useNegocio } from '@/context/NegocioContext';
import { ShieldCheck } from 'lucide-react';

/**
 * Componente Header con branding dinámico según el negocio actual
 * Si es Super Admin, muestra acceso rápido al panel de negocios
 */
export function Header() {
  const location = useLocation();
  const { negocioActual, esSuperAdmin } = useNegocio();

  if (location.pathname === '/login' || location.pathname === '/registro-negocio') {
    return null;
  }

  const logoSrc = negocioActual?.logoUrl || '/Logo.jpg';
  const nombreNegocio = negocioActual?.nombre || 'La Parada';

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-b border-amber-500/20 backdrop-blur-sm shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Espaciador izquierdo para centrar el logo */}
        <div className="w-24 hidden sm:block">
          {esSuperAdmin && (
            <Link
              to="/superadmin/negocios"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-1 rounded-lg transition-colors"
              title="Panel de Super Administrador"
            >
              <ShieldCheck size={13} />
              <span>Negocios</span>
            </Link>
          )}
        </div>

        {/* Branding Central */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex-shrink-0">
            <img
              src={logoSrc}
              alt={`Logo ${nombreNegocio}`}
              className="w-10 h-10 md:w-12 md:h-12 rounded-2xl border-2 border-amber-500/50 shadow-md object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/Logo.jpg';
              }}
            />
          </div>

          <div className="flex flex-col leading-tight text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-gold-400 tracking-wider drop-shadow font-display uppercase">
                {nombreNegocio}
              </h1>
              {negocioActual.id !== 'laparada' && (
                <span className="text-[9px] bg-neutral-800 text-neutral-300 border border-neutral-700 px-1.5 py-0.2 rounded font-semibold uppercase">
                  Staff
                </span>
              )}
            </div>
            <p className="text-[10px] md:text-xs text-neutral-400 font-medium tracking-wide">
              {negocioActual.id === 'laparada'
                ? 'SABORES QUE TE ACOMPAÑAN'
                : 'Panel Administrativo & Operaciones'}
            </p>
          </div>
        </div>

        {/* Acciones de la derecha */}
        <div className="w-24 flex justify-end">
          {esSuperAdmin ? (
            <span className="text-[10px] uppercase tracking-wider text-amber-400/80 font-bold hidden sm:inline-block">
              Super Admin
            </span>
          ) : (
            <span className="text-[10px] text-neutral-500 font-medium hidden sm:inline-block">
              v1.0 SaaS
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
