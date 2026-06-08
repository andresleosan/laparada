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
  const { cajaActual, loading: loadingCaja, crearCajaHoy, ventasEfectivo, refresh: refreshCaja, reiniciarCajaHoy } = useCaja();
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarFormularioCaja, setMostrarFormularioCaja] = useState(false);
  const [montoCajaStr, setMontoCajaStr] = useState('');
  const [creandoCaja, setCreandoCaja] = useState(false);
  const [mostrarModalReiniciar, setMostrarModalReiniciar] = useState(false);
  const [pinReiniciar, setPinReiniciar] = useState('');
  const [errorPinReiniciar, setErrorPinReiniciar] = useState('');
  const [cargandoReiniciar, setCargandoReiniciar] = useState(false);
  const [exitoReiniciar, setExitoReiniciar] = useState(false);
  const PIN_ADMINISTRATIVO = '140492';

  const pendientes = activos.filter(d => d.estado === 'en_camino').length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshReportes();
    await refreshCaja();
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

  const handleReiniciarCaja = async () => {
    if (pinReiniciar !== PIN_ADMINISTRATIVO) {
      setErrorPinReiniciar('PIN incorrecto');
      return;
    }

    setCargandoReiniciar(true);
    setErrorPinReiniciar('');
    try {
      await reiniciarCajaHoy();
      setExitoReiniciar(true);
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setMostrarModalReiniciar(false);
        setExitoReiniciar(false);
        setPinReiniciar('');
        setErrorPinReiniciar('');
      }, 2000);

      createToast('✅ Caja reiniciada correctamente', 'success');
    } catch (err) {
      setErrorPinReiniciar('Error reiniciando caja');
      createToast('❌ Error reiniciando caja', 'error');
      console.error('Error:', err);
    } finally {
      setCargandoReiniciar(false);
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

      {/* 💵 Venta en Efectivo Hoy */}
      <Card className="p-5 bg-gradient-to-br from-green-400/10 to-green-400/5 border-green-400/30 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            Venta en Efectivo Hoy
          </h3>
          <div className="text-2xl font-bold text-green-400 font-display">
            {loadingCaja ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              formatCOP(ventasEfectivo)
            )}
          </div>
        </div>
      </Card>

      {/* 💰 Caja de Hoy */}
      <Card className="p-5 bg-gradient-to-br from-purple-400/10 to-purple-400/5 border-purple-400/30 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-400" />
            Caja de Hoy
          </h3>
          <div className="flex gap-2">
            {cajaActual && !loadingCaja && (
              <button
                onClick={() => {
                  setMostrarModalReiniciar(true);
                  setPinReiniciar('');
                  setErrorPinReiniciar('');
                  setExitoReiniciar(false);
                }}
                className="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-all flex items-center gap-1 text-xs font-semibold"
                title="Reiniciar caja con PIN"
              >
                🔄 Reiniciar
              </button>
            )}
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
              <span className="text-neutral-400">Ingresos (Efectivo):</span>
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

      {/* Modal de PIN para reiniciar caja */}
      {mostrarModalReiniciar && cajaActual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6 shadow-xl">
            {exitoReiniciar ? (
              <div className="text-center">
                <div className="mb-4 text-4xl">✅</div>
                <h3 className="mb-2 text-lg font-bold text-white">Caja reiniciada</h3>
                <p className="text-sm text-neutral-400">El saldo actual se convirtió en el nuevo monto inicial</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3 rounded-lg bg-orange-500/10 p-4">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-white">Reiniciar caja</p>
                    <p className="text-xs text-neutral-400">Saldo actual: {formatCOP(cajaActual.saldoActual)}</p>
                  </div>
                </div>

                <p className="mb-4 text-sm text-neutral-300">Ingresa el PIN administrativo para confirmar:</p>

                <input
                  type="password"
                  placeholder="PIN"
                  value={pinReiniciar}
                  onChange={(e) => {
                    setPinReiniciar(e.target.value);
                    setErrorPinReiniciar('');
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && pinReiniciar.length > 0) {
                      handleReiniciarCaja();
                    }
                  }}
                  disabled={cargandoReiniciar}
                  className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-white placeholder-neutral-500 focus:border-orange-400 focus:outline-none disabled:opacity-50"
                  autoFocus
                />

                {errorPinReiniciar && (
                  <p className="mb-4 text-xs text-red-500">{errorPinReiniciar}</p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMostrarModalReiniciar(false);
                      setPinReiniciar('');
                      setErrorPinReiniciar('');
                    }}
                    disabled={cargandoReiniciar}
                    className="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-semibold text-white hover:bg-neutral-600 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReiniciarCaja}
                    disabled={cargandoReiniciar || pinReiniciar.length === 0}
                    className="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
                  >
                    {cargandoReiniciar ? 'Reiniciando...' : 'Reiniciar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
