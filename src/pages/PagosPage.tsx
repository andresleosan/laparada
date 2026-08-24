import React, { useState } from 'react';
import { usePagos } from '@/hooks/usePagos';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { CreditCard, RefreshCw } from 'lucide-react';
import { EstadoPago } from '@/types';

const estadoEmoji: Record<EstadoPago, string> = {
  pendiente: '⏳',
  procesando: '⚙️',
  completado: '✅',
  fallido: '❌',
  cancelado: '🚫',
  reembolsado: '↩️',
};

const estadoColor: Record<EstadoPago, { bg: string; text: string; badge: string }> = {
  pendiente: { bg: 'bg-yellow-900/20', text: 'text-yellow-300', badge: 'bg-yellow-500/20' },
  procesando: { bg: 'bg-blue-900/20', text: 'text-blue-300', badge: 'bg-blue-500/20' },
  completado: { bg: 'bg-green-900/20', text: 'text-green-300', badge: 'bg-green-500/20' },
  fallido: { bg: 'bg-red-900/20', text: 'text-red-300', badge: 'bg-red-500/20' },
  cancelado: { bg: 'bg-neutral-800', text: 'text-neutral-400', badge: 'bg-neutral-600/20' },
  reembolsado: { bg: 'bg-purple-900/20', text: 'text-purple-300', badge: 'bg-purple-500/20' },
};

export function PagosPage() {
  const { transacciones, estadisticas, loading, error, obtenerPorEstado, obtenerHoy, refresh } = usePagos();
  const [filtro, setFiltro] = useState<'todas' | 'hoy' | 'completadas' | 'pendientes' | 'fallidas'>('todas');

  React.useEffect(() => {
    if (filtro === 'hoy') {
      obtenerHoy();
    } else if (filtro === 'completadas') {
      obtenerPorEstado('completado');
    } else if (filtro === 'pendientes') {
      obtenerPorEstado('pendiente');
    } else if (filtro === 'fallidas') {
      obtenerPorEstado('fallido');
    } else {
      refresh();
    }
  }, [filtro]);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Transacciones de Pago</h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Transacciones de Pago</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">Control de pasarelas y cobros digitales</p>
          </div>
          <Button onClick={refresh} size="sm" variant="secondary" className="flex items-center gap-2 text-xs">
            <RefreshCw size={14} />
            Refrescar
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="border-l-4 border-red-500 bg-red-900/20 p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </Card>
        )}

        {/* KPIs */}
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
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Monto</p>
            <p className="mt-2 text-2xl font-bold text-gold-400 font-display">{formatCOP(estadisticas.totalMonto)}</p>
          </Card>

          <Card className="p-4 bg-neutral-900/90 border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tasa Éxito</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400 font-display">{estadisticas.porcentajeExito.toFixed(1)}%</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filtro === 'todas' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('todas')}
            size="sm"
            className="text-xs"
          >
            📊 Todas
          </Button>
          <Button
            variant={filtro === 'hoy' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('hoy')}
            size="sm"
            className="text-xs"
          >
            🌙 Hoy
          </Button>
          <Button
            variant={filtro === 'completadas' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('completadas')}
            size="sm"
            className="text-xs"
          >
            ✅ Completadas
          </Button>
          <Button
            variant={filtro === 'pendientes' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('pendientes')}
            size="sm"
            className="text-xs"
          >
            ⏳ Pendientes
          </Button>
          <Button
            variant={filtro === 'fallidas' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('fallidas')}
            size="sm"
            className="text-xs"
          >
            ❌ Fallidas
          </Button>
        </div>

        {/* Listado en Cuadrícula Responsive */}
        {transacciones.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin transacciones" description="No hay pagos para mostrar con este filtro" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {transacciones.map((txn) => {
              const colors = estadoColor[txn.estado];
              return (
                <Card key={txn.id} className={`p-4 transition-all ${colors.bg}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">
                          {txn.metodoPago === 'stripe' ? '🔵 Stripe' : txn.metodoPago === 'mercadopago' ? '🟡 MercadoPago' : '💵 Efectivo'}
                        </span>
                        <Badge className={colors.badge}>
                          {estadoEmoji[txn.estado]} {txn.estado}
                        </Badge>
                        {txn.referenciaPasarela && (
                          <span className="text-xs text-neutral-500">Ref: {txn.referenciaPasarela.slice(0, 12)}...</span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-neutral-300">
                          Venta: <span className="font-medium">{txn.ventaId.slice(0, 12)}...</span>
                        </p>
                        {txn.clienteEmail && (
                          <p className="text-xs text-neutral-400">📧 {txn.clienteEmail}</p>
                        )}
                        {txn.clienteTelefono && (
                          <p className="text-xs text-neutral-400">📱 {txn.clienteTelefono}</p>
                        )}
                        {txn.errorMensaje && (
                          <p className="text-xs text-red-400">⚠️ {txn.errorMensaje}</p>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-neutral-500">
                        {txn.creadoEn?.toDate?.()
                          ? txn.creadoEn.toDate().toLocaleString()
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-2xl font-bold ${colors.text}`}>{formatCOP(txn.monto)}</p>
                      <p className="mt-2 text-xs text-neutral-500">
                        {txn.moneda}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
