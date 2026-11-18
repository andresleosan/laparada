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
  Utensils,
  ShieldCheck,
  Send,
} from 'lucide-react';
import type { ReservaNegocio, EstadoReserva } from '@/types/reserva';
import { formatCOP } from '@/utils/formatCOP';
import {
  construirMensajeConfirmacionReservaWhatsApp,
  construirMensajeRecordatorioReservaWhatsApp,
  formatearOcasionReserva,
  generarUrlWhatsAppReserva,
} from '@/utils/reservasUtils';

interface ReservaCardProps {
  reserva: ReservaNegocio;
  negocioNombre?: string;
  onCambiarEstado: (id: string, nuevoEstado: EstadoReserva) => void;
  onVerificarAnticipo?: (reserva: ReservaNegocio) => void;
  onEnviarRecordatorioWhatsApp?: (reserva: ReservaNegocio) => void;
  onSentarEnMesa?: (reserva: ReservaNegocio) => void;
  onEliminar?: (id: string) => void;
  procesandoId?: string | null;
}

export function formatFechaHora(fechaHoraStr: string): { hora: string; fecha: string } {
  if (!fechaHoraStr) return { hora: '--:--', fecha: 'Sin fecha' };

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

  return { hora: fechaHoraStr, fecha: '' };
}

export function ReservaCard({
  reserva,
  negocioNombre = 'La Parada',
  onCambiarEstado,
  onVerificarAnticipo,
  onEnviarRecordatorioWhatsApp,
  onSentarEnMesa,
  onEliminar,
  procesandoId,
}: ReservaCardProps) {
  const { hora, fecha } = formatFechaHora(reserva.fechaHoraReserva);
  const isBusy = procesandoId === reserva.id;
  const mesaEtiqueta =
    reserva.mesaNombre || (reserva.mesaNumero ? `Mesa ${reserva.mesaNumero}` : null);
  const ocasionMeta = formatearOcasionReserva(reserva.ocasionEspecial);
  const montoAnticipo = Math.max(0, Math.round(Number(reserva.anticipoMonto) || 0));

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

  const mensajeRecordatorio =
    reserva.estado === 'pendiente'
      ? construirMensajeConfirmacionReservaWhatsApp({ reserva, negocioNombre })
      : construirMensajeRecordatorioReservaWhatsApp({ reserva, negocioNombre });

  const whatsappChatUrl = generarUrlWhatsAppReserva(reserva.clienteTelefono, '');
  const whatsappRecordatorioUrl = generarUrlWhatsAppReserva(
    reserva.clienteTelefono,
    mensajeRecordatorio
  );

  return (
    <article
      className={`rounded-2xl border bg-neutral-900/90 p-5 transition-all shadow-md flex flex-col justify-between ${
        reserva.estado === 'pendiente'
          ? 'border-yellow-500/40 shadow-yellow-500/5'
          : reserva.estado === 'confirmada'
            ? 'border-emerald-500/30 shadow-emerald-500/5'
            : reserva.estado === 'completada'
              ? 'border-sky-500/30 opacity-85'
              : 'border-neutral-800 opacity-60'
      }`}
    >
      <div>
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
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-white truncate max-w-[220px]">
              {reserva.clienteNombre}
            </h3>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-800/80 border border-neutral-700/60 text-neutral-200 shrink-0">
              <Users className="h-4 w-4 text-gold-400" />
              <span className="font-display text-sm font-bold">
                {reserva.personas} {reserva.personas === 1 ? 'persona' : 'personas'}
              </span>
            </div>
          </div>

          {/* Badges de Mesa Asignada, Ocasión y Recordatorio */}
          {(mesaEtiqueta || ocasionMeta || reserva.recordatorioEnviadoEn) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {mesaEtiqueta && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-gold-400/30 bg-gold-400/10 px-2.5 py-1 text-xs font-bold text-gold-400">
                  <Utensils className="h-3 w-3" />
                  {mesaEtiqueta}
                </span>
              )}
              {ocasionMeta && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-300">
                  <span>{ocasionMeta.emoji}</span>
                  {ocasionMeta.label}
                </span>
              )}
              {reserva.recordatorioEnviadoEn && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300">
                  Recordatorio enviado ✓
                </span>
              )}
            </div>
          )}

          {/* Bloque de Anticipo Offline */}
          {montoAnticipo > 0 && (
            <div
              className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
                reserva.anticipoEstado === 'verificado'
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-300'
              }`}
            >
              <div className="min-w-0">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  {reserva.anticipoEstado === 'verificado'
                    ? `Anticipo Verificado ${formatCOP(montoAnticipo)}`
                    : `Anticipo Pendiente ${formatCOP(montoAnticipo)}`}
                </span>
                {reserva.anticipoReferencia && (
                  <span className="block text-[11px] opacity-80 truncate">
                    {reserva.anticipoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia'} ·{' '}
                    {reserva.anticipoReferencia}
                  </span>
                )}
              </div>

              {reserva.anticipoEstado !== 'verificado' && onVerificarAnticipo && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onVerificarAnticipo(reserva)}
                  className="min-h-[44px] shrink-0 rounded-xl bg-amber-400 px-3 text-xs font-black text-neutral-950 hover:bg-amber-300 transition-colors disabled:opacity-50"
                >
                  Verificar Anticipo
                </button>
              )}
            </div>
          )}

          {/* Teléfono con accesos rápidos */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-neutral-400">
            <a
              href={`tel:${reserva.clienteTelefono}`}
              className="inline-flex items-center gap-1 text-neutral-300 hover:text-gold-400 transition-colors py-1"
            >
              <Phone className="h-3.5 w-3.5 text-neutral-500" />
              <span>{reserva.clienteTelefono}</span>
            </a>
            <span className="text-neutral-700">·</span>
            <a
              href={whatsappChatUrl}
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
      </div>

      {/* Acciones de 1 toque */}
      <div className="space-y-2 pt-2.5 border-t border-neutral-800/80">
        {(reserva.estado === 'pendiente' || reserva.estado === 'confirmada') && (
          <div className="flex flex-wrap items-center gap-2">
            {onSentarEnMesa && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onSentarEnMesa(reserva)}
                className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold-400 px-3 text-xs font-black text-neutral-950 hover:bg-gold-500 transition-colors disabled:opacity-50"
              >
                <Utensils className="h-3.5 w-3.5" />
                <span>Sentar en Mesa</span>
              </button>
            )}
            <a
              href={whatsappRecordatorioUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onEnviarRecordatorioWhatsApp?.(reserva)}
              className="flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Confirmar / Recordar WhatsApp</span>
            </a>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
              className="flex items-center justify-center h-11 w-11 rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-50 shrink-0"
              aria-label={`Eliminar reserva de ${reserva.clienteNombre}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
