// src/components/layout/Header.tsx
import { useLocation, Link } from 'react-router-dom';
import { useNegocio } from '@/context/NegocioContext';
import { ShieldCheck, Store } from 'lucide-react';

/**
 * Componente Header con branding dinámico según el negocio actual.
 * Si el usuario es SuperAdmin, ofrece selector directo de local a operar
 * y acceso rápido al panel de Locales SaaS.
 */
export function Header() {
  const location = useLocation();
  const {
    negocioActual,
    esSuperAdmin,
    negociosDisponibles,
    seleccionarNegocioOperativo,
  } = useNegocio();

  if (location.pathname === '/login' || location.pathname === '/registro-negocio') {
    return null;
  }

  const logoSrc = negocioActual?.logoUrl || '/logo-96.jpg';
  const nombreNegocio = negocioActual?.nombre || 'La Parada';

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-b border-amber-500/20 backdrop-blur-sm shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Acceso izquierdo SuperAdmin o espaciador */}
        <div className="hidden sm:flex items-center gap-2">
          {esSuperAdmin ? (
            <Link
              to="/super-admin/negocios"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold text-amber-400 transition-colors active:scale-95"
              title="Panel de Control SuperAdmin Locales SaaS"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Locales SaaS</span>
            </Link>
          ) : (
            <div className="w-20" />
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
                (e.target as HTMLImageElement).src = '/logo-96.jpg';
              }}
            />
          </div>

          <div className="flex flex-col leading-tight text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-gold-400 tracking-wider drop-shadow font-display uppercase">
                {nombreNegocio}
              </h1>
              {negocioActual.id !== 'laparada' && (
                <span className="text-[9px] bg-neutral-800 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold uppercase">
                  SaaS Staff
                </span>
              )}
            </div>
            <p className="text-[10px] md:text-xs text-neutral-400 font-medium tracking-wide">
              {negocioActual.id === 'laparada'
                ? 'SABORES QUE TE ACOMPAÑAN'
                : 'Panel Administrativo & Operaciones Multi-Tenant'}
            </p>
          </div>
        </div>

        {/* Acciones de la derecha: Selector de tienda para SuperAdmin o Badge de estado */}
        <div className="flex items-center justify-end gap-2">
          {esSuperAdmin ? (
            <div className="flex items-center gap-1.5">
              <label htmlFor="superadmin-store-select" className="sr-only">
                Seleccionar local para operar
              </label>
              <Store className="h-3.5 w-3.5 text-amber-400 hidden md:inline" aria-hidden="true" />
              <select
                id="superadmin-store-select"
                value={negocioActual.id}
                onChange={(e) => {
                  const targetId = e.target.value;
                  const seleccionado = negociosDisponibles.find((n) => n.id === targetId);
                  if (seleccionado) {
                    seleccionarNegocioOperativo(seleccionado);
                  }
                }}
                className="bg-neutral-950 border border-amber-500/40 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-inner max-w-[140px] sm:max-w-[200px] truncate"
                title="Cambiar negocio operativo en curso"
              >
                {negociosDisponibles.map((neg) => (
                  <option key={neg.id} value={neg.id} className="bg-neutral-900 text-white">
                    {neg.nombre} {neg.id === 'laparada' ? '★ (Insignia)' : ''}
                  </option>
                ))}
              </select>
            </div>
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
