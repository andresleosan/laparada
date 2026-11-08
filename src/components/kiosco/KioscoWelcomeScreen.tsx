import { Sparkles, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import type { TipoServicioKiosco } from '@/types';

export interface KioscoWelcomeScreenProps {
  negocioNombre: string;
  negocioLogo?: string;
  onSelectModalidad: (tipo: TipoServicioKiosco) => void;
}

export function KioscoWelcomeScreen({
  negocioNombre,
  negocioLogo,
  onSelectModalidad,
}: KioscoWelcomeScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-between bg-neutral-950 p-6 md:p-12 text-white select-none overflow-hidden">
      {/* Resplandor decorativo de fondo */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-gold-400/10 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-[450px] w-[450px] rounded-full bg-amber-600/10 blur-[130px]" />

      {/* Cabecera / Identidad */}
      <header className="relative z-10 flex flex-col items-center text-center mt-6">
        {negocioLogo ? (
          <img
            src={negocioLogo}
            alt={negocioNombre}
            className="h-24 w-24 rounded-3xl object-cover shadow-2xl border-2 border-gold-400/40 mb-4"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-neutral-900 border border-gold-400/30 text-gold-400 shadow-xl mb-4">
            <UtensilsCrossed className="h-10 w-10" />
          </div>
        )}
        <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-gold-400/10 px-4 py-1.5 text-xs font-black tracking-widest uppercase text-gold-400 mb-2">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Terminal de Autoservicio</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-white tracking-tight">
          {negocioNombre || 'La Parada'}
        </h1>
        <p className="mt-2 text-base sm:text-lg text-neutral-400 max-w-md">
          Personaliza tu pedido a tu gusto y reclama tu turno para pagar en caja.
        </p>
      </header>

      {/* Botones de Modalidad: Salón vs Llevar */}
      <main className="relative z-10 my-auto flex w-full max-w-2xl flex-col sm:flex-row items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => onSelectModalidad('salon')}
          className="group relative flex w-full flex-1 flex-col items-center justify-center rounded-3xl border-2 border-neutral-800 bg-neutral-900/90 p-8 sm:p-10 shadow-2xl transition-all duration-300 hover:border-gold-400 hover:scale-[1.03] active:scale-[0.98] min-h-[220px]"
          aria-label="Pedir para comer aquí en el salón"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-400 transition-colors group-hover:bg-gold-400 group-hover:text-black mb-4">
            <UtensilsCrossed className="h-10 w-10" />
          </div>
          <span className="font-display text-2xl font-black text-white group-hover:text-gold-400">
            Comer Aquí
          </span>
          <span className="mt-1 text-sm font-medium text-neutral-400 text-center">
            Mesa en salón y disfrute en el local
          </span>
          <span className="mt-4 rounded-xl bg-neutral-800 px-4 py-1.5 text-xs font-bold text-neutral-300 group-hover:bg-gold-400/20 group-hover:text-gold-400">
            Tocar para Salón
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectModalidad('para_llevar')}
          className="group relative flex w-full flex-1 flex-col items-center justify-center rounded-3xl border-2 border-neutral-800 bg-neutral-900/90 p-8 sm:p-10 shadow-2xl transition-all duration-300 hover:border-amber-400 hover:scale-[1.03] active:scale-[0.98] min-h-[220px]"
          aria-label="Pedir para llevar a casa"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 transition-colors group-hover:bg-amber-400 group-hover:text-black mb-4">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <span className="font-display text-2xl font-black text-white group-hover:text-amber-400">
            Para Llevar
          </span>
          <span className="mt-1 text-sm font-medium text-neutral-400 text-center">
            Empaque térmico y retiro rápido
          </span>
          <span className="mt-4 rounded-xl bg-neutral-800 px-4 py-1.5 text-xs font-bold text-neutral-300 group-hover:bg-amber-400/20 group-hover:text-amber-400">
            Tocar para Llevar
          </span>
        </button>
      </main>

      {/* Pie de pantalla */}
      <footer className="relative z-10 text-center text-xs text-neutral-500 pb-4">
        <p>Toca cualquiera de las opciones para explorar nuestro menú artesanal</p>
      </footer>
    </div>
  );
}
