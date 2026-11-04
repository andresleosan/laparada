import {
  Columns,
  Globe,
  LayoutList,
  MessageSquare,
  Search,
  Store,
  X,
} from 'lucide-react';
import type { CanalFiltro } from '@/utils/kitchenKds';

export type KdsLayoutView = 'kanban' | 'lista';

export interface KdsFiltersProps {
  canalFiltro: CanalFiltro;
  onCanalChange: (canal: CanalFiltro) => void;
  busqueda: string;
  onBusquedaChange: (query: string) => void;
  layoutView: KdsLayoutView;
  onLayoutViewChange: (view: KdsLayoutView) => void;
}

export const KdsFilters = ({
  canalFiltro,
  onCanalChange,
  busqueda,
  onBusquedaChange,
  layoutView,
  onLayoutViewChange,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-neutral-900/70 p-3">
      {/* Filtros por canal de origen */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por canal de origen">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-1 hidden sm:inline">
          Canal:
        </span>

        {/* Todos */}
        <button
          type="button"
          onClick={() => onCanalChange('todos')}
          aria-pressed={canalFiltro === 'todos'}
          className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold min-h-[44px] transition-colors border ${
            canalFiltro === 'todos'
              ? 'border-amber-400/80 bg-amber-400/20 text-amber-300'
              : 'border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <span>Todos</span>
        </button>

        {/* WhatsApp */}
        <button
          type="button"
          onClick={() => onCanalChange('whatsapp')}
          aria-pressed={canalFiltro === 'whatsapp'}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold min-h-[44px] transition-colors border ${
            canalFiltro === 'whatsapp'
              ? 'border-emerald-400/80 bg-emerald-950/60 text-emerald-300'
              : 'border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
          <span>WhatsApp</span>
        </button>

        {/* Tienda Web */}
        <button
          type="button"
          onClick={() => onCanalChange('web')}
          aria-pressed={canalFiltro === 'web'}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold min-h-[44px] transition-colors border ${
            canalFiltro === 'web'
              ? 'border-sky-400/80 bg-sky-950/60 text-sky-300'
              : 'border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Globe className="h-3.5 w-3.5 text-sky-400" />
          <span>Tienda Web</span>
        </button>

        {/* Mostrador / POS */}
        <button
          type="button"
          onClick={() => onCanalChange('pos')}
          aria-pressed={canalFiltro === 'pos'}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold min-h-[44px] transition-colors border ${
            canalFiltro === 'pos'
              ? 'border-amber-400/80 bg-amber-950/60 text-amber-300'
              : 'border-white/10 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          <Store className="h-3.5 w-3.5 text-amber-400" />
          <span>Mostrador / POS</span>
        </button>
      </div>

      {/* Buscador y alternador de vista */}
      <div className="flex flex-1 items-center justify-end gap-2 min-w-[260px]">
        {/* Input de búsqueda */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder="Buscar comanda, cliente, plato..."
            className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 pl-9 pr-8 text-xs font-medium text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none min-h-[44px]"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusquedaChange('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Alternador de vista: Kanban vs Lista */}
        <div className="flex items-center rounded-xl border border-white/10 bg-neutral-950 p-1" role="group" aria-label="Modo de visualización de comandas">
          <button
            type="button"
            onClick={() => onLayoutViewChange('kanban')}
            aria-label="Vista en 3 columnas Kanban"
            aria-pressed={layoutView === 'kanban'}
            className={`rounded-lg p-2 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
              layoutView === 'kanban'
                ? 'bg-amber-500 text-black font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Columns className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onLayoutViewChange('lista')}
            aria-label="Vista continua en lista"
            aria-pressed={layoutView === 'lista'}
            className={`rounded-lg p-2 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
              layoutView === 'lista'
                ? 'bg-amber-500 text-black font-black'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
