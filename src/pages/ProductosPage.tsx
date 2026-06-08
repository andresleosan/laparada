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
import { Edit, Trash2, Plus, Package, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

type TabType = 'productos' | 'combos';

export function ProductosPage() {
  const [tab, setTab] = useState<TabType>('productos');
  const [jornada, setJornada] = useState<Jornada>('ambas');
  const [productoFormOpen, setProductoFormOpen] = useState(false);
  const [comboFormOpen, setComboFormOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // PIN Modal state
  const [mostrarModalPin, setMostrarModalPin] = useState(false);
  const [elementoAEliminar, setElementoAEliminar] = useState<{ tipo: 'producto' | 'combo'; id: string; nombre: string } | null>(null);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [cargandoEliminar, setCargandoEliminar] = useState(false);
  const [exitoEliminar, setExitoEliminar] = useState(false);
  const PIN_ADMINISTRATIVO = '140492';

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

  const handleEliminarProducto = (id: string, nombre: string) => {
    setElementoAEliminar({ tipo: 'producto', id, nombre });
    setPinIngresado('');
    setErrorPin('');
    setExitoEliminar(false);
    setMostrarModalPin(true);
  };

  const handleEliminarProductoConPin = async () => {
    if (pinIngresado !== PIN_ADMINISTRATIVO) {
      setErrorPin('PIN incorrecto');
      return;
    }

    setCargandoEliminar(true);
    setErrorPin('');
    try {
      if (elementoAEliminar?.id) {
        await eliminarProducto(elementoAEliminar.id);
        setExitoEliminar(true);
        
        setTimeout(() => {
          setMostrarModalPin(false);
          setElementoAEliminar(null);
          setPinIngresado('');
          setExitoEliminar(false);
          refresh();
        }, 1500);
      }
    } catch (err) {
      console.error('Error eliminando producto:', err);
      setErrorPin('Error al eliminar el producto');
    } finally {
      setCargandoEliminar(false);
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

  const handleEliminarCombo = (id: string, nombre: string) => {
    setElementoAEliminar({ tipo: 'combo', id, nombre });
    setPinIngresado('');
    setErrorPin('');
    setExitoEliminar(false);
    setMostrarModalPin(true);
  };

  const handleEliminarComboConPin = async () => {
    if (pinIngresado !== PIN_ADMINISTRATIVO) {
      setErrorPin('PIN incorrecto');
      return;
    }

    setCargandoEliminar(true);
    setErrorPin('');
    try {
      if (elementoAEliminar?.id) {
        await eliminarCombo(elementoAEliminar.id);
        setExitoEliminar(true);
        
        setTimeout(() => {
          setMostrarModalPin(false);
          setElementoAEliminar(null);
          setPinIngresado('');
          setExitoEliminar(false);
          refresh();
        }, 1500);
      }
    } catch (err) {
      console.error('Error eliminando combo:', err);
      setErrorPin('Error al eliminar el combo');
    } finally {
      setCargandoEliminar(false);
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
                        className="p-2 h-10 w-10"
                      >
                        {producto.disponible ? <Eye size={40} /> : <EyeOff size={40} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarProducto(producto)}
                        title="Editar"
                        className="p-2 h-10 w-10"
                      >
                        <Edit size={40} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarProducto(producto.id, producto.nombre)}
                        loading={loadingId === producto.id}
                        disabled={loadingId === producto.id}
                        title="Eliminar"
                        className="p-2 h-10 w-10"
                      >
                        <Trash2 size={40} />
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
                        className="p-2 h-10 w-10"
                      >
                        {combo.disponible ? <Eye size={40} /> : <EyeOff size={40} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarCombo(combo)}
                        title="Editar"
                        className="p-2 h-10 w-10"
                      >
                        <Edit size={40} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarCombo(combo.id, combo.nombre)}
                        loading={loadingId === combo.id}
                        disabled={loadingId === combo.id}
                        title="Eliminar"
                        className="p-2 h-10 w-10"
                      >
                        <Trash2 size={40} />
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

      {/* Modal de PIN para eliminar */}
      {mostrarModalPin && elementoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6 shadow-xl">
            {exitoEliminar ? (
              <div className="text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                <h3 className="mb-2 text-lg font-bold text-white">{elementoAEliminar.tipo === 'producto' ? 'Producto' : 'Combo'} eliminado</h3>
                <p className="text-sm text-neutral-400">Se ha eliminado exitosamente</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-500/10 p-4">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Eliminar {elementoAEliminar.tipo}</p>
                    <p className="text-xs text-neutral-400">{elementoAEliminar.nombre}</p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-neutral-300">Ingresa el PIN administrativo para confirmar la eliminación:</p>

                <input
                  type="password"
                  placeholder="PIN"
                  value={pinIngresado}
                  onChange={(e) => {
                    setPinIngresado(e.target.value);
                    setErrorPin('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pinIngresado.length > 0) {
                      elementoAEliminar.tipo === 'producto' ? handleEliminarProductoConPin() : handleEliminarComboConPin();
                    }
                  }}
                  disabled={cargandoEliminar}
                  className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none disabled:opacity-50"
                  autoFocus
                />

                {errorPin && (
                  <p className="mb-4 text-xs text-red-500">{errorPin}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMostrarModalPin(false);
                      setElementoAEliminar(null);
                      setPinIngresado('');
                      setErrorPin('');
                    }}
                    disabled={cargandoEliminar}
                    className="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-semibold text-white hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={elementoAEliminar.tipo === 'producto' ? handleEliminarProductoConPin : handleEliminarComboConPin}
                    disabled={cargandoEliminar || pinIngresado.length === 0}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {cargandoEliminar ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
