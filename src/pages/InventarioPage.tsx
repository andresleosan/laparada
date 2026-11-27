// src/pages/InventarioPage.tsx
import { useEffect, useMemo, useState } from 'react';
import { useInRouterContext, useLocation, useSearchParams } from 'react-router-dom';
import type {
  CategoriaEmpaque,
  Combo,
  GuardarSubRecetaInput,
  Insumo,
  LoteEvaluadoSanitario,
  ModoRegistroMerma,
  Producto,
  RegistrarMermaOperativaInput,
  RegistrarProduccionLoteInput,
  ResultadoMermaOperativa,
} from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useInventario } from '@/hooks/useInventario';
import { useKardex } from '@/hooks/useKardex';
import { useLotesInventario } from '@/hooks/useLotesInventario';
import { usePreciosProveedores } from '@/hooks/usePreciosProveedores';
import { useNegocio } from '@/context/NegocioContext';
import { getCombos, getProductos } from '@/services/productosService';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { AjusteStockModal, type ModoAjuste } from '@/components/inventario/AjusteStockModal';
import { BajaRapidaLoteModal } from '@/components/inventario/BajaRapidaLoteModal';
import { ConteoFisicoRapidoModal } from '@/components/inventario/ConteoFisicoRapidoModal';
import { ControlMermasView } from '@/components/inventario/ControlMermasView';
import { KardexMovimientosView } from '@/components/inventario/KardexMovimientosView';
import { LotesVencimientoView } from '@/components/inventario/LotesVencimientoView';
import { ProduccionCocinaView } from '@/components/inventario/ProduccionCocinaView';
import { ProducirLoteModal } from '@/components/inventario/ProducirLoteModal';
import { RegistrarLoteModal } from '@/components/inventario/RegistrarLoteModal';
import { RegistrarMermaOperativaModal } from '@/components/inventario/RegistrarMermaOperativaModal';
import { SubRecetaFormModal } from '@/components/inventario/SubRecetaFormModal';
import { DetalleHistoricoPrecioModal } from '@/components/proveedores/DetalleHistoricoPrecioModal';
import { determinarTipoMovimiento } from '@/utils/kardexInventarioUtils';
import {
  formatearFechaVencimientoCorta,
  SEMAFORO_SANITARIO_META,
} from '@/utils/lotesInventarioUtils';
import { formatCOP } from '@/utils/formatCOP';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardCheck,
  Flame,
  Minus,
  Package,
  Plus,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  parseFiniteNumber,
  validateNonNegativeAmount,
  validatePositiveAmount,
} from '@/utils/adminInputValidation';
import {
  calculateInventoryStockPercentage,
  isInventoryLowStock,
} from '@/utils/inventoryStock';
import {
  esInsumoSubReceta,
  filtrarInsumosPrimarios,
  filtrarSubRecetas,
} from '@/utils/produccionCocinaUtils';
import {
  CATEGORIAS_EMPAQUE_META,
  CATEGORIAS_EMPAQUE_ORDEN,
  esInsumoEmpaque,
  filtrarInsumosEmpaque,
} from '@/utils/empaquesUtils';

type TabType = 'insumos' | 'kardex' | 'bajo-stock' | 'produccion' | 'mermas' | 'lotes';

function isProductionRoutePath(pathname: string): boolean {
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return normalized === '/produccion-cocina' || normalized === '/sub-recetas';
}

function isMermasRoutePath(pathname: string): boolean {
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return normalized === '/mermas' || normalized === '/desperdicios';
}

function isLotesRoutePath(pathname: string): boolean {
  const normalized = pathname.endsWith('/') && pathname.length > 1
    ? pathname.slice(0, -1)
    : pathname;
  return normalized === '/lotes' || normalized === '/vencimientos' || normalized === '/peps';
}

function RouterTabSync({ onTabParam }: { onTabParam: (tab: TabType) => void }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  useEffect(() => {
    const param = searchParams.get('tab');
    if (
      param === 'insumos' ||
      param === 'kardex' ||
      param === 'bajo-stock' ||
      param === 'produccion' ||
      param === 'mermas' ||
      param === 'lotes'
    ) {
      onTabParam(param);
      return;
    }
    if (isProductionRoutePath(location.pathname)) {
      onTabParam('produccion');
      return;
    }
    if (isMermasRoutePath(location.pathname)) {
      onTabParam('mermas');
      return;
    }
    if (isLotesRoutePath(location.pathname)) {
      onTabParam('lotes');
    }
  }, [searchParams, location.pathname, onTabParam]);
  return null;
}

