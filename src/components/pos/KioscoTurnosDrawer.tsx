import { useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  QrCode,
  ShoppingBag,
  Tablet,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Domicilio, ItemVenta, MetodoPago } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { marcarPedidoKioscoPagado } from '@/services/kioscoService';
import { createToast } from '@/components/ui/Toast';

export interface KioscoTurnosDrawerProps {
  pedidos: Domicilio[];
  negocioId: string;
  onClose: () => void;
  onCargarAlTicket: (items: ItemVenta[], clienteNombre?: string, mesaNumero?: string) => void;
}

export function KioscoTurnosDrawer({
  pedidos,
  negocioId,
  onClose,
  onCargarAlTicket,
}: KioscoTurnosDrawerProps) {
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const handleCobroRapido = async (pedido: Domicilio, metodo: MetodoPago) => {
    setProcesandoId(pedido.id);
    try {
      await marcarPedidoKioscoPagado(negocioId, pedido.id, metodo);
      createToast(
        `✓ Turno ${pedido.numeroTurno || '#' + pedido.id.slice(-4)} cobrado con éxito. ¡Enviado a preparación!`,
        'success',
        3500
      );
    } catch (err) {
      console.error('Error cobrando pedido de kiosco:', err);
      createToast(
        err instanceof Error ? err.message : 'Error al registrar cobro de kiosco',
        'error',
        3500
      );
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCargar = (pedido: Domicilio) => {
    onCargarAlTicket(pedido.items, pedido.clienteNombre, pedido.mesaNumero);
    onClose();
    createToast(`✓ Pedido de Turno ${pedido.numeroTurno || 'Kiosco'} cargado al ticket`, 'success', 2500);
  };

  return (
    <StorefrontDialog
      labelledBy="modal-turnos-kiosco-titulo"
      onClose={onClose}
      className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl"
    >
      {/* Cabecera */}
      <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Tablet className="h-6 w-6" />
          </div>
          <div>
            <h2 id="modal-turnos-kiosco-titulo" className="font-display text-xl font-black text-white">
              Pedidos de Kiosco por Cobrar ({pedidos.length})
            </h2>
            <p className="text-xs text-neutral-400">
              Turnos generados por clientes en la terminal de autoservicio esperando pago en caja.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          aria-label="Cerrar lista de turnos de kiosco"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Lista de Pedidos */}
      <div className="mt-5 max-h-[60vh] space-y-4 overflow-y-auto pr-1 no-scrollbar">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-neutral-800 bg-neutral-950/60">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
            <p className="font-display text-lg font-black text-white">
              ¡Al día! No hay pedidos de kiosco pendientes de cobro
            </p>
            <span className="text-xs text-neutral-500 mt-1">
              Los nuevos pedidos generados desde la terminal táctil aparecerán aquí automáticamente.
            </span>
          </div>
        ) : (
          pedidos.map((ped) => {
            const numTurno = ped.numeroTurno || `#${ped.id.slice(-4).toUpperCase()}`;
            const esTransferencia = ped.metodoPago === 'transferencia';
            const esSalon = ped.tipoServicio === 'salon' || Boolean(ped.mesaNumero);

            return (
              <article
                key={ped.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border-2 border-neutral-800 bg-neutral-950 p-4 transition-all hover:border-gold-400/50"
              >
                {/* Datos del Turno y Cliente */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-2xl font-black text-gold-400 tracking-tight">
                      {numTurno}
                    </span>
                    <span className="rounded-md border border-purple-500/40 bg-purple-950/60 px-2 py-0.5 text-[11px] font-bold text-purple-300">
                      Kiosco
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        esTransferencia
                          ? 'bg-sky-950 border border-sky-500/40 text-sky-300'
                          : 'bg-emerald-950 border border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {esTransferencia ? <QrCode className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                      {esTransferencia ? 'Paga con Transferencia' : 'Paga con Efectivo'}
                    </span>
                  </div>

                  <p className="text-sm font-black text-white">
                    {ped.clienteNombre}{' '}
                    <span className="text-xs font-normal text-neutral-400">
                      ({esSalon ? `Salón ${ped.mesaNumero ? `Mesa ${ped.mesaNumero}` : ''}` : 'Para Llevar'})
                    </span>
                  </p>

                  {/* Resumen de Ítems */}
                  <div className="mt-2 text-xs text-neutral-400 space-y-0.5">
                    {ped.items.map((it, idx) => (
                      <p key={idx}>
                        • <strong className="text-neutral-200">{it.cantidad}x</strong> {it.nombre}
                        {it.modificadores && it.modificadores.length > 0 && (
                          <span className="text-gold-400/80 italic ml-1">
                            ({it.modificadores.join(', ')})
                          </span>
                        )}
                      </p>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-400">Total a cobrar:</span>
                    <span className="font-display text-xl font-black text-gold-400">
                      {formatCOP(ped.total)}
                    </span>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCobroRapido(ped, ped.metodoPago || 'efectivo')}
                    disabled={procesandoId === ped.id}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-400 px-4 py-2.5 text-xs font-black text-black hover:bg-gold-500 transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Cobrar Turno</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCargar(ped)}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-bold text-neutral-300 hover:border-neutral-600 hover:text-white transition-colors min-h-[44px]"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Cargar al Ticket</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </StorefrontDialog>
  );
}
