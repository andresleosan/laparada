// src/pages/ProductosPage.tsx
import { useState } from 'react';
import type { Producto, Combo, Jornada } from '@/types';
import { useProductos } from '@/hooks/useProductos';
import {
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  crearCombo,
  actualizarCombo,
  eliminarCombo,
  toggleProductoDisponibilidad,
  toggleComboDisponibilidad,
} from '@/services/productosService';
import { getProductColorClass } from '@/services/imageService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductoForm, ComboForm } from '@/components/productos';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { Edit, Trash2, Plus, Package, Eye, EyeOff } from 'lucide-react';

type TabType = 'productos' | 'combos';

export function ProductosPage() {
  const [tab, setTab] = useState<TabType>('productos');
  const [jornada, setJornada] = useState<Jornada>('ambas');
  const [productoFormOpen, setProductoFormOpen] = useState(false);
  const [comboFormOpen, setComboFormOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { productos: productosData, combos: combosData, loading, refresh } = useProductos(jornada);

  // Filtrar por jornada si no es 'ambas'
  const productos =
    jornada === 'ambas'
      ? productosData
      : productosData.filter((p) => p.jornada === jornada || p.jornada === 'ambas');

  const combosFiltered =
    jornada === 'ambas'
      ? combosData
      : combosData.filter((c) => c.jornada === jornada || c.jornada === 'ambas');

  // Handlers para productos
  const handleCrearProducto = async (data: Omit<Producto, 'id'>) => {
    try {
      await crearProducto(data);
      createToast({ title: '✅ Producto creado', type: 'success' });
      setProductoFormOpen(false);
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al crear', type: 'error' });
    }
  };

  const handleEditarProducto = (producto: Producto) => {
    setEditingProducto(producto);
    setProductoFormOpen(true);
  };

  const handleActualizarProducto = async (data: Omit<Producto, 'id'>) => {
    if (!editingProducto) return;
    try {
      await actualizarProducto(editingProducto.id, data);
      createToast({ title: '✅ Producto actualizado', type: 'success' });
      setProductoFormOpen(false);
      setEditingProducto(null);
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al actualizar', type: 'error' });
    }
  };

  const handleEliminarProducto = async (id: string) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    setLoadingId(id);
    try {
      await eliminarProducto(id);
      createToast({ title: '✅ Producto eliminado', type: 'success' });
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al eliminar', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleProductoDisponibilidad = async (id: string, disponible: boolean) => {
    setLoadingId(id);
    try {
      await toggleProductoDisponibilidad(id, !disponible);
      createToast({
        title: !disponible ? '✅ Producto habilitado' : '✅ Producto deshabilitado',
        type: 'success',
      });
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al actualizar', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  // Handlers para combos
  const handleCrearCombo = async (data: Omit<Combo, 'id'>) => {
    try {
      await crearCombo(data);
      createToast({ title: '✅ Combo creado', type: 'success' });
      setComboFormOpen(false);
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al crear', type: 'error' });
    }
  };

  const handleEditarCombo = (combo: Combo) => {
    setEditingCombo(combo);
    setComboFormOpen(true);
  };

  const handleActualizarCombo = async (data: Omit<Combo, 'id'>) => {
    if (!editingCombo) return;
    try {
      await actualizarCombo(editingCombo.id, data);
      createToast({ title: '✅ Combo actualizado', type: 'success' });
      setComboFormOpen(false);
      setEditingCombo(null);
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al actualizar', type: 'error' });
    }
  };

  const handleEliminarCombo = async (id: string) => {
    if (!window.confirm('¿Eliminar este combo?')) return;
    setLoadingId(id);
    try {
      await eliminarCombo(id);
      createToast({ title: '✅ Combo eliminado', type: 'success' });
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al eliminar', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleComboDisponibilidad = async (id: string, disponible: boolean) => {
    setLoadingId(id);
    try {
      await toggleComboDisponibilidad(id, !disponible);
      createToast({
        title: !disponible ? '✅ Combo habilitado' : '✅ Combo deshabilitado',
        type: 'success',
      });
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al actualizar', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Productos y Combos</h1>
          <p className="mt-2 text-neutral-400">Gestión completa de catálogo</p>
        </div>

        {/* Botones de acción */}
        <div className="mb-6 flex gap-2">
          {tab === 'productos' ? (
            <Button
              onClick={() => {
                setEditingProducto(null);
                setProductoFormOpen(true);
              }}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Crear Producto
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingCombo(null);
                setComboFormOpen(true);
              }}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Crear Combo
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-neutral-700">
          <button
            onClick={() => setTab('productos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'productos'
                ? 'border-b-2 border-gold text-gold'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            📦 Productos
          </button>
          <button
            onClick={() => setTab('combos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'combos'
                ? 'border-b-2 border-gold text-gold'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            🎯 Combos
          </button>
        </div>

        {/* Filtro Jornada */}
        <div className="mb-6 flex gap-2">
          {(['ambas', 'mañana', 'noche'] as const).map((j) => (
            <Button
              key={j}
              onClick={() => setJornada(j)}
              variant={jornada === j ? 'primary' : 'secondary'}
              className="text-sm"
            >
              {j === 'ambas' ? '📅' : j === 'mañana' ? '🌅' : '🌙'} {j === 'ambas' ? 'Ambas' : j}
            </Button>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : tab === 'productos' ? (
          // Productos
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {productos.length === 0 ? (
              <EmptyState icon={Package} title="Sin productos" description="Crea tu primer producto" />
            ) : (
              productos.map((producto) => {
                const colorClass = getProductColorClass(producto.nombre);
                
                return (
                <div 
                  key={producto.id} 
                  className={`rounded-lg border border-neutral-700 p-3 flex flex-col relative overflow-hidden group min-h-60 shadow-lg ${colorClass}`}
                  style={producto.imagenUrl ? {
                    backgroundImage: `url(${producto.imagenUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {/* Overlay oscuro para mejorar legibilidad */}
                  {producto.imagenUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  )}
                  
                  <div className="flex-1 relative z-10 flex flex-col justify-end">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{producto.nombre}</h3>
                    <p className="mt-1 text-xs text-neutral-300 line-clamp-2">{producto.descripcion}</p>
                    <div className="mt-2">
                      <span className="text-base font-bold text-gold">{formatCOP(producto.precio)}</span>
                    </div>
                  </div>

                  <div className="mt-2 relative z-10 flex items-center justify-between gap-2">
                    <Badge 
                      variant={producto.disponible ? 'disponible' : 'no-disponible'}
                      className="flex-1 text-center py-2 text-xs"
                    >
                      {producto.disponible ? 'Disponible' : 'No disponible'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleProductoDisponibilidad(producto.id, producto.disponible)}
                        loading={loadingId === producto.id}
                        disabled={loadingId === producto.id}
                        title={producto.disponible ? 'Ocultar' : 'Mostrar'}
                        className="p-1.5 h-8 w-8"
                      >
                        {producto.disponible ? <Eye size={26} /> : <EyeOff size={26} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarProducto(producto)}
                        title="Editar"
                        className="p-1.5 h-8 w-8"
                      >
                        <Edit size={26} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarProducto(producto.id)}
                        loading={loadingId === producto.id}
                        disabled={loadingId === producto.id}
                        title="Eliminar"
                        className="p-1.5 h-8 w-8"
                      >
                        <Trash2 size={26} />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        ) : (
          // Combos
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {combosFiltered.length === 0 ? (
              <EmptyState icon={Package} title="Sin combos" description="Crea tu primer combo" />
            ) : (
              combosFiltered.map((combo) => {
                const colorClass = getProductColorClass(combo.nombre);
                
                return (
                <div 
                  key={combo.id} 
                  className={`rounded-lg border border-neutral-700 p-3 flex flex-col relative overflow-hidden group min-h-60 shadow-lg ${colorClass}`}
                  style={combo.imagenUrl ? {
                    backgroundImage: `url(${combo.imagenUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {/* Overlay oscuro para mejorar legibilidad */}
                  {combo.imagenUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  )}
                  
                  <div className="flex-1 relative z-10 flex flex-col justify-end">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{combo.nombre}</h3>
                    <p className="mt-1 text-xs text-neutral-300 line-clamp-1">{combo.descripcion}</p>
                    <p className="mt-1 text-xs text-neutral-400">{combo.items.length} items</p>
                    <div className="mt-2">
                      <span className="text-base font-bold text-gold">{formatCOP(combo.precioEspecial)}</span>
                    </div>
                  </div>

                  <div className="mt-2 relative z-10 flex items-center justify-between gap-2">
                    <Badge 
                      variant={combo.disponible ? 'disponible' : 'no-disponible'}
                      className="flex-1 text-center py-2 text-xs"
                    >
                      {combo.disponible ? 'Disponible' : 'No disponible'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleComboDisponibilidad(combo.id, combo.disponible)}
                        loading={loadingId === combo.id}
                        disabled={loadingId === combo.id}
                        title={combo.disponible ? 'Ocultar' : 'Mostrar'}
                        className="p-1.5 h-8 w-8"
                      >
                        {combo.disponible ? <Eye size={26} /> : <EyeOff size={26} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarCombo(combo)}
                        title="Editar"
                        className="p-1.5 h-8 w-8"
                      >
                        <Edit size={26} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarCombo(combo.id)}
                        loading={loadingId === combo.id}
                        disabled={loadingId === combo.id}
                        title="Eliminar"
                        className="p-1.5 h-8 w-8"
                      >
                        <Trash2 size={26} />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Modales de formularios */}
      <ProductoForm
        isOpen={productoFormOpen}
        onClose={() => {
          setProductoFormOpen(false);
          setEditingProducto(null);
        }}
        onSubmit={editingProducto ? handleActualizarProducto : handleCrearProducto}
        initialData={editingProducto || undefined}
      />

      <ComboForm
        isOpen={comboFormOpen}
        onClose={() => {
          setComboFormOpen(false);
          setEditingCombo(null);
        }}
        onSubmit={editingCombo ? handleActualizarCombo : handleCrearCombo}
        initialData={editingCombo || undefined}
      />
    </div>
  );
}