export function InventarioPage() {
  const inRouter = useInRouterContext();
  let negocioId = 'laparada';
  let negocioNombre = 'La Parada';
  let responsableUsuario = 'Administrador';
  try {
    const negocioCtx = useNegocio();
    negocioId = negocioCtx.negocioActual.id;
    negocioNombre = negocioCtx.negocioActual.nombre;
  } catch {
    // Fallback seguro si se renderiza en pruebas unitarias sin NegocioProvider
  }
  try {
    const authCtx = useAuth();
    responsableUsuario =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro si se renderiza en pruebas unitarias sin AuthProvider
  }

  const [tab, setTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('tab');
      if (
        param === 'insumos' ||
        param === 'kardex' ||
        param === 'bajo-stock' ||
        param === 'produccion' ||
        param === 'mermas' ||
        param === 'lotes'
      ) {
        return param;
      }
      if (isProductionRoutePath(window.location.pathname)) {
        return 'produccion';
      }
      if (isMermasRoutePath(window.location.pathname)) {
        return 'mermas';
      }
      if (isLotesRoutePath(window.location.pathname)) {
        return 'lotes';
      }
    }
    return 'insumos';
  });
  const [crearOpen, setCrearOpen] = useState(false);
  const [nombreInsumo, setNombreInsumo] = useState('');
  const [stockInicial, setStockInicial] = useState('');
  const [stockMinimo, setStockMinimo] = useState('10');
  const [unidad, setUnidad] = useState('unidades');
  const [costoUnitarioInsumo, setCostoUnitarioInsumo] = useState('');
  const [esEmpaqueNuevo, setEsEmpaqueNuevo] = useState(false);
  const [categoriaEmpaqueNuevo, setCategoriaEmpaqueNuevo] = useState<CategoriaEmpaque>('caja_contenedor');
  const [filtroTipoInsumo, setFiltroTipoInsumo] = useState<'todos' | 'cocina' | 'empaques'>('todos');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal unificado de Ajuste / Movimiento / Merma
  const [modalAjuste, setModalAjuste] = useState<{
    isOpen: boolean;
    insumo: Insumo | null;
    modo: ModoAjuste;
  }>({
    isOpen: false,
    insumo: null,
    modo: 'entrada',
  });

  // Modal de Conteo Físico Rápido de Bodega
  const [conteoRapidoOpen, setConteoRapidoOpen] = useState(false);

  // Modales de Producción de Cocina y Sub-Recetas
  const [subRecetaModalOpen, setSubRecetaModalOpen] = useState(false);
  const [editingSubReceta, setEditingSubReceta] = useState<Insumo | null>(null);
  const [producirLoteModal, setProducirLoteModal] = useState<{
    isOpen: boolean;
    subReceta: Insumo | null;
  }>({
    isOpen: false,
    subReceta: null,
  });

  // Modal de Control Avanzado de Mermas y Devoluciones por Escandallo
  const [mermaOperativaModal, setMermaOperativaModal] = useState<{
    isOpen: boolean;
    modo: ModoRegistroMerma;
    insumoId?: string;
  }>({
    isOpen: false,
    modo: 'insumo',
  });

  // Modales de Lotes PEPS / Vencimientos y Baja Rápida Sanitaria
  const [registrarLoteModal, setRegistrarLoteModal] = useState<{
    isOpen: boolean;
    insumoId?: string;
  }>({
    isOpen: false,
  });
  const [loteParaBaja, setLoteParaBaja] = useState<LoteEvaluadoSanitario | null>(null);
  const [insumoPreciosModalId, setInsumoPreciosModalId] = useState<string | null>(null);
  const [productosCatalogo, setProductosCatalogo] = useState<Producto[]>([]);
  const [combosCatalogo, setCombosCatalogo] = useState<Combo[]>([]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([getProductos(negocioId), getCombos(negocioId)])
      .then(([prods, combs]) => {
        if (cancelado) return;
        setProductosCatalogo(prods);
        setCombosCatalogo(combs);
      })
      .catch(() => {
        // Silencioso si se consulta sin red o fuera de sesión
      });
    return () => {
      cancelado = true;
    };
  }, [negocioId]);

  const {
    insumos,
    insumosConBajoStock,
    loading,
    error,
    crear,
    eliminar,
    registrarEntrada,
    registrarSalida,
    registrarMerma,
    registrarMermaOperativa,
    registrarAjuste,
    registrarConteoMasivo,
    guardarSubReceta,
    producirLoteSubReceta,
    refresh,
  } = useInventario();

  const {
    movimientos = [],
    movimientosFiltrados,
    loading: loadingKardex,
    error: errorKardex,
    filtros: filtrosKardex,
    setFiltros: setFiltrosKardex,
    resetFiltros: resetFiltrosKardex,
    exportarCsv: exportarKardexCsv,
    refresh: refreshKardex,
  } = useKardex({ insumos });

  const {
    lotes: lotesInventario = [],
    lotesFiltrados: lotesFiltradosInventario = [],
    resumenSanitario,
    resumenPorInsumo = {},
    loading: loadingLotes,
    error: errorLotes,
    filtros: filtrosLotes,
    setFiltros: setFiltrosLotes,
    resetFiltros: resetFiltrosLotes,
    registrarLoteManual,
    darDeBajaLote,
    toggleCuarentena,
    exportarTrazabilidadCsv,
    refresh: refreshLotes,
  } = useLotesInventario({ insumos });

  const {
    comparativasPorInsumo = {},
    resumenInflacion,
  } = usePreciosProveedores({
    insumos,
    movimientosKardex: movimientos,
    productos: productosCatalogo,
    combos: combosCatalogo,
  });

  const comparativaInsumoModal = useMemo(
    () =>
      insumoPreciosModalId
        ? comparativasPorInsumo[insumoPreciosModalId] || null
        : null,
    [insumoPreciosModalId, comparativasPorInsumo]
  );

  const lotesEnRiesgoCount =
    resumenSanitario.vencidosCount +
    resumenSanitario.criticos3dCount +
    resumenSanitario.proximos7dCount;

  const subRecetas = useMemo(() => filtrarSubRecetas(insumos), [insumos]);
  const insumosPrimarios = useMemo(() => filtrarInsumosPrimarios(insumos), [insumos]);
  const cantidadMermas = useMemo(
    () => movimientos.filter((m) => determinarTipoMovimiento(m) === 'merma').length,
    [movimientos]
  );

  const handleCrearInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombreInsumo.trim()) newErrors.nombre = 'Nombre requerido';
    const stockError = validateNonNegativeAmount(stockInicial);
    const minimoError = validatePositiveAmount(stockMinimo);
    if (stockError) newErrors.stock = stockError;
    if (minimoError) newErrors.minimo = minimoError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const stock = parseFiniteNumber(stockInicial) as number;
      const min = parseFiniteNumber(stockMinimo) as number;

      const costoUnitParsed = parseFiniteNumber(costoUnitarioInsumo);
      const insumoData: Omit<Insumo, 'id' | 'negocioId'> = {
        nombre: nombreInsumo.trim(),
        stockActual: stock,
        stockMinimo: min,
        unidad: unidad.trim() || 'unidades',
        ...(costoUnitParsed !== null && costoUnitParsed > 0 ? { costoUnitario: Math.round(costoUnitParsed) } : {}),
        ...(esEmpaqueNuevo ? { esEmpaque: true, categoriaEmpaque: categoriaEmpaqueNuevo } : {}),
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      };

      await crear(insumoData);
      createToast('Insumo creado correctamente', 'success');

      setNombreInsumo('');
      setStockInicial('');
      setStockMinimo('10');
      setUnidad('unidades');
      setCostoUnitarioInsumo('');
      setEsEmpaqueNuevo(false);
      setCategoriaEmpaqueNuevo('caja_contenedor');
      setCrearOpen(false);
      setErrors({});
      refresh();
      refreshKardex();
    } catch {
      createToast('Error al crear insumo', 'error');
    }
  };

  const handleEliminarInsumo = async (insumo: Insumo) => {
    if (!window.confirm(`¿Eliminar el insumo "${insumo.nombre}"?`)) return;
    try {
      await eliminar(insumo.id);
      createToast('Insumo eliminado exitosamente', 'success');
      refresh();
      refreshKardex();
    } catch (err) {
      console.error('Error eliminando insumo:', err);
      createToast('Error al eliminar el insumo', 'error');
    }
  };

  const handleAbrirAjuste = (insumo: Insumo | null, modo: ModoAjuste = 'entrada') => {
    setModalAjuste({
      isOpen: true,
      insumo,
      modo,
    });
  };

  const handleVerKardexInsumo = (insumo: Insumo) => {
    setFiltrosKardex((prev) => ({
      ...prev,
      insumoId: insumo.id,
    }));
    setTab('kardex');
  };

  const handleVerLotesInsumo = (insumoId: string) => {
    setFiltrosLotes((prev) => ({
      ...prev,
      insumoId,
      estadoLote: 'activo',
    }));
    setTab('lotes');
  };

  const handleToggleCuarentenaLote = async (lote: LoteEvaluadoSanitario) => {
    const ponerEnCuarentena = lote.estado !== 'cuarentena';
    try {
      await toggleCuarentena(
        lote.id,
        ponerEnCuarentena,
        ponerEnCuarentena
          ? 'Aislado en cuarentena preventiva desde bodega'
          : 'Liberado a rotación PEPS operativa',
        responsableUsuario
      );
      createToast(
        ponerEnCuarentena
          ? `Lote ${lote.codigoLote} puesto en cuarentena`
          : `Lote ${lote.codigoLote} liberado a operación`,
        'success'
      );
      refreshLotes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el lote';
      createToast(msg, 'error');
    }
  };

  const handleGuardarSubReceta = async (data: GuardarSubRecetaInput) => {
    if (!guardarSubReceta) {
      throw new Error('Servicio de sub-recetas no disponible');
    }
    return guardarSubReceta(data);
  };

  const handleConfirmarProduccion = async (input: RegistrarProduccionLoteInput) => {
    if (!producirLoteSubReceta) {
      throw new Error('Servicio de producción de lotes no disponible');
    }
    return producirLoteSubReceta(input);
  };

  const handleConfirmarMermaOperativa = async (
    input: RegistrarMermaOperativaInput
  ): Promise<ResultadoMermaOperativa> => {
    if (registrarMermaOperativa) {
      return registrarMermaOperativa(input, {
        productos: productosCatalogo,
        combos: combosCatalogo,
      });
    }
    if (input.modo === 'insumo' && input.insumoId) {
      await registrarMerma(input.insumoId, input.cantidad, input.motivo, input.notas, input.responsable);
      return {
        mermaLoteId: `merma_${Date.now()}`,
        modo: 'insumo',
        referenciaNombre: 'Insumo',
        cantidadRegistrada: input.cantidad,
        unidad: 'unid',
        motivo: input.motivo,
        origen: input.origen,
        estacion: input.estacion || 'general',
        costoTotalImpactoCOP: 0,
        insumosAfectadosCount: 1,
        movimientoIds: [],
      };
    }
    throw new Error('Servicio de mermas operativas no disponible');
  };

  const insumosEmpaque = useMemo(() => filtrarInsumosEmpaque(insumos), [insumos]);
  const displayInsumos = useMemo(() => {
    const base = tab === 'bajo-stock' ? insumosConBajoStock : insumos;
    if (tab !== 'insumos') return base;
    if (filtroTipoInsumo === 'empaques') return base.filter((i) => esInsumoEmpaque(i));
    if (filtroTipoInsumo === 'cocina') return base.filter((i) => !esInsumoEmpaque(i));
    return base;
  }, [tab, insumosConBajoStock, insumos, filtroTipoInsumo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-3xl font-bold text-white">Inventario</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-dark px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900">
          <EmptyState
            icon={AlertTriangle}
            title="No pudimos cargar el inventario"
            description="Las existencias no se reemplazaron por cero. Reintenta antes de registrar movimientos."
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      {inRouter && <RouterTabSync onTabParam={setTab} />}
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-start gap-2 text-2xl font-bold text-white sm:text-3xl">
              <Package className="h-8 w-8 shrink-0 text-gold-400" aria-hidden="true" />
              <span className="min-w-0 break-words">Inventario & Kardex Contable</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Control de existencias, producción de sub-recetas y auditoría de movimientos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setConteoRapidoOpen(true)}
              variant="secondary"
              disabled={insumos.length === 0}
              className="flex items-center gap-2 flex-1 sm:flex-none border-gold-400/40 bg-gold-400/10 text-gold-400 hover:bg-gold-400/20"
            >
              <ClipboardCheck size={16} />
              <span>Conteo Físico Rápido</span>
            </Button>

            <Button
              onClick={() => {
                setEditingSubReceta(null);
                setSubRecetaModalOpen(true);
              }}
              variant="secondary"
              className="flex items-center gap-2 flex-1 sm:flex-none border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#E5C158] hover:bg-[#C9A84C]/20"
            >
              <ChefHat size={16} aria-hidden="true" />
              <span>Nueva Sub-Receta</span>
            </Button>

            <Button
              onClick={() =>
                setMermaOperativaModal({
                  isOpen: true,
                  modo: 'producto_terminado',
                })
              }
              variant="secondary"
              className="flex items-center gap-2 flex-1 sm:flex-none border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20"
            >
              <AlertTriangle size={16} aria-hidden="true" />
              <span>Registrar Merma / Devolución</span>
            </Button>

            <Button
              onClick={() => handleAbrirAjuste(null, 'entrada')}
              variant="secondary"
              className="flex items-center gap-2 flex-1 sm:flex-none border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
            >
              <Plus size={16} />
              <span>Movimiento / Ajuste</span>
            </Button>

            <Button
              onClick={() => setRegistrarLoteModal({ isOpen: true })}
              variant="secondary"
              disabled={insumos.length === 0}
              className="flex items-center gap-2 flex-1 sm:flex-none border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            >
              <CalendarClock size={16} aria-hidden="true" />
              <span>+ Lote PEPS</span>
            </Button>

            <Button
              onClick={() => setCrearOpen(!crearOpen)}
              variant="primary"
              className="flex items-center gap-2 flex-1 sm:flex-none"
            >
              <Package size={16} />
              {crearOpen ? 'Cancelar' : 'Crear Insumo'}
            </Button>
          </div>
        </div>

        {/* Banner Sanitario de Vencimientos PEPS */}
        {lotesEnRiesgoCount > 0 && (
          <div className="mb-4 p-4 rounded-2xl border border-red-500/35 bg-gradient-to-r from-red-950/50 via-neutral-900 to-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 shrink-0">
                <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm sm:text-base text-white">
                  Semáforo Sanitario PEPS: {resumenSanitario.vencidosCount} vencido(s),{' '}
                  {resumenSanitario.criticos3dCount} en ≤ 3d y {resumenSanitario.proximos7dCount} en 4–7d
                </h2>
                <p className="text-xs text-neutral-300">
                  Capital en riesgo: <strong className="text-gold-300">{formatCOP(resumenSanitario.valorEnRiesgoCOP)}</strong>. Da de baja lotes expirados o prioriza su salida en cocina.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFiltrosLotes((prev) => ({
                  ...prev,
                  estadoLote: 'activo',
                  estadoSemaforo: 'en_riesgo',
                }));
                setTab('lotes');
              }}
              className="h-11 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors shadow shrink-0"
            >
              <CalendarClock className="w-4 h-4" aria-hidden="true" />
              <span>Ver Semáforo PEPS</span>
            </button>
          </div>
        )}

        {/* Banner de Alerta de Inflación de Bodega (> 10%) */}
        {resumenInflacion.alertasAlzaCriticaCount > 0 && (
          <div className="mb-4 p-4 rounded-2xl border border-red-500/35 bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-300 shrink-0">
                <TrendingUp className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm sm:text-base text-white">
                  Alerta de Inflación de Bodega: {resumenInflacion.alertasAlzaCriticaCount}{' '}
                  {resumenInflacion.alertasAlzaCriticaCount === 1
                    ? 'insumo con alza > 10%'
                    : 'insumos con alza > 10%'}
                </h2>
                <p className="text-xs text-neutral-300">
                  Índice acumulado:{' '}
                  <strong className="text-red-300">
                    {resumenInflacion.indiceInflacionPromedioPct > 0 ? '+' : ''}
                    {resumenInflacion.indiceInflacionPromedioPct}%
                  </strong>{' '}
                  · {resumenInflacion.recetasImpactadasCount} plato(s) con presión de Food Cost.
                </p>
              </div>
            </div>

            <a
              href="/proveedores?tab=comparador"
              className="h-11 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors shadow shrink-0"
            >
              <TrendingUp className="w-4 h-4" aria-hidden="true" />
              <span>Comparar Proveedores</span>
            </a>
          </div>
        )}

        {/* Banner Inteligente de Quiebre de Stock y Órdenes de Compra */}
        {insumosConBajoStock.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-neutral-900 to-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm sm:text-base text-white">
                  {insumosConBajoStock.length}{' '}
                  {insumosConBajoStock.length === 1
                    ? 'insumo presenta quiebre de stock mínimo'
                    : 'insumos presentan quiebre de stock mínimo'}
                </h2>
                <p className="text-xs text-neutral-300">
                  Genera órdenes de compra sugeridas automáticamente, envíalas por WhatsApp y recíbelas en 1 clic al Kardex.
                </p>
              </div>
            </div>

            <a
              href="/proveedores?tab=ordenes"
              className="h-11 px-4 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors shadow shrink-0"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Órdenes de Compra Inteligentes</span>
            </a>
          </div>
        )}

        {/* Form crear insumo */}
        {crearOpen && (
          <Card className="mb-6 p-4 bg-neutral-900 border-neutral-800">
            <h3 className="text-base font-bold text-white mb-3">Nuevo Insumo</h3>
            <form onSubmit={handleCrearInsumo} className="space-y-3">
              <Input
                label="Nombre del Insumo"
                value={nombreInsumo}
                onChange={(e) => {
                  setNombreInsumo(e.target.value);
                  if (errors.nombre) setErrors({ ...errors, nombre: '' });
                }}
                placeholder="Ej: Pan hamburguesa"
                error={errors.nombre}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Input
                  label="Stock Inicial"
                  type="number"
                  min="0.01"
                  value={stockInicial}
                  onChange={(e) => {
                    setStockInicial(e.target.value);
                    if (errors.stock) setErrors({ ...errors, stock: '' });
                  }}
                  placeholder="50"
                  error={errors.stock}
                />
                <Input
                  label="Stock Mínimo Alerta"
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  placeholder="10"
                  error={errors.minimo}
                />
                <Input
                  label="Unidad de Medida"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  placeholder="unidades, kg, litros"
                />
                <Input
                  label="Costo Unitario (COP)"
                  type="number"
                  min="0"
                  value={costoUnitarioInsumo}
                  onChange={(e) => setCostoUnitarioInsumo(e.target.value)}
                  placeholder="Ej: 350"
                />
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3 space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={esEmpaqueNuevo}
                    onChange={(e) => setEsEmpaqueNuevo(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-teal-400 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-teal-300">
                      Es Empaque, Bolsa o Desechable por Canal
                    </span>
                    <span className="block text-[11px] text-neutral-400">
                      Se descontará automáticamente solo en pedidos Para Llevar o Domicilio
                    </span>
                  </div>
                </label>
                {esEmpaqueNuevo && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    {CATEGORIAS_EMPAQUE_ORDEN.map((catId) => {
                      const meta = CATEGORIAS_EMPAQUE_META[catId];
                      const active = categoriaEmpaqueNuevo === catId;
                      return (
                        <button
                          key={catId}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setCategoriaEmpaqueNuevo(catId)}
                          className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors min-h-[44px] ${
                            active
                              ? 'border-teal-500/60 bg-teal-500/15 text-teal-200 font-semibold'
                              : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {meta.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <Button type="submit" variant="primary" className="w-full">
                Guardar Insumo
              </Button>
            </form>
          </Card>
        )}

        {/* Tabs Principales */}
        <div
          className="mb-6 flex gap-2 border-b border-neutral-700 overflow-x-auto"
          role="group"
          aria-label="Filtrar inventario"
        >
          <button
            type="button"
            onClick={() => setTab('insumos')}
            aria-pressed={tab === 'insumos'}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
              tab === 'insumos'
                ? 'border-b-2 border-gold-400 text-gold-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" aria-hidden="true" /> Insumos ({insumos.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('kardex')}
            aria-selected={tab === 'kardex'}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
              tab === 'kardex'
                ? 'border-b-2 border-gold-400 text-gold-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" /> Kardex de Movimientos ({movimientosFiltrados.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('bajo-stock')}
            aria-pressed={tab === 'bajo-stock'}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
              tab === 'bajo-stock'
                ? 'border-b-2 border-gold-400 text-gold-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Bajo stock ({insumosConBajoStock.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('produccion')}
            aria-selected={tab === 'produccion'}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
              tab === 'produccion'
                ? 'border-b-2 border-gold-400 text-gold-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <ChefHat className="h-4 w-4" aria-hidden="true" /> Producción &amp; Sub-Recetas ({subRecetas.length})
          </button>

          <button
            type="button"
            onClick={() => setTab('mermas')}
            aria-selected={tab === 'mermas'}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
              tab === 'mermas'
                ? 'border-b-2 border-red-400 text-red-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Mermas &amp; Devoluciones ({cantidadMermas})
          </button>

          <button
            type="button"
            onClick={() => setTab('lotes')}
            aria-selected={tab === 'lotes'}
            className={`flex items-center gap-1.5 px-4 py-2 font-semibold transition-colors whitespace-nowrap min-h-[44px] ${
              tab === 'lotes'
                ? 'border-b-2 border-emerald-400 text-emerald-300'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarClock className="h-4 w-4" aria-hidden="true" /> Lotes &amp; Vencimientos ({resumenSanitario.totalLotesActivos})
            {lotesEnRiesgoCount > 0 && (
              <span className="ml-1 rounded-full bg-red-500/20 border border-red-500/40 px-1.5 py-0.2 text-[10px] font-bold text-red-300">
                {lotesEnRiesgoCount}
              </span>
            )}
          </button>
        </div>

        {/* Contenido según pestaña */}
        {tab === 'lotes' ? (
          <LotesVencimientoView
            lotes={lotesInventario}
            lotesFiltrados={lotesFiltradosInventario}
            resumenSanitario={resumenSanitario}
            insumos={insumos}
            nombreNegocio={negocioNombre}
            loading={loadingLotes}
            error={errorLotes}
            filtros={filtrosLotes}
            setFiltros={setFiltrosLotes}
            resetFiltros={resetFiltrosLotes}
            onAbrirRegistrarLote={(insumoId) =>
              setRegistrarLoteModal({ isOpen: true, insumoId })
            }
            onAbrirBajaLote={(lote) => setLoteParaBaja(lote)}
            onToggleCuarentena={handleToggleCuarentenaLote}
            onVerKardexInsumo={(insumoId) => {
              setFiltrosKardex((prev) => ({ ...prev, insumoId }));
              setTab('kardex');
            }}
            onExportarCsv={() => exportarTrazabilidadCsv(negocioNombre)}
            onReintentar={() => refreshLotes()}
          />
        ) : tab === 'mermas' ? (
          <ControlMermasView
            insumos={insumos}
            movimientosKardex={movimientos}
            nombreNegocio={negocioNombre}
            onAbrirRegistroMerma={(modo) =>
              setMermaOperativaModal({
                isOpen: true,
                modo: modo || 'producto_terminado',
              })
            }
          />
        ) : tab === 'produccion' ? (
          <ProduccionCocinaView
            insumos={insumos}
            movimientosKardex={movimientos}
            onAbrirNuevaSubReceta={() => {
              setEditingSubReceta(null);
              setSubRecetaModalOpen(true);
            }}
            onEditarSubReceta={(sub) => {
              setEditingSubReceta(sub);
              setSubRecetaModalOpen(true);
            }}
            onAbrirProducirLote={(sub) => {
              setProducirLoteModal({ isOpen: true, subReceta: sub });
            }}
            onVerKardexSubReceta={handleVerKardexInsumo}
            onEliminarSubReceta={handleEliminarInsumo}
          />
        ) : tab === 'kardex' ? (
          <KardexMovimientosView
            movimientos={movimientosFiltrados}
            insumos={insumos}
            loading={loadingKardex}
            error={errorKardex}
            filtros={filtrosKardex}
            setFiltros={setFiltrosKardex}
            resetFiltros={resetFiltrosKardex}
            onExportarCsv={() => exportarKardexCsv()}
            onAbrirNuevoMovimiento={(insumoId, modo) => {
              const ins = insumos.find((i) => i.id === insumoId) || null;
              handleAbrirAjuste(ins, modo || 'entrada');
            }}
          />
        ) : displayInsumos.length === 0 ? (
          <EmptyState
            icon={tab === 'bajo-stock' ? AlertTriangle : TrendingDown}
            title={tab === 'bajo-stock' ? 'Stock normal' : 'Sin insumos'}
            description={
              tab === 'bajo-stock'
                ? 'Todos los insumos tienen stock suficiente'
                : 'Crea tu primer insumo para gestionar materias primas'
            }
          />
        ) : (
          <div className="space-y-4">
            {tab === 'insumos' && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por tipo de insumo">
                <button
                  type="button"
                  aria-pressed={filtroTipoInsumo === 'todos'}
                  onClick={() => setFiltroTipoInsumo('todos')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                    filtroTipoInsumo === 'todos'
                      ? 'border-gold-400/60 bg-gold-400/15 text-gold-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  Todos ({insumos.length})
                </button>
                <button
                  type="button"
                  aria-pressed={filtroTipoInsumo === 'cocina'}
                  onClick={() => setFiltroTipoInsumo('cocina')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                    filtroTipoInsumo === 'cocina'
                      ? 'border-gold-400/60 bg-gold-400/15 text-gold-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  Cocina / Ingredientes ({insumos.length - insumosEmpaque.length})
                </button>
                <button
                  type="button"
                  aria-pressed={filtroTipoInsumo === 'empaques'}
                  onClick={() => setFiltroTipoInsumo('empaques')}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors min-h-[36px] ${
                    filtroTipoInsumo === 'empaques'
                      ? 'border-teal-500/60 bg-teal-500/15 text-teal-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                >
                  Empaques &amp; Desechables ({insumosEmpaque.length})
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayInsumos.map((insumo) => {
              const porcentajeStock = calculateInventoryStockPercentage(insumo);
              const isLowStock = isInventoryLowStock(insumo);
              const esSubReceta = esInsumoSubReceta(insumo);

              return (
                <Card key={insumo.id} className="p-4 bg-neutral-900 border-neutral-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-white">{insumo.nombre}</h3>
                        {esSubReceta && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-2 py-0.5 text-[10px] font-bold text-[#E5C158]">
                            <ChefHat className="h-3 w-3" aria-hidden="true" /> Sub-Receta · Lote{' '}
                            {insumo.rendimientoLote || 1} {insumo.unidad}
                          </span>
                        )}
                        {esInsumoEmpaque(insumo) && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-md border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                            <Package className="h-3 w-3" aria-hidden="true" /> Empaque
                            {insumo.categoriaEmpaque
                              ? ` · ${CATEGORIAS_EMPAQUE_META[insumo.categoriaEmpaque]?.label || insumo.categoriaEmpaque}`
                              : ''}
                          </span>
                        )}
                        {resumenPorInsumo[insumo.id] && (() => {
                          const infoLotes = resumenPorInsumo[insumo.id];
                          const semMeta = SEMAFORO_SANITARIO_META[infoLotes.peorSemaforo];
                          return (
                            <span className={`mt-1 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${semMeta.badgeClass}`}>
                              <CalendarClock className="h-3 w-3" aria-hidden="true" />
                              {infoLotes.cantidadLotesActivos} lote(s)
                              {infoLotes.proximoVencimiento
                                ? ` · Vence ${formatearFechaVencimientoCorta(infoLotes.proximoVencimiento)}`
                                : ''}
                            </span>
                          );
                        })()}
                      </div>
                      {isLowStock ? (
                        <Badge variant="outline" className="border-red-500 text-red-400 bg-red-500/10 shrink-0">
                          <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Bajo stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10 shrink-0">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Normal
                        </Badge>
                      )}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-400">Existencias actuales:</span>
                        <span className={`font-bold ${isLowStock ? 'text-red-400 text-lg' : 'text-white text-lg'}`}>
                          {insumo.stockActual || 0} <span className="text-xs font-normal text-neutral-400">{insumo.unidad}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-neutral-400">
                        <span>Alerta mínima:</span>
                        <span>{insumo.stockMinimo} {insumo.unidad}</span>
                      </div>

                      {typeof insumo.costoUnitario === 'number' && insumo.costoUnitario > 0 && (
                        <div className="flex items-center justify-between text-xs text-neutral-400">
                          <span>Costo unitario ref.:</span>
                          <span className="font-mono font-semibold text-gold-400">
                            {formatCOP(insumo.costoUnitario)} / {insumo.unidad}
                          </span>
                        </div>
                      )}

                      {comparativasPorInsumo[insumo.id] && (comparativasPorInsumo[insumo.id].tieneAlertaAlzaCritica || comparativasPorInsumo[insumo.id].ahorroPotencialUnitarioCOP > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {comparativasPorInsumo[insumo.id].tieneAlertaAlzaCritica && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-300">
                              <TrendingUp className="h-3 w-3" aria-hidden="true" />
                              Alza +{comparativasPorInsumo[insumo.id].variacionUltimoSaltoPct}%
                            </span>
                          )}
                          {comparativasPorInsumo[insumo.id].ahorroPotencialUnitarioCOP > 0 && comparativasPorInsumo[insumo.id].mejorProveedor && (
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Mejor: {comparativasPorInsumo[insumo.id].mejorProveedor?.proveedorNombre} ({formatCOP(comparativasPorInsumo[insumo.id].mejorProveedor?.ultimoCostoCOP || 0)})
                            </span>
                          )}
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className={`h-full transition-all ${
                            isLowStock ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(porcentajeStock, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAbrirAjuste(insumo, 'entrada')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-green-400 hover:text-green-300 min-h-[36px]"
                        title="Registrar entrada de stock"
                      >
                        <Plus size={14} /> Entrada
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAbrirAjuste(insumo, 'salida')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-orange-400 hover:text-orange-300 min-h-[36px]"
                        title="Registrar salida de stock"
                      >
                        <Minus size={14} /> Salida
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAbrirAjuste(insumo, 'merma')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-red-400 hover:text-red-300 min-h-[36px]"
                        title="Registrar merma o desperdicio"
                      >
                        <AlertTriangle size={14} /> Merma
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleVerKardexInsumo(insumo)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-gold-400 hover:text-gold-300 min-h-[36px]"
                        title="Ver movimientos en Kardex"
                      >
                        <BookOpen size={14} /> Kardex
                      </Button>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleVerLotesInsumo(insumo.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-emerald-300 hover:text-emerald-200 min-h-[36px]"
                        title="Ver lotes y caducidad PEPS"
                      >
                        <CalendarClock size={14} aria-hidden="true" /> Lotes
                      </Button>

                      {comparativasPorInsumo[insumo.id] && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setInsumoPreciosModalId(insumo.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 text-sky-300 hover:text-sky-200 min-h-[36px]"
                          title="Ver histórico de precios entre proveedores"
                        >
                          <TrendingUp size={14} aria-hidden="true" /> Precios
                        </Button>
                      )}

                      {esSubReceta && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setProducirLoteModal({ isOpen: true, subReceta: insumo })}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 border border-[#C9A84C]/40 bg-[#C9A84C]/10 text-[#E5C158] hover:bg-[#C9A84C]/20 min-h-[36px]"
                          title="Producir lote desde insumos primarios"
                        >
                          <Flame size={14} aria-hidden="true" /> Producir Lote
                        </Button>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleEliminarInsumo(insumo)}
                      className="h-11 w-11 p-2"
                      title="Eliminar insumo"
                      aria-label={`Eliminar insumo ${insumo.nombre}`}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
            </div>
          </div>
        )}

        {/* Modal Unificado de Movimientos / Entrada / Salida / Merma / Ajuste */}
        <AjusteStockModal
          isOpen={modalAjuste.isOpen}
          onClose={() => setModalAjuste((prev) => ({ ...prev, isOpen: false }))}
          insumo={modalAjuste.insumo}
          modoInicial={modalAjuste.modo}
          insumosDisponibles={insumos}
          onEjecutarEntrada={registrarEntrada}
          onEjecutarSalida={registrarSalida}
          onEjecutarMerma={registrarMerma}
          onEjecutarAjuste={registrarAjuste}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Conteo Físico Rápido de Bodega */}
        <ConteoFisicoRapidoModal
          isOpen={conteoRapidoOpen}
          onClose={() => setConteoRapidoOpen(false)}
          insumos={insumos}
          onConfirmarConteo={async (input) => {
            const res = await registrarConteoMasivo(input);
            createToast(
              res.ajustadosCount > 0
                ? `Conteo físico aplicado: ${res.ajustadosCount} insumos actualizados en Kardex`
                : 'Bodega verificada sin diferencias',
              'success'
            );
            return res;
          }}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Configuración de Sub-Receta / Preparación Base */}
        <SubRecetaFormModal
          isOpen={subRecetaModalOpen}
          onClose={() => {
            setSubRecetaModalOpen(false);
            setEditingSubReceta(null);
          }}
          insumosPrimarios={insumosPrimarios}
          movimientosKardex={movimientos}
          initialSubReceta={editingSubReceta}
          onGuardar={handleGuardarSubReceta}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Producción Atómica de Lote en Cocina */}
        <ProducirLoteModal
          isOpen={producirLoteModal.isOpen}
          onClose={() => setProducirLoteModal({ isOpen: false, subReceta: null })}
          subReceta={producirLoteModal.subReceta}
          insumos={insumos}
          movimientosKardex={movimientos}
          onConfirmarProduccion={handleConfirmarProduccion}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Registro Avanzado de Mermas, Desperdicios y Devoluciones */}
        <RegistrarMermaOperativaModal
          isOpen={mermaOperativaModal.isOpen}
          onClose={() => setMermaOperativaModal((prev) => ({ ...prev, isOpen: false }))}
          insumos={insumos}
          productos={productosCatalogo}
          combos={combosCatalogo}
          movimientosKardex={movimientos}
          modoInicial={mermaOperativaModal.modo}
          insumoPreseleccionadoId={mermaOperativaModal.insumoId}
          onRegistrarMerma={handleConfirmarMermaOperativa}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Registro Manual de Lote y Vencimiento */}
        <RegistrarLoteModal
          isOpen={registrarLoteModal.isOpen}
          onClose={() => setRegistrarLoteModal({ isOpen: false })}
          insumos={insumos}
          insumoPreseleccionadoId={registrarLoteModal.insumoId}
          onRegistrarLote={registrarLoteManual}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Baja Rápida de Lote a Merma */}
        <BajaRapidaLoteModal
          isOpen={Boolean(loteParaBaja)}
          onClose={() => setLoteParaBaja(null)}
          lote={loteParaBaja}
          onConfirmarBaja={darDeBajaLote}
          onSuccess={() => {
            refresh();
            refreshKardex();
            refreshLotes();
          }}
        />

        {/* Modal de Histórico de Precios entre Proveedores */}
        <DetalleHistoricoPrecioModal
          isOpen={Boolean(comparativaInsumoModal)}
          onClose={() => setInsumoPreciosModalId(null)}
          comparativa={comparativaInsumoModal}
        />
      </div>
    </div>
  );
}
