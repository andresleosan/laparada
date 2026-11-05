// src/pages/InventarioPage.tsx
import { useState } from 'react';
import type { Insumo } from '@/types';
import { useInventario } from '@/hooks/useInventario';
import { useKardex } from '@/hooks/useKardex';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { AjusteStockModal, type ModoAjuste } from '@/components/inventario/AjusteStockModal';
import { KardexMovimientosView } from '@/components/inventario/KardexMovimientosView';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Trash2,
  TrendingDown,
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

type TabType = 'insumos' | 'kardex' | 'bajo-stock';

export function InventarioPage() {
  const [tab, setTab] = useState<TabType>('insumos');
  const [crearOpen, setCrearOpen] = useState(false);
  const [nombreInsumo, setNombreInsumo] = useState('');
  const [stockInicial, setStockInicial] = useState('');
  const [stockMinimo, setStockMinimo] = useState('10');
  const [unidad, setUnidad] = useState('unidades');
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
    registrarAjuste,
    refresh,
  } = useInventario();

  const {
    movimientosFiltrados,
    loading: loadingKardex,
    error: errorKardex,
    filtros: filtrosKardex,
    setFiltros: setFiltrosKardex,
    resetFiltros: resetFiltrosKardex,
    exportarCsv: exportarKardexCsv,
    refresh: refreshKardex,
  } = useKardex({ insumos });

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

      const insumoData: Omit<Insumo, 'id' | 'negocioId'> = {
        nombre: nombreInsumo.trim(),
        stockActual: stock,
        stockMinimo: min,
        unidad: unidad.trim() || 'unidades',
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      };

      await crear(insumoData);
      createToast('Insumo creado correctamente', 'success');

      setNombreInsumo('');
      setStockInicial('');
      setStockMinimo('10');
      setUnidad('unidades');
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

  const displayInsumos = tab === 'bajo-stock' ? insumosConBajoStock : insumos;

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
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="flex min-w-0 items-start gap-2 text-2xl font-bold text-white sm:text-3xl">
              <Package className="h-8 w-8 shrink-0 text-gold-400" aria-hidden="true" />
              <span className="min-w-0 break-words">Inventario & Kardex Contable</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Control de existencias, valuación de bodega y auditoría de movimientos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => handleAbrirAjuste(null, 'entrada')}
              variant="secondary"
              className="flex items-center gap-2 flex-1 sm:flex-none border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700"
            >
              <Plus size={16} />
              <span>Movimiento / Ajuste</span>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
        </div>

        {/* Contenido según pestaña */}
        {tab === 'kardex' ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayInsumos.map((insumo) => {
              const porcentajeStock = calculateInventoryStockPercentage(insumo);
              const isLowStock = isInventoryLowStock(insumo);

              return (
                <Card key={insumo.id} className="p-4 bg-neutral-900 border-neutral-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-white">{insumo.nombre}</h3>
                      {isLowStock ? (
                        <Badge variant="outline" className="border-red-500 text-red-400 bg-red-500/10">
                          <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Bajo stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10">
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
          }}
        />
      </div>
    </div>
  );
}
