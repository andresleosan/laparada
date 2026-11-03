// src/components/admin/NegocioQRCard.tsx
import { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Download,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { Negocio } from '@/types/negocio';
import {
  generateQRCodeDataUrl,
  generatePosterBlob,
  triggerBlobDownload,
} from '@/utils/qrPosterGenerator';

interface NegocioQRCardProps {
  negocio: Negocio;
}

export function NegocioQRCard({ negocio }: NegocioQRCardProps) {
  const [copiado, setCopiado] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generandoAfiche, setGenerandoAfiche] = useState(false);

  // Construir la URL pública según el negocio
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://laparada.co';
  const slug = negocio.slug || (negocio.id === 'laparada' ? 'la-parada' : negocio.id);
  const urlPublica = `${baseUrl}/tienda/${slug}`;

  // Generar preview del QR al montar o cambiar de negocio
  useEffect(() => {
    let cancelado = false;
    generateQRCodeDataUrl(urlPublica, { width: 320, margin: 2 })
      .then((dataUrl) => {
        if (!cancelado) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Error generando QR preview:', err);
      });

    return () => {
      cancelado = true;
    };
  }, [urlPublica]);

  const handleCopiarEnlace = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(urlPublica);
      } else {
        const input = document.createElement('input');
        input.value = urlPublica;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopiado(true);
      createToast('📋 ¡Enlace copiado al portapapeles!', 'success');
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      createToast('No fue posible copiar el enlace', 'error');
    }
  };

  const handleDescargarAfiche = async () => {
    setGenerandoAfiche(true);
    try {
      const blob = await generatePosterBlob({
        negocioNombre: negocio.nombre,
        urlTienda: urlPublica,
        ciudad: negocio.ciudad,
        telefono: negocio.telefono,
      });
      const filename = `afiche-qr-${slug}.png`;
      triggerBlobDownload(blob, filename);
      createToast('🎉 ¡Afiche PNG descargado con éxito!', 'success');
    } catch (error) {
      console.error('Error descargando afiche:', error);
      createToast('Error al generar el afiche descargable', 'error');
    } finally {
      setGenerandoAfiche(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <QrCode size={20} />
            </span>
            <h3 className="font-display font-black text-white text-base sm:text-lg">
              Enlace de tu Tienda &amp; Código QR
            </h3>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Tus clientes pueden escanear este código o abrir tu enlace para ver tu menú y pedir.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Tienda en Línea Activa
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Preview del Código QR */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-center">
          <div className="relative p-3 bg-white rounded-2xl shadow-xl shadow-amber-500/10 border border-amber-500/20">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`Código QR de ${negocio.nombre}`}
                width="192"
                height="192"
                className="w-44 h-44 object-contain rounded-lg"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-amber-500" />
              </div>
            )}
          </div>
          <span className="text-[11px] font-bold text-neutral-300 mt-3 block">
            Escanea para probar
          </span>
          <span className="text-[10px] text-neutral-500">
            Formato vectorial de alta resolución
          </span>
        </div>

        {/* Acciones y enlace */}
        <div className="md:col-span-8 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300 block">
              Enlace público de tu local
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                readOnly
                value={urlPublica}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 font-mono select-all focus:outline-none focus:border-amber-500"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopiarEnlace}
                  className="text-xs font-semibold flex items-center justify-center gap-1.5 py-2.5 px-3 min-w-[120px]"
                >
                  {copiado ? (
                    <>
                      <Check size={14} className="text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </Button>

                <a
                  href={urlPublica}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 text-xs font-semibold transition-colors"
                  title="Abrir tienda en nueva pestaña"
                >
                  <ExternalLink size={14} />
                  <span>Ver Tienda</span>
                </a>
              </div>
            </div>
          </div>

          {/* Botón Descargar Afiche */}
          <div className="pt-2 border-t border-neutral-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
              <div className="space-y-0.5">
                <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Afiche Imprimible para Mesas y Mostrador
                </span>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Genera una imagen PNG de 1200×1600 px en alta definición con el nombre de tu
                  local, colores elegantes y el código QR listo para colocar en portamenús.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleDescargarAfiche}
                disabled={generandoAfiche}
                className="w-full sm:w-auto shrink-0 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 py-3 px-4 shadow-lg shadow-amber-500/20"
              >
                {generandoAfiche ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Generando Afiche...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Descargar Afiche (PNG)</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

