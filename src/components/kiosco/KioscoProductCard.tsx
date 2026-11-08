import { Plus, Sparkles, Utensils } from 'lucide-react';
import type { Combo, Producto } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

export interface KioscoProductCardProps {
  item: Producto | Combo;
  isCombo?: boolean;
  onSelect: (item: Producto | Combo, isCombo: boolean) => void;
}

export function KioscoProductCard({ item, isCombo = false, onSelect }: KioscoProductCardProps) {
  const precio = isCombo
    ? (item as Combo).precioEspecial
    : (item as Producto).precio;

  const imagenUrl = item.imagenUrl;

  return (
    <article
      className="group flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-neutral-800 bg-neutral-900/90 shadow-xl transition-all duration-300 hover:border-gold-400 hover:scale-[1.02] active:scale-[0.99] select-none"
    >
      {/* Contenedor de Imagen o Fallback */}
      <div className="relative h-44 w-full overflow-hidden bg-neutral-950">
        {imagenUrl ? (
          <img
            src={imagenUrl}
            alt={item.nombre}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-600">
            <Utensils className="h-12 w-12 text-neutral-700 mb-2" />
            <span className="text-xs font-bold text-neutral-500">La Parada Artesanal</span>
          </div>
        )}

        {/* Badges superiores */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isCombo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-black text-black shadow-lg">
              <Sparkles className="h-3 w-3" />
              Combo
            </span>
          )}
          {(item as Producto).destacado && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gold-400 px-3 py-1 text-xs font-black text-black shadow-lg">
              Favorito
            </span>
          )}
        </div>
      </div>

      {/* Contenido: Nombre, Descripción y Precios */}
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <h3 className="font-display text-xl font-black text-white leading-tight group-hover:text-gold-400 transition-colors">
            {item.nombre}
          </h3>
          {item.descripcion && (
            <p className="mt-2 text-xs sm:text-sm text-neutral-400 line-clamp-2">
              {item.descripcion}
            </p>
          )}
        </div>

        {/* Pie de tarjeta con precio y botón de agregar */}
        <div className="mt-5 flex items-center justify-between border-t border-neutral-800/80 pt-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              Precio
            </span>
            <span className="font-display text-2xl font-black text-gold-400">
              {formatCOP(precio)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelect(item, isCombo)}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-neutral-800 px-4 py-2.5 text-xs font-black text-white transition-all group-hover:bg-gold-400 group-hover:text-black min-h-[44px] active:scale-95"
            aria-label={`Personalizar y agregar ${item.nombre} por ${formatCOP(precio)}`}
          >
            <Plus className="h-4 w-4" />
            <span>Ordenar</span>
          </button>
        </div>
      </div>
    </article>
  );
}
