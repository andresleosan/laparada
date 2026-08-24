import { useLocation } from 'react-router-dom';

/**
 * Componente Header con logo de La Parada
 * Se muestra en todas las pestañas del sistema
 */
export function Header() {
  const location = useLocation();

  // No mostrar en la página de login
  if (location.pathname === '/login') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-b border-amber-500/20 backdrop-blur-sm shadow-lg shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-center gap-3.5">
          {/* Logo Oficial de La Parada */}
          <div className="flex-shrink-0">
            <img
              src="/Logo.jpg"
              alt="Logo La Parada"
              className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-amber-500/50 shadow-lg shadow-amber-500/20 object-cover"
            />
          </div>

          {/* Texto del logo */}
          <div className="flex flex-col gap-0 leading-tight text-left">
            <h1 className="text-2xl md:text-3xl font-black text-gold-400 tracking-widest drop-shadow-lg font-display">
              LA PARADA
            </h1>
            <p className="text-[10px] md:text-xs text-gold-400/80 font-bold tracking-widest drop-shadow">
              SABORES QUE TE ACOMPAÑAN
            </p>
          </div>
        </div>

        {/* Divisor decorativo */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        </div>
      </div>
    </header>
  );
}
