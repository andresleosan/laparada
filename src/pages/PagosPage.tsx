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
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">Transacciones de Pago</h1>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
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
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Transacciones de Pago</h1>
            <p className="mt-2 text-neutral-400">Gestión de pagos por Stripe/MercadoPago</p>
          </div>
          <Button onClick={refresh} size="sm" variant="secondary" className="flex items-center gap-2">
            <RefreshCw size={16} />
            Refrescar
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Card className="mb-6 border-l-4 border-red-500 bg-red-900/20 p-4">
            <p className="text-red-300">{error}</p>
          </Card>
        )}

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-500 opacity-5" />
            <p className="text-xs text-neutral-400">Total Transacciones</p>
            <p className="mt-1 text-2xl font-bold text-blue-400">{estadisticas.totalTransacciones}</p>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-green-500 opacity-5" />
            <p className="text-xs text-neutral-400">Completadas</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{estadisticas.transaccionesCompletadas}</p>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gold opacity-5" />
            <p className="text-xs text-neutral-400">Total Monto</p>
            <p className="mt-1 text-xl font-bold text-gold">{formatCOP(estadisticas.totalMonto)}</p>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 p-3">
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-green-500 opacity-5" />
            <p className="text-xs text-neutral-400">Tasa Éxito</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{estadisticas.porcentajeExito.toFixed(1)}%</p>
          </Card>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={filtro === 'todas' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('todas')}
            size="sm"
          >
            📊 Todas
          </Button>
          <Button
            variant={filtro === 'hoy' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('hoy')}
            size="sm"
          >
            🌙 Hoy
          </Button>
          <Button
            variant={filtro === 'completadas' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('completadas')}
            size="sm"
          >
            ✅ Completadas
          </Button>
          <Button
            variant={filtro === 'pendientes' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('pendientes')}
            size="sm"
          >
            ⏳ Pendientes
          </Button>
          <Button
            variant={filtro === 'fallidas' ? 'primary' : 'secondary'}
            onClick={() => setFiltro('fallidas')}
            size="sm"
          >
            ❌ Fallidas
          </Button>
        </div>

        {/* Listado */}
        {transacciones.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin transacciones" description="No hay transacciones para mostrar" />
        ) : (
          <div className="space-y-3">
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
