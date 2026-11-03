import { useState } from 'react';
import {
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Phone,
} from 'lucide-react';
import { formatCOP } from '@/utils/formatCOP';
import { formatHora } from '@/utils/dateUtils';
import {
  buildGoogleMapsUrl,
  buildPhoneCallUrl,
  buildWazeUrl,
  buildWhatsAppContactUrl,
} from '@/utils/deliveryNavigation';
import type { Domicilio } from '@/types';

interface RepartidorOrderCardProps {
  domicilio: Domicilio;
  negocioNombre?: string;
  onTomarRuta?: (domicilio: Domicilio) => Promise<void>;
  onIniciarEntrega?: (domicilio: Domicilio) => void;
  isActionLoading?: boolean;
}

export function RepartidorOrderCard({
  domicilio,
  negocioNombre = 'La Parada',
  onTomarRuta,
  onIniciarEntrega,
  isActionLoading = false,
}: RepartidorOrderCardProps) {
  const [itemsExpandidos, setItemsExpandidos] = useState(false);

  const mapsUrl = buildGoogleMapsUrl(domicilio.direccion, domicilio.barrio);
  const wazeUrl = buildWazeUrl(domicilio.direccion, domicilio.barrio);
  const waUrl = buildWhatsAppContactUrl(
    domicilio.clienteTelefono,
    negocioNombre,
    domicilio.clienteNombre
  );
  const phoneUrl = buildPhoneCallUrl(domicilio.clienteTelefono);

  const horaCreacion = domicilio.creadoEn ? formatHora(domicilio.creadoEn) : '';
  const totalItems = (domicilio.items || []).reduce((sum, item) => sum + item.cantidad, 0);

  const estadoBadge = {
    pendiente: { bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', label: 'Pendiente' },
    en_preparacion: { bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400', label: 'En Cocina' },
    en_camino: { bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400', label: 'En Ruta' },
    entregado: { bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400', label: 'Entregado' },
  }[domicilio.estado] || { bg: 'bg-neutral-800 text-neutral-400 border-neutral-700', label: domicilio.estado };

  return (
    <article
      aria-label={`Pedido para ${domicilio.clienteNombre}`}
      className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-xl backdrop-blur-md transition-all hover:border-neutral-700"
    >
      {/* Encabezado: Estado + Hora */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${estadoBadge.bg}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {estadoBadge.label}
        </span>

        <span className="text-[11px] font-medium text-neutral-400">
          {horaCreacion && `Recibido: ${horaCreacion}`}
        </span>
      </div>

      {/* Cliente y Destino */}
      <div className="mt-3 space-y-1.5">
        <h3 className="font-display text-base font-bold text-white">
          {domicilio.clienteNombre}
        </h3>

        <div className="flex items-start gap-2 text-xs text-neutral-300">
          <MapPin className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-neutral-100">{domicilio.direccion}</p>
            {domicilio.barrio && (
              <span className="inline-block mt-0.5 rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">
                Barrio: {domicilio.barrio}
              </span>
            )}
          </div>
        </div>

        {domicilio.notas && (
          <p className="text-[11px] italic text-amber-200/80 pl-6">
            &ldquo;{domicilio.notas}&rdquo;
          </p>
        )}
      </div>

      {/* Botones de Navegación y Contacto (touch targets 44×44 px) */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir dirección de ${domicilio.clienteNombre} en Google Maps`}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-neutral-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors"
        >
          <MapPin className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-[9px] font-bold">Maps</span>
        </a>

        <a
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Iniciar navegación en Waze hacia ${domicilio.direccion}`}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-neutral-300 hover:border-sky-400/50 hover:text-sky-400 transition-colors"
        >
          <Navigation className="h-4 w-4 text-sky-400" aria-hidden="true" />
          <span className="text-[9px] font-bold">Waze</span>
        </a>

        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Escribir por WhatsApp a ${domicilio.clienteNombre}`}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-neutral-300 hover:border-emerald-400/50 hover:text-emerald-400 transition-colors"
        >
          <MessageCircle className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          <span className="text-[9px] font-bold">WhatsApp</span>
        </a>

        <a
          href={phoneUrl}
          aria-label={`Llamar al cliente ${domicilio.clienteNombre}`}
          className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 p-2 text-neutral-300 hover:border-amber-400/50 hover:text-amber-400 transition-colors"
        >
          <Phone className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span className="text-[9px] font-bold">Llamar</span>
        </a>
      </div>

      {/* Desglose de Ítems / Productos */}
      <div className="mt-3 border-t border-neutral-800/80 pt-2.5">
        <button
          type="button"
          onClick={() => setItemsExpandidos((prev) => !prev)}
          aria-expanded={itemsExpandidos}
          aria-label={itemsExpandidos ? 'Ocultar productos del pedido' : 'Ver productos del pedido'}
          className="flex min-h-[36px] w-full items-center justify-between text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-neutral-400" aria-hidden="true" />
            <span className="font-semibold text-white">
              {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <span>{itemsExpandidos ? 'Ocultar' : 'Ver detalle'}</span>
            {itemsExpandidos ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
        </button>

        {itemsExpandidos && (
          <ul className="mt-2 space-y-1.5 rounded-xl bg-neutral-950/70 p-2.5 text-xs text-neutral-300 border border-neutral-800/60">
            {domicilio.items.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center text-[11px]">
                <span>
                  <strong className="text-amber-400">{item.cantidad}×</strong> {item.nombre}
                </span>
                <span className="text-neutral-400">{formatCOP(item.subtotal)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Cobro y Botón de Acción Principal */}
      <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-neutral-800/80 pt-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
            Cobro ({domicilio.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})
          </span>
          <p className="font-display text-lg font-bold text-gold-400">
            {formatCOP(domicilio.total)}
          </p>
        </div>

        {/* Acciones según estado */}
        {domicilio.estado !== 'entregado' && (
          <div className="flex-1 sm:max-w-xs">
            {domicilio.estado === 'en_camino' ? (
              <button
                type="button"
                onClick={() => onIniciarEntrega?.(domicilio)}
                disabled={isActionLoading}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 disabled:opacity-50 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Finalizar Entrega y Cobro</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onTomarRuta?.(domicilio)}
                disabled={isActionLoading}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-bold text-white shadow-lg shadow-sky-950/50 hover:bg-sky-500 disabled:opacity-50 transition-all"
              >
                <Bike className="h-4 w-4" aria-hidden="true" />
                <span>Tomar Pedido y Salir a Ruta</span>
              </button>
            )}
          </div>
        )}

        {domicilio.estado === 'entregado' && (
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 self-end sm:self-center">
            <CheckCircle2 className="h-4 w-4" />
            Entregado
          </span>
        )}
      </div>
    </article>
  );
}

