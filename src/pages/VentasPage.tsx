// src/pages/VentasPage.tsx
import { useState, useEffect } from 'react';
import { Venta } from '@/types';
import {
  collection,
  query,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCOP } from '@/utils/formatCOP';
import { formatFechaCorta } from '@/utils/dateUtils';
import { History, X, Image } from 'lucide-react';

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'hoy' | 'semana' | 'mes'>('todas');
  const [fotoModalAbierto, setFotoModalAbierto] = useState(false);
  const [fotoSeleccionada, setFotoSeleccionada] = useState<string>('');

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
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">Historial de Ventas</h1>
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Historial de Ventas</h1>
          <p className="mt-2 text-neutral-400">
            {cantidadVentas} venta{cantidadVentas !== 1 ? 's' : ''} registrada{cantidadVentas !== 1 ? 's' : ''}
          </p>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold opacity-5" />
            <p className="text-xs text-neutral-400">Total</p>
            <p className="mt-1 text-xl font-bold text-gold">{formatCOP(totalVentas)}</p>
          </Card>
          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-500 opacity-5" />
            <p className="text-xs text-neutral-400">Cantidad</p>
            <p className="mt-1 text-xl font-bold text-blue-400">{cantidadVentas}</p>
          </Card>
          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-green-500 opacity-5" />
            <p className="text-xs text-neutral-400">Promedio</p>
            <p className="mt-1 text-xl font-bold text-green-400">{formatCOP(ventaPromedio)}</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filter === 'todas' ? 'primary' : 'secondary'}
            onClick={() => setFilter('todas')}
            size="sm"
          >
            📊 Todas
          </Button>
          <Button
            variant={filter === 'hoy' ? 'primary' : 'secondary'}
            onClick={() => setFilter('hoy')}
            size="sm"
          >
            🌙 Hoy
          </Button>
          <Button
            variant={filter === 'semana' ? 'primary' : 'secondary'}
            onClick={() => setFilter('semana')}
            size="sm"
          >
            📅 Semana
          </Button>
          <Button
            variant={filter === 'mes' ? 'primary' : 'secondary'}
            onClick={() => setFilter('mes')}
            size="sm"
          >
            📆 Mes
          </Button>
        </div>

        {/* Listado */}
        {ventas.length === 0 ? (
          <EmptyState icon={History} title="Sin ventas" description="No hay ventas para mostrar" />
        ) : (
          <div className="space-y-3">
            {ventas.map((venta) => (
              <Card key={venta.id} className="p-4 transition-all hover:bg-neutral-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">
                        {formatFechaCorta(venta.fecha?.toDate?.() || new Date())}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {origenEmoji[venta.origen] || '📍'} {venta.origen}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {metodoPagoEmoji[venta.metodoPago] || '💰'} {venta.metodoPago}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="mt-2 space-y-1">
                      {venta.items?.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="text-sm text-neutral-300">
                          • {item.nombre} x{item.cantidad} = <span className="font-medium text-gold">{formatCOP(item.subtotal)}</span>
                        </div>
                      ))}
                      {venta.items && venta.items.length > 2 && (
                        <div className="text-xs text-neutral-500">
                          +{venta.items.length - 2} artículo{venta.items.length - 2 > 1 ? 's' : ''} más
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs text-neutral-500">
                      Jornada: <span className="font-medium">{venta.jornada || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="text-2xl font-bold text-gold">{formatCOP(venta.total)}</p>
                    {venta.metodoPago === 'transferencia' && venta.fotoTransferenciaUrl && (
                      <button
                        onClick={() => {
                          setFotoSeleccionada(venta.fotoTransferenciaUrl!);
                          setFotoModalAbierto(true);
                        }}
                        className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                        title="Ver foto de transferencia"
                      >
                        <Image className="h-4 w-4" />
                        Ver Foto
                      </button>
                    )}
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
      </div>
    </div>
  );
}
