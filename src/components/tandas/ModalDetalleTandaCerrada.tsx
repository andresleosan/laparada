import { useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  ClipboardCopy,
  MessageCircle,
  PackageCheck,
  Smartphone,
  X,
} from 'lucide-react';
import type { TandaVitrina } from '@/types/tanda';
import { formatCOP } from '@/utils/formatCOP';
import { formatFecha, formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  calcularResumenTanda,
  calcularTotalesItem,
  generarResumenTandaWhatsApp,
} from '@/utils/tandaUtils';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';

interface ModalDetalleTandaCerradaProps {
  isOpen: boolean;
  onClose: () => void;
  tanda: TandaVitrina | null;
  nombreNegocio?: string;
}

export function ModalDetalleTandaCerrada({
  isOpen,
  onClose,
  tanda,
  nombreNegocio = 'La Parada',
}: ModalDetalleTandaCerradaProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const detalle = useMemo(() => {
    if (!tanda) return null;
    const fechaApertura = toValidAdminDate(tanda.fecha);
    const fechaCierre = toValidAdminDate(tanda.fechaCierre);
    const resumen =
      tanda.resumen ?? calcularResumenTanda(tanda.items || [], tanda.transferencias || []);
    const totalPuestas = resumen.totalInicial + resumen.totalAdiciones;
    const rotacionPct =
      totalPuestas > 0 ? Math.round((resumen.totalVendidos / totalPuestas) * 1000) / 10 : 0;
    const items = (tanda.items || []).map((item) => ({
      ...item,
      calc: calcularTotalesItem(item),
    }));
    const textoWhatsApp = generarResumenTandaWhatsApp(tanda, nombreNegocio);

    return {
      fechaApertura,
      fechaCierre,
      resumen,
      totalPuestas,
      rotacionPct,
      items,
      textoWhatsApp,
    };
  }, [tanda, nombreNegocio]);

  if (!isOpen || !tanda || !detalle) return null;

  const handleCopiarActa = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(detalle.textoWhatsApp);
        createToast('Acta de tanda copiada al portapapeles', 'success');
      }
    } catch {
      createToast('No se pudo copiar el acta automáticamente', 'error');
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(detalle.textoWhatsApp)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalle-tanda-cerrada-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <PackageCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="modal-detalle-tanda-cerrada-title"
                className="font-display text-lg font-bold text-white"
              >
                Acta de Cierre de Tanda
              </h2>
              <p className="text-xs text-neutral-400">
                {detalle.fechaApertura
                  ? `Apertura: ${formatFecha(detalle.fechaApertura)} · ${formatHora(detalle.fechaApertura)}`
                  : 'Fecha de apertura no disponible'}
                {detalle.fechaCierre
                  ? ` · Cierre: ${formatHora(detalle.fechaCierre)}`
                  : ''}
                {tanda.responsable ? ` · Responsable: ${tanda.responsable}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar detalle de tanda"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
          {/* Resumen de unidades */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <span className="block text-[11px] text-neutral-400">Puestas</span>
              <span className="font-display text-base font-bold text-white">
                {detalle.totalPuestas} unds
              </span>
            </div>
            <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-3">
              <span className="block text-[11px] text-emerald-300">Vendidas</span>
              <span className="font-display text-base font-bold text-emerald-400">
                {detalle.resumen.totalVendidos} unds
              </span>
            </div>
            <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3">
              <span className="block text-[11px] text-red-300">Mermas</span>
              <span className="font-display text-base font-bold text-red-400">
                {detalle.resumen.totalMermas} unds
              </span>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <span className="block text-[11px] text-neutral-400">Sobrantes</span>
              <span className="font-display text-base font-bold text-neutral-200">
                {detalle.resumen.totalSobrantes} unds
              </span>
            </div>
            <div className="col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:col-span-1">
              <span className="block text-[11px] text-amber-300">Rotación</span>
              <span className="font-display text-base font-bold text-amber-400">
                {detalle.rotacionPct}%
              </span>
            </div>
          </div>

          {/* Desglose por producto */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
            <div className="border-b border-neutral-800 px-4 py-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Desglose por Producto ({detalle.items.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-800 bg-neutral-950/60 text-[11px] text-neutral-400">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Producto</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Inicial</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Recargas</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Mermas</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Sobró</th>
                    <th className="px-2 py-2.5 text-right font-semibold">Vendidos</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/70">
                  {detalle.items.map((item) => (
                    <tr key={item.productoId} className="hover:bg-neutral-800/20">
                      <td className="px-3 py-2.5">
                        <span className="block font-semibold text-white">{item.nombre}</span>
                        <span className="text-[11px] text-neutral-400">
                          {formatCOP(item.precioUnitario)} c/u
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-neutral-300">
                        {item.cantidadInicial}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-emerald-400">
                        +{item.calc.totalAdiciones}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-red-400">
                        -{item.calc.totalMermas}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-neutral-300">
                        {item.calc.sobrantes}
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono font-bold text-white">
                        {item.calc.vendidos}
                      </td>
                      <td className="px-3 py-2.5 text-right font-display font-bold text-amber-400">
                        {formatCOP(item.calc.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transferencias de la tanda */}
          {tanda.transferencias && tanda.transferencias.length > 0 && (
            <div className="rounded-xl border border-purple-900/40 bg-purple-950/15 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-purple-400" aria-hidden="true" />
                  <h3 className="text-xs font-bold text-purple-200">
                    Transferencias de la Tanda ({tanda.transferencias.length})
                  </h3>
                </div>
                <span className="font-display text-sm font-bold text-purple-300">
                  {formatCOP(detalle.resumen.totalTransferencias)}
                </span>
              </div>
              <div className="divide-y divide-purple-900/30">
                {tanda.transferencias.map((transf) => {
                  const horaTransf = toValidAdminDate(transf.hora);
                  return (
                    <div
                      key={transf.id}
                      className="flex items-center justify-between py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-purple-950/60 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">
                          {transf.metodo}
                        </span>
                        {horaTransf && (
                          <span className="text-neutral-400">{formatHora(horaTransf)}</span>
                        )}
                        {transf.referencia && (
                          <span className="font-mono text-neutral-400">Ref: {transf.referencia}</span>
                        )}
                      </div>
                      <span className="font-bold text-white">{formatCOP(transf.monto)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cuadre Financiero */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <span className="block text-[11px] text-neutral-400">Venta Bruta Vitrina</span>
              <span className="font-display text-lg font-bold text-white">
                {formatCOP(detalle.resumen.totalVentaEstimada)}
              </span>
            </div>
            <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-3">
              <span className="block text-[11px] text-purple-300">(-) Transferencias</span>
              <span className="font-display text-lg font-bold text-purple-300">
                {formatCOP(detalle.resumen.totalTransferencias)}
              </span>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
              <span className="block text-[11px] font-medium text-amber-300">
                (=) Efectivo Esperado
              </span>
              <span className="font-display text-lg font-bold text-amber-400">
                {formatCOP(detalle.resumen.totalEfectivoEsperado)}
              </span>
            </div>
          </div>

          {tanda.notasCierre && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-300">
              <span className="font-semibold text-neutral-400">Notas de cierre: </span>
              {tanda.notasCierre}
            </div>
          )}
        </div>

        {/* Footer de acciones */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-800 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCopiarActa}
            className="min-h-[44px] gap-1.5 text-xs"
          >
            <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
            <span>Copiar Acta</span>
          </Button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Enviar acta de tanda por WhatsApp"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            <span>Enviar por WhatsApp</span>
          </a>

          <Button
            type="button"
            onClick={onClose}
            className="min-h-[44px] gap-1.5 bg-amber-500 text-xs font-bold text-neutral-950 hover:bg-amber-400"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>Listo</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
