import { useEffect, useRef, useState } from 'react';
import { Printer, MessageCircle, Copy, X, Check, FileText } from 'lucide-react';
import type { CierreCaja } from '@/types/cierreCaja';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import {
  formatearActaArqueoTexto,
  buildWhatsAppActaUrl,
  BILLETES_COP,
  MONEDAS_COP,
  calcularTotalesArqueo,
} from '@/utils/arqueoCaja';
import { createToast } from '@/components/ui/Toast';

interface ActaCierreModalProps {
  cierre: CierreCaja | null;
  negocio: {
    nombre: string;
    direccion?: string;
    telefono?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function ActaCierreModal({
  cierre,
  negocio,
  isOpen,
  onClose,
}: ActaCierreModalProps) {
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [copiado, setCopiado] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cierre) return null;

  const arqueo =
    cierre.arqueo ??
    calcularTotalesArqueo(
      {},
      cierre.efectivoEsperado ?? cierre.totalIngresos
    );

  const fechaObj =
    cierre.fecha && typeof (cierre.fecha as { toDate?: () => Date }).toDate === 'function'
      ? (cierre.fecha as { toDate: () => Date }).toDate()
      : cierre.fecha instanceof Date
      ? cierre.fecha
      : new Date();

  const fechaTexto = fechaObj.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const horaTexto = fechaObj.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const handleImprimir = () => {
    window.print();
  };

  const handleEnviarWhatsApp = () => {
    const url = buildWhatsAppActaUrl(cierre, negocio, telefonoWhatsApp);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopiarTexto = async () => {
    const texto = formatearActaArqueoTexto(cierre, negocio);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      createToast('Acta de cierre copiada al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      createToast('No se pudo copiar el texto', 'error');
    }
  };

  const billetesFiltrados = BILLETES_COP.filter((b) => (arqueo.denominaciones[b.key] ?? 0) > 0);
  const monedasFiltradas = MONEDAS_COP.filter((m) => (arqueo.denominaciones[m.key] ?? 0) > 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="acta-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="acta-modal-title" className="font-display text-lg font-bold text-white">
                Acta de Cierre y Arqueo
              </h2>
              <p className="text-xs text-neutral-400">
                Comprobante térmico oficial para auditoría e impresión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante de acta"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Visualización del comprobante térmico tipo papel comanda */}
        <div className="my-4 overflow-y-auto px-1 py-1 max-h-[60vh]">
          <div
            id="acta-cierre-impresion"
            className="rounded-lg border border-neutral-300 bg-[#FBFBFA] p-5 font-mono text-xs text-neutral-900 shadow-sm"
          >
            {/* Encabezado del negocio */}
            <div className="text-center">
              <h3 className="font-bold text-sm tracking-wider uppercase text-black">
                {(negocio.nombre || 'LA PARADA').toUpperCase()}
              </h3>
              <p className="text-[11px] text-neutral-600">Comprobante de Cierre y Arqueo</p>
              {negocio.direccion && (
                <p className="text-[10px] text-neutral-600">{negocio.direccion}</p>
              )}
              {negocio.telefono && (
                <p className="text-[10px] text-neutral-600">Tel: {negocio.telefono}</p>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Metadatos */}
            <div className="space-y-0.5 text-[11px] text-neutral-700">
              <div className="flex justify-between">
                <span>Fecha: {fechaTexto}</span>
                <span>{horaTexto}</span>
              </div>
              <div className="flex justify-between">
                <span>Cierre ID:</span>
                <span className="font-bold">#{(cierre.id || 'NUEVO').slice(-6).toUpperCase()}</span>
              </div>
              {cierre.cajeroNombre && (
                <div className="flex justify-between">
                  <span>Cajero:</span>
                  <span className="font-medium truncate max-w-[170px]">{cierre.cajeroNombre}</span>
                </div>
              )}
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Balance del Turno */}
            <div className="space-y-1 text-[11px]">
              <div className="font-bold text-[10px] text-neutral-500 uppercase tracking-wider">
                Balance del Turno
              </div>
              <div className="flex justify-between">
                <span>Ventas POS (Mostrador):</span>
                <span>{formatCOP(cierre.ventasPos || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Ventas WhatsApp / Web:</span>
                <span>{formatCOP(cierre.ventasWhatsapp || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold text-black">
                <span>TOTAL INGRESOS:</span>
                <span>{formatCOP(cierre.totalIngresos)}</span>
              </div>
              {cierre.totalDescuentos && cierre.totalDescuentos > 0 ? (
                <div className="flex justify-between text-amber-800">
                  <span>Descuentos ({cierre.cantidadDescuentos || 1} tickets):</span>
                  <span>-{formatCOP(cierre.totalDescuentos)}</span>
                </div>
              ) : null}
              {cierre.totalAnuladas && cierre.totalAnuladas > 0 ? (
                <div className="flex justify-between text-red-700">
                  <span>Anuladas ({cierre.cantidadAnuladas || 1} op.):</span>
                  <span>{formatCOP(cierre.totalAnuladas)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-red-600">
                <span>Total Gastos:</span>
                <span>-{formatCOP(cierre.totalGastos)}</span>
              </div>
              <div className="flex justify-between font-bold text-black border-t border-dashed border-neutral-300 pt-0.5">
                <span>UTILIDAD NETA:</span>
                <span>{formatCOP(cierre.utilidadNeta)}</span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {/* Desglose de Arqueo Físico */}
            <div className="space-y-1 text-[11px]">
              <div className="font-bold text-[10px] text-neutral-500 uppercase tracking-wider">
                Arqueo Físico de Billetes y Monedas
              </div>

              {billetesFiltrados.length > 0 && (
                <div className="pt-0.5 space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-600">Billetes:</span>
                  {billetesFiltrados.map((b) => {
                    const cant = arqueo.denominaciones[b.key] || 0;
                    return (
                      <div key={b.key} className="flex justify-between pl-1">
                        <span>
                          {cant} × {b.etiqueta}
                        </span>
                        <span>{formatCOP(cant * b.valor)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-medium text-[10px] text-neutral-700 pl-1 border-t border-dotted border-neutral-300">
                    <span>Subtotal Billetes:</span>
                    <span>{formatCOP(arqueo.totalBilletes)}</span>
                  </div>
                </div>
              )}

              {monedasFiltradas.length > 0 && (
                <div className="pt-1 space-y-0.5">
                  <span className="text-[10px] font-semibold text-neutral-600">Monedas:</span>
                  {monedasFiltradas.map((m) => {
                    const cant = arqueo.denominaciones[m.key] || 0;
                    return (
                      <div key={m.key} className="flex justify-between pl-1">
                        <span>
                          {cant} × {m.etiqueta}
                        </span>
                        <span>{formatCOP(cant * m.valor)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-medium text-[10px] text-neutral-700 pl-1 border-t border-dotted border-neutral-300">
                    <span>Subtotal Monedas:</span>
                    <span>{formatCOP(arqueo.totalMonedas)}</span>
                  </div>
                </div>
              )}

              {billetesFiltrados.length === 0 && monedasFiltradas.length === 0 && (
                <p className="italic text-neutral-500 text-[10px]">
                  (Sin desglose detallado de efectivo ingresado)
                </p>
              )}
            </div>

            <div className="my-2 border-b-2 border-dashed border-neutral-600" />

            {/* Comparación y Diferencia */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-bold text-black text-sm">
                <span>TOTAL FÍSICO CONTADO:</span>
                <span>{formatCOP(arqueo.totalFisico)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-neutral-700">
                <span>Efectivo Esperado (Sistema):</span>
                <span>{formatCOP(arqueo.efectivoEsperado)}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold">
                <span>Diferencia de Cuadre:</span>
                <span
                  className={
                    arqueo.estadoCuadre === 'cuadrado'
                      ? 'text-emerald-700'
                      : arqueo.estadoCuadre === 'sobrante'
                      ? 'text-sky-700'
                      : 'text-red-600'
                  }
                >
                  {arqueo.estadoCuadre === 'cuadrado' && '¡CUADRADO ($0)!'}
                  {arqueo.estadoCuadre === 'sobrante' && `+${formatCOP(arqueo.diferencia)} (SOBRANTE)`}
                  {arqueo.estadoCuadre === 'faltante' && `-${formatCOP(Math.abs(arqueo.diferencia))} (FALTANTE)`}
                </span>
              </div>
            </div>

            {cierre.notas && (
              <>
                <div className="my-2 border-b border-dashed border-neutral-400" />
                <div className="text-[10px] text-neutral-600 italic">
                  <span>Nota: {cierre.notas}</span>
                </div>
              </>
            )}

            <div className="my-2 border-b border-dashed border-neutral-400" />
            <div className="text-center text-[10px] text-neutral-500">
              Sistema La Parada POS · Auditoría Inmutable
            </div>
          </div>
        </div>

        {/* Acciones y Compartir */}
        <div className="space-y-3 border-t border-neutral-800 pt-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleImprimir}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 font-bold"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Imprimir Acta (Térmica)</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCopiarTexto}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2"
            >
              {copiado ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  <span>Copiar Acta</span>
                </>
              )}
            </Button>
          </div>

          {/* Enviar WhatsApp con teléfono opcional */}
          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="Número WhatsApp (ej: 3123456789)"
              value={telefonoWhatsApp}
              onChange={(e) => setTelefonoWhatsApp(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleEnviarWhatsApp}
              className="min-h-[44px] px-4 flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
