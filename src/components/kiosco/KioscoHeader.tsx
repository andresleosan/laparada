import { Lock, RotateCcw, ShoppingBag, UtensilsCrossed, Maximize2, Minimize2 } from 'lucide-react';
import type { TipoServicioKiosco } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

export interface KioscoHeaderProps {
  negocioNombre: string;
  negocioLogo?: string;
  modalidad: TipoServicioKiosco;
  onToggleModalidad: () => void;
  cantidadItems: number;
  totalCOP: number;
  onOpenCart: () => void;
  onReset: () => void;
  onOpenPinModal: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function KioscoHeader({
  negocioNombre,
  negocioLogo,
  modalidad,
  onToggleModalidad,
  cantidadItems,
  totalCOP,
  onOpenCart,
  onReset,
  onOpenPinModal,
  isFullscreen,
  onToggleFullscreen,
}: KioscoHeaderProps) {
  const esSalon = modalidad === 'salon';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-4 py-3 backdrop-blur-md">
      {/* Izquierda: Logo y Nombre */}
      <div className="flex items-center gap-3">
        {negocioLogo ? (
          <img
            src={negocioLogo}
            alt={negocioNombre}
            className="h-10 w-10 rounded-xl object-cover border border-neutral-700"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 border border-gold-400/30 text-gold-400 font-display font-black text-sm">
            LP
          </div>
        )}
        <div className="hidden sm:flex flex-col">
          <span className="font-display text-base font-black text-white leading-tight">
            {negocioNombre || 'La Parada'}
          </span>
          <span className="text-[11px] font-bold text-neutral-400">
            Kiosco de Autoservicio
          </span>
        </div>

        {/* Badge de Modalidad conmutador */}
        <button
          type="button"
          onClick={onToggleModalidad}
          className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black transition-colors min-h-[36px] ${
            esSalon
              ? 'border-gold-400/40 bg-gold-400/10 text-gold-400 hover:bg-gold-400/20'
              : 'border-amber-400/40 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20'
          }`}
          aria-label={`Modalidad actual: ${esSalon ? 'Salón' : 'Para llevar'}. Tocar para cambiar.`}
        >
          {esSalon ? <UtensilsCrossed className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}
          <span>{esSalon ? 'Comer en Salón' : 'Para Llevar'}</span>
        </button>
      </div>

      {/* Derecha: Botón de Carrito, Reset, Fullscreen y Candado de PIN */}
      <div className="flex items-center gap-2">
        {/* Botón Carrito */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative inline-flex items-center gap-2 rounded-2xl bg-gold-400 px-4 py-2 text-sm font-black text-black shadow-lg transition-transform active:scale-95 hover:bg-gold-500 min-h-[44px]"
          aria-label={`Ver pedido. ${cantidadItems} productos por un total de ${formatCOP(totalCOP)}`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden xs:inline">Mi Pedido</span>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-gold-400 text-xs font-black">
            {cantidadItems}
          </span>
          <span className="font-mono text-xs font-bold border-l border-black/20 pl-2">
            {formatCOP(totalCOP)}
          </span>
        </button>

        {/* Reiniciar */}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-700 active:scale-95 transition-colors"
          title="Reiniciar pedido"
          aria-label="Reiniciar pedido actual"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        {/* Pantalla completa (si el navegador lo soporta) */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-700 active:scale-95 transition-colors"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}

        {/* Candado de Salida del Personal con PIN */}
        <button
          type="button"
          onClick={onOpenPinModal}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 text-neutral-500 hover:text-gold-400 hover:border-neutral-700 active:scale-95 transition-colors"
          title="Salir del modo kiosco (requiere PIN)"
          aria-label="Salir de modo kiosco con PIN de seguridad"
        >
          <Lock className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
