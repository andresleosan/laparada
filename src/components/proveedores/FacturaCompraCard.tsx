import { Calendar, DollarSign, CheckCircle2, AlertTriangle, Clock, Eye, MessageSquare, Ban } from 'lucide-react';
import type { FacturaCompra, Proveedor } from '@/types/proveedor';
import { determinarEstadoVencimiento, generarMensajeWhatsAppProveedor } from '@/utils/proveedoresUtils';
import { formatCOP } from '@/utils/formatCOP';

interface FacturaCompraCardProps {
  factura: FacturaCompra;
  proveedor?: Proveedor;
  onAbonar: (factura: FacturaCompra) => void;
  onVerDetalle: (factura: FacturaCompra) => void;
  onAnular: (factura: FacturaCompra) => void;
}

export function FacturaCompraCard({
  factura,
  proveedor,
  onAbonar,
  onVerDetalle,
  onAnular,
}: FacturaCompraCardProps) {
  const semaforo = determinarEstadoVencimiento(factura);
  const esAnulada = factura.estado === 'anulada';
  const esPagada = factura.estado === 'pagada' || factura.saldoPendiente <= 0;

  const emisionStr = factura.fechaEmision && typeof factura.fechaEmision.toDate === 'function'
    ? factura.fechaEmision.toDate().toLocaleDateString('es-CO')
    : new Date(factura.fechaEmision as unknown as string).toLocaleDateString('es-CO');

  const vencimientoStr = factura.fechaVencimiento && typeof factura.fechaVencimiento.toDate === 'function'
    ? factura.fechaVencimiento.toDate().toLocaleDateString('es-CO')
    : new Date(factura.fechaVencimiento as unknown as string).toLocaleDateString('es-CO');

  const porcentajePago = factura.total > 0
    ? Math.min(100, Math.round((factura.montoPagado / factura.total) * 100))
    : 100;

  // WhatsApp
  let waUrl: string | undefined;
  if (proveedor?.telefono) {
    const telLimpio = proveedor.telefono.replace(/\D/g, '');
    const telWhatsApp = telLimpio.startsWith('57') ? telLimpio : `57${telLimpio}`;
    const mensajeWA = encodeURIComponent(generarMensajeWhatsAppProveedor(proveedor, factura));
    waUrl = `https://wa.me/${telWhatsApp}?text=${mensajeWA}`;
  }

  // Badges de semáforo
  const badgeConfig = (() => {
    if (esAnulada) {
      return {
        label: 'Anulada',
        bg: 'bg-neutral-800 text-neutral-400 border-neutral-700',
        icon: Ban,
      };
    }
    if (esPagada) {
      return {
        label: 'Pagada',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle2,
      };
    }
    if (semaforo === 'vencida') {
      return {
        label: '¡Vencida!',
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse',
        icon: AlertTriangle,
      };
    }
    if (semaforo === 'por_vencer') {
      return {
        label: 'Por vencer',
        bg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        icon: Clock,
      };
    }
    return {
      label: 'Al día',
      bg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
      icon: CheckCircle2,
    };
  })();

  const BadgeIcon = badgeConfig.icon;

  return (
    <article
      className={`bg-neutral-900 border rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all shadow-md ${
        semaforo === 'vencida' && !esAnulada
          ? 'border-rose-500/40 hover:border-rose-400'
          : 'border-neutral-800 hover:border-gold-400/30'
      }`}
      aria-label={`Factura ${factura.numeroFactura} de ${factura.proveedorNombre}`}
    >
      <div>
        {/* Cabecera: Número, Condición de Pago y Semáforo */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm sm:text-base text-gold-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
              {factura.numeroFactura}
            </span>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded">
              {factura.condicionPago === 'contado' ? 'Contado' : 'Crédito'}
            </span>
          </div>

          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${badgeConfig.bg}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badgeConfig.label}</span>
          </span>
        </div>

        {/* Proveedor y Fechas */}
        <div className="mb-3">
          <h3 className="font-display font-bold text-base sm:text-lg text-white truncate">
            {factura.proveedorNombre}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-neutral-500" />
              Emisión: <strong className="text-neutral-300 font-normal">{emisionStr}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              Vence: <strong className={`font-medium ${semaforo === 'vencida' && !esAnulada ? 'text-rose-400' : 'text-neutral-300'}`}>{vencimientoStr}</strong>
            </span>
          </div>
        </div>

        {/* Resumen de Valores COP */}
        <div className="grid grid-cols-3 gap-2 my-3 p-3 rounded-lg bg-neutral-950 border border-neutral-800/80">
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Total Factura
            </span>
            <span className="font-display font-bold text-xs sm:text-sm text-neutral-200">
              {formatCOP(factura.total)}
            </span>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Abonado
            </span>
            <span className="font-display font-bold text-xs sm:text-sm text-emerald-400">
              {formatCOP(factura.montoPagado)}
            </span>
          </div>

          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
              Saldo Pendiente
            </span>
            <span
              className={`font-display font-bold text-xs sm:text-sm ${
                factura.saldoPendiente > 0 ? 'text-amber-400' : 'text-neutral-400'
              }`}
            >
              {formatCOP(factura.saldoPendiente)}
            </span>
          </div>
        </div>

        {/* Barra de progreso de pago */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
            <span>Progreso de pago</span>
            <span className="font-semibold text-neutral-300">{porcentajePago}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                porcentajePago >= 100
                  ? 'bg-emerald-400'
                  : semaforo === 'vencida'
                  ? 'bg-rose-500'
                  : 'bg-gold-400'
              }`}
              style={{ width: `${porcentajePago}%` }}
            />
          </div>
        </div>

        {/* Conteo de ítems */}
        {factura.items && factura.items.length > 0 && (
          <p className="text-xs text-neutral-400 truncate mb-2">
            📦 {factura.items.length} {factura.items.length === 1 ? 'concepto' : 'conceptos'}:{' '}
            <span className="text-neutral-300">
              {factura.items.map((i) => i.descripcion).join(', ')}
            </span>
          </p>
        )}

        {factura.notas && (
          <p className="text-xs text-neutral-400 italic truncate mb-2">
            Nota: {factura.notas}
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-2 mt-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onVerDetalle(factura)}
            aria-label={`Ver detalle y abonos de factura ${factura.numeroFactura}`}
            className="h-11 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
          >
            <Eye className="w-4 h-4 text-gold-400" />
            <span className="hidden sm:inline">Detalle</span>
          </button>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Enviar estado de cuenta a ${factura.proveedorNombre} por WhatsApp`}
              className="w-11 h-11 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors border border-emerald-500/30"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {!esPagada && !esAnulada && (
            <button
              type="button"
              onClick={() => onAbonar(factura)}
              className="h-11 px-3.5 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <DollarSign className="w-4 h-4" />
              <span>Abonar / Pagar</span>
            </button>
          )}

          {!esAnulada && (
            <button
              type="button"
              onClick={() => onAnular(factura)}
              aria-label={`Anular factura ${factura.numeroFactura}`}
              className="w-11 h-11 rounded-lg bg-neutral-800/80 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 flex items-center justify-center transition-colors border border-neutral-700/80"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
