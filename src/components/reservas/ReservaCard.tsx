import {
  Clock,
  Users,
  Phone,
  MessageCircle,
  Store,
  Globe,
  Check,
  CheckCheck,
  X,
  Trash2,
} from 'lucide-react';
import type { ReservaNegocio, EstadoReserva } from '@/types/reserva';

interface ReservaCardProps {
  reserva: ReservaNegocio;
  onCambiarEstado: (id: string, nuevoEstado: EstadoReserva) => void;
  onEliminar?: (id: string) => void;
  procesandoId?: string | null;
}

export function formatFechaHora(fechaHoraStr: string): { hora: string; fecha: string } {
  if (!fechaHoraStr) return { hora: '--:--', fecha: 'Sin fecha' };

  // Intentar parsear como Date estándar
  const d = new Date(fechaHoraStr);
  if (!isNaN(d.getTime())) {
    const hora = d.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const fecha = d.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    return { hora, fecha };
  }

  // Si es un string personalizado devuelto por el modelo (ej. "2026-11-03 20:00" o "Hoy 8:00 PM")
  return { hora: fechaHoraStr, fecha: '' };
}

export function ReservaCard({
  reserva,
  onCambiarEstado,
  onEliminar,
  procesandoId,
}: ReservaCardProps) {
  const { hora, fecha } = formatFechaHora(reserva.fechaHoraReserva);
  const isBusy = procesandoId === reserva.id;

  // Canal visual
  const renderOrigenBadge = () => {
    switch (reserva.origen) {
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </span>
        );
      case 'web':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Globe className="h-3 w-3" />
            Tienda Web
          </span>
        );
      case 'pos':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Store className="h-3 w-3" />
            Punto Físico
          </span>
        );
    }
  };

  // Estado visual
  const renderEstadoBadge = () => {
    switch (reserva.estado) {
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clock className="h-3 w-3" />
            Pendiente
          </span>
        );
      case 'confirmada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="h-3 w-3" />
            Confirmada
          </span>
        );
      case 'completada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <CheckCheck className="h-3 w-3" />
            Completada
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
            <X className="h-3 w-3" />
            Cancelada
          </span>
        );
    }
  };

  // Formato para teléfono a WhatsApp directo
  const telefonoNumerico = reserva.clienteTelefono.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${telefonoNumerico.startsWith('57') ? telefonoNumerico : `57${telefonoNumerico}`}`;

  return (
    <article
      className={`rounded-2xl border bg-neutral-900/90 p-5 transition-all shadow-md ${
        reserva.estado === 'pendiente'
          ? 'border-yellow-500/40 shadow-yellow-500/5'
          : reserva.estado === 'confirmada'
            ? 'border-emerald-500/30 shadow-emerald-500/5'
            : reserva.estado === 'completada'
              ? 'border-sky-500/30 opacity-80'
              : 'border-neutral-800 opacity-60'
      }`}
    >
      {/* Fila superior: Hora, Fecha y Badges */}
      <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3.5 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-display text-2xl font-black text-gold-400 leading-none">
              {hora}
            </span>
            {fecha && (
              <span className="text-xs font-medium text-neutral-400 capitalize mt-1">
                {fecha}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {renderOrigenBadge()}
          {renderEstadoBadge()}
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-white truncate max-w-[240px]">
            {reserva.clienteNombre}
          </h3>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-800/80 border border-neutral-700/60 text-neutral-200">
            <Users className="h-4 w-4 text-gold-400" />
            <span className="font-display text-sm font-bold">
              {reserva.personas} {reserva.personas === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>

        {/* Teléfono con accesos rápidos */}
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <a
            href={`tel:${reserva.clienteTelefono}`}
            className="inline-flex items-center gap-1 text-neutral-300 hover:text-gold-400 transition-colors py-1"
          >
            <Phone className="h-3.5 w-3.5 text-neutral-500" />
            <span>{reserva.clienteTelefono}</span>
          </a>
          <span className="text-neutral-700">·</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors py-1 font-medium"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Chat WhatsApp</span>
          </a>
        </div>

        {/* Observaciones / Notas */}
        {reserva.notas && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5 text-xs text-neutral-300 italic">
            &ldquo;{reserva.notas}&rdquo;
          </div>
        )}
      </div>

      {/* Acciones de 1 toque */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          {reserva.estado === 'pendiente' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onCambiarEstado(reserva.id, 'confirmada')}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 transition-colors shadow-sm disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Confirmar
            </button>
          )}

          {reserva.estado === 'confirmada' && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onCambiarEstado(reserva.id, 'completada')}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-neutral-950 transition-colors shadow-sm disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Llegó / Completar
            </button>
          )}

          {(reserva.estado === 'pendiente' || reserva.estado === 'confirmada') && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onCambiarEstado(reserva.id, 'cancelada')}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-3.5 rounded-xl text-xs font-semibold border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
          )}
        </div>

        {onEliminar && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onEliminar(reserva.id)}
            className="flex items-center justify-center h-11 w-11 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-50"
            aria-label={`Eliminar reserva de ${reserva.clienteNombre}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}
