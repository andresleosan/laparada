// src/pages/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Bike, 
  AlertCircle, 
  RefreshCw, 
  Wallet, 
  Plus, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Package,
  Clock,
  Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useJornada } from '@/context/JornadaContext';
import { useReportes } from '@/hooks/useReportes';
import { useDomicilios } from '@/hooks/useDomicilios';
import { useCaja } from '@/hooks/useCaja';
import { getNombreJornada } from '@/utils/jornadaUtils';
import { sumarIngresosCaja } from '@/services/cajaService';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';
import { verifyAdminPin } from '@/services/changePinService';

const categoriaEmoji: Record<string, string> = {
  gas: '⛽',
  insumos: '📦',
  mantenimiento: '🔧',
  otros: '❓',
  domiciliario: '🏍️',
  servicios: '⚡',
  varios: '📋',
  salarios: '👨‍💼',
};

const ordenCategorias = ['gas', 'insumos', 'mantenimiento', 'otros', 'domiciliario', 'servicios', 'varios', 'salarios'];

export function DashboardPage() {
  const { jornadaActual } = useJornada();
  const { resumen, ventas, loading: loadingReportes, refresh: refreshReportes } = useReportes();
  const { activos, entregados, loading: loadingDomicilios } = useDomicilios('ambas');
  const { cajaActual, loading: loadingCaja, crearCajaHoy, refresh: refreshCaja, reiniciarCajaHoy } = useCaja();
  
  const [refreshing, setRefreshing] = useState(false);
  const [mostrarFormularioCaja, setMostrarFormularioCaja] = useState(false);
  const [montoCajaStr, setMontoCajaStr] = useState('');
  const [creandoCaja, setCreandoCaja] = useState(false);
  
  const [mostrarModalReiniciar, setMostrarModalReiniciar] = useState(false);
  const [pinReiniciar, setPinReiniciar] = useState('');
  const [errorPinReiniciar, setErrorPinReiniciar] = useState('');
  const [cargandoReiniciar, setCargandoReiniciar] = useState(false);
  const [exitoReiniciar, setExitoReiniciar] = useState(false);
  
  const [mostrarFormularioAgregar, setMostrarFormularioAgregar] = useState(false);
  const [montoAgregar, setMontoAgregar] = useState('');
  const [cargandoAgregar, setCargandoAgregar] = useState(false);
  const [pedidosAyer, setPedidosAyer] = useState(0);

  const pendientes = activos.filter(d => d.estado === 'en_camino').length;
  const totalDomicilios = activos.length + entregados.length;

  // Calcular transferencias de hoy
  const ventasTransferencia = ventas
    .filter(v => {
      const fechaVenta = v.fecha instanceof Date ? v.fecha : v.fecha?.toDate?.() || new Date();
      const fechaVentaDate = new Date(fechaVenta);
      fechaVentaDate.setHours(0, 0, 0, 0);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return fechaVentaDate.getTime() === hoy.getTime() && v.metodoPago === 'transferencia';
    })
    .reduce((sum, v) => sum + (v.total || 0), 0);

  // Calcular domiciliarios (comisiones/ingresos domicilio) de hoy
  const ventasDomicilio = ventas
    .filter(v => {
      const fechaVenta = v.fecha instanceof Date ? v.fecha : v.fecha?.toDate?.() || new Date();
      const fechaVentaDate = new Date(fechaVenta);
      fechaVentaDate.setHours(0, 0, 0, 0);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return fechaVentaDate.getTime() === hoy.getTime() && v.metodoPago === 'domicilio';
    })
    .reduce((sum, v) => sum + (v.total || 0), 0);

  // Total general: Caja + Transferencias + Domiciliarios
  const totalGeneral = (cajaActual?.saldoActual || 0) + ventasTransferencia + ventasDomicilio;

  // Calcular pedidos de ayer
  useEffect(() => {
    if (!ventas || ventas.length === 0) {
      setPedidosAyer(0);
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const pedidosAyerCount = ventas.filter(venta => {
      const fechaVenta = venta.fecha instanceof Date 
        ? venta.fecha 
        : venta.fecha?.toDate?.() || new Date();
      
      const fechaVentaDate = new Date(fechaVenta);
      fechaVentaDate.setHours(0, 0, 0, 0);
      
      return fechaVentaDate.getTime() === ayer.getTime();
    }).length;

    setPedidosAyer(pedidosAyerCount);
  }, [ventas]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshReportes(), refreshCaja()]);
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
      const monto = Number(montoCajaStr);
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
    setCargandoReiniciar(true);
    setErrorPinReiniciar('');
    try {
      const esValido = await verifyAdminPin(pinReiniciar);
      if (!esValido) {
        setErrorPinReiniciar('PIN incorrecto');
        return;
      }

      await reiniciarCajaHoy();
      setExitoReiniciar(true);
      
      setTimeout(() => {
        setMostrarModalReiniciar(false);
        setExitoReiniciar(false);
        setPinReiniciar('');
        setErrorPinReiniciar('');
      }, 1500);

      createToast('✅ Caja reiniciada correctamente', 'success');
    } catch (err) {
      setErrorPinReiniciar('Error verificando PIN');
      createToast('❌ Error reiniciando caja', 'error');
      console.error('Error:', err);
    } finally {
      setCargandoReiniciar(false);
    }
  };

  const handleAgregarSaldo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoAgregar.trim() || isNaN(Number(montoAgregar))) {
      createToast('❌ Ingresa un monto válido', 'error');
      return;
    }

    if (!cajaActual) {
      createToast('❌ No hay caja abierta', 'error');
      return;
    }

    try {
      setCargandoAgregar(true);
      const monto = Number(montoAgregar);
      await sumarIngresosCaja(cajaActual.id, monto);
      await refreshCaja();
      createToast('✅ Saldo agregado correctamente', 'success');
      setMontoAgregar('');
      setMostrarFormularioAgregar(false);
    } catch (err) {
      createToast('❌ Error agregando saldo', 'error');
      console.error('Error:', err);
    } finally {
      setCargandoAgregar(false);
    }
  };

  // Porcentajes de métodos de pago
  const pctEfectivo = totalGeneral > 0 ? Math.round(((cajaActual?.saldoActual || 0) / totalGeneral) * 100) : 0;
  const pctTransferencia = totalGeneral > 0 ? Math.round((ventasTransferencia / totalGeneral) * 100) : 0;
  const pctDomicilio = totalGeneral > 0 ? Math.round((ventasDomicilio / totalGeneral) * 100) : 0;

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header con Jornada y Acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
                Dashboard
              </h1>
              <Badge variant="outline" className="border-gold-400/40 bg-gold-400/10 text-gold-400 text-xs px-2.5 py-0.5">
                <Clock className="w-3 h-3 mr-1 inline" />
                {getNombreJornada(jornadaActual)}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Visión general operativa, financiera y pedidos en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!cajaActual && !loadingCaja && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setMostrarFormularioCaja(true)}
                className="flex items-center gap-1.5 text-xs shadow-lg shadow-gold-500/10"
              >
                <Plus className="h-4 w-4" />
                Iniciar Caja
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-gold-400' : ''}`} />
              {refreshing ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>

        {/* 🌟 4 KPI Cards Principales (Grid responsive 2x2 en móvil / 4 cols en desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: Ventas Hoy */}
          <Card className="p-4 sm:p-5 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ventas Hoy</span>
              <div className="p-2 rounded-lg bg-gold-400/10 text-gold-400">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold text-white font-display">
                {loadingReportes ? <Skeleton className="h-8 w-28" /> : formatCOP(resumen.totalVentas)}
              </div>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-green-400 font-medium mt-1">
                <TrendingUp className="h-3 w-3 inline" />
                <span>{resumen.cantidadVentas} órdenes completadas</span>
              </div>
            </div>
          </Card>

          {/* Card 2: Ganancia Neta */}
          <Card className="p-4 sm:p-5 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ganancia Neta</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-display">
                {loadingReportes ? <Skeleton className="h-8 w-28" /> : formatCOP(resumen.gananciaNeta)}
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-1">
                Ingresos menos gastos
              </p>
            </div>
          </Card>

          {/* Card 3: Saldo en Caja */}
          <Card className="p-4 sm:p-5 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Caja en Efectivo</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold text-purple-400 font-display">
                {loadingCaja ? (
                  <Skeleton className="h-8 w-28" />
                ) : cajaActual ? (
                  formatCOP(cajaActual.saldoActual)
                ) : (
                  <span className="text-neutral-500 text-lg">No iniciada</span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 mt-1">
                {cajaActual ? `Base: ${formatCOP(cajaActual.montoInicial)}` : 'Requiere apertura'}
              </p>
            </div>
          </Card>

          {/* Card 4: Domicilios */}
          <Card className="p-4 sm:p-5 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Domicilios</span>
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Bike className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold text-cyan-400 font-display flex items-baseline gap-2">
                {loadingDomicilios ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <span>{totalDomicilios} <span className="text-xs font-normal text-neutral-400">totales</span></span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs mt-1">
                <span className="text-orange-400 font-semibold">{pendientes} en camino</span>
                <span className="text-neutral-600">•</span>
                <span className="text-green-400">{entregados.length} entregados</span>
              </div>
            </div>
          </Card>

        </div>

        {/* 🏢 Sección Central en 2 Columnas (Desktop: 7fr / 5fr) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA (7 columnas): Control de Caja + Desglose de Fondos */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Tarjeta de Control de Caja */}
            <Card className="p-5 bg-neutral-900/90 border-neutral-800">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-gold-400" />
                  <h2 className="text-base font-bold text-white">Estado de Caja</h2>
                  {cajaActual ? (
                    <Badge variant="outline" className="border-green-500/40 text-green-400 bg-green-500/10 text-[10px]">
                      ● Activa
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]">
                      ● Pendiente
                    </Badge>
                  )}
                </div>

                {cajaActual && !loadingCaja && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setMostrarFormularioAgregar(true)}
                      className="text-xs py-1 px-2.5 text-green-400 hover:text-green-300"
                      title="Agregar saldo a la caja"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Agregar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setMostrarModalReiniciar(true);
                        setPinReiniciar('');
                        setErrorPinReiniciar('');
                        setExitoReiniciar(false);
                      }}
                      className="text-xs py-1 px-2.5 text-orange-400 hover:text-orange-300"
                      title="Reiniciar caja con PIN"
                    >
                      🔄 Reiniciar
                    </Button>
                  </div>
                )}
              </div>

              {loadingCaja ? (
                <div className="py-6 space-y-3">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : cajaActual ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-xs text-neutral-400 font-medium">Saldo Total en Efectivo</span>
                    <div className="text-3xl font-display font-bold text-white mt-0.5">
                      {formatCOP(cajaActual.saldoActual)}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-2">
                    <div className="p-3 rounded-lg bg-neutral-800/60 border border-neutral-700/50">
                      <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Base Inicial</p>
                      <p className="text-sm font-bold text-neutral-200 mt-1">{formatCOP(cajaActual.montoInicial)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                      <p className="text-[10px] uppercase font-bold text-green-400 tracking-wider flex items-center gap-1">
                        <ArrowUpRight className="h-3 w-3" /> Ingresos
                      </p>
                      <p className="text-sm font-bold text-green-400 mt-1">+{formatCOP(cajaActual.ingresos)}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1">
                        <ArrowDownRight className="h-3 w-3" /> Egresos
                      </p>
                      <p className="text-sm font-bold text-red-400 mt-1">-{formatCOP(cajaActual.egresos)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-sm text-neutral-300 font-medium">No se ha iniciado la caja para el turno de hoy.</p>
                  <p className="text-xs text-neutral-500 mt-1 mb-4">Ingresa la base inicial en efectivo para comenzar a registrar ventas.</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setMostrarFormularioCaja(true)}
                    className="inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Iniciar Caja Ahora
                  </Button>
                </div>
              )}
            </Card>

            {/* Tarjeta de Desglose de Fondos por Método de Pago */}
            <Card className="p-5 bg-neutral-900/90 border-neutral-800">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-gold-400" />
                  <h2 className="text-base font-bold text-white">Fondos por Método de Pago</h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Total Recaudado</span>
                  <span className="text-base font-bold text-gold-400 font-display">
                    {loadingCaja ? <Skeleton className="h-5 w-20" /> : formatCOP(totalGeneral)}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3.5">
                {/* 💵 Efectivo */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                      💵 Efectivo en Caja
                    </span>
                    <span className="text-white font-bold">
                      {formatCOP(cajaActual?.saldoActual || 0)}{' '}
                      <span className="text-[10px] font-normal text-neutral-400">({pctEfectivo}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${pctEfectivo}%` }} />
                  </div>
                </div>

                {/* 🏦 Transferencias */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                      🏦 Transferencias (Nequi / Bancolombia / Daviplata)
                    </span>
                    <span className="text-white font-bold">
                      {formatCOP(ventasTransferencia)}{' '}
                      <span className="text-[10px] font-normal text-neutral-400">({pctTransferencia}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pctTransferencia}%` }} />
                  </div>
                </div>

                {/* 🛵 Domiciliarios */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                      🛵 Pagos en Domicilio
                    </span>
                    <span className="text-white font-bold">
                      {formatCOP(ventasDomicilio)}{' '}
                      <span className="text-[10px] font-normal text-neutral-400">({pctDomicilio}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pctDomicilio}%` }} />
                  </div>
                </div>
              </div>
            </Card>

          </div>

          {/* COLUMNA DERECHA (5 columnas): Rendimiento + Gastos */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Tarjeta de Métricas Operativas */}
            <Card className="p-5 bg-neutral-900/90 border-neutral-800">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                <Sparkles className="h-5 w-5 text-gold-400" />
                <h2 className="text-base font-bold text-white">Rendimiento del Turno</h2>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* Venta Promedio */}
                <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-800">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Ticket Promedio</p>
                  <p className="text-base font-bold text-white mt-1">
                    {loadingReportes ? <Skeleton className="h-6 w-20" /> : formatCOP(resumen.ventaPromedio)}
                  </p>
                </div>

                {/* Pedidos vs Ayer */}
                <div className="p-3 rounded-lg bg-neutral-800/40 border border-neutral-800">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Pedidos Hoy / Ayer</p>
                  <p className="text-base font-bold text-white mt-1">
                    {loadingReportes ? <Skeleton className="h-6 w-16" /> : `${resumen.cantidadVentas} / ${pedidosAyer}`}
                  </p>
                </div>

                {/* Top Producto */}
                <div className="col-span-2 p-3 rounded-lg bg-neutral-800/40 border border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-gold-400/10 text-gold-400">
                      <Package className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Producto Más Vendido</p>
                      <p className="text-sm font-semibold text-white mt-0.5">
                        {loadingReportes ? (
                          <Skeleton className="h-4 w-28" />
                        ) : resumen.productoMasVendido ? (
                          resumen.productoMasVendido.nombre
                        ) : (
                          'Sin datos aún'
                        )}
                      </p>
                    </div>
                  </div>
                  {resumen.productoMasVendido && (
                    <Badge variant="outline" className="border-gold-400/40 text-gold-400 bg-gold-400/10 font-bold">
                      {resumen.productoMasVendido.cantidad} un.
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Tarjeta de Gastos del Día */}
            <Card className="p-5 bg-neutral-900/90 border-neutral-800">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-400" />
                  <h2 className="text-base font-bold text-white">Gastos Registrados</h2>
                </div>
                <span className="text-sm font-bold text-red-400 font-display">
                  {loadingReportes ? <Skeleton className="h-5 w-20" /> : formatCOP(resumen.totalGastos)}
                </span>
              </div>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
                {loadingReportes ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : Object.entries(resumen.gastosPorCategoria).length > 0 ? (
                  ordenCategorias
                    .filter(cat => cat in resumen.gastosPorCategoria)
                    .map(categoria => (
                      <div
                        key={categoria}
                        className="flex justify-between items-center text-xs p-2 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 transition-colors"
                      >
                        <span className="text-neutral-300 font-medium">
                          {categoriaEmoji[categoria]} {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                        </span>
                        <span className="text-red-400 font-semibold font-mono">
                          {formatCOP(resumen.gastosPorCategoria[categoria])}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-xs text-neutral-500 py-3 text-center">No hay gastos registrados en esta jornada</p>
                )}
              </div>
            </Card>

          </div>

        </div>

        {/* Modal para Iniciar Caja */}
        {mostrarFormularioCaja && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">💵 Apertura de Caja</h3>
              <p className="text-xs text-neutral-400 mb-4">
                Ingresa el monto de base en efectivo con el que inicias este turno.
              </p>

              <form onSubmit={handleCrearCaja} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">Monto Inicial en Pesos (COP)</label>
                  <Input
                    type="number"
                    placeholder="Ej: 100000"
                    value={montoCajaStr}
                    onChange={(e) => setMontoCajaStr(e.target.value)}
                    min="0"
                    step="1000"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setMostrarFormularioCaja(false)}
                    disabled={creandoCaja}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={creandoCaja}
                    disabled={creandoCaja || !montoCajaStr.trim()}
                    className="flex-1"
                  >
                    Iniciar Caja
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de PIN para reiniciar caja */}
        {mostrarModalReiniciar && cajaActual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
              {exitoReiniciar ? (
                <div className="text-center py-4">
                  <div className="mb-3 text-4xl">✅</div>
                  <h3 className="text-lg font-bold text-white">Caja Reiniciada</h3>
                  <p className="text-xs text-neutral-400 mt-1">El saldo actual se convirtió en la nueva base</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
                    <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white text-sm">Reiniciar Caja de Hoy</p>
                      <p className="text-xs text-neutral-400">Saldo actual: {formatCOP(cajaActual.saldoActual)}</p>
                    </div>
                  </div>

                  <p className="mb-3 text-xs text-neutral-300">Ingresa el PIN administrativo para autorizar:</p>

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
                    className="mb-2 w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none disabled:opacity-50 text-center tracking-widest text-lg"
                    maxLength={6}
                    autoFocus
                  />

                  {errorPinReiniciar && (
                    <p className="mb-3 text-xs text-red-400 text-center">{errorPinReiniciar}</p>
                  )}

                  <div className="flex gap-3 mt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setMostrarModalReiniciar(false);
                        setPinReiniciar('');
                        setErrorPinReiniciar('');
                      }}
                      disabled={cargandoReiniciar}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleReiniciarCaja}
                      loading={cargandoReiniciar}
                      disabled={cargandoReiniciar || pinReiniciar.length === 0}
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

        {/* Modal para agregar saldo */}
        {mostrarFormularioAgregar && cajaActual && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-white mb-2">➕ Agregar Saldo a Caja</h3>
              <p className="text-xs text-neutral-400 mb-4">Ingresa el monto en efectivo a ingresar a la caja.</p>
              
              <form onSubmit={handleAgregarSaldo} className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-300 font-semibold block mb-1">Monto en Pesos (COP)</label>
                  <Input
                    type="number"
                    placeholder="Ej: 50000"
                    value={montoAgregar}
                    onChange={(e) => setMontoAgregar(e.target.value)}
                    min="0"
                    step="1000"
                    disabled={cargandoAgregar}
                    autoFocus
                    required
                  />
                </div>

                <div className="rounded-lg bg-green-500/10 p-3 border border-green-500/20 text-xs">
                  <p className="text-neutral-300">
                    Saldo actual: <span className="font-bold text-white">{formatCOP(cajaActual.saldoActual)}</span>
                  </p>
                  {montoAgregar && !isNaN(Number(montoAgregar)) && (
                    <p className="text-green-400 font-semibold mt-1">
                      Nuevo saldo estimado: {formatCOP(cajaActual.saldoActual + Number(montoAgregar))}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMostrarFormularioAgregar(false);
                      setMontoAgregar('');
                    }}
                    disabled={cargandoAgregar}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={cargandoAgregar}
                    disabled={cargandoAgregar || !montoAgregar.trim()}
                    className="flex-1"
                  >
                    Agregar Saldo
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
