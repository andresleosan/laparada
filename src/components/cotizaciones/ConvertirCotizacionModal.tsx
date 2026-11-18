import { useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChefHat,
  Flame,
  PackageCheck,
  QrCode,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  Combo,
  CotizacionComercial,
  Insumo,
  MetodoPago,
  Producto,
} from '@/types';
import {
  construirItemsVentaDesdeCotizacion,
  simularCostosYMargenCotizacion,
} from '@/utils/cotizacionesUtils';
import { formatCOP } from '@/utils/formatCOP';

export interface ConvertirCotizacionModalProps {
  cotizacion: CotizacionComercial | null;
  isOpen: boolean;
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  procesando?: boolean;
  onClose: () => void;
  onConfirmarConversion: (params: {
    cotizacion: CotizacionComercial;
    metodoPagoSaldo: MetodoPago;
    enviarAKDS: boolean;
    descontarInventario: boolean;
    notasCocinaExtra?: string;
  }) => Promise<void>;
}

export function ConvertirCotizacionModal({
  cotizacion,
  isOpen,
  productos,
  combos,
  insumos,
  procesando = false,
  onClose,
  onConfirmarConversion,
}: ConvertirCotizacionModalProps) {
  const titleId = `convertir-cot-${useId().replace(/:/g, '')}`;
  const [metodoPagoSaldo, setMetodoPagoSaldo] = useState<MetodoPago>('transferencia');
  const [enviarAKDS, setEnviarAKDS] = useState(true);
  const [descontarInventario, setDescontarInventario] = useState(true);
  const [notasCocinaExtra, setNotasCocinaExtra] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !cotizacion) return;
    setMetodoPagoSaldo(cotizacion.anticipoMetodo || 'transferencia');
    setEnviarAKDS(true);
    setDescontarInventario(true);
    setNotasCocinaExtra('');
    setError('');
  }, [isOpen, cotizacion]);

  const simulacion = useMemo(() => {
    if (!cotizacion) return null;
    return simularCostosYMargenCotizacion({
      items: cotizacion.items,
      productos,
      combos,
      insumos,
      descuento: cotizacion.descuento,
      costoLogistica: cotizacion.costoLogistica,
      invitados: cotizacion.invitados,
    });
  }, [cotizacion, productos, combos, insumos]);

  if (!isOpen || !cotizacion) return null;

  const itemsVentaPreview = construirItemsVentaDesdeCotizacion(
    cotizacion.items,
    cotizacion.costoLogistica
  );

  const handleConfirmar = async () => {
    setError('');
    try {
      await onConfirmarConversion({
        cotizacion,
        metodoPagoSaldo,
        enviarAKDS,
        descontarInventario,
        notasCocinaExtra: notasCocinaExtra.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la conversión atómica de la cotización.'
      );
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      canClose={!procesando}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-3xl border border-gold-400/40 bg-[#0A0A0A] p-6 text-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold-400/40 bg-gold-400/15 text-gold-400">
              <Flame className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-black text-white">
                Convertir {cotizacion.codigo} a Venta y Cocina
              </h2>
              <p className="text-xs text-neutral-400">
                Operación atómica: registra venta oficial, envía comanda al KDS y descuenta escandallos de bodega.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            aria-label="Cerrar confirmación de conversión"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="mt-5 space-y-4">
          {/* Resumen Financiero */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Cliente / Empresa</span>
              <strong className="text-white">
                {cotizacion.empresa || cotizacion.clienteNombre}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Fecha del evento · Invitados</span>
              <strong className="text-white">
                {cotizacion.fechaEvento} ({cotizacion.invitados} inv.)
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Ítems a facturar</span>
              <strong className="text-white">{itemsVentaPreview.length} líneas</strong>
            </div>

            <div className="border-t border-neutral-800 pt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">Total Oficial de Venta</span>
                <span className="font-display text-xl font-black text-gold-400">
                  {formatCOP(cotizacion.totalCotizado)}
                </span>
              </div>
              {cotizacion.anticipoMonto > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <span>
                      Anticipo registrado (
                      {cotizacion.anticipoEstado === 'verificado' ? 'Verificado' : 'Por confirmar'})
                    </span>
                    <span className="font-mono font-bold">
                      -{formatCOP(cotizacion.anticipoMonto)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Saldo a liquidar ahora</span>
                    <span className="font-mono text-amber-300">
                      {formatCOP(cotizacion.saldoPendiente)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Método de pago offline de la liquidación */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-neutral-300">
              Método de Pago Offline para el Registro de Venta
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                aria-pressed={metodoPagoSaldo === 'transferencia'}
                onClick={() => setMetodoPagoSaldo('transferencia')}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-bold ${
                  metodoPagoSaldo === 'transferencia'
                    ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <QrCode className="h-4 w-4" aria-hidden="true" />
                <span>Transferencia</span>
              </button>
              <button
                type="button"
                aria-pressed={metodoPagoSaldo === 'efectivo'}
                onClick={() => setMetodoPagoSaldo('efectivo')}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-xs font-bold ${
                  metodoPagoSaldo === 'efectivo'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                }`}
              >
                <Banknote className="h-4 w-4" aria-hidden="true" />
                <span>Efectivo</span>
              </button>
            </div>
          </div>

          {/* Opciones de producción y bodega */}
          <div className="space-y-2.5">
            <label className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enviarAKDS}
                onChange={(e) => setEnviarAKDS(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold-400"
              />
              <div className="text-xs">
                <p className="flex items-center gap-1.5 font-bold text-white">
                  <ChefHat className="h-4 w-4 text-amber-400" aria-hidden="true" />
                  Enviar Comanda Automática a Cocina (KDS)
                </p>
                <p className="text-neutral-400">
                  Aparece en `/cocina` con código #{cotizacion.codigo}, marcada como pagada para evitar doble facturación.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={descontarInventario}
                onChange={(e) => setDescontarInventario(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold-400"
              />
              <div className="text-xs">
                <p className="flex items-center gap-1.5 font-bold text-white">
                  <PackageCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  Descontar Insumos de Escandallo en Bodega & Kardex
                </p>
                <p className="text-neutral-400">
                  {simulacion && simulacion.insumosRequeridos.length > 0
                    ? `Descontará atómicamente ${simulacion.insumosRequeridos.length} insumos vinculados a recetas.`
                    : 'No hay insumos con receta asociados a los ítems actuales.'}
                </p>
              </div>
            </label>
          </div>

          {descontarInventario && simulacion && simulacion.insumosConDeficit.length > 0 && (
            <div
              role="status"
              className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200 space-y-1"
            >
              <p className="flex items-center gap-1.5 font-bold text-amber-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Alerta de Bodega ({simulacion.insumosConDeficit.length} insumos con stock inferior al evento)
              </p>
              <ul className="space-y-0.5 pl-5 list-disc text-[11px]">
                {simulacion.insumosConDeficit.slice(0, 4).map((ins) => (
                  <li key={ins.insumoId}>
                    {ins.nombre}: requiere {ins.cantidadRequerida} {ins.unidad} (en bodega:{' '}
                    {ins.stockActual})
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-300/80">
                El stock descontado se protegerá en 0 sin generar saldos negativos.
              </p>
            </div>
          )}

          {enviarAKDS && (
            <label className="block space-y-1 text-xs">
              <span className="font-semibold text-neutral-300">
                Nota adicional para Cocina KDS (Opcional)
              </span>
              <input
                type="text"
                value={notasCocinaExtra}
                onChange={(e) => setNotasCocinaExtra(e.target.value)}
                placeholder="Ej: Prioridad salida 12:00 PM · Empacar salsas en envase grande"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
              />
            </label>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/50 bg-red-950/50 p-3 text-xs font-semibold text-red-200"
            >
              {error}
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={procesando}
              className="min-h-[46px] flex-1 rounded-xl border border-neutral-700 bg-neutral-900 text-xs font-bold text-neutral-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmar()}
              disabled={procesando}
              className="inline-flex min-h-[46px] flex-[1.7] items-center justify-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-black hover:bg-gold-500 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {procesando
                  ? 'Ejecutando conversión atómica...'
                  : 'Confirmar Venta y Despachar Evento'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </StorefrontDialog>
  );
}
