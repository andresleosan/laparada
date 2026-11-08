import { Sparkles } from 'lucide-react';
import type { CategoriaProducto } from '@/types';

export interface KioscoCategoriasBarProps {
  categorias: CategoriaProducto[];
  categoriaActiva: string;
  onSelectCategoria: (categoriaId: string) => void;
  totalProductos: number;
}

export function KioscoCategoriasBar({
  categorias,
  categoriaActiva,
  onSelectCategoria,
  totalProductos,
}: KioscoCategoriasBarProps) {
  return (
    <nav
      aria-label="Categorías del menú"
      className="sticky top-[65px] z-20 flex gap-2.5 overflow-x-auto border-b border-neutral-800 bg-neutral-950/90 px-4 py-3 no-scrollbar scroll-smooth"
    >
      {/* Botón "Todos" */}
      <button
        type="button"
        onClick={() => onSelectCategoria('todos')}
        aria-pressed={categoriaActiva === 'todos'}
        className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all duration-200 min-h-[48px] select-none ${
          categoriaActiva === 'todos'
            ? 'bg-gold-400 text-black shadow-lg shadow-gold-400/20 scale-[1.02]'
            : 'border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700 hover:text-white'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        <span>Todos ({totalProductos})</span>
      </button>

      {/* Lista de Categorías */}
      {categorias.map((cat) => {
        const isActive = categoriaActiva === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategoria(cat.id)}
            aria-pressed={isActive}
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition-all duration-200 min-h-[48px] select-none ${
              isActive
                ? 'bg-gold-400 text-black shadow-lg shadow-gold-400/20 scale-[1.02]'
                : 'border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700 hover:text-white'
            }`}
          >
            {cat.icono && <span className="text-base">{cat.icono}</span>}
            <span>{cat.nombre}</span>
          </button>
        );
      })}
    </nav>
  );
}
