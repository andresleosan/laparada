import { Clock, DollarSign, PlusCircle, Receipt, User, Users, Utensils } from 'lucide-react';
import type { Mesa } from '@/types/mesa';
import { getBadgeEstadoMesa } from '@/utils/mesasUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface MesaCardProps {
  mesa: Mesa;
  onAbrir: (mesa: Mesa) => void;
  onVerDetalle: (mesa: Mesa) => void;
  onCobrarDirecto?: (mesa: Mesa) => void;
}

export function MesaCard({ mesa, onAbrir, onVerDetalle, onCobrarDirecto }: MesaCardProps) {
  const badge = getBadgeEstadoMesa(mesa.estado);

  const horaAperturaStr = (() => {
    if (!mesa.apertura) return null;
    try {
      let date: Date;
      if (typeof mesa.apertura === 'object' && 'toDate' in mesa.apertura) {
        date = (mesa.apertura as { toDate: () => Date }).toDate();
      } else if (typeof mesa.apertura === 'object' && 'seconds' in mesa.apertura) {
        date = new Date((mesa.apertura as { seconds: number }).seconds * 1000);
      } else {
        date = new Date(mesa.apertura as string | number);
      }
      return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  })();

  return (
    <article
      data-testid={`mesa-card-${mesa.id}`}
      className={`relative flex flex-col justify-between rounded-2xl border-2 bg-neutral-900/95 p-4 shadow-xl transition-all duration-200 ${badge.borderClass}`}
    >
      {/* Cabecera de la Mesa: Nombre, Zona y Badge */}
      <div>
        <header className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-black text-white tracking-tight">
                {mesa.nombre}
              </span>
            </div>
            <span className="text-xs font-medium text-neutral-400 block truncate">
              {mesa.zona || 'Salón Principal'}
            </span>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.colorClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${badge.dotClass}`} />
            {badge.label}
          </span>
        </header>

        {/* Capacidad y Comensales */}
        <div className="my-3 space-y-2 text-sm">
          <div className="flex items-center justify-between text-neutral-300">
            <span className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Users className="h-4 w-4 text-neutral-400" />
              Capacidad:
            </span>
            <span className="font-semibold text-white">
              {mesa.capacidad} {mesa.capacidad === 1 ? 'persona' : 'personas'}
            </span>
          </div>

          {mesa.estado !== 'libre' && (
            <>
              {Boolean(mesa.comensales) && (
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Utensils className="h-4 w-4 text-amber-400" />
                    Sentados:
                  </span>
                  <span className="font-bold text-amber-400">
                    {mesa.comensales} comensales
                  </span>
                </div>
              )}

              {Boolean(mesa.mesero) && (
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <User className="h-4 w-4 text-neutral-400" />
                    Mesero:
                  </span>
                  <span className="font-medium text-white truncate max-w-[140px]">
                    {mesa.mesero}
                  </span>
                </div>
              )}

              {horaAperturaStr && (
                <div className="flex items-center justify-between text-neutral-300">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Clock className="h-4 w-4 text-neutral-400" />
                    Abierta a las:
                  </span>
                  <span className="font-mono text-xs text-neutral-300">
                    {horaAperturaStr}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Pie: Total y Acciones Táctiles */}
      <div className="border-t border-white/10 pt-3">
        {mesa.estado !== 'libre' ? (
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs uppercase font-black tracking-wider text-neutral-400">
              Cuenta:
            </span>
            <span className="font-display text-xl font-black text-amber-400">
              {formatCOP(mesa.totalActual || 0)}
            </span>
          </div>
        ) : (
          <div className="mb-3 text-xs text-emerald-400/80 font-medium">
            Mesa desocupada y disponible
          </div>
        )}

        <div className="flex items-center gap-2">
          {mesa.estado === 'libre' ? (
            <button
              type="button"
              onClick={() => onAbrir(mesa)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 active:scale-95"
            >
              <PlusCircle className="h-4 w-4" />
              Abrir Mesa
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onVerDetalle(mesa)}
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 px-3 py-2.5 text-xs font-bold text-white border border-neutral-700 hover:bg-neutral-700 active:scale-95 transition-all"
              >
                <Receipt className="h-4 w-4 text-gold-400" />
                Ver Cuenta
              </button>

              {mesa.estado === 'por_cobrar' && onCobrarDirecto && (
                <button
                  type="button"
                  onClick={() => onCobrarDirecto(mesa)}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-2.5 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all animate-pulse"
                >
                  <DollarSign className="h-4 w-4" />
                  Cobrar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

