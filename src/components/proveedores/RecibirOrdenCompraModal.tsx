import { useState, useEffect, useId, type FormEvent } from 'react';
import {
  X,
  PackageCheck,
  CheckCircle2,
  Receipt,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  OrdenCompra,
  RecibirOrdenCompraInput,
  CondicionPagoFactura,
} from '@/types/proveedor';
import { formatCOP } from '@/utils/formatCOP';

interface RecibirOrdenCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  orden: OrdenCompra | null;
  onConfirmarRecepcion: (
    ordenId: string,
    input: RecibirOrdenCompraInput
  ) => Promise<unknown>;
}

interface LineaRecepcionState {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  cantidadSolicitada: number;
  cantidadRecibida: number;
  costoUnitarioEstimado: number;
  costoUnitarioReal: number;
}

export function RecibirOrdenCompraModal({
  isOpen,
  onClose,
  orden,
  onConfirmarRecepcion,
}: RecibirOrdenCompraModalProps) {
  const generatedId = useId();
  const titleId = `modal-recibir-orden-${generatedId.replace(/:/g, '')}-title`;

  const [lineas, setLineas] = useState<LineaRecepcionState[]>([]);
  const [actualizarCostoCatalogo, setActualizarCostoCatalogo] = useState(true);
  const [generarFactura, setGenerarFactura] = useState(true);
  const [numeroFacturaProveedor, setNumeroFacturaProveedor] = useState('');
  const [condicionPago, setCondicionPago] = useState<CondicionPagoFactura>('contado');
  const [registrarGastoContado, setRegistrarGastoContado] = useState(true);
  const [notasRecepcion, setNotasRecepcion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orden) return;
    setErrorLocal(null);
    setActualizarCostoCatalogo(true);
    setGenerarFactura(true);
    setNumeroFacturaProveedor(`FAC-${orden.numeroOrden}`);
    setCondicionPago('contado');
    setRegistrarGastoContado(true);
    setNotasRecepcion('');

    setLineas(
      orden.items.map((i) => ({
        insumoId: i.insumoId,
        insumoNombre: i.insumoNombre,
        unidad: i.unidad,
        cantidadSolicitada: i.cantidadSolicitada,
        cantidadRecibida: i.cantidadSolicitada,
        costoUnitarioEstimado: i.costoUnitarioEstimado,
        costoUnitarioReal: i.costoUnitarioEstimado,
      }))
    );
  }, [isOpen, orden]);

  if (!isOpen || !orden) return null;

  const totalRealCalculado = lineas.reduce(
    (acc, l) => acc + Math.round(Math.max(0, l.cantidadRecibida) * Math.max(0, l.costoUnitarioReal)),
    0
  );

  const handleActualizarLinea = (
    idx: number,
    campo: 'cantidadRecibida' | 'costoUnitarioReal',
    valor: number
  ) => {
    setLineas((prev) => {
      const copia = [...prev];
      const item = { ...copia[idx] };
      if (campo === 'cantidadRecibida') {
        item.cantidadRecibida = Math.max(0, valor);
      } else {
        item.costoUnitarioReal = Math.max(0, Math.round(valor));
      }
      copia[idx] = item;
      return copia;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const conCantidad = lineas.filter((l) => l.cantidadRecibida > 0);
    if (conCantidad.length === 0) {
      setErrorLocal('Al menos un insumo debe tener cantidad recibida mayor a 0.');
      return;
    }

    try {
      setProcesando(true);
      await onConfirmarRecepcion(orden.id, {
        itemsRecibidos: lineas.map((l) => ({
          insumoId: l.insumoId,
          cantidadRecibida: l.cantidadRecibida,
          costoUnitarioReal: l.costoUnitarioReal,
        })),
        actualizarCostoUnitarioCatalogo: actualizarCostoCatalogo,
        generarFacturaCompra: generarFactura,
        numeroFacturaProveedor: numeroFacturaProveedor.trim() || `FAC-${orden.numeroOrden}`,
        condicionPago,
        registrarGastoContado: condicionPago === 'contado' && registrarGastoContado,
        notasRecepcion: notasRecepcion.trim(),
      });
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'Error al recibir la orden en el Kardex'
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <StorefrontDialog
      onClose={onClose}
      onBackdropClick={onClose}
      labelledBy={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
      {/* Cabecera */}
      <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h2
              id={titleId}
              className="font-display font-bold text-lg sm:text-xl text-white"
            >
              Recepción en 1 Clic al Kardex ({orden.numeroOrden})
            </h2>
            <p className="text-xs text-neutral-400">
              Proveedor: <strong className="text-neutral-200">{orden.proveedorNombre}</strong> · Ingreso inmediato de stock y actualización de costos
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de recepción"
          className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
        {errorLocal && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
            {errorLocal}
          </div>
        )}

        {/* Tabla/Tarjetas de verificación de mercancía */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Verificación de Mercancía Recibida y Costo Unitario Real
            </span>
            <span className="text-xs text-neutral-400">
              Solicitado: {formatCOP(orden.totalEstimado)}
            </span>
          </div>

          {lineas.map((linea, idx) => {
            const diffCosto = linea.costoUnitarioReal - linea.costoUnitarioEstimado;
            const subtotalLinea = Math.round(linea.cantidadRecibida * linea.costoUnitarioReal);

            return (
              <div
                key={linea.insumoId}
                className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-4">
                  <p className="font-display font-bold text-sm text-white">
                    {linea.insumoNombre}
                  </p>
                  <p className="text-xs text-neutral-400">
                    Pedido original: {linea.cantidadSolicitada} {linea.unidad} a{' '}
                    {formatCOP(linea.costoUnitarioEstimado)}
                  </p>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Cant. Recibida ({linea.unidad})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={linea.cantidadRecibida}
                    onChange={(e) =>
                      handleActualizarLinea(
                        idx,
                        'cantidadRecibida',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full h-11 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-emerald-400 font-bold text-sm focus:border-gold-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] text-neutral-400 mb-1">
                    Costo Unit. Real (COP)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={linea.costoUnitarioReal}
                    onChange={(e) =>
                      handleActualizarLinea(
                        idx,
                        'costoUnitarioReal',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full h-11 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-gold-400 font-bold text-sm focus:border-gold-400 focus:outline-none"
                  />
                  {diffCosto !== 0 && (
                    <span
                      className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold ${
                        diffCosto > 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {diffCosto > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {diffCosto > 0 ? '+' : ''}
                      {formatCOP(diffCosto)} vs est.
                    </span>
                  )}
                </div>

                <div className="sm:col-span-2 text-right">
                  <span className="text-[11px] text-neutral-500 block">Subtotal</span>
                  <span className="font-display font-bold text-sm text-white">
                    {formatCOP(subtotalLinea)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Opciones de Sincronización con Catálogo y Cuentas por Pagar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={actualizarCostoCatalogo}
            onClick={() => setActualizarCostoCatalogo((v) => !v)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
              actualizarCostoCatalogo
                ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <CheckCircle2
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                actualizarCostoCatalogo ? 'text-emerald-400' : 'text-neutral-600'
              }`}
            />
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                Actualizar Costo Unitario en Catálogo
              </span>
              <span className="text-xs text-neutral-400">
                Actualiza automáticamente el costo de referencia de cada insumo para Ingeniería de Menú y Escandallos.
              </span>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={generarFactura}
            onClick={() => setGenerarFactura((v) => !v)}
            className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
              generarFactura
                ? 'bg-gold-400/10 border-gold-400/40 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <Receipt
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                generarFactura ? 'text-gold-400' : 'text-neutral-600'
              }`}
            />
            <div>
              <span className="font-bold text-xs sm:text-sm block">
                Generar Factura de Compra Automática
              </span>
              <span className="text-xs text-neutral-400">
                Crea el soporte en Cuentas por Pagar sin duplicar la entrada de inventario.
              </span>
            </div>
          </button>
        </div>

        {generarFactura && (
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1">
                N° Factura / Remisión
              </label>
              <input
                type="text"
                value={numeroFacturaProveedor}
                onChange={(e) => setNumeroFacturaProveedor(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase text-neutral-400 mb-1">
                Condición de Pago
              </label>
              <select
                value={condicionPago}
                onChange={(e) => setCondicionPago(e.target.value as CondicionPagoFactura)}
                className="w-full h-10 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
              >
                <option value="contado">Contado (Pagada)</option>
                <option value="credito">Crédito (Cuenta por Pagar)</option>
              </select>
            </div>

            <div className="flex items-end">
              {condicionPago === 'contado' && (
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer h-10">
                  <input
                    type="checkbox"
                    checked={registrarGastoContado}
                    onChange={(e) => setRegistrarGastoContado(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-900 text-gold-400 focus:ring-gold-400"
                  />
                  <span>Registrar egreso en Gastos de Caja</span>
                </label>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
            Notas de Recepción en Bodega
          </label>
          <input
            type="text"
            value={notasRecepcion}
            onChange={(e) => setNotasRecepcion(e.target.value)}
            placeholder="Ej: Mercancía recibida completa y pesada en báscula..."
            className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Pie */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-neutral-400 block">
              Total Real de Recepción
            </span>
            <span className="font-display font-black text-2xl text-emerald-400">
              {formatCOP(totalRealCalculado)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs sm:text-sm transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={procesando}
              className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg disabled:opacity-40"
            >
              <PackageCheck className="w-4 h-4" />
              <span>
                {procesando
                  ? 'Ingresando al Kardex...'
                  : 'Confirmar Recepción en 1 Clic al Kardex'}
              </span>
            </button>
          </div>
        </div>
      </form>
      </div>
    </StorefrontDialog>
  );
}
