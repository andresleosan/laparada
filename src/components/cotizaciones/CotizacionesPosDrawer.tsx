import { useId } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Flame,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { CotizacionComercial, ItemVenta } from '@/types';
import {
  ESTADOS_COTIZACION_META,
  construirItemsVentaDesdeCotizacion,
  obtenerEstadoEfectivoCotizacion,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface CotizacionesPosDrawerProps {
  cotizaciones: CotizacionComercial[];
  onClose: () => void;
  onCargarAlTicket: (
    items: ItemVenta[],
    cotizacion: CotizacionComercial
  ) => void;
  onConvertirEn1Clic: (cotizacion: CotizacionComercial) => void;
}

export function CotizacionesPosDrawer({
  cotizaciones,
  onClose,
  onCargarAlTicket,
  onConvertirEn1Clic,
}: CotizacionesPosDrawerProps) {
  const titleId = `pos-cotizaciones-${useId().replace(/:/g, '')}`;

  const cotizacionesOperables = (cotizaciones || []).filter((cot) => {
    const estado = obtenerEstadoEfectivoCotizacion(cot);
    return estado === 'aprobada' || estado === 'enviada' || estado === 'borrador';
  });

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/35 bg-gold-400/15 text-gold-400">
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-black text-white">
                Cotizaciones & Eventos Activos ({cotizacionesOperables.length})
              </h2>
              <p className="text-xs text-neutral-400">
                Carga una propuesta al ticket del POS o conviértela en 1 clic a Venta y Comanda de Cocina.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de cotizaciones en POS"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="mt-5 max-h-[58vh] space-y-3 overflow-y-auto pr-1">
          {cotizacionesOperables.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950/70 p-10 text-center">
              <CheckCircle2 className="mb-2 h-10 w-10 text-emerald-400" />
              <p className="font-display text-lg font-black text-white">
                Sin cotizaciones pendientes de cobro
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Puedes crear propuestas corporativas y de catering desde el módulo de Cotizaciones o guardar el ticket actual del POS.
              </p>
            </div>
          ) : (
            cotizacionesOperables.map((cot) => {
              const estadoEfectivo = obtenerEstadoEfectivoCotizacion(cot);
              const meta = ESTADOS_COTIZACION_META[estadoEfectivo];

              return (
                <article
                  key={cot.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:flex-row sm:items-center hover:border-gold-400/50 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-gold-400">
                        {cot.codigo}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                      {cot.anticipoMonto > 0 && (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          Anticipo {formatCOP(cot.anticipoMonto)}
                        </span>
                      )}
                    </div>

                    <p className="truncate text-sm font-black text-white">
                      {cot.empresa || cot.clienteNombre}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-gold-400" />
                        {cot.fechaEvento}
                        {cot.horaEvento ? ` · ${cot.horaEvento}` : ''}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-sky-400" />
                        {cot.invitados} inv.
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <span className="font-display text-lg font-black text-gold-400">
                        {formatCOP(cot.totalCotizado)}
                      </span>
                      {cot.anticipoMonto > 0 && (
                        <span className="text-xs text-neutral-400">
                          Saldo: <strong className="text-white">{formatCOP(cot.saldoPendiente)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 gap-2 sm:w-auto sm:flex-col">
                    <button
                      type="button"
                      onClick={() => onConvertirEn1Clic(cot)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-400 px-3.5 text-xs font-black text-black hover:bg-gold-500 sm:flex-initial"
                    >
                      <Flame className="h-4 w-4" aria-hidden="true" />
                      <span>Convertir 1 Clic</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const itemsVenta = construirItemsVentaDesdeCotizacion(
                          cot.items,
                          cot.costoLogistica
                        );
                        onCargarAlTicket(itemsVenta, cot);
                        onClose();
                      }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 text-xs font-bold text-neutral-200 hover:border-gold-400 hover:text-white sm:flex-initial"
                    >
                      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                      <span>Cargar al Ticket</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <footer className="mt-5 flex items-center justify-between border-t border-neutral-800 pt-4">
          <Link
            to="/cotizaciones"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-400/10 px-4 text-xs font-bold text-gold-300 hover:bg-gold-400 hover:text-black"
          >
            <span>Abrir Centro de Cotizaciones</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-4 text-xs font-bold text-neutral-300 hover:text-white"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </StorefrontDialog>
  );
}
