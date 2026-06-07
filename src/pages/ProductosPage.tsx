// src/pages/ProductosPage.tsx
import React, { useState } from 'react';
import type { Jornada } from '@/types';
import { useProductos } from '@/hooks/useProductos';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCOP } from '@/utils/formatCOP';
import { Edit, Trash2, Package } from 'lucide-react';

type TabType = 'productos' | 'combos';

export function ProductosPage() {
  const [tab, setTab] = useState<TabType>('productos');
  const [jornada, setJornada] = useState<Jornada>('ambas');

  const { productos: productosData, combos: combosData, loading } = useProductos(jornada);

  // Filtrar por jornada si no es 'ambas'
  const productos =
    jornada === 'ambas'
      ? productosData
      : productosData.filter((p) => p.jornada === jornada || p.jornada === 'ambas');

  const combos =
    jornada === 'ambas'
      ? combosData
      : combosData.filter((c) => c.jornada === jornada || c.jornada === 'ambas');

  return (
    <div className="pb-20 px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-gold-400 mb-4">
          Productos y Combos
        </h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setTab('productos')}
            variant={tab === 'productos' ? 'primary' : 'secondary'}
            size="sm"
          >
            📦 Productos
          </Button>
          <Button
            onClick={() => setTab('combos')}
            variant={tab === 'combos' ? 'primary' : 'secondary'}
            size="sm"
          >
            🎯 Combos
          </Button>
        </div>

        {/* Filtro Jornada */}
        <div className="flex gap-2">
          <Button
            onClick={() => setJornada('ambas')}
            variant={jornada === 'ambas' ? 'primary' : 'secondary'}
            size="sm"
          >
            Ambas
          </Button>
          <Button
            onClick={() => setJornada('mañana')}
            variant={jornada === 'mañana' ? 'primary' : 'secondary'}
            size="sm"
          >
            🌅 Mañana
          </Button>
          <Button
            onClick={() => setJornada('noche')}
            variant={jornada === 'noche' ? 'primary' : 'secondary'}
            size="sm"
          >
            🌙 Noche
          </Button>
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : tab === 'productos' ? (
        // Tabla Productos
        <div className="space-y-3">
          {productos.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No hay productos"
              description={`No hay productos para la jornada ${jornada}`}
            />
          ) : (
            productos.map((producto) => (
              <Card key={producto.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-50">
                      {producto.nombre}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {producto.descripcion}
                    </p>
                    <div className="flex gap-2 items-center mt-3">
                      <span className="font-bold text-gold-400">
                        {formatCOP(producto.precio)}
                      </span>
                      <Badge
                        variant={producto.disponible ? 'default' : 'default'}
                        className="bg-green-600 text-white text-xs"
                      >
                        {producto.disponible ? '✅ Disponible' : '❌ No disponible'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      className="opacity-50"
                      aria-label="Editar producto"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled
                      className="opacity-50"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        // Tabla Combos
        <div className="space-y-3">
          {combos.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No hay combos"
              description={`No hay combos para la jornada ${jornada}`}
            />
          ) : (
            combos.map((combo) => (
              <Card key={combo.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-50">
                      {combo.nombre}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {combo.descripcion}
                    </p>
                    <div className="text-xs text-neutral-500 mt-2">
                      {combo.items.length} items incluidos
                    </div>
                    <div className="flex gap-2 items-center mt-3">
                      <span className="font-bold text-gold-400">
                        {formatCOP(combo.precioEspecial)}
                      </span>
                      <Badge
                        variant={combo.disponible ? 'default' : 'default'}
                        className="bg-green-600 text-white text-xs"
                      >
                        {combo.disponible ? '✅ Disponible' : '❌ No disponible'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled
                      className="opacity-50"
                      aria-label="Editar combo"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled
                      className="opacity-50"
                      aria-label="Eliminar combo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Nota */}
      <div className="mt-6 p-4 bg-neutral-800 rounded-lg text-xs text-neutral-400">
        💡 <strong>Nota:</strong> La edición y eliminación de productos estará disponible en Fase 4.
      </div>
    </div>
  );
}
