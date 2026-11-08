import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Flame,
  Trash2,
  Utensils,
} from 'lucide-react';
import type { NotificacionOperativa, ModuloNotificacion } from '@/types/notificacion';
import {
  getBadgeUrgenciaInfo,
  getModuloInfo,
  formatearTiempoRelativoNotificacion,
} from '@/utils/notificacionesUtils';

interface NotificacionCardProps {
  notificacion: NotificacionOperativa;
  onMarcarLeida?: (id: string) => void;
  onEliminar?: (id: string) => void;
}

function getIconoModulo(modulo: ModuloNotificacion) {
  switch (modulo) {
    case 'cocina':
      return Flame;
    case 'inventario':
      return Boxes;
    case 'pedidos':
      return ClipboardList;
    case 'salon':
      return Utensils;
    case 'caja':
      return CircleDollarSign;
    case 'sistema':
    default:
      return Bell;
  }
}

export function NotificacionCard({
  notificacion,
  onMarcarLeida,
  onEliminar,
}: NotificacionCardProps) {
  const urgenciaInfo = getBadgeUrgenciaInfo(notificacion.urgencia);
  const moduloInfo = getModuloInfo(notificacion.modulo);
  const Icono = getIconoModulo(notificacion.modulo);
  const tiempoRelativo = formatearTiempoRelativoNotificacion(notificacion.fecha);

  const esCritica = notificacion.urgencia === 'critica';
  const esAlta = notificacion.urgencia === 'alta';

  // Borde temático dinámico según urgencia y estado de lectura
  const borderLeftColor = esCritica
    ? 'border-l-rose-500'
    : esAlta
      ? 'border-l-amber-500'
      : notificacion.urgencia === 'media'
        ? 'border-l-sky-500'
        : 'border-l-neutral-600';

  return (
    <article
      data-testid="notificacion-card"
      aria-label={`Notificación: ${notificacion.titulo}`}
      className={`relative rounded-2xl border transition-all duration-200 border-l-4 ${borderLeftColor} ${
        notificacion.leida
          ? 'bg-neutral-900/60 border-neutral-800/80 opacity-80'
          : esCritica
            ? 'bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/20'
            : esAlta
              ? 'bg-amber-950/20 border-amber-500/30 shadow-md shadow-amber-950/20'
              : 'bg-neutral-900 border-neutral-800 shadow-md'
      } p-4 sm:p-5`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        {/* Encabezado: Ícono, Badges y Título */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${urgenciaInfo.borderClass} ${urgenciaInfo.bgClass}`}
          >
            <Icono className={`h-5 w-5 ${urgenciaInfo.textClass}`} aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {/* Badge de Urgencia */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${urgenciaInfo.bgClass} ${urgenciaInfo.textClass} ${urgenciaInfo.borderClass}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${urgenciaInfo.dotClass} ${
                    esCritica && !notificacion.leida ? 'animate-ping' : ''
                  }`}
                  aria-hidden="true"
                />
                {urgenciaInfo.label}
              </span>

              {/* Badge de Módulo */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[11px] font-medium border border-neutral-700">
                {moduloInfo.label}
              </span>

              {/* Indicador No Leída */}
              {!notificacion.leida && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600 text-white tracking-wide">
                  Nueva
                </span>
              )}

              {/* Tiempo relativo */}
              <span className="text-[11px] text-neutral-400 font-medium ml-auto">
                {tiempoRelativo}
              </span>
            </div>

            <h3
              className={`font-display text-base sm:text-lg font-bold leading-snug tracking-tight ${
                notificacion.leida ? 'text-neutral-300' : 'text-white'
              }`}
            >
              {notificacion.titulo}
            </h3>

            <p className="mt-1 text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {notificacion.mensaje}
            </p>

            {/* Metadatos adicionales o autor */}
            {notificacion.creadaPor && (
              <p className="mt-2 text-[11px] text-neutral-400 font-medium">
                Emitida por: <span className="text-amber-300">{notificacion.creadaPor}</span>
              </p>
            )}
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center justify-end sm:flex-col sm:items-end gap-2 shrink-0 pt-2 sm:pt-0 border-t border-neutral-800/80 sm:border-0">
          {notificacion.enlace && (
            <Link
              to={notificacion.enlace}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all active:scale-95"
              aria-label={`Ir a pantalla de ${notificacion.titulo}`}
              title="Abrir módulo relacionado"
            >
              <span>Ver en módulo</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}

          <div className="flex items-center gap-1.5">
            {onMarcarLeida && (
              <button
                type="button"
                onClick={() => onMarcarLeida(notificacion.id)}
                className={`inline-flex items-center justify-center h-11 w-11 rounded-xl border transition-colors ${
                  notificacion.leida
                    ? 'border-neutral-800 bg-neutral-800/50 text-neutral-400 hover:text-white'
                    : 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40'
                }`}
                aria-label={
                  notificacion.leida
                    ? 'Marcar notificación como no leída'
                    : 'Marcar notificación como leída'
                }
                title={notificacion.leida ? 'Notificación ya leída' : 'Marcar como leída'}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {onEliminar && (
              <button
                type="button"
                onClick={() => onEliminar(notificacion.id)}
                className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-rose-500/30 hover:bg-rose-950/30 hover:text-rose-400 transition-colors"
                aria-label={`Descartar notificación ${notificacion.titulo}`}
                title="Descartar notificación"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
