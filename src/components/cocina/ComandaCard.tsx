import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Globe,
  MessageSquare,
  PackageCheck,
  Store,
  Truck,
} from 'lucide-react';
import type { Domicilio } from '@/types';
import {
  getCanalComandaBadge,
  getCodigoComanda,
  getKitchenUrgency,
} from '@/utils/kitchenKds';
import { formatCOP } from '@/utils/formatCOP';

export interface ComandaCardProps {
  comanda: Domicilio;
  ahoraMs: number;
  itemsPreparados: Record<string, boolean>;
  onToggleItem: (comandaId: string, itemIdx: number) => void;
  onAvanzar: (comanda: Domicilio) => void;
  onDevolver?: (comandaId: string) => void;
  onMarcarEntregado?: (comandaId: string) => void;
  isLoading?: boolean;
}

export const ComandaCard = ({
  comanda,
  ahoraMs,
  itemsPreparados,
  onToggleItem,
  onAvanzar,
  onDevolver,
  onMarcarEntregado,
  isLoading = false,
}: ComandaCardProps) => {
  const urgency = getKitchenUrgency(comanda.creadoEn, ahoraMs);
  const canalBadge = getCanalComandaBadge(comanda.origen);
  const codigo = getCodigoComanda(comanda);

  const horaIngresoStr = (() => {
    try {
      if (!comanda.creadoEn) return '';
      let date: Date;
      if (typeof comanda.creadoEn === 'object' && 'toDate' in comanda.creadoEn) {
        date = (comanda.creadoEn as { toDate: () => Date }).toDate();
      } else if (typeof comanda.creadoEn === 'object' && 'seconds' in comanda.creadoEn) {
        date = new Date((comanda.creadoEn as { seconds: number }).seconds * 1000);
      } else {
        date = new Date(comanda.creadoEn as string | number);
      }
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  })();

  const esDomicilio = comanda.direccion || comanda.barrio;
  const items = comanda.items || [];
  const todosPreparados = items.length > 0 && items.every((_, idx) => itemsPreparados[`${comanda.id}_${idx}`]);

  return (
    <article
      data-testid={`comanda-card-${comanda.id}`}
      className={`flex flex-col justify-between rounded-2xl border-2 bg-neutral-900/95 p-4 shadow-xl transition-all duration-200 ${urgency.borderClass} ${urgency.bgCardClass}`}
    >
      {/* Cabecera de la comanda: Código, Canal, Cronómetro y Semáforo */}
      <div>
        <header className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-black tracking-tight text-white">
                {codigo}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${canalBadge.badgeClass}`}
              >
                {canalBadge.iconName === 'whatsapp' && <MessageSquare className="h-3 w-3" />}
                {canalBadge.iconName === 'web' && <Globe className="h-3 w-3" />}
                {canalBadge.iconName === 'pos' && <Store className="h-3 w-3" />}
                {canalBadge.label}
              </span>
            </div>
            {horaIngresoStr && (
              <span className="text-xs font-medium text-neutral-400">
                Ingresó: {horaIngresoStr}
              </span>
            )}
          </div>

          {/* Cronómetro en vivo y nivel de urgencia */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 font-display text-2xl font-black text-white">
              <Clock className="h-5 w-5 text-neutral-400" />
              <span>{urgency.tiempoFormateado}</span>
            </div>
            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${urgency.badgeClass}`}
            >
              {urgency.badgeLabel}
            </span>
          </div>
        </header>

        {/* Datos del Cliente y Tipo de Entrega */}
        <div className="my-3 flex items-center justify-between text-sm">
          <div className="min-w-0 pr-2">
            <p className="truncate font-bold text-white text-base">
              {comanda.clienteNombre || 'Cliente mostrador'}
            </p>
            <p className="flex items-center gap-1 text-xs text-neutral-400 truncate">
              {esDomicilio ? (
                <>
                  <Truck className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                  <span>Domicilio · {comanda.barrio || comanda.direccion}</span>
                </>
              ) : (
                <>
                  <Store className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span>Para mesa / mostrador</span>
                </>
              )}
            </p>
          </div>
          <span className="shrink-0 font-mono text-xs font-semibold text-neutral-300">
            {formatCOP(comanda.total)}
          </span>
        </div>

        {/* Alerta de notas especiales (alérgenos, sin cebolla, etc.) */}
        {Boolean(comanda.notas?.trim()) && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-xl bg-amber-400 p-2.5 text-neutral-950 font-bold text-sm shadow-md"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-neutral-950 mt-0.5" />
            <div className="leading-tight">
              <span className="uppercase text-[11px] font-black tracking-wider block opacity-90">
                Instrucciones de cocina:
              </span>
              <span>{comanda.notas}</span>
            </div>
          </div>
        )}

        {/* Lista de Platos con selector táctil para tachar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-400 pb-1">
            <span>Platos ({items.length})</span>
            <span className="text-[10px] text-neutral-400">Toca para tachar</span>
          </div>

          <ul className="space-y-1.5">
            {items.map((item, idx) => {
              const preparado = Boolean(itemsPreparados[`${comanda.id}_${idx}`]);
              return (
                <li key={`${item.nombre}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => onToggleItem(comanda.id, idx)}
                    aria-pressed={preparado}
                    className={`w-full flex items-center justify-between gap-2 rounded-xl border p-2 text-left min-h-[44px] transition-colors ${
                      preparado
                        ? 'border-emerald-600/50 bg-emerald-950/40 text-emerald-300'
                        : 'border-white/10 bg-neutral-800/80 hover:bg-neutral-800 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${
                          preparado
                            ? 'border-emerald-500 bg-emerald-500 text-black'
                            : 'border-gold-400/60 bg-gold-400/20 text-gold-400'
                        }`}
                      >
                        {preparado ? <Check className="h-4 w-4" /> : `${item.cantidad}×`}
                      </span>
                      <span
                        className={`text-sm font-bold truncate ${
                          preparado ? 'line-through text-neutral-400' : 'text-white'
                        }`}
                      >
                        {item.nombre}
                      </span>
                    </div>

                    {item.tipo === 'combo' && (
                      <span className="shrink-0 text-[10px] font-bold uppercase rounded bg-neutral-700/80 px-1.5 py-0.5 text-neutral-300">
                        Combo
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Botones de acción rápida a un toque */}
      <footer className="mt-4 pt-3 border-t border-white/10">
        {comanda.estado === 'pendiente' && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAvanzar(comanda)}
            className="w-full min-h-[48px] rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-neutral-950 font-black text-base flex items-center justify-center gap-2 shadow-lg transition-transform"
          >
            <Flame className="h-5 w-5" />
            <span>{isLoading ? 'Iniciando...' : '🔥 A Cocina / Iniciar'}</span>
          </button>
        )}

        {comanda.estado === 'en_preparacion' && (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAvanzar(comanda)}
            className={`w-full min-h-[48px] rounded-xl font-black text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98] ${
              todosPreparados
                ? 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 ring-2 ring-emerald-300'
                : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950'
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>{isLoading ? 'Guardando...' : '✅ ¡Comanda Lista!'}</span>
          </button>
        )}

        {comanda.estado === 'en_camino' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-lg px-3 py-1.5">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4" />
                Comanda lista en mostrador
              </span>
              <span>{esDomicilio ? 'En despacho' : 'Listo para retiro'}</span>
            </div>

            <div className="flex gap-2">
              {Boolean(onDevolver) && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onDevolver?.(comanda.id)}
                  aria-label={`Devolver comanda ${codigo} a cocina`}
                  className="flex items-center justify-center gap-1 rounded-xl border border-white/20 bg-neutral-800 hover:bg-neutral-700 active:scale-[0.98] px-3 py-2 text-xs font-bold text-neutral-300 min-h-[44px] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Devolver</span>
                </button>
              )}

              {Boolean(onMarcarEntregado) && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onMarcarEntregado?.(comanda.id)}
                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-neutral-950 font-black text-sm flex items-center justify-center gap-1.5 shadow transition-colors"
                >
                  <Check className="h-4 w-4" />
                  <span>Entregar / Despachado</span>
                </button>
              )}
            </div>
          </div>
        )}
      </footer>
    </article>
  );
};
