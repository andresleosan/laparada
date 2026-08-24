// src/pages/InventarioPage.tsx
import { useState } from 'react';
import type { Insumo } from '@/types';
import { useInventario } from '@/hooks/useInventario';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { verifyAdminPin } from '@/services/changePinService';
import { Plus, Minus, AlertTriangle, TrendingDown, Trash2, Package, AlertCircle, CheckCircle } from 'lucide-react';

type TabType = 'insumos' | 'bajo-stock';

export function InventarioPage() {
  const [tab, setTab] = useState<TabType>('insumos');
  const [crearOpen, setCrearOpen] = useState(false);
  const [nombreInsumo, setNombreInsumo] = useState('');
  const [stockInicial, setStockInicial] = useState('');
  const [stockMinimo, setStockMinimo] = useState('10');
  const [unidad, setUnidad] = useState('unidades');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modal para ajustar stock (Entrada / Salida)
  const [insumoAjuste, setInsumoAjuste] = useState<{ insumo: Insumo; tipo: 'entrada' | 'salida' } | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [costoEntrada, setCostoEntrada] = useState('');
  const [cargandoAjuste, setCargandoAjuste] = useState(false);

  // Modal de PIN para eliminar
  const [insumoAEliminar, setInsumoAEliminar] = useState<Insumo | null>(null);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [cargandoEliminar, setCargandoEliminar] = useState(false);
  const [exitoEliminar, setExitoEliminar] = useState(false);

  const { insumos, insumosConBajoStock, loading, crear, eliminar, registrarEntrada, registrarSalida, refresh } =
    useInventario();

  const handleCrearInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombreInsumo.trim()) newErrors.nombre = 'Nombre requerido';
    if (!stockInicial.trim() || isNaN(Number(stockInicial))) newErrors.stock = 'Stock inicial válido requerido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const stock = Number(stockInicial);
      const min = Number(stockMinimo) || 10;

      const insumoData: Omit<Insumo, 'id'> = {
        nombre: nombreInsumo.trim(),
        stockActual: stock,
        stockMinimo: min,
        unidad: unidad.trim() || 'unidades',
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      };

      await crear(insumoData);
      createToast('✅ Insumo creado correctamente', 'success');

      setNombreInsumo('');
      setStockInicial('');
      setStockMinimo('10');
      setUnidad('unidades');
      setCrearOpen(false);
      setErrors({});
      refresh();
    } catch (err) {
      createToast('❌ Error al crear insumo', 'error');
    }
  };

  const handleGuardarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoAjuste) return;

    const cant = Number(cantidadAjuste);
    if (!cantidadAjuste.trim() || isNaN(cant) || cant <= 0) {
      createToast('❌ Ingresa una cantidad válida mayor a 0', 'error');
      return;
    }

    setCargandoAjuste(true);
    try {
      if (insumoAjuste.tipo === 'entrada') {
        const costo = Number(costoEntrada) || 0;
        await registrarEntrada(insumoAjuste.insumo.id, cant, costo);
        createToast(`✅ Stock agregado: +${cant} ${insumoAjuste.insumo.unidad}`, 'success');
      } else {
        await registrarSalida(insumoAjuste.insumo.id, cant);
        createToast(`✅ Salida registrada: -${cant} ${insumoAjuste.insumo.unidad}`, 'success');
      }

      setInsumoAjuste(null);
      setCantidadAjuste('');
      setCostoEntrada('');
      refresh();
    } catch (err) {
      createToast('❌ Error al ajustar stock', 'error');
    } finally {
      setCargandoAjuste(false);
    }
  };

  const handleEliminarInsumoConPin = async () => {
    if (!insumoAEliminar) return;

    setCargandoEliminar(true);
    try {
      const esValido = await verifyAdminPin(pinIngresado);
      if (!esValido) {
        setErrorPin('PIN incorrecto');
        return;
      }

      await eliminar(insumoAEliminar.id);
      setExitoEliminar(true);

      setTimeout(() => {
        setInsumoAEliminar(null);
        setPinIngresado('');
        setErrorPin('');
        setExitoEliminar(false);
        refresh();
      }, 1500);

      createToast('✅ Insumo eliminado exitosamente', 'success');
    } catch (err) {
      setErrorPin('Error al verificar PIN o eliminar');
    } finally {
      setCargandoEliminar(false);
    }
  };

  const displayInsumos = tab === 'bajo-stock' ? insumosConBajoStock : insumos;

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">Inventario</h1>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Package className="h-8 w-8 text-gold-400" />
              Inventario de Insumos
            </h1>
            <p className="mt-1 text-sm text-neutral-400">Control de materias primas y existencias</p>
          </div>

          <Button
            onClick={() => setCrearOpen(!crearOpen)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {crearOpen ? 'Cancelar' : 'Crear Insumo'}
          </Button>
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
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Stock Inicial"
                  type="number"
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
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  placeholder="10"
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

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-neutral-700">
          <button
            onClick={() => setTab('insumos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'insumos'
                ? 'border-b-2 border-gold-400 text-gold-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            📦 Todos ({insumos.length})
          </button>
          <button
            onClick={() => setTab('bajo-stock')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'bajo-stock'
                ? 'border-b-2 border-gold-400 text-gold-400'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            ⚠️ Bajo Stock ({insumosConBajoStock.length})
          </button>
        </div>

        {/* Contenido */}
        {displayInsumos.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayInsumos.map((insumo) => {
              const porcentajeStock =
                ((insumo.stockActual || 0) / (insumo.stockMinimo || 10)) * 100;
              const isLowStock = (insumo.stockActual || 0) < (insumo.stockMinimo || 10);

              return (
                <Card key={insumo.id} className="p-4 bg-neutral-900 border-neutral-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="text-base font-semibold text-white">{insumo.nombre}</h3>
                      {isLowStock ? (
                        <Badge variant="outline" className="border-red-500 text-red-400 bg-red-500/10">
                          ⚠️ Bajo Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500 text-green-400 bg-green-500/10">
                          ✓ Normal
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
                        <span>{insumo.stockMinimo || 10} {insumo.unidad}</span>
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
                  <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setInsumoAjuste({ insumo, tipo: 'entrada' });
                          setCantidadAjuste('');
                          setCostoEntrada('');
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-green-400 hover:text-green-300"
                        title="Registrar entrada de stock"
                      >
                        <Plus size={14} /> Entrada
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setInsumoAjuste({ insumo, tipo: 'salida' });
                          setCantidadAjuste('');
                        }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 text-orange-400 hover:text-orange-300"
                        title="Registrar salida o merma de stock"
                      >
                        <Minus size={14} /> Salida
                      </Button>
                    </div>

                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setInsumoAEliminar(insumo);
                        setPinIngresado('');
                        setErrorPin('');
                        setExitoEliminar(false);
                      }}
                      className="p-1.5 h-8 w-8"
                      title="Eliminar insumo"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal de Entrada / Salida de Stock */}
        {insumoAjuste && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">
                {insumoAjuste.tipo === 'entrada' ? '📥 Registrar Entrada de Stock' : '📤 Registrar Salida de Stock'}
              </h3>
              <p className="text-xs text-neutral-400 mb-4">
                Insumo: <span className="text-gold-400 font-semibold">{insumoAjuste.insumo.nombre}</span> (Stock actual: {insumoAjuste.insumo.stockActual} {insumoAjuste.insumo.unidad})
              </p>

              <form onSubmit={handleGuardarAjuste} className="space-y-3">
                <Input
                  label={`Cantidad a ${insumoAjuste.tipo === 'entrada' ? 'sumar' : 'restar'} (${insumoAjuste.insumo.unidad})`}
                  type="number"
                  placeholder="Ej: 10"
                  value={cantidadAjuste}
                  onChange={(e) => setCantidadAjuste(e.target.value)}
                  autoFocus
                  required
                />

                {insumoAjuste.tipo === 'entrada' && (
                  <Input
                    label="Costo total de la compra (opcional)"
                    type="number"
                    placeholder="Ej: 25000"
                    value={costoEntrada}
                    onChange={(e) => setCostoEntrada(e.target.value)}
                  />
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setInsumoAjuste(null)}
                    disabled={cargandoAjuste}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={cargandoAjuste}
                    disabled={cargandoAjuste || !cantidadAjuste.trim()}
                    className="flex-1"
                  >
                    {insumoAjuste.tipo === 'entrada' ? 'Agregar Stock' : 'Restar Stock'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de PIN para eliminar insumo */}
        {insumoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
              {exitoEliminar ? (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto mb-3 h-12 w-12 text-green-500" />
                  <h3 className="text-lg font-bold text-white">Insumo Eliminado</h3>
                  <p className="text-xs text-neutral-400 mt-1">Se ha removido del inventario</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/30 p-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-sm">Eliminar Insumo</p>
                      <p className="text-xs text-neutral-400">{insumoAEliminar.nombre}</p>
                    </div>
                  </div>

                  <p className="mb-3 text-xs text-neutral-300">
                    Ingresa el PIN administrativo para confirmar la eliminación:
                  </p>

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
                        handleEliminarInsumoConPin();
                      }
                    }}
                    disabled={cargandoEliminar}
                    className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none disabled:opacity-50 tracking-widest text-center"
                    maxLength={6}
                    autoFocus
                  />

                  {errorPin && (
                    <p className="mb-3 text-xs text-red-400 text-center">{errorPin}</p>
                  )}

                  <div className="flex gap-3 mt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setInsumoAEliminar(null)}
                      disabled={cargandoEliminar}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleEliminarInsumoConPin}
                      loading={cargandoEliminar}
                      disabled={cargandoEliminar || pinIngresado.length === 0}
                      className="flex-1"
                    >
                      Confirmar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
