// src/pages/GastosPage.tsx
import React, { useState, useEffect } from 'react';
import { Gasto, CategoriaGasto, Jornada, EstadoPago } from '@/types';
import {
  crearGasto,
  getTodosGastos,
  eliminarGasto,
} from '@/services/gastosService';
import { usePagos } from '@/hooks/usePagos';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { DollarSign, Plus, Trash2, CreditCard, RefreshCw, Zap } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

const categorias: CategoriaGasto[] = ['gas', 'insumos', 'mantenimiento', 'otros', 'domiciliario', 'servicios', 'varios', 'salarios'];
const categoriaEmoji: Record<CategoriaGasto, string> = {
  gas: '⛽',
  insumos: '📦',
  mantenimiento: '🔧',
  otros: '❓',
  domiciliario: '🚗',
  servicios: '⚡',
  varios: '📋',
  salarios: '👨‍💼',
};

const jornadas: Jornada[] = ['mañana', 'noche', 'ambas'];

const estadoEmoji: Record<EstadoPago, string> = {
  pendiente: '⏳',
  procesando: '⚙️',
  completado: '✅',
  fallido: '❌',
  cancelado: '🚫',
  reembolsado: '↩️',
};

const estadoColor: Record<EstadoPago, { bg: string; text: string; badge: string }> = {
  pendiente: { bg: 'bg-yellow-950/20 border-yellow-900/40', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300' },
  procesando: { bg: 'bg-blue-950/20 border-blue-900/40', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  completado: { bg: 'bg-emerald-950/20 border-emerald-900/40', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  fallido: { bg: 'bg-red-950/20 border-red-900/40', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  cancelado: { bg: 'bg-neutral-900 border-neutral-800', text: 'text-neutral-400', badge: 'bg-neutral-600/20 text-neutral-400' },
  reembolsado: { bg: 'bg-purple-950/20 border-purple-900/40', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
};

export function GastosPage() {
  const [activeTab, setActiveTab] = useState<'gastos' | 'pagos'>('gastos');
  
  // Estado de Gastos
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(true);
  const [creandoGasto, setCreandoGasto] = useState(false);

  const [concepto, setConcepto] = useState('');
  const [montoStr, setMontoStr] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('gas');
  const [jornada, setJornada] = useState<Jornada>('ambas');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hook de Pagos y Pasarelas
  const { transacciones, estadisticas, loading: loadingPagos, error: errorPagos, obtenerPorEstado, obtenerHoy, refresh: refreshPagos } = usePagos();
  const [filtroPago, setFiltroPago] = useState<'todas' | 'hoy' | 'completadas' | 'pendientes' | 'fallidas'>('todas');

  const cargarGastos = async () => {
    setLoadingGastos(true);
    try {
      const datos = await getTodosGastos();
      setGastos(datos);
    } catch (err) {
      console.error('Error cargando gastos:', err);
    } finally {
      setLoadingGastos(false);
    }
  };

  useEffect(() => {
    cargarGastos();
  }, []);

  useEffect(() => {
    if (activeTab === 'pagos') {
      if (filtroPago === 'hoy') {
        obtenerHoy();
      } else if (filtroPago === 'completadas') {
        obtenerPorEstado('completado');
      } else if (filtroPago === 'pendientes') {
        obtenerPorEstado('pendiente');
      } else if (filtroPago === 'fallidas') {
        obtenerPorEstado('fallido');
      } else {
        refreshPagos();
      }
    }
  }, [filtroPago, activeTab]);

  const handleCrearGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!concepto.trim()) newErrors.concepto = 'Concepto requerido';
    if (!montoStr.trim()) newErrors.monto = 'Monto requerido';
    if (isNaN(Number(montoStr))) newErrors.monto = 'Monto debe ser número';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const monto = Number(montoStr) * 1000;
      const data: Omit<Gasto, 'id'> = {
        concepto: concepto.trim(),
        monto,
        categoria,
        jornada,
        fecha: Timestamp.now(),
      };

      await crearGasto(data);
      createToast('✅ Gasto registrado', 'success');

      // Limpiar formulario y refrescar
      setConcepto('');
      setMontoStr('');
      setCategoria('gas');
      setJornada('ambas');
      setCreandoGasto(false);
      await cargarGastos();
    } catch (err) {
      console.error('Error creando gasto:', err);
      createToast('❌ Error al registrar el gasto', 'error');
    }
  };

  const handleEliminarGasto = async (gasto: Gasto) => {
    if (!window.confirm(`¿Eliminar el gasto "${gasto.concepto}"?`)) return;
    try {
      await eliminarGasto(gasto.id);
      createToast('Gasto eliminado', 'success');
      await cargarGastos();
    } catch (err) {
      console.error('Error eliminando gasto:', err);
      createToast('Error al eliminar el gasto', 'error');
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Gastos y Pasarelas de Pago</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Control integral de egresos operativos y transacciones digitales
            </p>
          </div>

          {/* Botones de acción contextuales */}
          <div className="flex gap-2">
            {activeTab === 'gastos' ? (
              <Button
                onClick={() => setCreandoGasto(!creandoGasto)}
                variant="primary"
                className="flex items-center gap-2 text-xs"
              >
                <Plus size={15} />
                {creandoGasto ? 'Cancelar' : 'Registrar Gasto'}
              </Button>
            ) : (
              <Button
                onClick={refreshPagos}
                variant="secondary"
                size="sm"
                className="flex items-center gap-2 text-xs"
              >
                <RefreshCw size={14} />
                Refrescar
              </Button>
            )}
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('gastos')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'gastos'
                ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Zap size={14} />
            Gastos Operativos ({gastos.length})
          </button>
          <button
            onClick={() => setActiveTab('pagos')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'pagos'
                ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <CreditCard size={14} />
            Pasarelas y Pagos ({estadisticas.totalTransacciones})
          </button>
        </div>

        {/* CONTENIDO PESTAÑA: GASTOS OPERATIVOS */}
        {activeTab === 'gastos' && (
          <div className="space-y-6">
            {/* KPI Resumen de Gastos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Acumulado en Egresos</p>
                <p className="mt-2 text-2xl font-bold text-red-400 font-display">{formatCOP(totalGastos)}</p>
              </Card>
              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Registros de Gastos</p>
                <p className="mt-2 text-2xl font-bold text-white font-display">{gastos.length}</p>
              </Card>
              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Gasto Promedio</p>
                <p className="mt-2 text-2xl font-bold text-gold-400 font-display">
                  {gastos.length > 0 ? formatCOP(totalGastos / gastos.length) : formatCOP(0)}
                </p>
              </Card>
            </div>

            {/* Formulario de Registro de Gasto */}
            {creandoGasto && (
              <Card className="p-5 bg-neutral-900/90 border-neutral-800 max-w-2xl mx-auto shadow-xl">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign size={16} className="text-gold-400" />
                  Nuevo Registro de Gasto
                </h3>
                <form onSubmit={handleCrearGasto} className="space-y-4">
                  <Input
                    label="Concepto"
                    value={concepto}
                    onChange={(e) => {
                      setConcepto(e.target.value);
                      if (errors.concepto) setErrors({ ...errors, concepto: '' });
                    }}
                    placeholder="Ej: Pago de gas, compra de desechables, salario turno"
                    error={errors.concepto}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Monto (miles COP)"
                      type="number"
                      step="0.5"
                      value={montoStr}
                      onChange={(e) => {
                        setMontoStr(e.target.value);
                        if (errors.monto) setErrors({ ...errors, monto: '' });
                      }}
                      placeholder="Ej: 50 (= $50.000)"
                      error={errors.monto}
                    />

                    <Select
                      label="Categoría"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
                      options={categorias.map((cat) => ({
                        value: cat,
                        label: `${categoriaEmoji[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
                      }))}
                    >
                      {categorias.map((cat) => (
                        <option key={cat} value={cat}>
                          {categoriaEmoji[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </Select>

                    <Select
                      label="Jornada"
                      value={jornada}
                      onChange={(e) => setJornada(e.target.value as Jornada)}
                      options={jornadas.map((j) => ({
                        value: j,
                        label: `${j === 'mañana' ? '🌅 Mañana/Tarde' : j === 'noche' ? '🌙 Noche' : '📅 Ambas'}`,
                      }))}
                    >
                      {jornadas.map((j) => (
                        <option key={j} value={j}>
                          {j === 'mañana' ? '🌅 Mañana/Tarde' : j === 'noche' ? '🌙 Noche' : '📅 Ambas'}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <Button type="submit" variant="primary" className="w-full text-xs">
                    Guardar Gasto
                  </Button>
                </form>
              </Card>
            )}

            {/* Listado de Gastos */}
            {loadingGastos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : gastos.length === 0 ? (
              <EmptyState icon={DollarSign} title="Sin gastos" description="No hay egresos registrados en este periodo" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {gastos.map((gasto) => {
                  const categoriaColors: Record<CategoriaGasto, { bg: string; text: string }> = {
                    salarios: { bg: 'bg-blue-950/20 border-blue-900/40', text: 'text-blue-400' },
                    servicios: { bg: 'bg-yellow-950/20 border-yellow-900/40', text: 'text-yellow-400' },
                    insumos: { bg: 'bg-emerald-950/20 border-emerald-900/40', text: 'text-emerald-400' },
                    mantenimiento: { bg: 'bg-purple-950/20 border-purple-900/40', text: 'text-purple-400' },
                    otros: { bg: 'bg-neutral-900 border-neutral-800', text: 'text-neutral-300' },
                    gas: { bg: 'bg-orange-950/20 border-orange-900/40', text: 'text-orange-400' },
                    domiciliario: { bg: 'bg-indigo-950/20 border-indigo-900/40', text: 'text-indigo-400' },
                    varios: { bg: 'bg-slate-900 border-slate-800', text: 'text-slate-300' },
                  };
                  const colors = categoriaColors[gasto.categoria] || categoriaColors.otros;
                  return (
                    <Card key={gasto.id} className={`p-4 transition-all ${colors.bg} hover:border-neutral-700 flex flex-col justify-between`}>
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                          <span className="font-semibold text-white text-xs sm:text-sm truncate max-w-[200px]">{gasto.concepto}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            {categoriaEmoji[gasto.categoria]} {gasto.categoria}
                          </Badge>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-400">
                          <span>
                            {gasto.fecha?.toDate
                              ? gasto.fecha.toDate().toLocaleDateString()
                              : 'N/A'}
                          </span>
                          <span className="capitalize px-1.5 py-0.5 bg-neutral-800/60 rounded text-[10px]">
                            {gasto.jornada}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                        <p className={`text-xl font-bold ${colors.text} font-display`}>{formatCOP(gasto.monto)}</p>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleEliminarGasto(gasto)}
                          title="Eliminar gasto"
                          className="p-1.5 h-8 w-8"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO PESTAÑA: PASARELAS Y PAGOS */}
        {activeTab === 'pagos' && (
          <div className="space-y-6">
            {/* Error de Pagos */}
            {errorPagos && (
              <Card className="border-l-4 border-red-500 bg-red-900/20 p-4">
                <p className="text-red-300 text-sm">{errorPagos}</p>
              </Card>
            )}

            {/* KPIs de Pasarelas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Transacciones</p>
                <p className="mt-2 text-2xl font-bold text-blue-400 font-display">{estadisticas.totalTransacciones}</p>
              </Card>

              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Completadas</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400 font-display">{estadisticas.transaccionesCompletadas}</p>
              </Card>

              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Monto Digital</p>
                <p className="mt-2 text-2xl font-bold text-gold-400 font-display">{formatCOP(estadisticas.totalMonto)}</p>
              </Card>

              <Card className="p-4 bg-neutral-900/90 border-neutral-800">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tasa Éxito</p>
                <p className="mt-2 text-2xl font-bold text-emerald-400 font-display">{estadisticas.porcentajeExito.toFixed(1)}%</p>
              </Card>
            </div>

            {/* Filtros de Pagos */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filtroPago === 'todas' ? 'primary' : 'secondary'}
                onClick={() => setFiltroPago('todas')}
                size="sm"
                className="text-xs"
              >
                📊 Todas
              </Button>
              <Button
                variant={filtroPago === 'hoy' ? 'primary' : 'secondary'}
                onClick={() => setFiltroPago('hoy')}
                size="sm"
                className="text-xs"
              >
                🌙 Hoy
              </Button>
              <Button
                variant={filtroPago === 'completadas' ? 'primary' : 'secondary'}
                onClick={() => setFiltroPago('completadas')}
                size="sm"
                className="text-xs"
              >
                ✅ Completadas
              </Button>
              <Button
                variant={filtroPago === 'pendientes' ? 'primary' : 'secondary'}
                onClick={() => setFiltroPago('pendientes')}
                size="sm"
                className="text-xs"
              >
                ⏳ Pendientes
              </Button>
              <Button
                variant={filtroPago === 'fallidas' ? 'primary' : 'secondary'}
                onClick={() => setFiltroPago('fallidas')}
                size="sm"
                className="text-xs"
              >
                ❌ Fallidas
              </Button>
            </div>

            {/* Listado de Transacciones */}
            {loadingPagos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : transacciones.length === 0 ? (
              <EmptyState icon={CreditCard} title="Sin transacciones" description="No hay pagos para mostrar con este filtro" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {transacciones.map((txn) => {
                  const colors = estadoColor[txn.estado] || estadoColor.cancelado;
                  return (
                    <Card key={txn.id} className={`p-4 transition-all ${colors.bg}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-white text-xs sm:text-sm">
                              {txn.metodoPago === 'stripe' ? '🔵 Stripe' : txn.metodoPago === 'mercadopago' ? '🟡 MercadoPago' : '💵 Efectivo'}
                            </span>
                            <Badge className={`text-[10px] ${colors.badge}`}>
                              {estadoEmoji[txn.estado]} {txn.estado}
                            </Badge>
                            {txn.referenciaPasarela && (
                              <span className="text-[10px] text-neutral-500">Ref: {txn.referenciaPasarela.slice(0, 10)}...</span>
                            )}
                          </div>

                          <div className="mt-2 space-y-1">
                            <p className="text-xs text-neutral-300">
                              Venta ID: <span className="font-mono text-neutral-400">{txn.ventaId ? txn.ventaId.slice(0, 8) : 'N/A'}</span>
                            </p>
                            <p className="text-[10px] text-neutral-500">
                              {txn.creadoEn?.toDate ? txn.creadoEn.toDate().toLocaleString() : 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className={`text-xl font-bold ${colors.text} font-display`}>{formatCOP(txn.monto)}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
