// src/components/pos/Catalogo.tsx
import { useState, useMemo } from 'react';
import type { Producto, Combo } from '@/types';
import { ItemProducto } from './ItemProducto';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package, Tag } from 'lucide-react';

interface CatalogoProps {
  combos: Combo[];
  productos: Producto[];
  loading: boolean;
  onAgregarProducto: (producto: Producto) => void;
  onAgregarCombo: (combo: Combo) => void;
}

export function Catalogo({
  combos,
  productos,
  loading,
  onAgregarProducto,
  onAgregarCombo,
}: CatalogoProps) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');

  // Extraer todas las categorías únicas
  const categoriasDisponibles = useMemo(() => {
    const setCats = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria && p.categoria.trim()) {
        setCats.add(p.categoria.trim());
      }
    });
    return Array.from(setCats);
  }, [productos]);

  // Filtrar productos
  const productosFiltrados = useMemo(() => {
    if (categoriaSeleccionada === 'todos') return productos;
    if (categoriaSeleccionada === 'combos') return [];
    return productos.filter(
      (p) =>
        p.categoria?.toLowerCase().trim() === categoriaSeleccionada.toLowerCase().trim()
    );
  }, [productos, categoriaSeleccionada]);

  // Filtrar combos
  const combosFiltrados = useMemo(() => {
    if (categoriaSeleccionada === 'todos' || categoriaSeleccionada === 'combos') {
      return combos;
    }
    return [];
  }, [combos, categoriaSeleccionada]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-3">Combos</h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-40" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-3">Productos</h3>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const tieneCombos = combosFiltrados.length > 0;
  const tieneProductos = productosFiltrados.length > 0;

  return (
    <div className="space-y-4">
      {/* Barra de Filtros por Categoría */}
      {(categoriasDisponibles.length > 0 || combos.length > 0) && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setCategoriaSeleccionada('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              categoriaSeleccionada === 'todos'
                ? 'bg-amber-500 text-neutral-950 shadow-md scale-102'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            <span>🍽️ Todos ({productos.length + combos.length})</span>
          </button>

          {combos.length > 0 && (
            <button
              onClick={() => setCategoriaSeleccionada('combos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoriaSeleccionada === 'combos'
                  ? 'bg-amber-500 text-neutral-950 shadow-md scale-102'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              <span>🎯 Combos ({combos.length})</span>
            </button>
          )}

          {categoriasDisponibles.map((cat) => {
            const count = productos.filter(
              (p) => p.categoria?.toLowerCase().trim() === cat.toLowerCase().trim()
            ).length;
            const esActivo = categoriaSeleccionada.toLowerCase() === cat.toLowerCase();

            return (
              <button
                key={cat}
                onClick={() => setCategoriaSeleccionada(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  esActivo
                    ? 'bg-amber-500 text-neutral-950 shadow-md scale-102'
                    : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                }`}
              >
                <Tag size={12} className={esActivo ? 'text-neutral-950' : 'text-amber-400'} />
                <span>
                  {cat} ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Combos */}
      {tieneCombos && (
        <div>
          <h3 className="text-sm font-bold text-gold-400 mb-2 flex items-center gap-1.5">
            <span>🎯 Combos Especiales</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {combosFiltrados.map((combo) => (
              <ItemProducto
                key={combo.id}
                nombre={combo.nombre}
                precio={combo.precioEspecial}
                descripcion={combo.descripcion}
                disponible={combo.disponible}
                imagenUrl={combo.imagenUrl}
                esCombо
                onAgregar={() => onAgregarCombo(combo)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Productos */}
      {tieneProductos && (
        <div>
          <h3 className="text-sm font-bold text-neutral-300 mb-2 flex items-center gap-1.5">
            <span>📦 Productos</span>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {productosFiltrados.map((producto) => (
              <ItemProducto
                key={producto.id}
                nombre={producto.nombre}
                precio={producto.precio}
                descripcion={producto.descripcion}
                disponible={producto.disponible}
                imagenUrl={producto.imagenUrl}
                onAgregar={() => onAgregarProducto(producto)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Vacío */}
      {!tieneCombos && !tieneProductos && (
        <EmptyState
          icon={Package}
          title="No hay productos en esta categoría"
          description="Selecciona otra categoría o crea productos en el menú"
        />
      )}
    </div>
  );
}
