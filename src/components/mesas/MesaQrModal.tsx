import React, { useState, useEffect, useId } from 'react';
import {
  QrCode,
  X,
  Copy,
  Check,
  ExternalLink,
  Download,
  Sparkles,
} from 'lucide-react';
import type { Mesa } from '@/types/mesa';
import {
  generarUrlMenuMesa,
  generarQrMesaDataUrl,
  generarTarjetonMesaBlob,
} from '@/utils/menuMesaUtils';
import { createToast } from '@/components/ui/Toast';

export interface MesaQrModalProps {
  isOpen: boolean;
  mesa: Mesa | null;
  negocioNombre?: string;
  negocioSlug?: string;
  onClose: () => void;
}

export const MesaQrModal: React.FC<MesaQrModalProps> = ({
  isOpen,
  mesa,
  negocioNombre = 'La Parada',
  negocioSlug = 'laparada',
  onClose,
}) => {
  const idPrefix = useId();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiado, setCopiado] = useState(false);
  const [generandoTarjeton, setGenerandoTarjeton] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://la-parada.co';

  const urlMesa = mesa
    ? generarUrlMenuMesa(origin, negocioSlug, mesa.numero)
    : '';

  useEffect(() => {
    if (!isOpen || !urlMesa) {
      setQrDataUrl('');
      return;
    }
    generarQrMesaDataUrl(urlMesa)
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error al generar QR:', err));
  }, [isOpen, urlMesa]);

  if (!isOpen || !mesa) return null;

  const handleCopiarEnlace = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(urlMesa);
        setCopiado(true);
        createToast('Enlace de mesa copiado al portapapeles', 'success');
        setTimeout(() => setCopiado(false), 2000);
      }
    } catch {
      createToast('No se pudo copiar el enlace', 'info');
    }
  };

  const handleDescargarQrPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${negocioSlug}-Mesa-${mesa.numero}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    createToast('Código QR descargado', 'success');
  };

  const handleDescargarTarjeton = async () => {
    if (generandoTarjeton) return;
    setGenerandoTarjeton(true);
    try {
      const blob = await generarTarjetonMesaBlob({
        negocioNombre,
        mesaNumero: mesa.numero,
        mesaNombre: mesa.nombre,
        zona: mesa.zona,
        urlMesa,
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Tarjeton-${negocioSlug}-Mesa-${mesa.numero}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      createToast('Tarjetón de mesa generado y descargado', 'success');
    } catch (err) {
      console.error('Error al generar tarjetón de mesa:', err);
      createToast('Error al generar el tarjetón de mesa', 'error');
    } finally {
      setGenerandoTarjeton(false);
    }
  };

  const handleAbrirVistaComensal = () => {
    window.open(urlMesa, '_blank');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm transition-all"
    >
      <div className="relative w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl space-y-4">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h2 id={`${idPrefix}-title`} className="font-display text-lg font-bold text-white">
                Código QR de Mesa
              </h2>
              <p className="text-xs text-neutral-400">
                {mesa.nombre || `Mesa ${mesa.numero}`} · {mesa.zona || 'Salón Principal'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Visualización del Código QR */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-neutral-800 bg-neutral-900/60">
          {qrDataUrl ? (
            <div className="rounded-2xl bg-white p-3 shadow-xl">
              <img
                src={qrDataUrl}
                alt={`QR de ${mesa.nombre}`}
                className="h-48 w-48 object-contain"
              />
            </div>
          ) : (
            <div className="h-48 w-48 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-amber-400 border-t-transparent rounded-full" />
            </div>
          )}

          <div className="mt-3 text-center">
            <span className="font-display text-lg font-black text-white block">
              {mesa.nombre}
            </span>
            <span className="text-[11px] text-neutral-400 block truncate max-w-[280px]">
              {urlMesa}
            </span>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopiarEnlace}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all active:scale-95"
            >
              {copiado ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-amber-400" />}
              <span>{copiado ? 'Copiado' : 'Copiar Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirVistaComensal}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all active:scale-95"
            >
              <ExternalLink className="h-4 w-4 text-sky-400" />
              <span>Probar Vista</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDescargarQrPng}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all active:scale-95"
            >
              <Download className="h-4 w-4 text-amber-400" />
              <span>Solo QR (PNG)</span>
            </button>

            <button
              type="button"
              onClick={handleDescargarTarjeton}
              disabled={generandoTarjeton}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-2 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{generandoTarjeton ? 'Generando...' : 'Tarjetón Mesa'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
