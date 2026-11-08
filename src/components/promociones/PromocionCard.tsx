// src/components/promociones/PromocionCard.tsx
import { useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Copy,
  Edit2,
  Flame,
  Gift,
  Globe,
  Percent,
  QrCode,
  Share2,
  Store,
  Tag,
  Ticket,
  Trash2,
} from 'lucide-react';
import type { Promocion } from '@/types/promocion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import {
  estaPromocionVigente,
  formatearDiasSemana,
  formatearHorarioPromocion,
  generarMensajeWhatsAppPromocion,
} from '@/utils/promocionesUtils';
import { createToast } from '@/components/ui/Toast';

interface PromocionCardProps {
  promocion: Promocion;
  negocioNombre: string;
  negocioSlug: string;
  reloj?: Date;
  onEditar: (promocion: Promocion) => void;
  onEliminar: (promocionId: string) => void;
  onToggleActivo: (promocionId: string, nuevoEstado: boolean) => void;
  onVerQr: (promocion: Promocion) => void;
}

export function PromocionCard({
  promocion,
  negocioNombre,
  negocioSlug,
  reloj = new Date(),
  onEditar,
  onEliminar,
  onToggleActivo,
  onVerQr,
}: PromocionCardProps) {
  const [copiando, setCopiando] = useState(false);
  const estaVigente = estaPromocionVigente(promocion, reloj);
  const esEnVivo = promocion.activo && estaVigente;

  const copiarCodigo = async () => {
    if (!promocion.codigoCupon) return;
    try {
      await navigator.clipboard.writeText(promocion.codigoCupon);
      setCopiando(true);
      createToast(`Código ${promocion.codigoCupon} copiado al portapapeles`, 'success');
      setTimeout(() => setCopiando(false), 2000);
    } catch {
      createToast('No fue posible copiar el código', 'error');
    }
  };

  const compartirWhatsApp = () => {
    const urlTienda = typeof window !== 'undefined'
      ? `${window.location.origin}/tienda/${negocioSlug}`
      : `https://laparada.pages.dev/tienda/${negocioSlug}`;

    const mensaje = generarMensajeWhatsAppPromocion(promocion, negocioNombre, urlTienda);
    const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Renderizado del ícono y etiqueta del tipo
  const renderTipoInfo = () => {
    switch (promocion.tipo) {
      case 'happy_hour':
        return {
          icon: Flame,
          label: 'Happy Hour',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        };
      case 'dos_por_uno':
        return {
          icon: Gift,
          label: '2x1 Especial',
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      case 'descuento_categoria':
        return {
          icon: Tag,
          label: 'Categoría OFF',
          color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        };
      case 'cupon_descuento':
        return {
          icon: Ticket,
          label: 'Cupón Digital',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      default:
        return {
          icon: Percent,
          label: 'Descuento General',
          color: 'text-gold-400 bg-gold-500/10 border-gold-500/20',
        };
    }
  };

  const tipoInfo = renderTipoInfo();
  const IconoTipo = tipoInfo.icon;

  const porcentajeUsos =
    promocion.limiteUsos && promocion.limiteUsos > 0
      ? Math.min(100, Math.round(((promocion.usosActuales ?? 0) / promocion.limiteUsos) * 100))
      : 0;

  return (
    <Card className="flex flex-col justify-between border border-neutral-800 bg-neutral-900/90 p-5 shadow-lg transition-all hover:border-neutral-700">
      <div>
        {/* Cabecera: Badges y Switch */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${tipoInfo.color}`}
            >
              <IconoTipo className="h-3.5 w-3.5" aria-hidden="true" />
              {tipoInfo.label}
            </span>

            {/* Badge de estado en tiempo real */}
            {esEnVivo ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                🔥 En Vivo Ahora
              </span>
            ) : promocion.activo ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs text-neutral-400 bg-neutral-800 border border-neutral-700">
                Programada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs text-red-400 bg-red-950/40 border border-red-800/40">
                Inactiva
              </span>
            )}
          </div>

          {/* Switch toggle de activación rápida */}
          <button
            type="button"
            role="switch"
            aria-checked={promocion.activo}
            aria-label={`${promocion.activo ? 'Desactivar' : 'Activar'} promoción ${promocion.nombre}`}
            onClick={() => onToggleActivo(promocion.id, !promocion.activo)}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
              promocion.activo ? 'bg-emerald-500' : 'bg-neutral-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                promocion.activo ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Título y Monto de Descuento */}
        <div className="mb-3">
          <h3 className="text-lg font-bold text-white font-display leading-tight">{promocion.nombre}</h3>
          {promocion.descripcion && (
            <p className="mt-1 text-sm text-neutral-400 line-clamp-2">{promocion.descripcion}</p>
          )}
        </div>

        {/* Bloque Destacado del Descuento */}
        <div className="mb-4 rounded-lg bg-neutral-950/60 p-3.5 border border-neutral-800/80 flex items-center justify-between">
          <span className="text-xs text-neutral-400 font-medium">Beneficio:</span>
          <div className="text-right">
            {promocion.tipo === 'dos_por_uno' ? (
              <span className="text-xl font-black text-purple-300 font-display">2x1</span>
            ) : promocion.tipoDescuento === 'porcentaje' ? (
              <span className="text-xl font-black text-gold-400 font-display">
                {promocion.valorDescuento}% OFF
              </span>
            ) : (
              <span className="text-xl font-black text-gold-400 font-display">
                -{formatCOP(promocion.valorDescuento)}
              </span>
            )}
            {promocion.montoMinimoSubtotal && (
              <p className="text-[11px] text-neutral-400">
                Mínimo: {formatCOP(promocion.montoMinimoSubtotal)}
              </p>
            )}
          </div>
        </div>

        {/* Código de Cupón con Copiado Rápido */}
        {promocion.tipo === 'cupon_descuento' && promocion.codigoCupon && (
          <div className="mb-4 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-950/20 p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Código Cupón
              </span>
              <p className="text-base font-black font-mono tracking-widest text-emerald-300">
                {promocion.codigoCupon}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={copiarCodigo}
                aria-label={`Copiar código de cupón ${promocion.codigoCupon}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition"
              >
                {copiando ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => onVerQr(promocion)}
                aria-label={`Ver código QR de ${promocion.nombre}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 transition"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Condiciones de Vigencia: Horario y Días */}
        <div className="space-y-2 text-xs text-neutral-300 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span>{formatearHorarioPromocion(promocion.horaInicio, promocion.horaFin)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-neutral-400 shrink-0" aria-hidden="true" />
            <span>{formatearDiasSemana(promocion.diasSemana)}</span>
          </div>
          <div className="flex items-center gap-2">
            {promocion.canales.includes('storefront') && !promocion.canales.includes('pos') ? (
              <>
                <Globe className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                <span>Solo Tienda Web</span>
              </>
            ) : promocion.canales.includes('pos') && !promocion.canales.includes('storefront') ? (
              <>
                <Store className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
                <span>Solo Mostrador POS</span>
              </>
            ) : (
              <>
                <Store className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <span>Mostrador POS y Tienda Web</span>
              </>
            )}
          </div>
        </div>

        {/* Barra de progreso de usos si tiene límite */}
        {promocion.limiteUsos && promocion.limiteUsos > 0 && (
          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-[11px] text-neutral-400">
              <span>Usos canjeados:</span>
              <span className="font-semibold text-neutral-200">
                {promocion.usosActuales ?? 0} / {promocion.limiteUsos} ({porcentajeUsos}%)
              </span>
            </div>
            <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  porcentajeUsos >= 100 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${porcentajeUsos}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={compartirWhatsApp}
            aria-label={`Compartir ${promocion.nombre} por WhatsApp`}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs">WhatsApp</span>
          </Button>

          {promocion.tipo === 'cupon_descuento' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onVerQr(promocion)}
              aria-label={`Ver QR de ${promocion.nombre}`}
              className="text-neutral-300 hover:text-white hover:bg-neutral-800 gap-1.5"
            >
              <QrCode className="h-4 w-4" />
              <span className="text-xs">QR</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditar(promocion)}
            aria-label={`Editar ${promocion.nombre}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onEliminar(promocion.id)}
            aria-label={`Eliminar ${promocion.nombre}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-red-400 hover:text-red-300 hover:bg-red-950/40 transition"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
