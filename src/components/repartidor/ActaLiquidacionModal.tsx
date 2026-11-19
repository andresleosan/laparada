import { useEffect } from 'react';
import { MessageCircle, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { LiquidacionDomiciliario } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { formatearActaLiquidacionWhatsApp } from '@/utils/liquidacionDomiciliariosUtils';

interface ActaLiquidacionModalProps {
  acta: LiquidacionDomiciliario | null;
  negocioNombre: string;
  onClose: () => void;
}

export function ActaLiquidacionModal({
  acta,
  negocioNombre,
  onClose,
}: ActaLiquidacionModalProps) {
  useEffect(() => {
    if (!acta) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [acta, onClose]);

  if (!acta) return null;

  const fecha = toValidAdminDate(acta.fechaLiquidacion || acta.fechaEntregaBase);
  const fechaStr = fecha
    ? fecha.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Hoy';

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    formatearActaLiquidacionWhatsApp(acta, negocioNombre)
  )}`;

  const diferenciaLabel =
    acta.diferencia === 0
      ? 'CUADRADO ($ 0)'
      : acta.diferencia > 0
      ? `SOBRANTE (+${formatCOP(acta.diferencia)})`
      : `FALTANTE (-${formatCOP(Math.abs(acta.diferencia))})`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-acta-liquidacion"
    >
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
          <h2 id="titulo-acta-liquidacion" className="font-display text-lg font-bold text-white">
            Acta de Liquidación · {acta.codigoActa}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar acta de liquidación"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cuerpo imprimible 80mm */}
        <div
          id="acta-liquidacion-impresion"
          className="rounded-xl border border-neutral-800 bg-white p-4 font-mono text-xs text-neutral-900 shadow-inner"
        >
          <div className="border-b border-dashed border-neutral-400 pb-2 text-center">
            <p className="text-sm font-black uppercase">{negocioNombre}</p>
            <p className="font-bold">ACTA DE LIQUIDACIÓN DE RUTA</p>
            <p className="text-[11px] font-bold">{acta.codigoActa}</p>
            <p className="text-[10px] text-neutral-600">{fechaStr}</p>
          </div>

          <div className="my-2.5 space-y-1 border-b border-dashed border-neutral-400 pb-2.5">
            <div className="flex justify-between">
              <span>Repartidor:</span>
              <span className="font-bold">{acta.domiciliarioNombre}</span>
            </div>
            <div className="flex justify-between">
              <span>Entregó Base:</span>
              <span>{acta.entregadoPor}</span>
            </div>
            {acta.cajeroReceptor && (
              <div className="flex justify-between">
                <span>Recibió Caja:</span>
                <span>{acta.cajeroReceptor}</span>
              </div>
            )}
          </div>

          <div className="my-2.5 space-y-1 border-b border-dashed border-neutral-400 pb-2.5">
            <div className="flex justify-between">
              <span>Base Sencillo Inicial:</span>
              <span className="font-bold">{formatCOP(acta.montoBaseInicial)}</span>
            </div>
            <div className="flex justify-between">
              <span>Carreras Conciliadas:</span>
              <span>{acta.totalEntregas}</span>
            </div>
            <div className="flex justify-between">
              <span>Efectivo Cobrado:</span>
              <span>{formatCOP(acta.totalEfectivoCobrado)}</span>
            </div>
            <div className="flex justify-between">
              <span>Transferencias Validadas:</span>
              <span>{formatCOP(acta.totalTransferencias)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>ESPERADO A RENDIR:</span>
              <span>{formatCOP(acta.efectivoEsperadoRendir)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span>ENTREGADO EN CAJA:</span>
              <span>{formatCOP(acta.efectivoEntregadoFisico)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-300 pt-1 text-xs font-black">
              <span>RESULTADO:</span>
              <span>{diferenciaLabel}</span>
            </div>
          </div>

          {acta.notasLiquidacion && (
            <p className="mt-2.5 border-t border-dashed border-neutral-400 pt-2 text-[10px]">
              Notas: {acta.notasLiquidacion}
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
            className="min-h-[44px] gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir 80mm</span>
          </Button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/25"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
