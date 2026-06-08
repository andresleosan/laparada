// src/components/pos/Catalogo.tsx

import type { Producto, Combo } from '@/types';
import { ItemProducto } from './ItemProducto';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Package } from 'lucide-react';

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
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-3">
            Combos
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-40" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-neutral-50 mb-3">
            Productos
          </h3>
          <div className="grid grid-cols-4 gap-4">
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

  const tieneCombos = combos.length > 0;
  const tieneProductos = productos.length > 0;

  return (
    <div className="space-y-6">
      {/* Combos */}
      {tieneCombos && (
        <div>
          <h3 className="text-lg font-semibold text-gold-400 mb-3">
            🎯 Combos Especiales
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {combos.map((combo) => (
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
          <h3 className="text-lg font-semibold text-gold-400 mb-3">
            📦 Productos
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {productos.map((producto) => (
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
          title="No hay productos disponibles"
          description="Por ahora no hay ítems para esta jornada"
        />
      )}
    </div>
  );
}
