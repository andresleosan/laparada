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
  toggleProductoDestacado,
  toggleComboDestacado,
} from '@/services/productosService';
import { getProductColorClass } from '@/services/imageService';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductoForm, ComboForm } from '@/components/productos';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { Edit, Trash2, Plus, Package, Eye, EyeOff, AlertCircle, CheckCircle, Heart } from 'lucide-react';
import { verifyAdminPin } from '@/services/changePinService';
import { useNegocio } from '@/context/NegocioContext';

type TabType = 'productos' | 'combos';

export function ProductosPage() {
  const { negocioActual } = useNegocio();
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
      await crearProducto({
        ...data,
        negocioId: negocioActual.id,
      });
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
    try {
      setCargandoEliminar(true);
      const esValido = await verifyAdminPin(pinIngresado);
      if (!esValido) {
        setErrorPin('PIN incorrecto');
        return;
      }
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
      }
    } catch (err) {
      setErrorPin('Error verificando PIN');
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

  const handleToggleProductoDestacado = async (id: string, actual?: boolean) => {
    setLoadingId(id);
    try {
      const nuevo = !actual;
      await toggleProductoDestacado(id, nuevo);
      createToast({
        title: nuevo ? '❤️ Marcado como Destacado del Día' : '🤍 Removido de Destacados',
        type: 'success',
      });
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al actualizar destacado', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  // Handlers para combos
  const handleCrearCombo = async (data: Omit<Combo, 'id'>) => {
    try {
      await crearCombo({
        ...data,
        negocioId: negocioActual.id,
      });
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
    try {
      setCargandoEliminar(true);
      const esValido = await verifyAdminPin(pinIngresado);
      if (!esValido) {
        setErrorPin('PIN incorrecto');
        return;
      }
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
      }
    } catch (err) {
      setErrorPin('Error verificando PIN');
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

  const handleToggleComboDestacado = async (id: string, actual?: boolean) => {
    setLoadingId(id);
    try {
      const nuevo = !actual;
      await toggleComboDestacado(id, nuevo);
      createToast({
        title: nuevo ? '❤️ Marcado como Destacado del Día' : '🤍 Removido de Destacados',
        type: 'success',
      });
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al actualizar destacado', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Productos y Combos</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">Gestión de catálogo, disponibilidad y precios</p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            {tab === 'productos' ? (
              <Button
                onClick={() => {
                  setEditingProducto(null);
                  setProductoFormOpen(true);
                }}
                variant="primary"
                className="flex items-center gap-2 text-xs"
              >
                <Plus size={15} />
                Crear Producto
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditingCombo(null);
                  setComboFormOpen(true);
                }}
                variant="primary"
                className="flex items-center gap-2 text-xs"
              >
                <Plus size={15} />
                Crear Combo
              </Button>
            )}
          </div>
        </div>

        {/* Filtros y Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('productos')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'productos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              📦 Productos ({productos.length})
            </button>
            <button
              onClick={() => setTab('combos')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'combos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🎯 Combos ({combosFiltered.length})
            </button>
          </div>

          {/* Filtro Jornada */}
          <div className="flex gap-2">
            {(['ambas', 'mañana', 'noche'] as const).map((j) => (
              <Button
                key={j}
                onClick={() => setJornada(j)}
                variant={jornada === j ? 'primary' : 'secondary'}
                size="sm"
                className="text-xs"
              >
                {j === 'ambas' ? '📅 Ambas' : j === 'mañana' ? '🌅 Mañana/Tarde' : '🌙 Noche'}
              </Button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : tab === 'productos' ? (
          // Productos
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {productos.length === 0 ? (
              <div className="col-span-full">
                <EmptyState icon={Package} title="Sin productos" description="Crea tu primer producto para esta jornada" />
              </div>
            ) : (
              productos.map((producto) => {
                const colorClass = getProductColorClass(producto.nombre);
                
                return (
                <div 
                  key={producto.id} 
                  className={`rounded-2xl border ${producto.destacado ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-neutral-700'} p-3 flex flex-col relative overflow-hidden group min-h-60 shadow-lg ${colorClass}`}
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

                  {/* Badge y Botón de Destacado / Favorito (Corazón) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                    {producto.destacado ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[10px] font-black flex items-center gap-1 shadow-md animate-pulse">
                        🔥 Destacado
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleProductoDestacado(producto.id, producto.destacado);
                      }}
                      title={producto.destacado ? 'Quitar de destacados' : 'Marcar como destacado del día'}
                      className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer ${
                        producto.destacado
                          ? 'bg-red-500/30 border border-red-400/80 text-red-400 scale-110'
                          : 'bg-black/60 border border-white/20 text-neutral-400 hover:text-red-400 hover:scale-105'
                      }`}
                    >
                      <Heart
                        size={15}
                        className={producto.destacado ? 'fill-red-500 text-red-500' : ''}
                      />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative z-10 flex flex-col justify-end mt-8">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{producto.nombre}</h3>
                    <p className="mt-1 text-xs text-neutral-300 line-clamp-2">{producto.descripcion}</p>
                    <div className="mt-2">
                      <span className="text-base font-bold text-gold">{formatCOP(producto.precio)}</span>
                    </div>
                  </div>

                  <div className="mt-2 relative z-10 flex items-center justify-between gap-2">
                    <Badge 
                      variant={producto.disponible ? 'disponible' : 'no-disponible'}
                      className={`flex-1 text-center py-2 text-xs cursor-pointer ${!producto.disponible ? 'line-through opacity-60' : ''}`}
                      onClick={() => handleToggleProductoDisponibilidad(producto.id, producto.disponible)}
                    >
                      Disponible
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleProductoDisponibilidad(producto.id, producto.disponible)}
                        loading={loadingId === producto.id}
                        disabled={loadingId === producto.id}
                        title={producto.disponible ? 'Ocultar' : 'Mostrar'}
                        className="p-2 h-9 w-9"
                      >
                        {producto.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarProducto(producto)}
                        title="Editar"
                        className="p-2 h-9 w-9"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarProducto(producto.id, producto.nombre)}
                        loading={loadingId === producto.id}
                        disabled={loadingId === producto.id}
                        title="Eliminar"
                        className="p-2 h-9 w-9"
                      >
                        <Trash2 size={16} />
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {combosFiltered.length === 0 ? (
              <div className="col-span-full">
                <EmptyState icon={Package} title="Sin combos" description="Crea tu primer combo para esta jornada" />
              </div>
            ) : (
              combosFiltered.map((combo) => {
                const colorClass = getProductColorClass(combo.nombre);
                
                return (
                <div 
                  key={combo.id} 
                  className={`rounded-2xl border ${combo.destacado ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-neutral-700'} p-3 flex flex-col relative overflow-hidden group min-h-60 shadow-lg ${colorClass}`}
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

                  {/* Badge y Botón de Destacado / Favorito (Corazón) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                    {combo.destacado ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[10px] font-black flex items-center gap-1 shadow-md animate-pulse">
                        🔥 Destacado
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComboDestacado(combo.id, combo.destacado);
                      }}
                      title={combo.destacado ? 'Quitar de destacados' : 'Marcar como destacado del día'}
                      className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer ${
                        combo.destacado
                          ? 'bg-red-500/30 border border-red-400/80 text-red-400 scale-110'
                          : 'bg-black/60 border border-white/20 text-neutral-400 hover:text-red-400 hover:scale-105'
                      }`}
                    >
                      <Heart
                        size={15}
                        className={combo.destacado ? 'fill-red-500 text-red-500' : ''}
                      />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative z-10 flex flex-col justify-end mt-8">
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
                      className={`flex-1 text-center py-2 text-xs cursor-pointer ${!combo.disponible ? 'line-through opacity-60' : ''}`}
                      onClick={() => handleToggleComboDisponibilidad(combo.id, combo.disponible)}
                    >
                      Disponible
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleComboDisponibilidad(combo.id, combo.disponible)}
                        loading={loadingId === combo.id}
                        disabled={loadingId === combo.id}
                        title={combo.disponible ? 'Ocultar' : 'Mostrar'}
                        className="p-2 h-9 w-9"
                      >
                        {combo.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarCombo(combo)}
                        title="Editar"
                        className="p-2 h-9 w-9"
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleEliminarCombo(combo.id, combo.nombre)}
                        loading={loadingId === combo.id}
                        disabled={loadingId === combo.id}
                        title="Eliminar"
                        className="p-2 h-9 w-9"
                      >
                        <Trash2 size={16} />
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
