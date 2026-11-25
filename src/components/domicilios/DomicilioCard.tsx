import React from 'react';
import { Domicilio, type OrigenVenta } from '../../types';
import { Card } from '../ui/Card';
import { Badge, BadgeEstado } from '../ui/Badge';
import { formatCOP } from '../../utils/formatCOP';
import {
  Bike,
  CheckSquare,
  Clock,
  ExternalLink,
  Globe,
  LifeBuoy,
  MapPin,
  MessageCircle,
  Monitor,
  Navigation,
  Package,
  Phone,
  Square,
  Tablet,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { EstadoButton } from './EstadoButton';
import { buildGoogleMapsUrl } from '@/utils/deliveryNavigation';
import {
  calcularSlaDomicilio,
  construirUrlWhatsAppClienteDespacho,
} from '@/utils/despachoDomiciliosUtils';

export interface DomicilioCardProps {
  domicilio: Domicilio;
  onEstadoChange: (nuevoEstado: string) => Promise<void>;
  isUpdating?: boolean;
  negocioNombre?: string;
  seleccionado?: boolean;
  onToggleSeleccion?: (id: string) => void;
  onAbrirAsignarRepartidor?: (domicilio: Domicilio) => void;
  onReportarReclamo?: (domicilio: Domicilio) => void;
  ahoraMs?: number;
}

const SLA_BADGE_STYLES = {
  en_tiempo: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300',
  atencion: 'border-amber-500/40 bg-amber-950/40 text-amber-300',
  demorado: 'border-red-500/60 bg-red-950/50 text-red-300 animate-pulse',
} as const;

export const DomicilioCard = React.forwardRef<HTMLDivElement, DomicilioCardProps>(
  (
    {
      domicilio,
      onEstadoChange,
      isUpdating = false,
      negocioNombre = 'La Parada',
      seleccionado = false,
      onToggleSeleccion,
      onAbrirAsignarRepartidor,
      onReportarReclamo,
      ahoraMs,
    },
    ref
  ) => {
    const origenIcon: Record<OrigenVenta, LucideIcon> = {
      whatsapp: MessageCircle,
      pos: Monitor,
      web: Globe,
      kiosco: Tablet,
    };
    const OriginIcon = origenIcon[domicilio.origen] || MapPin;

    const sla = calcularSlaDomicilio(
      domicilio.creadoEn,
      domicilio.estado === 'entregado'
        ? domicilio.entregadoEn ?? domicilio.actualizadoEn
        : undefined,
      ahoraMs
    );

    const mapsUrl = buildGoogleMapsUrl(domicilio.direccion, domicilio.barrio);
    const whatsappClienteUrl = construirUrlWhatsAppClienteDespacho(
      domicilio,
      negocioNombre,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );

    const esActivo = domicilio.estado !== 'entregado';

    return (
      <Card
        ref={ref}
        className={`mb-0 flex flex-col justify-between p-4 transition-colors ${
          seleccionado ? 'border-gold-400/70 bg-neutral-900/95 ring-1 ring-gold-400/30' : ''
        }`}
      >
        <div>
          {/* Header: Selección + Cliente + Teléfono + Estado */}
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              {onToggleSeleccion && esActivo && (
                <button
                  type="button"
                  onClick={() => onToggleSeleccion(domicilio.id)}
                  aria-pressed={seleccionado}
                  aria-label={
                    seleccionado
                      ? `Deseleccionar domicilio de ${domicilio.clienteNombre}`
                      : `Seleccionar domicilio de ${domicilio.clienteNombre}`
                  }
                  className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                    seleccionado
                      ? 'border-gold-400 bg-gold-400/20 text-gold-400'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {seleccionado ? (
                    <CheckSquare className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Square className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              )}

              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold text-white">
                  {domicilio.clienteNombre}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
                  <Phone size={14} aria-hidden="true" />
                  <a
                    href={`tel:${domicilio.clienteTelefono}`}
                    className="transition-colors hover:text-gold"
                  >
                    {domicilio.clienteTelefono}
                  </a>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <BadgeEstado estado={domicilio.estado} />
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                  SLA_BADGE_STYLES[sla.estadoSla]
                }`}
              >
                <Clock className="h-3 w-3" aria-hidden="true" />
                {sla.etiqueta}
              </span>
            </div>
          </div>

          {/* Dirección, Barrio y Zona */}
          <div className="mb-3 space-y-1.5 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="flex items-start gap-2 text-sm text-neutral-200">
              <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gold-400" aria-hidden="true" />
              <p className="break-words">{domicilio.direccion}</p>
            </div>
            {(domicilio.barrio || domicilio.zonaDomicilioNombre) && (
              <div className="flex flex-wrap items-center gap-1.5 pl-6 text-xs">
                {domicilio.barrio && (
                  <span className="rounded-md border border-neutral-700 bg-neutral-900 px-2 py-0.5 font-semibold text-neutral-200">
                    Barrio: {domicilio.barrio}
                  </span>
                )}
                {domicilio.zonaDomicilioNombre && (
                  <span className="rounded-md border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 font-medium text-amber-300">
                    {domicilio.zonaDomicilioNombre}
                  </span>
                )}
              </div>
            )}
            {domicilio.notas && (
              <p className="pl-6 text-xs text-amber-300/90">Nota: {domicilio.notas}</p>
            )}
          </div>

          {/* Repartidor Asignado */}
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <Bike
                className={`h-4 w-4 shrink-0 ${
                  domicilio.domiciliarioNombre ? 'text-sky-400' : 'text-neutral-500'
                }`}
                aria-hidden="true"
              />
              <span className="truncate text-neutral-300">
                {domicilio.domiciliarioNombre ? (
                  <>
                    Repartidor:{' '}
                    <strong className="text-white">{domicilio.domiciliarioNombre}</strong>
                  </>
                ) : (
                  <span className="text-neutral-400">Sin repartidor asignado</span>
                )}
              </span>
            </div>

            {onAbrirAsignarRepartidor && esActivo && (
              <button
                type="button"
                onClick={() => onAbrirAsignarRepartidor(domicilio)}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-950/40 px-3 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-900/50"
              >
                <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                {domicilio.domiciliarioNombre ? 'Reasignar' : 'Asignar repartidor'}
              </button>
            )}
          </div>

          {/* Items */}
          <div className="mb-3 rounded-lg bg-base-dark/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gold">
              <Package size={14} aria-hidden="true" />
              ITEMS
            </div>
            <div className="space-y-1">
              {domicilio.items.map((item, idx) => (
                <div key={idx} className="text-sm text-neutral-300">
                  • {item.nombre} x{item.cantidad} = {formatCOP(item.subtotal)}
                </div>
              ))}
            </div>
          </div>

          {/* Total + Origen + Pago */}
          <div className="mb-3 flex items-center justify-between border-t border-neutral-800 pt-3">
            <div>
              <p className="text-xs text-neutral-400">
                Total ({domicilio.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})
                {typeof domicilio.costoEnvio === 'number' && domicilio.costoEnvio > 0
                  ? ` · Envío ${formatCOP(domicilio.costoEnvio)}`
                  : ''}
              </p>
              <p className="font-display text-lg font-bold text-gold">
                {formatCOP(domicilio.total)}
              </p>
            </div>
            <Badge variant="outline">
              <OriginIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              {domicilio.origen.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Acciones rápidas: Mapa, WhatsApp Cliente, Rastreo y Botón de Estado */}
        <div className="space-y-2.5 border-t border-neutral-800/80 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Abrir dirección de ${domicilio.clienteNombre} en Google Maps`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-semibold text-neutral-200 transition-colors hover:border-neutral-600 hover:bg-neutral-800"
            >
              <Navigation className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
              <span>Google Maps</span>
            </a>

            <a
              href={whatsappClienteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Enviar estado por WhatsApp a ${domicilio.clienteNombre}`}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-950/50"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>WhatsApp</span>
            </a>

            {domicilio.rastreoToken && (
              <a
                href={`/rastreo/${domicilio.rastreoToken}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir rastreo en vivo del pedido de ${domicilio.clienteNombre}`}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-950/40"
              >
                <span>Rastreo</span>
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            )}

            {onReportarReclamo && (
              <button
                type="button"
                onClick={() => onReportarReclamo(domicilio)}
                aria-label={`Reportar reclamo o garantía del pedido de ${domicilio.clienteNombre}`}
                className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-950/50"
              >
                <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Reclamo / Garantía</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <EstadoButton
              estado={domicilio.estado}
              onEstadoChange={onEstadoChange}
              isLoading={isUpdating}
            />
          </div>
        </div>
      </Card>
    );
  }
);

DomicilioCard.displayName = 'DomicilioCard';
