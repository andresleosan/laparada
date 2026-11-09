import {
  Star,
  MessageCircle,
  Clock,
  Utensils,
  Truck,
  ChefHat,
  Tablet,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Share2,
} from 'lucide-react';
import type { EncuestaSatisfaccion } from '@/types/satisfaccion';
import {
  getTagMeta,
  parseFechaEncuesta,
  generarMensajeWhatsAppRespuestaQueja,
  generarMensajeWhatsAppAgradecimiento,
} from '@/utils/satisfaccionUtils';
import { formatFecha, formatHora } from '@/utils/dateUtils';
import { Button } from '@/components/ui/Button';

interface EncuestaCardProps {
  encuesta: EncuestaSatisfaccion;
  nombreNegocio?: string;
  googleBusinessUrl?: string;
  onGestionar: (encuesta: EncuestaSatisfaccion) => void;
  onEliminar?: (encuesta: EncuestaSatisfaccion) => void;
}

export function EncuestaCard({
  encuesta,
  nombreNegocio = 'La Parada',
  googleBusinessUrl,
  onGestionar,
  onEliminar,
}: EncuestaCardProps) {
  const fecha = parseFechaEncuesta(encuesta.creadoEn);
  const fechaTexto = `${formatFecha(fecha)} ${formatHora(fecha)}`;

  // Icono del canal
  const getCanalIcon = () => {
    switch (encuesta.canal) {
      case 'mesa':
        return <Utensils className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />;
      case 'domicilio':
        return <Truck className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />;
      case 'kiosco':
        return <Tablet className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />;
      case 'tienda_web':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />;
      default:
        return <ChefHat className="w-3.5 h-3.5 text-neutral-400" aria-hidden="true" />;
    }
  };

  const getCanalLabel = () => {
    switch (encuesta.canal) {
      case 'mesa':
        return encuesta.mesaNombre ? `Salón · ${encuesta.mesaNombre}` : 'Salón / Mesas';
      case 'domicilio':
        return 'Domicilio';
      case 'kiosco':
        return 'Kiosco Táctil';
      case 'tienda_web':
        return 'Tienda Web';
      default:
        return 'Mostrador POS';
    }
  };

  // URL directa de WhatsApp
  const obtenerUrlWhatsApp = () => {
    const rawTel = (encuesta.clienteTelefono || '').replace(/\D/g, '');
    const telefono = rawTel.startsWith('57') ? rawTel : `57${rawTel}`;

    const texto = encuesta.esQueja
      ? generarMensajeWhatsAppRespuestaQueja({ encuesta, nombreNegocio })
      : generarMensajeWhatsAppAgradecimiento({
          encuesta,
          nombreNegocio,
          googleBusinessUrl,
        });

    return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
  };

  const borderClass = encuesta.esQueja
    ? encuesta.estado === 'resuelta'
      ? 'border-emerald-500/30 bg-neutral-900/95'
      : 'border-rose-500/60 bg-rose-950/20'
    : 'border-neutral-800 bg-neutral-900/90';

  return (
    <article
      className={`rounded-2xl border p-5 transition-all shadow-md flex flex-col justify-between ${borderClass}`}
      aria-label={`Encuesta de ${encuesta.calificacion} estrellas`}
    >
      <div>
        {/* Cabecera: Canal, Calificación y Estado */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300 border border-neutral-700/60">
              {getCanalIcon()}
              <span>{getCanalLabel()}</span>
            </span>

            {encuesta.esQueja && (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  encuesta.estado === 'resuelta'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                }`}
              >
                {encuesta.estado === 'resuelta' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Queja Atendida</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Queja Crítica</span>
                  </>
                )}
              </span>
            )}

            {encuesta.redirigidoGoogleReviews && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
                <Share2 className="w-3 h-3" aria-hidden="true" />
                <span>Google Maps</span>
              </span>
            )}
          </div>

          {/* Fecha */}
          <div className="flex items-center gap-1 text-xs text-neutral-400 shrink-0">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <time dateTime={fecha.toISOString()}>{fechaTexto}</time>
          </div>
        </div>

        {/* Estrellas y NPS */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1" role="img" aria-label={`${encuesta.calificacion} de 5 estrellas`}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= encuesta.calificacion
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-neutral-800 text-neutral-700'
                }`}
                aria-hidden="true"
              />
            ))}
          </div>

          <span className="font-display font-bold text-lg text-white">
            {encuesta.calificacion}.0
          </span>

          <span
            className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
              encuesta.tipoNps === 'promotor'
                ? 'bg-emerald-500/20 text-emerald-400'
                : encuesta.tipoNps === 'pasivo'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {encuesta.tipoNps}
          </span>
        </div>

        {/* Datos del Cliente y Pedido */}
        <div className="text-sm text-neutral-300 mb-3 space-y-0.5">
          {encuesta.clienteNombre && (
            <p className="font-medium text-white">
              👤 {encuesta.clienteNombre}
              {encuesta.clienteTelefono && (
                <span className="text-neutral-400 ml-2 font-normal">
                  ({encuesta.clienteTelefono})
                </span>
              )}
            </p>
          )}
          {(encuesta.ventaId || encuesta.pedidoId) && (
            <p className="text-xs text-neutral-400">
              🧾 Venta #{((encuesta.ventaId || encuesta.pedidoId) || '').slice(-6).toUpperCase()}
              {encuesta.meseroNombre && ` · Mesero: ${encuesta.meseroNombre}`}
            </p>
          )}
        </div>

        {/* Desglose de Dimensiones */}
        {encuesta.dimensiones && (
          <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
            {typeof encuesta.dimensiones.comida === 'number' && (
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700/40">
                🍔 Comida: <strong className="text-amber-400">{encuesta.dimensiones.comida}★</strong>
              </span>
            )}
            {typeof encuesta.dimensiones.servicio === 'number' && (
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700/40">
                👏 Servicio: <strong className="text-amber-400">{encuesta.dimensiones.servicio}★</strong>
              </span>
            )}
            {typeof encuesta.dimensiones.tiempo === 'number' && (
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700/40">
                ⚡ Tiempo: <strong className="text-amber-400">{encuesta.dimensiones.tiempo}★</strong>
              </span>
            )}
            {typeof encuesta.dimensiones.empaque === 'number' && (
              <span className="px-2 py-0.5 rounded bg-neutral-800/80 text-neutral-300 border border-neutral-700/40">
                📦 Empaque: <strong className="text-amber-400">{encuesta.dimensiones.empaque}★</strong>
              </span>
            )}
          </div>
        )}

        {/* Tags táctiles seleccionados */}
        {encuesta.tags && encuesta.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            {encuesta.tags.map((tagId) => {
              const meta = getTagMeta(tagId);
              if (!meta) return null;
              return (
                <span
                  key={tagId}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    meta.tipo === 'positivo'
                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span aria-hidden="true">{meta.icono}</span>
                  <span>{meta.label}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Comentario del comensal */}
        {encuesta.comentario && (
          <div className="bg-black/40 border border-neutral-800/80 rounded-xl p-3 mb-3 text-sm text-neutral-200 italic">
            "{encuesta.comentario}"
          </div>
        )}

        {/* Notas internas de seguimiento */}
        {encuesta.notasInternas && (
          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-2.5 mb-3 text-xs text-neutral-300">
            <span className="font-semibold text-neutral-400 block mb-0.5">
              📌 Nota Interna {encuesta.atendidaPor ? `(${encuesta.atendidaPor})` : ''}:
            </span>
            <span>{encuesta.notasInternas}</span>
          </div>
        )}
      </div>

      {/* Barra de Acciones */}
      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {encuesta.clienteTelefono && (
            <a
              href={obtenerUrlWhatsApp()}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors ${
                encuesta.esQueja
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              aria-label={`Contactar por WhatsApp a ${encuesta.clienteNombre || 'cliente'}`}
            >
              <MessageCircle className="w-4 h-4" aria-hidden="true" />
              <span>{encuesta.esQueja ? 'Responder Queja' : 'Agradecer'}</span>
            </a>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onGestionar(encuesta)}
            className="min-h-[44px] text-xs"
            aria-label={`Gestionar estado de encuesta`}
          >
            Gestionar Estado
          </Button>
        </div>

        {onEliminar && (
          <button
            type="button"
            onClick={() => onEliminar(encuesta)}
            className="p-2.5 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-colors"
            title="Eliminar encuesta"
            aria-label="Eliminar encuesta"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
