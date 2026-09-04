import { useMemo, useState } from 'react';
import { Layers3, Package, Search, Tags, X } from 'lucide-react';
import type { Combo, Producto } from '@/types';
import { useCategorias } from '@/hooks/useCategorias';
import { filterAdminCatalog } from '@/utils/adminCatalogFilters';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ItemProducto } from './ItemProducto';

interface CatalogoProps {
  combos: Combo[];
  productos: Producto[];
  loading: boolean;
  onAgregarProducto: (producto: Producto) => void;
  onAgregarCombo: (combo: Combo) => void;
  disabled?: boolean;
}

export function Catalogo({
  combos,
  productos,
  loading,
  onAgregarProducto,
  onAgregarCombo,
  disabled = false,
}: CatalogoProps) {
  const { categorias: categoriasDB } = useCategorias();
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  const categoriasDisponibles = useMemo(() => {
    const list: Array<{ id: string; nombre: string }> = [];
    const nombres = new Set<string>();

    categoriasDB.forEach((categoria) => {
      const normalized = categoria.nombre.toLowerCase().trim();
      if (!nombres.has(normalized)) {
        nombres.add(normalized);
        list.push({ id: categoria.id, nombre: categoria.nombre });
      }
    });

    productos.forEach((producto) => {
      const normalized = producto.categoria?.toLowerCase().trim();
      if (normalized && !nombres.has(normalized)) {
        nombres.add(normalized);
        list.push({
          id: producto.categoria?.trim() || normalized,
          nombre: producto.categoria?.trim() || normalized,
        });
      }
    });

    return list;
  }, [categoriasDB, productos]);

  const catalogoFiltrado = useMemo(() => filterAdminCatalog({
    productos,
    combos,
    query: busqueda,
    category: categoriaSeleccionada,
  }), [busqueda, categoriaSeleccionada, combos, productos]);

  const totalResultados = catalogoFiltrado.productos.length + catalogoFiltrado.combos.length;

  if (loading) {
    return (
      <section aria-label="Cargando catálogo" className="space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-60 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    );
  }

  const renderCategoryButton = (
    value: string,
    label: string,
    count: number,
    Icon: typeof Layers3
  ) => {
    const isActive = categoriaSeleccionada.toLowerCase() === value.toLowerCase();

    return (
      <button
        key={value}
        type="button"
        onClick={() => setCategoriaSeleccionada(value)}
        aria-pressed={isActive}
        className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-colors ${
          isActive
            ? 'border-[#b69334] bg-[#c9a84c] text-[#201f1b] shadow-sm'
            : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-[#c9a84c] hover:text-white'
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-black/10' : 'bg-neutral-800'}`}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <section aria-labelledby="catalogo-title" className="space-y-5">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="catalogo-title" className="text-base font-bold text-white">Catálogo</h2>
            <p className="text-xs text-neutral-400">Busca un producto y agrégalo al ticket.</p>
          </div>
          <p className="shrink-0 text-xs font-semibold text-neutral-400" aria-live="polite">
            {totalResultados} {totalResultados === 1 ? 'resultado' : 'resultados'}
          </p>
        </div>

        <div className="relative mt-3">
          <label htmlFor="pos-catalog-search" className="sr-only">Buscar en el catálogo</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
          <input
            id="pos-catalog-search"
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por nombre, descripción o categoría"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl border border-neutral-700 bg-neutral-800 py-2 pl-10 pr-11 text-sm text-neutral-50 placeholder-neutral-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gold-400"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-700 hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label="Filtrar catálogo por categoría">
          {renderCategoryButton('todos', 'Todos', productos.length + combos.length, Layers3)}
          {combos.length > 0 && renderCategoryButton('combos', 'Combos', combos.length, Package)}
          {categoriasDisponibles.map((categoria) => {
            const count = productos.filter(
              (producto) => producto.categoria?.toLowerCase().trim() === categoria.nombre.toLowerCase().trim()
            ).length;
            return renderCategoryButton(categoria.nombre, categoria.nombre, count, Tags);
          })}
        </div>
      </div>

      {catalogoFiltrado.combos.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gold-400">
              <Package className="h-4 w-4" aria-hidden="true" />
              Combos
            </h3>
            <span className="text-xs text-neutral-400">{catalogoFiltrado.combos.length} disponibles</span>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
            {catalogoFiltrado.combos.map((combo) => (
              <ItemProducto
                key={combo.id}
                nombre={combo.nombre}
                precio={combo.precioEspecial}
                descripcion={combo.descripcion}
                disponible={combo.disponible}
                imagenUrl={combo.imagenUrl}
                esCombo
                disabled={disabled}
                onAgregar={() => onAgregarCombo(combo)}
              />
            ))}
          </div>
        </div>
      )}

      {catalogoFiltrado.productos.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Package className="h-4 w-4 text-gold-400" aria-hidden="true" />
              Productos
            </h3>
            <span className="text-xs text-neutral-400">{catalogoFiltrado.productos.length} disponibles</span>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-3">
            {catalogoFiltrado.productos.map((producto) => (
              <ItemProducto
                key={producto.id}
                nombre={producto.nombre}
                precio={producto.precio}
                descripcion={producto.descripcion}
                disponible={producto.disponible}
                imagenUrl={producto.imagenUrl}
                disabled={disabled}
                onAgregar={() => onAgregarProducto(producto)}
              />
            ))}
          </div>
        </div>
      )}

      {totalResultados === 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={Search}
            title="No encontramos coincidencias"
            description={busqueda ? `Prueba otro término o cambia la categoría “${categoriaSeleccionada}”.` : 'Selecciona otra categoría para continuar.'}
            action={busqueda ? { label: 'Limpiar búsqueda', onClick: () => setBusqueda('') } : undefined}
          />
        </div>
      )}
    </section>
  );
}
