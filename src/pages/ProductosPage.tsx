import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import type { Producto, Combo, ItemIngenieriaMenu } from '@/types';
import { useProductos } from '@/hooks/useProductos';
import { useInventario } from '@/hooks/useInventario';
import { useKardex } from '@/hooks/useKardex';
import { useControl86 } from '@/hooks/useControl86';
import { useHoraActual } from '@/hooks/useHoraActual';
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
import { getGourmetImage } from '@/utils/productImages';
import { obtenerRangoFechaReporte } from '@/utils/analiticaFinancieraUtils';
import {
  construirMatrizIngenieriaMenu,
  FOOD_COST_OBJETIVO_DEFAULT_PCT,
} from '@/utils/ingenieriaMenuUtils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProductoForm, ComboForm } from '@/components/productos';
import { CategoriasModal } from '@/components/productos/CategoriasModal';
import { BadgesDieteticos } from '@/components/dieta/BadgesDieteticos';
import {
  Badge86Estado,
  BadgeEspecialDelDia,
  Control86Board,
} from '@/components/control86';
import {
  calcularResumenTablero86,
  evaluarDisponibilidadItem86,
} from '@/utils/control86Utils';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import {
  AlertCircle,
  Ban,
  ChefHat,
  Edit,
  Eye,
  EyeOff,
  Flame,
  Heart,
  Layers3,
  Package,
  Plus,
  Sparkles,
  Tag,
  Target,
  Trash2,
} from 'lucide-react';
import { esComboPersonalizable } from '@/utils/combosPersonalizablesUtils';
import {
  ESTACIONES_COCINA_META,
  inferirEstacionPorCategoriaONombre,
} from '@/utils/estacionesCocinaUtils';
import { calcularCostoRecetaEmpaque } from '@/utils/empaquesUtils';
import {
  contarProductosConSubRecetas,
  filtrarSubRecetas,
} from '@/utils/produccionCocinaUtils';
import {
  construirLookupPerfilDietetico,
  construirPerfilDietetico,
} from '@/utils/alergenosUtils';
import { useNegocio } from '@/context/NegocioContext';
import { useCategorias } from '@/hooks/useCategorias';

type TabType = 'productos' | 'combos' | 'control86';

function Control86TabPanel() {
  const { negocioActual } = useNegocio();
  const {
    productos,
    combos,
    items,
    resumen,
    ahora,
    actionLoadingKey,
    puedeConfigurarEspeciales,
    marcar86,
    reactivar86,
    ajustarPorciones,
    ajustarPorcionesDelta,
    guardarEspecial,
    restablecerTurno86,
  } = useControl86();

  return (
    <Control86Board
      nombreNegocio={negocioActual.nombre || 'La Parada'}
      productos={productos}
      combos={combos}
      items={items}
      resumen={resumen}
      ahora={ahora}
      actionLoadingKey={actionLoadingKey}
      puedeConfigurarEspeciales={puedeConfigurarEspeciales}
      onMarcar86={marcar86}
      onReactivar86={reactivar86}
      onAjustarPorciones={ajustarPorciones}
      onAjustarPorcionesDelta={ajustarPorcionesDelta}
      onGuardarEspecial={guardarEspecial}
      onRestablecerTodos={restablecerTurno86}
    />
  );
}

function SafeIngenieriaLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to="/ingenieria-menu" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href="/ingenieria-menu" className={className}>
      {children}
    </a>
  );
}

function SafeProduccionBaseLink({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to="/inventario?tab=produccion" className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href="/inventario?tab=produccion" className={className}>
      {children}
    </a>
  );
}

