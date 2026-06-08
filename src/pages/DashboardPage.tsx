// src/pages/DashboardPage.tsx

import { TrendingUp, TrendingDown, ShoppingBag, Truck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { useJornada } from '@/context/JornadaContext';
import { getNombreJornada } from '@/utils/jornadaUtils';

export function DashboardPage() {
  const { jornadaActual } = useJornada();
  // TODO: Integrar listeners de Firestore para KPIs

  return (
    <div className="space-y-6 pb-20 p-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-gold-400">Dashboard</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Jornada activa: {getNombreJornada(jornadaActual)}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Ventas Hoy */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Ventas Hoy</p>
              <div className="text-2xl font-bold text-gold-400 mt-1">
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
            <ShoppingBag className="h-6 w-6 text-gold-400" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-green-500">
            <TrendingUp className="h-4 w-4" />
            <span>+12% vs ayer</span>
          </div>
        </Card>

        {/* Pedidos */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Pedidos</p>
              <div className="text-2xl font-bold text-neutral-50 mt-1">
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <ShoppingBag className="h-6 w-6 text-neutral-500" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-blue-500">
            <TrendingDown className="h-4 w-4" />
            <span>-2% vs ayer</span>
          </div>
        </Card>

        {/* Domicilios Pendientes */}
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-neutral-500 uppercase">Pendientes</p>
              <div className="text-2xl font-bold text-status-error mt-1">
                <Skeleton className="h-8 w-12" />
              </div>
            </div>
            <Truck className="h-6 w-6 text-status-error" />
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs text-neutral-400">
            <span>Requiere atención</span>
          </div>
        </Card>

        {/* Producto Destacado */}
        <Card className="p-4">
          <div>
            <p className="text-xs text-neutral-500 uppercase">Más Vendido</p>
            <div className="text-lg font-semibold text-neutral-50 mt-1">
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="mt-3">
              <Badge variant="en_camino">
                <Skeleton className="h-4 w-16" />
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Comparativa Origen */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-neutral-50 mb-4">
          Ventas por Canal
        </h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400">POS</span>
              <div className="text-neutral-50 font-semibold">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="bg-neutral-800 rounded-full h-2">
              <div className="bg-gold-400 h-2 rounded-full w-2/3" />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-neutral-400">WhatsApp</span>
              <div className="text-neutral-50 font-semibold">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="bg-neutral-800 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full w-1/3" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
