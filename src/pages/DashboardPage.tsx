// src/pages/DashboardPage.tsx

import { useState } from 'react';
import { TrendingUp, TrendingDown, ShoppingBag, Truck, AlertCircle, RefreshCw, Wallet, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useJornada } from '@/context/JornadaContext';
import { useReportes } from '@/hooks/useReportes';
import { useDomicilios } from '@/hooks/useDomicilios';
import { useCaja } from '@/hooks/useCaja';
import { getNombreJornada } from '@/utils/jornadaUtils';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

const categoriaEmoji: Record<string, string> = {
  gas: '⛽',
  insumos: '📦',
  mantenimiento: '🔧',
  otros: '❓',
  domiciliario: '🚗',
  servicios: '⚡',
  varios: '📋',
  salarios: '👨‍💼',
};

const ordenCategorias = ['gas', 'insumos', 'mantenimiento', 'otros', 'domiciliario', 'servicios', 'varios', 'salarios'];

export function DashboardPage() {
  const { jornadaActual } = useJornada();
  const { resumen, loading: loadingReportes, refresh: refreshReportes } = useReportes();
  const { activos, loading: loadingDomicilios } = useDomicilios('ambas');
  const { cajaActual, loading: loadingCaja, crearCajaHoy } = useCaja();
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarFormularioCaja, setMostrarFormularioCaja] = useState(false);
  const [montoCajaStr, setMontoCajaStr] = useState('');
  const [creandoCaja, setCreandoCaja] = useState(false);

  const pendientes = activos.filter(d => d.estado === 'en_camino').length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshReportes();
    setRefreshing(false);
  };

  const handleCrearCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoCajaStr.trim() || isNaN(Number(montoCajaStr))) {
      createToast('❌ Ingresa un monto válido', 'error');
      return;
    }

    try {
      setCreandoCaja(true);
      const monto = Number(montoCajaStr); // Guardar directo sin conversión
      await crearCajaHoy(monto);
      createToast('✅ Caja iniciada', 'success');
      setMontoCajaStr('');
      setMostrarFormularioCaja(false);
    } catch (err) {
      createToast('❌ Error creando caja', 'error');
      console.error('Error:', err);
    } finally {
      setCreandoCaja(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-dark to-neutral-900 pb-20 px-4 py-6">
      {/* Header con Refresh */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold text-gold-400 mb-2">Dashboard</h1>
          <p className="text-neutral-400 text-base">
            🕐 Jornada: <span className="text-neutral-200 font-semibold">{getNombreJornada(jornadaActual)}</span>
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-gold-400 hover:bg-gold-500 disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`h-5 w-5 text-base-dark ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards - Principal */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Ventas Hoy */}
        <Card className="p-4 bg-gradient-to-br from-gold-400/10 to-gold-400/5 border-gold-400/30">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Ventas Hoy</p>
              <div className="text-2xl font-bold text-gold-400 mt-2 font-display">
                {loadingReportes ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  formatCOP(resumen.totalVentas)
                )}
              </div>
            </div>
            <ShoppingBag className="h-8 w-8 text-gold-400 opacity-80" />
          </div>
          <div className="pt-2 border-t border-gold-400/20">
            <div className="flex items-center gap-1 text-xs text-green-400 font-semibold">
              <TrendingUp className="h-4 w-4" />
              <span>+12% vs ayer</span>
            </div>
          </div>
        </Card>

        {/* Pedidos */}
        <Card className="p-4 bg-gradient-to-br from-blue-400/10 to-blue-400/5 border-blue-400/30">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Pedidos</p>
              <div className="text-2xl font-bold text-blue-400 mt-2 font-display">
                {loadingReportes ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  resumen.cantidadVentas
                )}
              </div>
            </div>
            <ShoppingBag className="h-8 w-8 text-blue-400 opacity-80" />
          </div>
          <div className="pt-2 border-t border-blue-400/20">
            <div className="flex items-center gap-1 text-xs text-red-400 font-semibold">
              <TrendingDown className="h-4 w-4" />
              <span>-2% vs ayer</span>
            </div>
          </div>
        </Card>

        {/* Ganancia Neta */}
        <Card className="p-4 bg-gradient-to-br from-green-400/10 to-green-400/5 border-green-400/30">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">Ganancia Neta</p>
              <div className="text-2xl font-bold text-green-400 mt-2 font-display">
                {loadingReportes ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  formatCOP(resumen.gananciaNeta)
                )}
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-green-400 opacity-80" />
          </div>
          <div className="pt-2 border-t border-green-400/20">
            <p className="text-xs text-neutral-400">Ingresos - Gastos</p>
          </div>
        </Card>

        {/* Domicilios Pendientes */}
        <Card className={`p-4 ${pendientes > 0 ? 'bg-gradient-to-br from-red-400/10 to-red-400/5 border-red-400/30' : 'bg-gradient-to-br from-green-400/10 to-green-400/5 border-green-400/30'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">En Camino</p>
              <div className={`text-2xl font-bold mt-2 font-display ${pendientes > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {loadingDomicilios ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  pendientes
                )}
              </div>
            </div>
            <Truck className={`h-8 w-8 opacity-80 ${pendientes > 0 ? 'text-red-400' : 'text-green-400'}`} />
          </div>
          {pendientes > 0 && (
            <div className="pt-2 border-t border-red-400/20 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>Requiere atención</span>
            </div>
          )}
        </Card>
      </div>

      {/* Caja de Hoy */}
      <Card className="p-5 bg-gradient-to-br from-purple-400/10 to-purple-400/5 border-purple-400/30 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-400" />
            Caja de Hoy
          </h3>
          {!cajaActual && !loadingCaja && (
            <button
              onClick={() => setMostrarFormularioCaja(true)}
              className="p-2 rounded-lg bg-purple-400 hover:bg-purple-500 text-base-dark transition-all flex items-center gap-1 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Iniciar
            </button>
          )}
        </div>

        {loadingCaja ? (
          <Skeleton className="h-8 w-32" />
        ) : cajaActual ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Inicial:</span>
              <span className="text-purple-400 font-semibold">{formatCOP(cajaActual.montoInicial)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Ingresos (Ventas):</span>
              <span className="text-green-400 font-semibold">+{formatCOP(cajaActual.ingresos)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Egresos (Gastos):</span>
              <span className="text-red-400 font-semibold">-{formatCOP(cajaActual.egresos)}</span>
            </div>
            <div className="pt-3 border-t border-purple-400/20 flex justify-between items-center">
              <span className="text-base font-bold text-neutral-100">Saldo Actual:</span>
              <span className="text-2xl font-bold text-purple-400 font-display">
                {formatCOP(cajaActual.saldoActual)}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-400 mb-3">No hay caja iniciada para hoy</p>
            <button
              onClick={() => setMostrarFormularioCaja(true)}
              className="w-full py-2 rounded-lg bg-purple-400 hover:bg-purple-500 text-base-dark font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Iniciar Caja
            </button>
          </div>
        )}

        {/* Formulario Caja */}
        {mostrarFormularioCaja && (
          <div className="mt-4 p-4 bg-neutral-700/50 rounded-lg border border-neutral-600">
            <form onSubmit={handleCrearCaja} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 font-bold">Monto Inicial en Pesos (ej: 100000)</label>
                <Input
                  type="number"
                  placeholder="100000"
                  value={montoCajaStr}
                  onChange={(e) => setMontoCajaStr(e.target.value)}
                  min="0"
                  step="1000"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={creandoCaja}
                  className="flex-1 bg-purple-400 hover:bg-purple-500 text-base-dark font-semibold"
                >
                  {creandoCaja ? 'Iniciando...' : 'Iniciar Caja'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setMostrarFormularioCaja(false)}
                  className="flex-1 bg-neutral-600 hover:bg-neutral-700 text-neutral-100"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      {/* Estadísticas Secundarias */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Venta Promedio */}
        <Card className="p-4 bg-neutral-800/50">
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-2">Venta Promedio</p>
          <div className="text-xl font-bold text-neutral-100 font-display">
            {loadingReportes ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              formatCOP(resumen.ventaPromedio)
            )}
          </div>
        </Card>

        {/* Producto Más Vendido */}
        <Card className="p-4 bg-neutral-800/50">
          <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider mb-2">Top Producto</p>
          <div className="text-neutral-100 font-semibold">
            {loadingReportes ? (
              <Skeleton className="h-7 w-28" />
            ) : resumen.productoMasVendido ? (
              <div>
                <p className="text-sm text-neutral-200">{resumen.productoMasVendido.nombre}</p>
                <p className="text-xs text-gold-400 mt-1">{resumen.productoMasVendido.cantidad} unidades</p>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Sin datos</p>
            )}
          </div>
        </Card>
      </div>

      {/* Gastos por Categoría - Reordenado */}
      <Card className="p-5 bg-neutral-800/50 mb-6">
        <h3 className="text-base font-bold text-neutral-100 mb-4 flex items-center gap-2">
          💰 Total Gastos
        </h3>
        <div className="text-2xl font-bold text-red-400 mb-4 font-display">
          {loadingReportes ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            formatCOP(resumen.totalGastos)
          )}
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {loadingReportes ? (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </>
          ) : Object.entries(resumen.gastosPorCategoria).length > 0 ? (
            ordenCategorias
              .filter(cat => cat in resumen.gastosPorCategoria)
              .map(categoria => (
                <div key={categoria} className="flex justify-between items-center text-xs p-2 rounded hover:bg-neutral-700/30 transition-colors">
                  <span className="text-neutral-400">
                    {categoriaEmoji[categoria]} {categoria}
                  </span>
                  <span className="text-red-400 font-semibold">{formatCOP(resumen.gastosPorCategoria[categoria])}</span>
                </div>
              ))
          ) : (
            <p className="text-xs text-neutral-500">Sin gastos registrados</p>
          )}
        </div>
      </Card>
    </div>
  );
}