export function ProductosPage({ defaultTab = 'productos' }: { defaultTab?: TabType } = {}) {
  const { negocioActual } = useNegocio();
  const { categorias: categoriasDB } = useCategorias();
  const ahora = useHoraActual();
  const [tab, setTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('tab');
      if (param === 'control86' || param === 'combos' || param === 'productos') {
        return param;
      }
    }
    return defaultTab;
  });
  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [productoFormOpen, setProductoFormOpen] = useState(false);
  const [comboFormOpen, setComboFormOpen] = useState(false);
  const [categoriasModalOpen, setCategoriasModalOpen] = useState(false);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const { productos, combos: combosFiltered, loading, error, refresh } = useProductos();
  const { insumos } = useInventario();
  const { movimientos: movimientosKardex } = useKardex({ insumos, limite: 300 });

  const resumenCosteoCatalogo = useMemo(() => {
    return construirMatrizIngenieriaMenu({
      productos,
      combos: combosFiltered,
      ventas: [],
      insumos,
      movimientosKardex,
      periodo: obtenerRangoFechaReporte('hoy'),
      foodCostObjetivoPct: FOOD_COST_OBJETIVO_DEFAULT_PCT,
      incluirNoDisponibles: true,
    });
  }, [productos, combosFiltered, insumos, movimientosKardex]);

  const costeoPorClave = useMemo(() => {
    const mapa = new Map<string, ItemIngenieriaMenu>();
    resumenCosteoCatalogo.items.forEach((item) => {
      mapa.set(`${item.tipo}:${item.id}`, item);
    });
    return mapa;
  }, [resumenCosteoCatalogo.items]);

  const perfilDieteticoLookup = useMemo(
    () => construirLookupPerfilDietetico(productos, combosFiltered),
    [productos, combosFiltered]
  );

  const resumen86 = useMemo(
    () => calcularResumenTablero86(productos, combosFiltered, ahora),
    [productos, combosFiltered, ahora]
  );

  const subRecetasCount = useMemo(() => filtrarSubRecetas(insumos).length, [insumos]);
  const usoSubRecetas = useMemo(
    () => contarProductosConSubRecetas(insumos, productos, combosFiltered),
    [insumos, productos, combosFiltered]
  );

  // Extraer categorías únicas disponibles (fusionando categoriasDB con las existentes en productos)
  const categoriasDisponibles = useMemo(() => {
    const list: Array<{ id: string; nombre: string; icono?: string }> = [];
    const setNombres = new Set<string>();

    // Primero las categorías configuradas en la base de datos
    categoriasDB.forEach((c) => {
      if (!setNombres.has(c.nombre.toLowerCase().trim())) {
        setNombres.add(c.nombre.toLowerCase().trim());
        list.push({ id: c.id, nombre: c.nombre, icono: c.icono });
      }
    });

    // Luego agregar cualquier categoría que tengan los productos pero no esté en categoriasDB
    productos.forEach((p) => {
      if (p.categoria && p.categoria.trim() && !setNombres.has(p.categoria.toLowerCase().trim())) {
        setNombres.add(p.categoria.toLowerCase().trim());
        list.push({ id: p.categoria.trim(), nombre: p.categoria.trim() });
      }
    });

    return list;
  }, [categoriasDB, productos]);

  // Filtrar productos según categoría seleccionada
  const productosMostrados = useMemo(() => {
    if (categoriaFiltro === 'todas') return productos;
    return productos.filter(
      (p) => p.categoria?.toLowerCase().trim() === categoriaFiltro.toLowerCase().trim()
    );
  }, [productos, categoriaFiltro]);

  // Handlers para productos
  const handleCrearProducto = async (data: Omit<Producto, 'id' | 'negocioId'>) => {
    try {
      await crearProducto({
        ...data,
        negocioId: negocioActual.id,
      });
      createToast({ title: 'Producto creado', type: 'success' });
      setProductoFormOpen(false);
      refresh();
    } catch {
      createToast({ title: 'Error al crear', type: 'error' });
    }
  };

  const handleEditarProducto = (producto: Producto) => {
    setEditingProducto(producto);
    setProductoFormOpen(true);
  };

  const handleActualizarProducto = async (data: Omit<Producto, 'id' | 'negocioId'>) => {
    if (!editingProducto) return;
    try {
      await actualizarProducto(editingProducto.id, data, negocioActual.id);
      createToast({ title: 'Producto actualizado', type: 'success' });
      setProductoFormOpen(false);
      setEditingProducto(null);
      refresh();
    } catch {
      createToast({ title: 'Error al actualizar', type: 'error' });
    }
  };

  const handleEliminarProducto = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar el producto "${nombre}"?`)) return;
    setLoadingId(id);
    try {
      await eliminarProducto(id, negocioActual.id);
      createToast({ title: 'Producto eliminado', type: 'success' });
      refresh();
    } catch (err) {
      console.error('Error eliminando producto:', err);
      createToast({ title: 'Error al eliminar el producto', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleProductoDisponibilidad = async (id: string, disponible: boolean) => {
    setLoadingId(id);
    try {
      await toggleProductoDisponibilidad(id, !disponible, negocioActual.id);
      createToast({
        title: !disponible ? 'Producto habilitado' : 'Producto deshabilitado',
        type: 'success',
      });
      refresh();
    } catch {
      createToast({ title: 'Error al actualizar', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleProductoDestacado = async (id: string, actual?: boolean) => {
    setLoadingId(id);
    try {
      const nuevo = !actual;
      await toggleProductoDestacado(id, nuevo, negocioActual.id);
      createToast({
        title: nuevo ? 'Marcado como destacado en tienda' : 'Retirado de destacados en tienda',
        type: 'success',
      });
      refresh();
    } catch {
      createToast({ title: 'Error al actualizar destacado', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  // Handlers para combos
  const handleCrearCombo = async (data: Omit<Combo, 'id' | 'negocioId'>) => {
    try {
      await crearCombo({
        ...data,
        negocioId: negocioActual.id,
      });
      createToast({ title: 'Combo creado', type: 'success' });
      setComboFormOpen(false);
      refresh();
    } catch {
      createToast({ title: 'Error al crear', type: 'error' });
    }
  };

  const handleEditarCombo = (combo: Combo) => {
    setEditingCombo(combo);
    setComboFormOpen(true);
  };

  const handleActualizarCombo = async (data: Omit<Combo, 'id' | 'negocioId'>) => {
    if (!editingCombo) return;
    try {
      await actualizarCombo(editingCombo.id, data, negocioActual.id);
      createToast({ title: 'Combo actualizado', type: 'success' });
      setComboFormOpen(false);
      setEditingCombo(null);
      refresh();
    } catch {
      createToast({ title: 'Error al actualizar', type: 'error' });
    }
  };

  const handleEliminarCombo = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Eliminar el combo "${nombre}"?`)) return;
    setLoadingId(id);
    try {
      await eliminarCombo(id, negocioActual.id);
      createToast({ title: 'Combo eliminado', type: 'success' });
      refresh();
    } catch (err) {
      console.error('Error eliminando combo:', err);
      createToast({ title: 'Error al eliminar el combo', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleComboDisponibilidad = async (id: string, disponible: boolean) => {
    setLoadingId(id);
    try {
      await toggleComboDisponibilidad(id, !disponible, negocioActual.id);
      createToast({
        title: !disponible ? 'Combo habilitado' : 'Combo deshabilitado',
        type: 'success',
      });
      refresh();
    } catch {
      createToast({ title: 'Error al actualizar', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleToggleComboDestacado = async (id: string, actual?: boolean) => {
    setLoadingId(id);
    try {
      const nuevo = !actual;
      await toggleComboDestacado(id, nuevo, negocioActual.id);
      createToast({
        title: nuevo ? 'Marcado como destacado en tienda' : 'Retirado de destacados en tienda',
        type: 'success',
      });
      refresh();
    } catch {
      createToast({ title: 'Error al actualizar destacado', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  if (error && !loading) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertCircle}
            title="No pudimos cargar el catálogo"
            description="No sustituimos el catálogo por una lista vacía. Comprueba la conexión y reintenta."
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Productos y Combos</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">Gestión de catálogo, disponibilidad y precios</p>
          </div>

          {/* Botones de acción: Primero Crear Producto/Combo, Categorías y enlace a Ingeniería de Menú */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                if (tab === 'productos') {
                  setEditingProducto(null);
                  setProductoFormOpen(true);
                } else {
                  setEditingCombo(null);
                  setComboFormOpen(true);
                }
              }}
              variant="primary"
              className="flex min-h-[44px] items-center gap-2 text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-md"
            >
              <Plus size={15} aria-hidden="true" />
              <span>{tab === 'productos' ? 'Crear Producto' : 'Crear Combo'}</span>
            </Button>

            <Button
              onClick={() => setCategoriasModalOpen(true)}
              variant="secondary"
              className="flex min-h-[44px] items-center gap-1.5 text-xs font-semibold border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 hover:text-white transition-all shadow-sm"
            >
              <Tag size={15} className="text-amber-400" aria-hidden="true" />
              <span>Categorías</span>
            </Button>

            <SafeIngenieriaLink className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-3 py-2 text-xs font-semibold text-[#E5C158] hover:bg-[#C9A84C]/20 transition-colors">
              <Target size={15} aria-hidden="true" />
              <span>Ingeniería de Menú</span>
            </SafeIngenieriaLink>

            <SafeProduccionBaseLink className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-semibold text-neutral-200 hover:border-[#C9A84C]/40 hover:text-[#E5C158] transition-colors">
              <ChefHat size={15} aria-hidden="true" />
              <span>Producción Base ({subRecetasCount})</span>
            </SafeProduccionBaseLink>

            <button
              type="button"
              onClick={() => setTab('control86')}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-950/50 transition-colors"
            >
              <Ban size={15} className="text-red-400" aria-hidden="true" />
              <span>Control 86</span>
              {resumen86.totalEn86 > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {resumen86.totalEn86}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Resumen compacto de costeo */}
        {resumenCosteoCatalogo.totalItemsCatalogo > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-3 text-neutral-300">
              <span>
                Cobertura de costeo:{' '}
                <strong className="text-white font-mono tabular-nums">
                  {resumenCosteoCatalogo.itemsCosteados} / {resumenCosteoCatalogo.totalItemsCatalogo}
                </strong>{' '}
                ítems
              </span>
              {subRecetasCount > 0 && (
                <span className="text-[#E5C158]">
                  · {subRecetasCount} sub-recetas ({usoSubRecetas.totalCount} platos vinculados)
                </span>
              )}
              {resumenCosteoCatalogo.itemsSinCosteo > 0 && (
                <span className="text-amber-300">
                  · {resumenCosteoCatalogo.itemsSinCosteo} por costear
                </span>
              )}
              {resumenCosteoCatalogo.itemsCosteoIncompleto > 0 && (
                <span className="text-amber-300">
                  · {resumenCosteoCatalogo.itemsCosteoIncompleto} con insumos en $0
                </span>
              )}
            </div>
            <SafeIngenieriaLink className="font-semibold text-[#E5C158] hover:underline whitespace-nowrap">
              Abrir Matriz BCG &amp; Simulador →
            </SafeIngenieriaLink>
          </div>
        )}

        {/* Filtros y Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2" role="group" aria-label="Tipo de catálogo">
            <button
              type="button"
              onClick={() => setTab('productos')}
              aria-pressed={tab === 'productos'}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === 'productos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Package className="h-3.5 w-3.5" aria-hidden="true" /> Productos ({productos.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('combos')}
              aria-pressed={tab === 'combos'}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === 'combos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Layers3 className="h-3.5 w-3.5" aria-hidden="true" /> Combos ({combosFiltered.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('control86')}
              aria-pressed={tab === 'control86'}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === 'control86'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Control 86 &amp; Especiales
              {(resumen86.totalEn86 > 0 || resumen86.totalEspecialesVigentes > 0) && (
                <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-black text-white">
                  {resumen86.totalEn86} / ⭐{resumen86.totalEspecialesVigentes}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Barra de Filtro por Categorías */}
        {tab === 'productos' && categoriasDisponibles.length > 0 && (
          <div
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none"
            role="group"
            aria-label="Filtrar productos por categoría"
          >
            <button
              type="button"
              onClick={() => setCategoriaFiltro('todas')}
              aria-pressed={categoriaFiltro === 'todas'}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                categoriaFiltro === 'todas'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Todas ({productos.length})</span>
            </button>

            {categoriasDisponibles.map((cat) => {
              const count = productos.filter(
                (p) => p.categoria?.toLowerCase().trim() === cat.nombre.toLowerCase().trim()
              ).length;
              const esActivo = categoriaFiltro.toLowerCase() === cat.nombre.toLowerCase();

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaFiltro(cat.nombre)}
                  aria-pressed={esActivo}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    esActivo
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                  }`}
                >
                  {cat.icono ? (
                    <span aria-hidden="true">{cat.icono}</span>
                  ) : (
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  <span>
                    {cat.nombre} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : tab === 'control86' ? (
          <Control86TabPanel />
        ) : tab === 'productos' ? (
          // Productos
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {productosMostrados.length === 0 ? (
              <div className="col-span-full">
                <EmptyState icon={Package} title="Sin productos" description="No hay productos para este filtro de categoría" />
              </div>
            ) : (
              productosMostrados.map((producto) => {
                const colorClass = getProductColorClass(producto.nombre);
                const imagenAMostrar =
                  getGourmetImage(producto.nombre, producto.imagenUrl) ||
                  categoriasDB.find(
                    (c) => c.nombre.toLowerCase().trim() === producto.categoria?.toLowerCase().trim()
                  )?.imagenUrl;
                
                return (
                <div 
                  key={producto.id} 
                  data-admin-media="true"
                  className={`rounded-2xl border ${producto.destacado ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-neutral-700'} p-3 flex flex-col relative overflow-hidden group min-h-60 shadow-lg ${colorClass}`}
                  style={imagenAMostrar ? {
                    backgroundImage: `url(${imagenAMostrar})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {/* Overlay oscuro para mejorar legibilidad */}
                  {imagenAMostrar && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  )}

                  {/* Badge y Botón de Destacado / Favorito (Corazón) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                    {producto.destacado ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                        <Flame className="h-3 w-3" aria-hidden="true" /> Destacado
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
                      title={producto.destacado ? 'Quitar de destacados en tienda' : 'Marcar como destacado en tienda'}
                      aria-label={producto.destacado ? `Quitar ${producto.nombre} de destacados en tienda` : `Destacar ${producto.nombre} en tienda`}
                      className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer ${
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
                    {producto.categoria && (
                      <span className="text-[10px] font-bold text-amber-300 bg-neutral-950/80 border border-amber-500/30 px-2 py-0.5 rounded-md w-fit mb-1 backdrop-blur-xs">
                        <Tag className="mr-1 inline h-3 w-3" aria-hidden="true" /> {producto.categoria}
                      </span>
                    )}
                    {producto.receta && producto.receta.length > 0 && (
                      <span className="text-[10px] font-bold text-[#C9A84C] bg-neutral-950/80 border border-[#C9A84C]/40 px-2 py-0.5 rounded-md w-fit mb-1 backdrop-blur-xs">
                        <ChefHat className="mr-1 inline h-3 w-3" aria-hidden="true" /> Receta ({producto.receta.length} insumos)
                      </span>
                    )}
                    {producto.recetaEmpaque && producto.recetaEmpaque.length > 0 && (() => {
                      const costoEmp = calcularCostoRecetaEmpaque(
                        producto.recetaEmpaque,
                        insumos,
                        movimientosKardex
                      );
                      return (
                        <span className="text-[10px] font-bold text-teal-300 bg-neutral-950/85 border border-teal-500/40 px-2 py-0.5 rounded-md w-fit mb-1 backdrop-blur-xs">
                          <Package className="mr-1 inline h-3 w-3" aria-hidden="true" /> Empaque ({producto.recetaEmpaque.length})
                          {costoEmp > 0 ? ` · ${formatCOP(costoEmp)}` : ''}
                        </span>
                      );
                    })()}
                    {(() => {
                      const est =
                        producto.estacionCocina ||
                        inferirEstacionPorCategoriaONombre(producto.categoria, producto.nombre);
                      const metaEst = ESTACIONES_COCINA_META[est];
                      const minEst = producto.tiempoPreparacionMin ?? metaEst.tiempoDefaultMin;
                      return (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md w-fit mb-1 border backdrop-blur-xs bg-neutral-950/85 ${metaEst.badgeClass}`}
                        >
                          {metaEst.emoji} {metaEst.shortLabel} · {minEst} min
                        </span>
                      );
                    })()}
                    {(() => {
                      const perfil =
                        perfilDieteticoLookup.get(producto.id) ??
                        construirPerfilDietetico(producto);
                      return (
                        <>
                          <BadgesDieteticos
                            perfil={perfil}
                            compacto
                            mostrarNutricion
                            className="mb-1"
                          />
                          {!perfil.declarado && (
                            <span className="mb-1 w-fit rounded-md border border-neutral-700 bg-neutral-950/80 px-2 py-0.5 text-[10px] font-semibold text-neutral-400 backdrop-blur-xs">
                              ⚠ Alérgenos sin declarar
                            </span>
                          )}
                        </>
                      );
                    })()}
                    {(() => {
                      const ev86 = evaluarDisponibilidadItem86(producto, ahora);
                      return (
                        <div className="mb-1 flex flex-wrap gap-1">
                          <BadgeEspecialDelDia evaluacion={ev86} compacto />
                          <Badge86Estado evaluacion={ev86} compacto />
                        </div>
                      );
                    })()}
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{producto.nombre}</h3>
                    <p className="mt-1 text-xs text-neutral-300 line-clamp-2">{producto.descripcion}</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-bold text-gold">{formatCOP(producto.precio)}</span>
                      {(() => {
                        const costeoItem = costeoPorClave.get(`producto:${producto.id}`);
                        if (!costeoItem?.tieneCosteo) return null;
                        return (
                          <span
                            title={`Costo: ${formatCOP(costeoItem.costoUnitarioCOP)} · Margen: ${formatCOP(costeoItem.margenContribucionUnitario)}`}
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums backdrop-blur-xs ${
                              costeoItem.foodCostPct <= FOOD_COST_OBJETIVO_DEFAULT_PCT
                                ? 'border-emerald-500/40 bg-neutral-950/85 text-emerald-300'
                                : costeoItem.foodCostPct <= 35
                                  ? 'border-amber-500/40 bg-neutral-950/85 text-amber-300'
                                  : 'border-red-500/40 bg-neutral-950/85 text-red-300'
                            }`}
                          >
                            FC {costeoItem.foodCostPct}% · +{formatCOP(costeoItem.margenContribucionUnitario)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="mt-2 relative z-10 flex flex-col gap-2">
                    <Badge 
                      variant={producto.disponible ? 'disponible' : 'no-disponible'}
                      className={`w-full text-center py-2 text-xs ${!producto.disponible ? 'line-through opacity-60' : ''}`}
                    >
                      Disponible
                    </Badge>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleProductoDisponibilidad(producto.id, producto.disponible)}
                        loading={loadingId === producto.id}
                        disabled={loadingId === producto.id}
                      title={producto.disponible ? 'Ocultar' : 'Mostrar'}
                        aria-label={producto.disponible ? `Ocultar ${producto.nombre}` : `Mostrar ${producto.nombre}`}
                        className="h-11 w-full p-2"
                      >
                        {producto.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarProducto(producto)}
                        title="Editar"
                        aria-label={`Editar ${producto.nombre}`}
                        className="h-11 w-full p-2"
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
                        aria-label={`Eliminar ${producto.nombre}`}
                        className="h-11 w-full p-2"
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
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {combosFiltered.length === 0 ? (
              <div className="col-span-full">
                <EmptyState icon={Package} title="Sin combos" description="Crea tu primer combo" />
              </div>
            ) : (
              combosFiltered.map((combo) => {
                const colorClass = getProductColorClass(combo.nombre);
                const comboImg = getGourmetImage(combo.nombre, combo.imagenUrl);
                
                return (
                <div
                  key={combo.id}
                  data-admin-media="true"
                  className={`rounded-2xl border ${combo.destacado ? 'border-amber-400 ring-2 ring-amber-400/30' : 'border-neutral-700'} p-3 flex flex-col relative overflow-hidden group min-h-60 shadow-lg ${colorClass}`}
                  style={comboImg ? {
                    backgroundImage: `url(${comboImg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  {/* Overlay oscuro para mejorar legibilidad */}
                  {comboImg && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />
                  )}

                  {/* Badge y Botón de Destacado / Favorito (Corazón) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                    {combo.destacado ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/90 text-white text-[10px] font-black flex items-center gap-1 shadow-md">
                        <Flame className="h-3 w-3" aria-hidden="true" /> Destacado
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
                      title={combo.destacado ? 'Quitar de destacados en tienda' : 'Marcar como destacado en tienda'}
                      aria-label={combo.destacado ? `Quitar ${combo.nombre} de destacados en tienda` : `Destacar ${combo.nombre} en tienda`}
                      className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-full backdrop-blur-md transition-all shadow-md active:scale-90 cursor-pointer ${
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
                    {(() => {
                      const ev86Combo = evaluarDisponibilidadItem86(combo, ahora);
                      return (
                        <div className="mb-1 flex flex-wrap gap-1">
                          <BadgeEspecialDelDia evaluacion={ev86Combo} compacto />
                          <Badge86Estado evaluacion={ev86Combo} compacto />
                        </div>
                      );
                    })()}
                    <h3 className="text-sm font-semibold text-white line-clamp-2">{combo.nombre}</h3>
                    <p className="mt-1 text-xs text-neutral-300 line-clamp-1">{combo.descripcion}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <p className="text-xs text-neutral-400">{combo.items.length} items</p>
                      {esComboPersonalizable(combo) && (
                        <span className="text-[10px] font-bold text-amber-300 bg-neutral-950/85 border border-amber-500/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          <Sparkles className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" />
                          Arma tu Combo · {combo.gruposEleccion?.length || 0} grupos
                        </span>
                      )}
                      {combo.receta && combo.receta.length > 0 && (
                        <span className="text-[10px] font-bold text-[#C9A84C] bg-neutral-950/80 border border-[#C9A84C]/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                          <ChefHat className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" /> +{combo.receta.length} insumos
                        </span>
                      )}
                      {combo.recetaEmpaque && combo.recetaEmpaque.length > 0 && (() => {
                        const costoEmp = calcularCostoRecetaEmpaque(
                          combo.recetaEmpaque,
                          insumos,
                          movimientosKardex
                        );
                        return (
                          <span className="text-[10px] font-bold text-teal-300 bg-neutral-950/85 border border-teal-500/40 px-1.5 py-0.5 rounded backdrop-blur-xs">
                            <Package className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" /> Empaque ({combo.recetaEmpaque.length})
                            {costoEmp > 0 ? ` · ${formatCOP(costoEmp)}` : ''}
                          </span>
                        );
                      })()}
                      {(() => {
                        const est =
                          combo.estacionCocina ||
                          inferirEstacionPorCategoriaONombre(combo.categoria || 'Combos', combo.nombre);
                        const metaEst = ESTACIONES_COCINA_META[est];
                        const minEst = combo.tiempoPreparacionMin ?? metaEst.tiempoDefaultMin;
                        return (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-xs bg-neutral-950/85 ${metaEst.badgeClass}`}
                          >
                            {metaEst.emoji} {metaEst.shortLabel} · {minEst} min
                          </span>
                        );
                      })()}
                      {(() => {
                        const perfilCombo =
                          perfilDieteticoLookup.get(combo.id) ??
                          construirPerfilDietetico(combo);
                        return (
                          <>
                            <BadgesDieteticos
                              perfil={perfilCombo}
                              compacto
                              mostrarNutricion
                            />
                            {!perfilCombo.declarado && (
                              <span className="rounded border border-neutral-700 bg-neutral-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 backdrop-blur-xs">
                                ⚠ Alérgenos sin declarar
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-base font-bold text-gold">{formatCOP(combo.precioEspecial)}</span>
                      {(() => {
                        const costeoItem = costeoPorClave.get(`combo:${combo.id}`);
                        if (!costeoItem?.tieneCosteo) return null;
                        return (
                          <span
                            title={`Costo: ${formatCOP(costeoItem.costoUnitarioCOP)} · Margen: ${formatCOP(costeoItem.margenContribucionUnitario)}`}
                            className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums backdrop-blur-xs ${
                              costeoItem.foodCostPct <= FOOD_COST_OBJETIVO_DEFAULT_PCT
                                ? 'border-emerald-500/40 bg-neutral-950/85 text-emerald-300'
                                : costeoItem.foodCostPct <= 35
                                  ? 'border-amber-500/40 bg-neutral-950/85 text-amber-300'
                                  : 'border-red-500/40 bg-neutral-950/85 text-red-300'
                            }`}
                          >
                            FC {costeoItem.foodCostPct}% · +{formatCOP(costeoItem.margenContribucionUnitario)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="mt-2 relative z-10 flex flex-col gap-2">
                    <Badge 
                      variant={combo.disponible ? 'disponible' : 'no-disponible'}
                      className={`w-full text-center py-2 text-xs ${!combo.disponible ? 'line-through opacity-60' : ''}`}
                    >
                      Disponible
                    </Badge>
                    <div className="grid grid-cols-3 gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleToggleComboDisponibilidad(combo.id, combo.disponible)}
                        loading={loadingId === combo.id}
                        disabled={loadingId === combo.id}
                        title={combo.disponible ? 'Ocultar' : 'Mostrar'}
                        aria-label={combo.disponible ? `Ocultar ${combo.nombre}` : `Mostrar ${combo.nombre}`}
                        className="h-11 w-full p-2"
                      >
                        {combo.disponible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditarCombo(combo)}
                        title="Editar"
                        aria-label={`Editar ${combo.nombre}`}
                        className="h-11 w-full p-2"
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
                        aria-label={`Eliminar ${combo.nombre}`}
                        className="h-11 w-full p-2"
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

      {/* Modales de formularios */}
      <ProductoForm
        isOpen={productoFormOpen}
        onClose={() => {
          setProductoFormOpen(false);
          setEditingProducto(null);
        }}
        onSubmit={editingProducto ? handleActualizarProducto : handleCrearProducto}
        initialData={editingProducto || undefined}
        insumos={insumos}
        movimientosKardex={movimientosKardex}
      />

      <ComboForm
        isOpen={comboFormOpen}
        onClose={() => {
          setComboFormOpen(false);
          setEditingCombo(null);
        }}
        onSubmit={editingCombo ? handleActualizarCombo : handleCrearCombo}
        initialData={editingCombo || undefined}
        productos={productos}
        insumos={insumos}
        movimientosKardex={movimientosKardex}
      />

      <CategoriasModal
        isOpen={categoriasModalOpen}
        onClose={() => setCategoriasModalOpen(false)}
      />
    </div>
  );
}
