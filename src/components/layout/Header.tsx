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
    <header className="sticky top-0 z-40 bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-b border-neutral-700 backdrop-blur-sm shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3">
          {/* Logo SVG mejorado - Carrito de comida rápida */}
          <div className="flex-shrink-0">
            <svg
              viewBox="0 0 200 200"
              width="64"
              height="64"
              className="text-gold-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Círculo exterior grueso */}
              <circle cx="100" cy="100" r="95" strokeWidth="3.5" />

              {/* Vapor estilizado */}
              <path d="M 85 45 Q 83 38 90 36" strokeWidth="2.5" />
              <path d="M 100 43 Q 98 35 105 33" strokeWidth="2.5" />
              <path d="M 115 45 Q 113 38 120 36" strokeWidth="2.5" />

              {/* Techo del carrito - más grande y redondeado */}
              <path d="M 70 57 Q 70 52 77 52 L 123 52 Q 130 52 130 57 Z" 
                    fill="currentColor" strokeWidth="2.5" />

              {/* Estructura - posts verticales más gruesos */}
              <line x1="77" y1="57" x2="77" y2="100" strokeWidth="2.5" />
              <line x1="123" y1="57" x2="123" y2="100" strokeWidth="2.5" />

              {/* Estantería superior */}
              <line x1="71" y1="67" x2="129" y2="67" strokeWidth="2" />
              {/* Estantería del medio */}
              <line x1="71" y1="82" x2="129" y2="82" strokeWidth="2" />

              {/* Items en la estantería */}
              {/* Botella izquierda */}
              <rect x="80" y="69" width="5" height="10" rx="1" fill="currentColor" />
              <circle cx="82.5" cy="68" r="2.5" fill="currentColor" />
              
              {/* Botella derecha */}
              <rect x="104" y="72" width="5" height="9" rx="1" fill="currentColor" />
              <circle cx="106.5" cy="71" r="2.5" fill="currentColor" />

              {/* Hojas/lechuga decorativa */}
              <path d="M 118 76 Q 120 74 122 76 Q 120 78 118 76" fill="currentColor" />
              <path d="M 123 78 Q 125 76 127 78 Q 125 80 123 78" fill="currentColor" />

              {/* Base/plataforma del carrito */}
              <line x1="70" y1="103" x2="130" y2="103" strokeWidth="2.5" />

              {/* Ruedas grandes y prominentes */}
              <circle cx="80" cy="120" r="13" strokeWidth="2.5" />
              <circle cx="120" cy="120" r="13" strokeWidth="2.5" />

              {/* Detalles en las ruedas - aros internos */}
              <circle cx="80" cy="120" r="7" strokeWidth="1.5" />
              <circle cx="120" cy="120" r="7" strokeWidth="1.5" />

              {/* Radios de las ruedas */}
              <line x1="80" y1="107" x2="80" y2="133" strokeWidth="1" />
              <line x1="67" y1="120" x2="93" y2="120" strokeWidth="1" />
              
              <line x1="120" y1="107" x2="120" y2="133" strokeWidth="1" />
              <line x1="107" y1="120" x2="133" y2="120" strokeWidth="1" />

              {/* Manija del carrito - más pronunciada */}
              <path d="M 67 100 Q 60 90 65 78" strokeWidth="3" />
            </svg>
          </div>

          {/* Texto del logo */}
          <div className="flex flex-col gap-0 leading-tight">
            <h1 className="text-3xl md:text-4xl font-black text-gold-400 tracking-widest drop-shadow-lg">
              LA PARADA
            </h1>
            <p className="text-xs md:text-sm text-gold-400/75 font-bold tracking-widest drop-shadow">
              SABORES QUE TE ACOMPAÑAN
            </p>
          </div>
        </div>

        {/* Divisor decorativo - más sutil */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gold-400/30 to-transparent" />
        </div>
      </div>
    </header>
  );
}
