// src/pages/VentasPage.tsx
import React, { useState } from 'react';
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
import { History, Filter } from 'lucide-react';

export function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'hoy' | 'semana'>('todas');

  React.useEffect(() => {
    const cargarVentas = async () => {
      try {
        const ventasRef = collection(db, 'ventas');
        const q = query(ventasRef, orderBy('fecha', 'desc'));
        const snapshot = await getDocs(q);
        const ventasData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Venta));

        // Aplicar filtro
        let ventasFiltradas = ventasData;
        if (filter === 'hoy') {
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);
          ventasFiltradas = ventasData.filter((v) => {
            const ventaDate = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
            ventaDate.setHours(0, 0, 0, 0);
            return ventaDate.getTime() === hoy.getTime();
          });
        } else if (filter === 'semana') {
          const hace7Dias = new Date();
          hace7Dias.setDate(hace7Dias.getDate() - 7);
          ventasFiltradas = ventasData.filter((v) => {
            const ventaDate = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
            return ventaDate >= hace7Dias;
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Historial de Ventas</h1>
          <p className="mt-2 text-neutral-400">
            {cantidadVentas} venta{cantidadVentas !== 1 ? 's' : ''} registrada
            {cantidadVentas !== 1 ? 's' : ''}
          </p>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-xs text-neutral-400">Total</p>
            <p className="mt-1 text-xl font-bold text-gold">{formatCOP(totalVentas)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-neutral-400">Cantidad</p>
            <p className="mt-1 text-xl font-bold text-white">{cantidadVentas}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-neutral-400">Promedio</p>
            <p className="mt-1 text-xl font-bold text-white">{formatCOP(ventaPromedio)}</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={filter === 'todas' ? 'primary' : 'secondary'}
            onClick={() => setFilter('todas')}
            size="sm"
          >
            Todas
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
        </div>

        {/* Listado */}
        {ventas.length === 0 ? (
          <EmptyState icon={History} title="Sin ventas" description="No hay ventas para mostrar" />
        ) : (
          <div className="space-y-3">
            {ventas.map((venta) => (
              <Card key={venta.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {formatFechaCorta(venta.fecha?.toDate?.() || new Date())}
                      </span>
                      <Badge variant="outline">
                        {origenEmoji[venta.origen] || '📍'} {venta.origen}
                      </Badge>
                      <Badge variant="outline">
                        {metodoPagoEmoji[venta.metodoPago] || '💰'} {venta.metodoPago}
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="mt-2 text-sm text-neutral-300">
                      {venta.items?.map((item, idx) => (
                        <div key={idx}>
                          • {item.nombre} x{item.cantidad} = {formatCOP(item.subtotal)}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 text-xs text-neutral-500">
                      Jornada: {venta.jornada || 'N/A'}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gold">{formatCOP(venta.total)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
