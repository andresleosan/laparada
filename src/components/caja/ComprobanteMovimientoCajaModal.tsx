import { useEffect, useState } from 'react';
import { Check, Copy, FileText, MessageCircle, Printer, X } from 'lucide-react';
import type { CorteXParcial, MovimientoCaja } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  CATALOGO_TIPOS_MOVIMIENTO_CAJA,
  buildWhatsAppCorteXUrl,
  buildWhatsAppMovimientoCajaUrl,
  formatearActaCorteXTexto,
  formatearComprobanteMovimientoTexto,
} from '@/utils/movimientosCajaUtils';
import { createToast } from '@/components/ui/Toast';

interface ComprobanteMovimientoCajaModalProps {
  isOpen: boolean;
  movimiento?: MovimientoCaja | null;
  corteX?: CorteXParcial | null;
  negocio: {
    nombre: string;
    direccion?: string;
    telefono?: string;
  };
  onClose: () => void;
}

export function ComprobanteMovimientoCajaModal({
  isOpen,
  movimiento,
  corteX,
  negocio,
  onClose,
}: ComprobanteMovimientoCajaModalProps) {
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || (!movimiento && !corteX)) return null;

  const fechaRaw = movimiento?.fecha ?? corteX?.fecha;
  const fechaObj = toValidAdminDate(fechaRaw) || new Date();
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

  const handleCopiar = async () => {
    const texto = movimiento
      ? formatearComprobanteMovimientoTexto(movimiento, negocio)
      : formatearActaCorteXTexto(corteX as CorteXParcial, negocio);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      createToast('Comprobante copiado al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      createToast('No se pudo copiar el texto', 'error');
    }
  };

  const handleWhatsApp = () => {
    const url = movimiento
      ? buildWhatsAppMovimientoCajaUrl(movimiento, negocio, telefonoWhatsApp)
      : buildWhatsAppCorteXUrl(corteX as CorteXParcial, negocio, telefonoWhatsApp);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comprobante-caja-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="comprobante-caja-title" className="font-display text-lg font-bold text-white">
                {movimiento ? 'Comprobante de Movimiento' : 'Acta de Corte X (Relevo)'}
              </h2>
              <p className="text-xs text-neutral-400">
                Documento térmico auditable para firma e impresión
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comprobante de caja"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="my-4 max-h-[60vh] overflow-y-auto px-1 py-1">
          <div
            id="comprobante-movimiento-caja-impresion"
            className="rounded-lg border border-neutral-300 bg-[#FBFBFA] p-5 font-mono text-xs text-neutral-900 shadow-sm"
          >
            <div className="text-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black">
                {(negocio.nombre || 'LA PARADA').toUpperCase()}
              </h3>
              <p className="text-[11px] text-neutral-600">
                {movimiento ? 'Comprobante de Movimiento de Caja' : 'Acta de Corte X · Relevo de Turno'}
              </p>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            <div className="space-y-1 text-[11px] text-neutral-700">
              <div className="flex justify-between">
                <span>Fecha: {fechaTexto}</span>
                <span>{horaTexto}</span>
              </div>
              <div className="flex justify-between">
                <span>Código:</span>
                <span className="font-bold text-black">
                  {movimiento ? movimiento.codigoComprobante : corteX?.codigoCorte}
                </span>
              </div>
            </div>

            <div className="my-2 border-b border-dashed border-neutral-400" />

            {movimiento ? (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Tipo:</span>
                  <span className="font-bold text-black">
                    {CATALOGO_TIPOS_MOVIMIENTO_CAJA[movimiento.tipo].label}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-black">
                  <span>MONTO:</span>
                  <span>
                    {CATALOGO_TIPOS_MOVIMIENTO_CAJA[movimiento.tipo].signo > 0 ? '+' : '-'}
                    {formatCOP(movimiento.monto)}
                  </span>
                </div>
                <div className="pt-1">
                  <span className="text-neutral-500 block">Motivo:</span>
                  <span className="font-semibold text-black">{movimiento.motivo}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span>Responsable:</span>
                  <span>{movimiento.responsableNombre}</span>
                </div>
                {movimiento.autorizadoPor && (
                  <div className="flex justify-between">
                    <span>Autorizado por:</span>
                    <span>{movimiento.autorizadoPor}</span>
                  </div>
                )}
                {movimiento.referencia && (
                  <div className="flex justify-between">
                    <span>Referencia / Sobre:</span>
                    <span>{movimiento.referencia}</span>
                  </div>
                )}
              </div>
            ) : corteX ? (
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Cajero Saliente:</span>
                  <span className="font-bold">{corteX.cajeroSaliente}</span>
                </div>
                {corteX.cajeroEntrante && (
                  <div className="flex justify-between">
                    <span>Cajero Entrante:</span>
                    <span className="font-bold">{corteX.cajeroEntrante}</span>
                  </div>
                )}
                <div className="my-2 border-b border-dashed border-neutral-300" />
                <div className="flex justify-between">
                  <span>Base Inicial:</span>
                  <span>{formatCOP(corteX.efectivoInicial)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ventas Efectivo:</span>
                  <span>+{formatCOP(corteX.ventasEfectivo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ingresos Sencillo:</span>
                  <span>+{formatCOP(corteX.ingresosSencillo)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sangrías Caja Fuerte:</span>
                  <span>-{formatCOP(corteX.sangriasCajaFuerte)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Caja Menor:</span>
                  <span>-{formatCOP(corteX.egresosCajaMenor)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos Operativos:</span>
                  <span>-{formatCOP(corteX.gastosOperativos)}</span>
                </div>
                <div className="my-2 border-b border-dashed border-neutral-400" />
                <div className="flex justify-between font-bold text-black">
                  <span>EFECTIVO ESPERADO:</span>
                  <span>{formatCOP(corteX.efectivoEsperado)}</span>
                </div>
                <div className="flex justify-between font-bold text-black">
                  <span>FÍSICO CONTADO:</span>
                  <span>{formatCOP(corteX.arqueo.totalFisico)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>DIFERENCIA:</span>
                  <span
                    className={
                      corteX.arqueo.estadoCuadre === 'cuadrado'
                        ? 'text-emerald-700'
                        : corteX.arqueo.estadoCuadre === 'sobrante'
                          ? 'text-sky-700'
                          : 'text-red-600'
                    }
                  >
                    {corteX.arqueo.estadoCuadre === 'cuadrado'
                      ? 'CUADRADO ($0)'
                      : corteX.arqueo.estadoCuadre === 'sobrante'
                        ? `+${formatCOP(corteX.arqueo.diferencia)} (SOBRANTE)`
                        : `-${formatCOP(Math.abs(corteX.arqueo.diferencia))} (FALTANTE)`}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="my-3 border-b border-dashed border-neutral-400" />
            <div className="pt-3 text-center text-[10px] text-neutral-500">
              Firma Responsable: _______________________
            </div>
          </div>
        </div>

        <div className="space-y-3 border-t border-neutral-800 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="primary"
              onClick={() => window.print()}
              className="flex-1 min-h-[44px] flex items-center justify-center gap-2 font-bold"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Imprimir (Térmica)</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCopiar}
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
                  <span>Copiar Texto</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <input
              type="tel"
              placeholder="WhatsApp destino (opcional)"
              value={telefonoWhatsApp}
              onChange={(e) => setTelefonoWhatsApp(e.target.value)}
              className="h-11 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleWhatsApp}
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
