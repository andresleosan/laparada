// src/pages/VentasPage.tsx
import { useState, useEffect } from 'react';
import { Venta } from '@/types';
import {
  collection,
  query,
  getDocs,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCOP } from '@/utils/formatCOP';
import { formatFechaCorta } from '@/utils/dateUtils';
import { History, X, Image, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { verifyAdminPin } from '@/services/changePinService';

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'hoy' | 'semana' | 'mes'>('todas');
  const [fotoModalAbierto, setFotoModalAbierto] = useState(false);
  const [fotoSeleccionada, setFotoSeleccionada] = useState<string>('');
  const [mostrarModalPin, setMostrarModalPin] = useState(false);
  const [ventaAEliminar, setVentaAEliminar] = useState<Venta | null>(null);
  const [pinIngresado, setPinIngresado] = useState('');
  const [cargandoEliminar, setCargandoEliminar] = useState(false);
  const [errorPin, setErrorPin] = useState('');
  const [exitoEliminar, setExitoEliminar] = useState(false);

  useEffect(() => {
    const cargarVentas = async () => {
      setLoading(true);
      try {
        const ventasRef = collection(db, 'ventas');
        const q = query(ventasRef, orderBy('fecha', 'desc'));
        const snapshot = await getDocs(q);
        const ventasData = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data(),
        } as Venta));

        // Aplicar filtro
        let ventasFiltradas = ventasData;

        
        if (filter === 'hoy') {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          ventasFiltradas = ventasData.filter((v) => {
            const ventaDate = v.fecha && 'toDate' in v.fecha ? v.fecha.toDate() : new Date(v.fecha as any);
            ventaDate.setHours(0, 0, 0, 0);
            return ventaDate.getTime() === hoy.getTime();
          });
        } else if (filter === 'semana') {
          const hace7Dias = new Date();
          hace7Dias.setDate(hace7Dias.getDate() - 7);
          ventasFiltradas = ventasData.filter((v) => {
            const ventaDate = v.fecha && 'toDate' in v.fecha ? v.fecha.toDate() : new Date(v.fecha as any);
            return ventaDate >= hace7Dias;
          });
        } else if (filter === 'mes') {
          const hace30Dias = new Date();
          hace30Dias.setDate(hace30Dias.getDate() - 30);
          ventasFiltradas = ventasData.filter((v) => {
            const ventaDate = v.fecha && 'toDate' in v.fecha ? v.fecha.toDate() : new Date(v.fecha as any);
            return ventaDate >= hace30Dias;
          });
        }

        setVentas(ventasFiltradas);
      } catch (err) {
        console.error('Error cargando ventas:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarVentas();
  }, [filter]);

  const handleEliminarVenta = async () => {
    try {
      setCargandoEliminar(true);
      const esValido = await verifyAdminPin(pinIngresado);
      if (!esValido) {
        setErrorPin('PIN incorrecto');
        return;
      }
      setErrorPin('');
      try {
        if (ventaAEliminar?.id) {
          await deleteDoc(doc(db, 'ventas', ventaAEliminar.id));
          setExitoEliminar(true);

          // Cerrar modal después de 2 segundos
          setTimeout(() => {
            setMostrarModalPin(false);
            setVentaAEliminar(null);
            setPinIngresado('');
            setExitoEliminar(false);
            // Recargar ventas
            const filtroActual = filter;
            setFilter('todas');
            setFilter(filtroActual);
          }, 2000);
        }
      } catch (error) {
        console.error('Error eliminando venta:', error);
        setErrorPin('Error al eliminar la venta');
      }
    } catch (err) {
      setErrorPin('Error verificando PIN');
    } finally {
      setCargandoEliminar(false);
    }
  };

  const totalVentas = ventas.reduce((sum, v) => sum + (v.total || 0), 0);
  const cantidadVentas = ventas.length;
  const ventaPromedio = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

  const metodoPagoEmoji: Record<string, string> = {
    efectivo: '💵',
    transferencia: '🏦',
    domicilio: '🚗',
  };

  const origenEmoji: Record<string, string> = {
    pos: '💻',
    whatsapp: '💬',
    phone: '☎️',
    domicilio: '🚗',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-white font-display">Historial de Ventas</h1>
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Historial de Ventas</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              {cantidadVentas} venta{cantidadVentas !== 1 ? 's' : ''} registrada{cantidadVentas !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'todas' ? 'primary' : 'secondary'}
              onClick={() => setFilter('todas')}
              size="sm"
              className="text-xs"
            >
              📊 Todas
            </Button>
            <Button
              variant={filter === 'hoy' ? 'primary' : 'secondary'}
              onClick={() => setFilter('hoy')}
              size="sm"
              className="text-xs"
            >
              🌙 Hoy
            </Button>
            <Button
              variant={filter === 'semana' ? 'primary' : 'secondary'}
              onClick={() => setFilter('semana')}
              size="sm"
              className="text-xs"
            >
              📅 Semana
            </Button>
            <Button
              variant={filter === 'mes' ? 'primary' : 'secondary'}
              onClick={() => setFilter('mes')}
              size="sm"
              className="text-xs"
            >
              📆 Mes
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Recaudado</p>
            <p className="mt-2 text-2xl font-bold text-gold-400 font-display">{formatCOP(totalVentas)}</p>
          </Card>
          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Cantidad de Ventas</p>
            <p className="mt-2 text-2xl font-bold text-blue-400 font-display">{cantidadVentas}</p>
          </Card>
          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Ticket Promedio</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400 font-display">{formatCOP(ventaPromedio)}</p>
          </Card>
        </div>

        {/* Listado de Ventas en Grid Responsive */}
        {ventas.length === 0 ? (
          <EmptyState icon={History} title="Sin ventas" description="No hay ventas para mostrar en este filtro" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {ventas.map((venta) => (
              <Card key={venta.id} className="p-4 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <span className="font-semibold text-white text-xs sm:text-sm">
                      {formatFechaCorta(venta.fecha?.toDate?.() || new Date())}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {origenEmoji[venta.origen] || '📍'} {venta.origen}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                        {metodoPagoEmoji[venta.metodoPago] || '💰'} {venta.metodoPago}
                      </Badge>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mt-3 space-y-1">
                    {venta.items?.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="text-xs text-neutral-300 flex justify-between">
                        <span className="truncate max-w-[180px]">• {item.nombre} x{item.cantidad}</span>
                        <span className="font-medium text-gold-400">{formatCOP(item.subtotal)}</span>
                      </div>
                    ))}
                    {venta.items && venta.items.length > 3 && (
                      <div className="text-[10px] text-neutral-500 italic">
                        +{venta.items.length - 3} artículo{venta.items.length - 3 > 1 ? 's' : ''} más
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Total</span>
                    <p className="text-lg font-bold text-gold-400 font-display">{formatCOP(venta.total)}</p>
                  </div>

                  <div className="flex gap-1.5">
                    {venta.metodoPago === 'transferencia' && venta.fotoTransferenciaUrl && (
                      <button
                        onClick={() => {
                          setFotoSeleccionada(venta.fotoTransferenciaUrl!);
                          setFotoModalAbierto(true);
                        }}
                        className="flex items-center gap-1 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 px-2.5 py-1.5 text-xs font-semibold transition-colors"
                        title="Ver foto de transferencia"
                      >
                        <Image className="h-3.5 w-3.5" />
                        Foto
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setVentaAEliminar(venta);
                        setPinIngresado('');
                        setErrorPin('');
                        setExitoEliminar(false);
                        setMostrarModalPin(true);
                      }}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar venta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Foto */}
        {fotoModalAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="relative max-h-[90vh] max-w-2xl w-full rounded-lg bg-neutral-900 overflow-hidden">
              {/* Botón cerrar */}
              <button
                onClick={() => {
                  setFotoModalAbierto(false);
                  setFotoSeleccionada('');
                }}
                className="absolute right-3 top-3 z-10 rounded-full bg-neutral-800 p-2 hover:bg-neutral-700 transition-colors"
              >
                <X className="h-6 w-6 text-white" />
              </button>

              {/* Imagen */}
              <img
                src={fotoSeleccionada}
                alt="Foto de transferencia"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Modal de PIN para eliminar */}
        {mostrarModalPin && ventaAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-md rounded-lg bg-neutral-900 p-6 shadow-xl">
              {exitoEliminar ? (
                <div className="text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
                  <h3 className="mb-2 text-lg font-bold text-white">Venta eliminada</h3>
                  <p className="text-sm text-neutral-400">La venta ha sido eliminada exitosamente</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3 rounded-lg bg-red-500/10 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Eliminar venta</p>
                      <p className="text-xs text-neutral-400">Total: {formatCOP(ventaAEliminar.total)}</p>
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
                        handleEliminarVenta();
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
                        setVentaAEliminar(null);
                        setPinIngresado('');
                        setErrorPin('');
                      }}
                      disabled={cargandoEliminar}
                      className="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-semibold text-white hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEliminarVenta}
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
