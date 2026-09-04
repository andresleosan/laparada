import React from 'react';
import { Domicilio, type OrigenVenta } from '../../types';
import { Card } from '../ui/Card';
import { Badge, BadgeEstado } from '../ui/Badge';
import { formatCOP } from '../../utils/formatCOP';
import { Globe, MapPin, MessageCircle, Monitor, Phone, Package, type LucideIcon } from 'lucide-react';
import { EstadoButton } from './EstadoButton';

export interface DomicilioCardProps {
  domicilio: Domicilio;
  onEstadoChange: (nuevoEstado: string) => Promise<void>;
  isUpdating?: boolean;
}

export const DomicilioCard = React.forwardRef<HTMLDivElement, DomicilioCardProps>(
  ({ domicilio, onEstadoChange, isUpdating = false }, ref) => {
    const origenIcon: Record<OrigenVenta, LucideIcon> = {
      whatsapp: MessageCircle,
      pos: Monitor,
      web: Globe,
    };
    const OriginIcon = origenIcon[domicilio.origen] || MapPin;

    return (
      <Card ref={ref} className="mb-4 p-4">
        {/* Header: Cliente + Teléfono */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{domicilio.clienteNombre}</h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
              <Phone size={14} />
              <a
                href={`tel:${domicilio.clienteTelefono}`}
                className="hover:text-gold transition-colors"
              >
                {domicilio.clienteTelefono}
              </a>
            </div>
          </div>
          <BadgeEstado estado={domicilio.estado} />
        </div>

        {/* Dirección */}
        <div className="mb-3 flex items-start gap-2 text-sm text-neutral-300">
          <MapPin size={16} className="mt-0.5 flex-shrink-0" />
          <p>{domicilio.direccion}</p>
        </div>

        {/* Items */}
        <div className="mb-3 rounded-lg bg-base-dark/50 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gold">
            <Package size={14} />
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

        {/* Total + Origen */}
        <div className="mb-3 flex items-center justify-between border-t border-neutral-700 pt-3">
          <div>
            <p className="text-xs text-neutral-400">Total</p>
            <p className="text-lg font-bold text-gold">{formatCOP(domicilio.total)}</p>
          </div>
          <Badge variant="outline">
            <OriginIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            {domicilio.origen.toUpperCase()}
          </Badge>
        </div>

        {/* Botones de estado */}
        <div className="flex gap-2">
          <EstadoButton
            estado={domicilio.estado}
            onEstadoChange={onEstadoChange}
            isLoading={isUpdating}
          />
        </div>
      </Card>
    );
  }
);

DomicilioCard.displayName = 'DomicilioCard';
