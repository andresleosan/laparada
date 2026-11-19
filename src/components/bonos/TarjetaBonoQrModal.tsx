import { useEffect, useId, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Printer,
  QrCode,
  X,
} from 'lucide-react';
import type { BonoPrepago } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  construirPayloadQrBono,
  evaluarEstadoBono,
  generarMensajeBonoWhatsApp,
  generarUrlWhatsAppBono,
  getBadgeEstadoBono,
  getEtiquetaTipoBono,
} from '@/utils/bonosUtils';
import { generateQRCodeDataUrl } from '@/utils/qrPosterGenerator';
import { createToast } from '@/components/ui/Toast';

interface TarjetaBonoQrModalProps {
  isOpen: boolean;
  bono: BonoPrepago | null;
  negocioNombre: string;
  onClose: () => void;
}

export function TarjetaBonoQrModal({
  isOpen,
  bono,
  negocioNombre,
  onClose,
}: TarjetaBonoQrModalProps) {
  const titleId = `modal-qr-bono-${useId().replace(/:/g, '')}`;
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen || !bono) return;
    let cancelado = false;
    const payload = construirPayloadQrBono(bono.codigo);
    generateQRCodeDataUrl(payload, { width: 320, margin: 2 })
      .then((url) => {
        if (!cancelado) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('No se pudo generar QR de bono:', err);
      });

    return () => {
      cancelado = true;
    };
  }, [isOpen, bono]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !bono) return null;

  const evaluacion = evaluarEstadoBono(bono);
  const badge = getBadgeEstadoBono(evaluacion.estadoEfectivo);
  const urlWa = generarUrlWhatsAppBono(
    bono.titularTelefono,
    generarMensajeBonoWhatsApp(bono, negocioNombre)
  );

  const handleCopiarCodigo = async () => {
    try {
      await navigator.clipboard.writeText(bono.codigo);
      setCopiado(true);
      createToast(`Código ${bono.codigo} copiado`, 'success');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      createToast('No se pudo copiar el código', 'error');
    }
  };

  const handleDescargarQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-${bono.codigo.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    createToast('Código QR descargado', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400">
              <QrCode className="h-3 w-3" aria-hidden="true" />
              Tarjeta Digital Offline
            </span>
            <h2 id={titleId} className="font-display text-lg font-black text-white mt-1">
              {getEtiquetaTipoBono(bono.tipo)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar tarjeta digital QR"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tarjeta Imprimible */}
        <div
          id="bono-tarjeta-impresion"
          className="rounded-2xl border border-gold-400/40 bg-gradient-to-b from-neutral-900 to-neutral-950 p-5 text-center space-y-3.5"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-400">
              {(negocioNombre || 'LA PARADA').toUpperCase()}
            </p>
            <h3 className="font-display text-lg font-black text-white mt-0.5">
              {bono.titularNombre}
            </h3>
            {bono.compradorNombre && (
              <p className="text-xs text-neutral-400">Obsequio de {bono.compradorNombre}</p>
            )}
            {bono.mensajeRegalo && (
              <p className="mt-1 text-xs italic text-amber-300">“{bono.mensajeRegalo}”</p>
            )}
          </div>

          <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-lg">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR del bono ${bono.codigo}`}
                width={176}
                height={176}
                className="h-44 w-44 object-contain"
              />
            ) : (
              <div className="grid h-44 w-44 place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="font-mono text-base font-black tracking-wider text-gold-400">
              {bono.codigo}
            </p>
            <p className="font-display text-3xl font-black text-emerald-400">
              {formatCOP(bono.saldoActual)}
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${badge.badgeCls}`}
              >
                {badge.label}
              </span>
              <span>
                {evaluacion.fechaVencimiento
                  ? `Válido hasta ${evaluacion.fechaVencimiento.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}`
                  : 'Sin fecha de vencimiento'}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleCopiarCodigo}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold text-neutral-200 hover:bg-neutral-800"
          >
            {copiado ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-gold-400" aria-hidden="true" />
                Copiar Código
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDescargarQr}
            disabled={!qrDataUrl}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold text-neutral-200 hover:bg-neutral-800 disabled:opacity-40"
          >
            <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Descargar QR
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs font-bold text-neutral-200 hover:bg-neutral-800"
          >
            <Printer className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Imprimir Vale
          </button>

          <a
            href={urlWa}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 text-xs font-black text-neutral-950 hover:bg-emerald-400 transition-colors"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
