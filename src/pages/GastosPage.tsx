// src/pages/GastosPage.tsx
import React, { useState } from 'react';
import { Gasto, CategoriaGasto, Jornada } from '@/types';
import {
  crearGasto,
  getTodosGastos,
  eliminarGasto,
} from '@/services/gastosService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { DollarSign, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { verifyAdminPin } from '@/services/changePinService';

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

export function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creandoGasto, setCreandoGasto] = useState(false);

  // Form state
  const [concepto, setConcepto] = useState('');
  const [montoStr, setMontoStr] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('gas');
  const [jornada, setJornada] = useState<Jornada>('ambas');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // PIN Modal state
  const [mostrarModalPin, setMostrarModalPin] = useState(false);
  const [gastoAEliminar, setGastoAEliminar] = useState<Gasto | null>(null);
  const [pinIngresado, setPinIngresado] = useState('');
  const [errorPin, setErrorPin] = useState('');
  const [cargandoEliminar, setCargandoEliminar] = useState(false);
  const [exitoEliminar, setExitoEliminar] = useState(false);

  // Cargar gastos
  React.useEffect(() => {
    const cargarGastos = async () => {
      setLoading(true);
      try {
        const datos = await getTodosGastos();
        setGastos(datos);
      } catch (err) {
        console.error('Error cargando gastos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarGastos();
  }, []);

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
      const monto = Number(montoStr) * 1000; // Convertir a centavos
      const data: Omit<Gasto, 'id'> = {
        concepto: concepto.trim(),
        monto,
        categoria,
        jornada,
        fecha: Timestamp.now(),
      };

      await crearGasto(data);
      createToast('✅ Gasto registrado', 'success');

      // Refrescar
      const datos = await getTodosGastos();
      setGastos(datos);

      // Limpiar form
      setConcepto('');
      setMontoStr('');
      setCategoria('gas');
      setJornada('ambas');
      setErrors({});
      setCreandoGasto(false);
    } catch (err) {
      createToast('❌ Error al crear', 'error');
    }
  };

  const handleEliminarGasto = (gasto: Gasto) => {
    setGastoAEliminar(gasto);
    setPinIngresado('');
    setErrorPin('');
    setExitoEliminar(false);
    setMostrarModalPin(true);
  };

  const handleEliminarGastoConPin = async () => {
    try {
      setCargandoEliminar(true);
      const esValido = await verifyAdminPin(pinIngresado);
      if (!esValido) {
        setErrorPin('PIN incorrecto');
        return;
      }
      setErrorPin('');
      try {
        if (gastoAEliminar?.id) {
          await eliminarGasto(gastoAEliminar.id);
          setExitoEliminar(true);

          setTimeout(async () => {
            setMostrarModalPin(false);
            setGastoAEliminar(null);
            setPinIngresado('');
            setExitoEliminar(false);
            const datos = await getTodosGastos();
            setGastos(datos);
          }, 1500);
        }
      } catch (err) {
        console.error('Error eliminando gasto:', err);
        setErrorPin('Error al eliminar el gasto');
      }
    } catch (err) {
      setErrorPin('Error verificando PIN');
    } finally {
      setCargandoEliminar(false);
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-white font-display">Gastos y Egresos</h1>
          <Skeleton className="mb-6 h-12 w-32 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Gastos y Egresos</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Total acumulado: <span className="font-bold text-red-400 font-display text-sm sm:text-base">{formatCOP(totalGastos)}</span>
            </p>
          </div>

          {/* Botón crear */}
          <Button
            onClick={() => setCreandoGasto(!creandoGasto)}
            variant="primary"
            className="flex items-center gap-2 text-xs"
          >
            <Plus size={15} />
            {creandoGasto ? 'Cancelar' : 'Registrar Nuevo Gasto'}
          </Button>
        </div>

        {/* Form crear gasto */}
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
                placeholder="Ej: Pago de gas, compra de desechables"
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
                    label: `${j === 'mañana' ? '🌅' : j === 'noche' ? '🌙' : '📅'} ${j}`,
                  }))}
                >
                  {jornadas.map((j) => (
                    <option key={j} value={j}>
                      {j === 'mañana' ? '🌅' : j === 'noche' ? '🌙' : '📅'} {j}
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

        {/* Listado en Cuadrícula Responsive */}
        {gastos.length === 0 ? (
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

        {/* Modal de PIN para eliminar */}
        {mostrarModalPin && gastoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6 shadow-xl">
              {exitoEliminar ? (
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  <h3 className="mb-2 text-lg font-bold text-white">Gasto eliminado</h3>
                  <p className="text-sm text-neutral-400">El gasto ha sido eliminado exitosamente</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-500/10 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Eliminar gasto</p>
                      <p className="text-xs text-neutral-400">Total: {formatCOP(gastoAEliminar.monto)}</p>
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
                        handleEliminarGastoConPin();
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
                        setGastoAEliminar(null);
                        setPinIngresado('');
                        setErrorPin('');
                      }}
                      disabled={cargandoEliminar}
                      className="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-semibold text-white hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEliminarGastoConPin}
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
      </div>
    </div>
  );
}
