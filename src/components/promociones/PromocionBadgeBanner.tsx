// src/components/promociones/PromocionBadgeBanner.tsx
import { Flame, Gift, Tag, Ticket, X } from 'lucide-react';
import type { Promocion } from '@/types/promocion';
import { formatearHorarioPromocion } from '@/utils/promocionesUtils';

interface PromocionBadgeBannerProps {
  promocionesEnVivo: Promocion[];
  onAplicarPromo?: (promo: Promocion) => void;
  onCerrar?: () => void;
  compacto?: boolean;
}

export function PromocionBadgeBanner({
  promocionesEnVivo,
  onAplicarPromo,
  onCerrar,
  compacto = false,
}: PromocionBadgeBannerProps) {
  if (!promocionesEnVivo || promocionesEnVivo.length === 0) {
    return null;
  }

  // Tomar la primera promoción en vivo más relevante
  const promo = promocionesEnVivo[0];

  const renderIcono = () => {
    switch (promo.tipo) {
      case 'happy_hour':
        return <Flame className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />;
      case 'dos_por_uno':
        return <Gift className="h-4 w-4 text-purple-400 shrink-0" />;
      case 'cupon_descuento':
        return <Ticket className="h-4 w-4 text-emerald-400 shrink-0" />;
      default:
        return <Tag className="h-4 w-4 text-gold-400 shrink-0" />;
    }
  };

  const horarioTexto = promo.horaFin ? `hasta las ${promo.horaFin}` : '';

  if (compacto) {
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
        <div className="flex items-center gap-1.5 truncate">
          {renderIcono()}
          <span className="font-bold truncate">{promo.nombre}</span>
          {horarioTexto && <span className="text-[11px] text-amber-300/80">({horarioTexto})</span>}
        </div>
        {onAplicarPromo && (
          <button
            type="button"
            onClick={() => onAplicarPromo(promo)}
            className="text-[11px] font-bold text-amber-300 underline hover:text-white shrink-0"
          >
            Aprovechar
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-amber-950/30 p-3.5 shadow-lg"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            {renderIcono()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                🔥 EN VIVO AHORA
              </span>
              <h4 className="text-sm font-bold text-white font-display leading-tight">
                {promo.nombre}
              </h4>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              {promo.descripcion || `Aprovecha este beneficio ${formatearHorarioPromocion(promo.horaInicio, promo.horaFin)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onAplicarPromo && (
            <button
              type="button"
              onClick={() => onAplicarPromo(promo)}
              className="px-3 py-1.5 rounded-md bg-gold-400 hover:bg-gold-500 text-black font-bold text-xs shadow transition min-h-[36px]"
            >
              Aplicar a la Venta
            </button>
          )}
          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar aviso de promoción"
              className="text-neutral-400 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
