// src/components/pos/OfflineStatusBanner.tsx
import { useState } from 'react';
import {
  WifiOff,
  UploadCloud,
  RefreshCw,
  Clock,
  Trash2,
  X,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import type { VentaPendienteOffline } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';

interface OfflineStatusBannerProps {
  isOnline: boolean;
  cantidadPendientes: number;
  sincronizando: boolean;
  ventasPendientes: VentaPendienteOffline[];
  onSincronizar: () => void;
  onDescartarVenta?: (id: string) => Promise<void>;
}

export function OfflineStatusBanner({
  isOnline,
  cantidadPendientes,
  sincronizando,
  ventasPendientes,
  onSincronizar,
  onDescartarVenta,
}: OfflineStatusBannerProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [descartandoId, setDescartandoId] = useState<string | null>(null);

  // Si está online y no hay ventas pendientes, no ocupamos espacio en el banner principal
  if (isOnline && cantidadPendientes === 0) {
    return null;
  }

  const handleDescartar = async (id: string) => {
    if (!onDescartarVenta) return;
    const seguro = window.confirm('¿Seguro que deseas descartar esta venta de la cola local?');
    if (!seguro) return;

    try {
      setDescartandoId(id);
      await onDescartarVenta(id);
    } finally {
      setDescartandoId(null);
    }
  };

  return (
    <>
      <section
        role="status"
        aria-live="polite"
        className={`mb-4 rounded-2xl border p-4 transition-all ${
          !isOnline
            ? 'border-amber-500/40 bg-amber-950/40 text-amber-200'
            : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                !isOnline ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {!isOnline ? (
                <WifiOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <UploadCloud
                  className={`h-5 w-5 ${sincronizando ? 'animate-bounce' : ''}`}
                  aria-hidden="true"
                />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-white">
                  {!isOnline ? 'Modo Offline activo (sin internet)' : 'Conexión restablecida'}
                </h2>
                {cantidadPendientes > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black tracking-wide text-amber-300 border border-amber-500/30">
                    {cantidadPendientes} {cantidadPendientes === 1 ? 'venta en cola' : 'ventas en cola'}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-neutral-300">
                {!isOnline
                  ? 'Puedes seguir cobrando con normalidad. Las ventas quedan seguras en la memoria del dispositivo y se subirán al reconectar.'
                  : `Tienes ${cantidadPendientes} venta(s) guardadas sin conexión listas para sincronizar con la nube.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {cantidadPendientes > 0 && (
              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                aria-label={`Ver detalle de las ${cantidadPendientes} ventas offline en cola`}
              >
                <HardDrive className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                <span>Ver cola</span>
              </button>
            )}

            {isOnline && cantidadPendientes > 0 && (
              <button
                type="button"
                onClick={onSincronizar}
                disabled={sincronizando}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-black text-neutral-950 shadow-lg shadow-emerald-950/40 hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                aria-label="Sincronizar ventas offline con el servidor ahora"
              >
                <RefreshCw
                  className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Modal de Detalle de Cola Offline */}
      {modalAbierto && (
        <StorefrontDialog
          labelledBy="modal-cola-offline-title"
          onClose={() => setModalAbierto(false)}
          onBackdropClick={() => setModalAbierto(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-gold-400" aria-hidden="true" />
                <h3 id="modal-cola-offline-title" className="font-display text-lg font-bold text-white">
                  Ventas Guardadas en Dispositivo (Modo Offline)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-gold-400"
                aria-label="Cerrar modal de cola offline"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {ventasPendientes.length === 0 ? (
                <div className="py-8 text-center text-neutral-400">
                  <p className="text-sm">No hay ventas pendientes por sincronizar en este momento.</p>
                </div>
              ) : (
                ventasPendientes.map((venta, index) => {
                  const fechaObj = new Date(venta.fechaCreacion);
                  const horaStr = !isNaN(fechaObj.getTime())
                    ? fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    : 'Hora desconocida';

                  return (
                    <article
                      key={venta.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 transition-colors hover:border-neutral-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-neutral-500">
                              #{index + 1}
                            </span>
                            <span className="font-display text-base font-black text-gold-400">
                              {formatCOP(venta.total)}
                            </span>
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                              {venta.metodoPago}
                            </span>
                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                              {venta.tipoEntrega}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-neutral-400 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
                            <span>Registrada a las {horaStr}</span>
                          </p>

                          <div className="mt-2 text-xs text-neutral-300">
                            <p className="font-semibold text-neutral-400 mb-0.5">Productos:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {venta.items.map((it, itIdx) => (
                                <li key={itIdx}>
                                  <span className="font-bold text-white">{it.cantidad}x</span>{' '}
                                  {it.nombre} ({formatCOP(it.subtotal)})
                                </li>
                              ))}
                            </ul>
                          </div>

                          {venta.estadoSync === 'error' && (
                            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/30 p-2 text-xs text-red-300">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                              <span>Fallo previo: {venta.errorDetalle || 'Error al conectar con la base de datos'}</span>
                            </div>
                          )}
                        </div>

                        {onDescartarVenta && (
                          <button
                            type="button"
                            onClick={() => void handleDescartar(venta.id)}
                            disabled={descartandoId === venta.id}
                            className="grid h-11 w-11 place-items-center rounded-xl border border-red-900/40 bg-red-950/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400"
                            aria-label={`Descartar venta de ${formatCOP(venta.total)} de la cola`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            {/* Footer del Modal */}
            <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900/50 px-6 py-4">
              <span className="text-xs text-neutral-400">
                Almacenamiento local seguro en IndexedDB
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
                >
                  Cerrar
                </button>
                {isOnline && ventasPendientes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onSincronizar();
                    }}
                    disabled={sincronizando}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-neutral-950 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
                    <span>{sincronizando ? 'Sincronizando...' : 'Sincronizar todas'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </StorefrontDialog>
      )}
    </>
  );
}
