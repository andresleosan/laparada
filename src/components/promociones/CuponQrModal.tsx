// src/components/promociones/CuponQrModal.tsx
import { useState, useEffect } from 'react';
import {
  Check,
  Copy,
  Download,
  Printer,
  QrCode,
  Share2,
  Ticket,
  X,
} from 'lucide-react';
import type { Promocion } from '@/types/promocion';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import {
  formatearDiasSemana,
  formatearHorarioPromocion,
  generarMensajeWhatsAppPromocion,
  generarQrCuponDataUrl,
} from '@/utils/promocionesUtils';
import { createToast } from '@/components/ui/Toast';

interface CuponQrModalProps {
  isOpen: boolean;
  promocion: Promocion | null;
  negocioNombre: string;
  negocioSlug: string;
  onClose: () => void;
}

export function CuponQrModal({
  isOpen,
  promocion,
  negocioNombre,
  negocioSlug,
  onClose,
}: CuponQrModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [cargandoQr, setCargandoQr] = useState(false);

  useEffect(() => {
    if (!promocion || !promocion.codigoCupon) {
      setQrUrl('');
      return;
    }

    let isMounted = true;
    setCargandoQr(true);

    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/tienda/${negocioSlug}`
      : `https://laparada.pages.dev/tienda/${negocioSlug}`;

    generarQrCuponDataUrl(baseUrl, promocion.codigoCupon)
      .then((dataUrl) => {
        if (isMounted) {
          setQrUrl(dataUrl);
          setCargandoQr(false);
        }
      })
      .catch((err) => {
        console.error('Error generando QR del cupón:', err);
        if (isMounted) setCargandoQr(false);
      });

    return () => {
      isMounted = false;
    };
  }, [promocion, negocioSlug]);

  if (!isOpen || !promocion) return null;

  const codigo = promocion.codigoCupon || 'CUPON';

  const copiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      createToast(`Código ${codigo} copiado al portapapeles`, 'success');
      setTimeout(() => setCopiado(false), 2000);
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

  const descargarImagenQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `Cupon_${codigo}_${negocioSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    createToast('Código QR descargado', 'success');
  };

  const imprimirCupon = () => {
    window.print();
  };

  const beneficioTexto =
    promocion.tipo === 'dos_por_uno'
      ? '2x1'
      : promocion.tipoDescuento === 'porcentaje'
        ? `${promocion.valorDescuento}% OFF`
        : `-${formatCOP(promocion.valorDescuento)}`;

  return (
    <StorefrontDialog
      labelledBy="modal-cupon-qr-title"
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
          <div>
            <h2 id="modal-cupon-qr-title" className="text-lg font-bold text-white">
              Cupón Digital & Código QR
            </h2>
            <p className="text-xs text-neutral-400">
              Comparte con tus clientes o imprime para mostrar en el mostrador.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 text-neutral-200">
        {/* Tarjeta del Cupón Estilo Ticket Gastronómico */}
        <div className="rounded-xl border border-dashed border-emerald-500/50 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 text-center shadow-xl relative overflow-hidden">
          {/* Muescas decorativas de ticket */}
          <div className="absolute -left-3 top-1/2 -mt-3 h-6 w-6 rounded-full bg-base-dark border-r border-neutral-800" />
          <div className="absolute -right-3 top-1/2 -mt-3 h-6 w-6 rounded-full bg-base-dark border-l border-neutral-800" />

          {/* Logo / Nombre del Negocio */}
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold-400 mb-1">
            <Ticket className="h-4 w-4" /> {negocioNombre}
          </div>
          <h3 className="text-xl font-black text-white font-display">{promocion.nombre}</h3>

          {/* Beneficio gigante */}
          <div className="my-3 py-2 bg-neutral-900/80 rounded-lg border border-neutral-800 inline-block px-6">
            <span className="text-2xl font-black text-emerald-400 font-display">
              {beneficioTexto}
            </span>
            {promocion.montoMinimoSubtotal && (
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Compra mínima: {formatCOP(promocion.montoMinimoSubtotal)}
              </p>
            )}
          </div>

          {/* Imagen del Código QR */}
          <div className="my-4 flex justify-center">
            <div className="p-3 bg-white rounded-xl shadow-md border-2 border-emerald-500/40 inline-block">
              {cargandoQr ? (
                <div className="h-48 w-48 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : qrUrl ? (
                <img
                  src={qrUrl}
                  alt={`Código QR para el cupón ${codigo}`}
                  className="h-48 w-48 object-contain"
                />
              ) : (
                <div className="h-48 w-48 flex items-center justify-center text-neutral-500 text-xs">
                  <QrCode className="h-10 w-10 text-neutral-400" />
                </div>
              )}
            </div>
          </div>

          {/* Código alfanumérico */}
          <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg">
            <span className="text-xs text-neutral-400">CÓDIGO:</span>
            <span className="text-lg font-black font-mono tracking-widest text-emerald-300">
              {codigo}
            </span>
            <button
              type="button"
              onClick={copiarCodigo}
              aria-label="Copiar código del cupón"
              className="ml-1 text-neutral-400 hover:text-white transition"
            >
              {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {/* Términos y horarios */}
          <div className="mt-4 pt-3 border-t border-neutral-800/80 text-xs text-neutral-400 space-y-1">
            <p>
              ⏰ Horario: <strong className="text-neutral-300">{formatearHorarioPromocion(promocion.horaInicio, promocion.horaFin)}</strong>
            </p>
            <p>
              📅 Días: <strong className="text-neutral-300">{formatearDiasSemana(promocion.diasSemana)}</strong>
            </p>
            {promocion.limiteUsos && (
              <p className="text-[11px] text-amber-400">
                ⚠️ Cupón limitado a {promocion.limiteUsos} canjes totales ({promocion.usosActuales ?? 0} usados).
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={compartirWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5"
          >
            <Share2 className="h-4 w-4" /> Enviar WhatsApp
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={descargarImagenQr}
            className="flex items-center justify-center gap-1.5"
          >
            <Download className="h-4 w-4" /> Descargar QR
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={imprimirCupon}
            className="flex items-center justify-center gap-1.5 text-neutral-300 hover:text-white"
          >
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>
      </div>
    </StorefrontDialog>
  );
}
