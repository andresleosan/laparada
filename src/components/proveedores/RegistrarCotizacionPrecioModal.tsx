import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, DollarSign, TrendingDown, TrendingUp, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { formatCOP } from '@/utils/formatCOP';
import { obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';
import {
  calcularVariacionPrecioPct,
  UMBRAL_ALZA_CRITICA_PCT,
} from '@/utils/preciosProveedoresUtils';
import type {
  ComparativaInsumoProveedores,
  Insumo,
  Proveedor,
  RegistrarPrecioInsumoInput,
} from '@/types';

interface RegistrarCotizacionPrecioModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumos: Insumo[];
  proveedores: Proveedor[];
  comparativasPorInsumo?: Record<string, ComparativaInsumoProveedores>;
  insumoPreseleccionadoId?: string;
  responsable?: string;
  onRegistrar: (
    input: Omit<RegistrarPrecioInsumoInput, 'negocioId'>
  ) => Promise<{ id: string; variacionPct: number; esAlzaCritica: boolean }>;
}

export function RegistrarCotizacionPrecioModal({
  isOpen,
  onClose,
  insumos,
  proveedores,
  comparativasPorInsumo = {},
  insumoPreseleccionadoId,
  responsable = 'Administrador',
  onRegistrar,
}: RegistrarCotizacionPrecioModalProps) {
  const generatedId = useId();
  const titleId = `modal-cotizacion-precio-${generatedId.replace(/:/g, '')}-title`;

  const [insumoId, setInsumoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [proveedorManual, setProveedorManual] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [fechaIso, setFechaIso] = useState(() => obtenerFechaIsoColombia());
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    const insumoInicial =
      (insumoPreseleccionadoId &&
        insumos.find((i) => i.id === insumoPreseleccionadoId)?.id) ||
      insumos[0]?.id ||
      '';
    setInsumoId(insumoInicial);
    setProveedorId(proveedores[0]?.id || '__manual__');
    setProveedorManual('');
    setCostoUnitario('');
    setFechaIso(obtenerFechaIsoColombia());
    setNotas('');
  }, [isOpen, insumoPreseleccionadoId, insumos, proveedores]);

  const insumoSeleccionado = useMemo(
    () => insumos.find((i) => i.id === insumoId) || null,
    [insumos, insumoId]
  );

  const ultimoCostoConocido = useMemo(() => {
    if (!insumoSeleccionado) return 0;
    const comp = comparativasPorInsumo[insumoSeleccionado.id];
    if (comp && comp.ultimoCostoCOP > 0) return comp.ultimoCostoCOP;
    return typeof insumoSeleccionado.costoUnitario === 'number' &&
      insumoSeleccionado.costoUnitario > 0
      ? Math.round(insumoSeleccionado.costoUnitario)
      : 0;
  }, [insumoSeleccionado, comparativasPorInsumo]);

  const costoNumerico = Math.round(Number(costoUnitario) || 0);
  const variacionPreviewPct = useMemo(() => {
    if (ultimoCostoConocido <= 0 || costoNumerico <= 0) return 0;
    return calcularVariacionPrecioPct(ultimoCostoConocido, costoNumerico);
  }, [ultimoCostoConocido, costoNumerico]);

  const esAlzaCriticaPreview =
    ultimoCostoConocido > 0 && variacionPreviewPct > UMBRAL_ALZA_CRITICA_PCT;

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    if (!insumoSeleccionado) {
      setErrorLocal('Selecciona un insumo válido de bodega.');
      return;
    }

    const provSeleccionado =
      proveedorId && proveedorId !== '__manual__'
        ? proveedores.find((p) => p.id === proveedorId)
        : undefined;
    const proveedorNombre = provSeleccionado
      ? provSeleccionado.nombre
      : proveedorManual.trim();

    if (!proveedorNombre) {
      setErrorLocal('Indica el proveedor de la cotización o compra.');
      return;
    }
    if (!Number.isFinite(costoNumerico) || costoNumerico <= 0) {
      setErrorLocal('Ingresa un costo unitario válido mayor a $0 COP.');
      return;
    }

    try {
      setGuardando(true);
      await onRegistrar({
        insumoId: insumoSeleccionado.id,
        insumoNombre: insumoSeleccionado.nombre,
        unidad: insumoSeleccionado.unidad || 'unidad',
        proveedorId: provSeleccionado?.id,
        proveedorNombre,
        costoUnitarioCOP: costoNumerico,
        costoAnteriorCOP: ultimoCostoConocido > 0 ? ultimoCostoConocido : undefined,
        origen: 'cotizacion_manual',
        fechaIso,
        registradoPor: responsable,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'No se pudo registrar la cotización.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      onClose={onClose}
      onBackdropClick={onClose}
      labelledBy={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/70 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/15 border border-gold-400/40 flex items-center justify-center text-gold-400">
              <DollarSign className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display font-bold text-lg text-white">
                Registrar Cotización / Precio de Proveedor
              </h2>
              <p className="text-xs text-neutral-400">
                Compara ofertas de otros proveedores sin alterar el stock físico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de cotización"
            className="w-11 h-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {errorLocal && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs sm:text-sm text-red-300"
            >
              {errorLocal}
            </div>
          )}

          <div>
            <label
              htmlFor="cot-insumo"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Insumo en Bodega
            </label>
            <select
              id="cot-insumo"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              {insumos.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.nombre} ({ins.unidad})
                </option>
              ))}
            </select>
            {ultimoCostoConocido > 0 && insumoSeleccionado && (
              <p className="mt-1 text-xs text-neutral-400">
                Último costo registrado:{' '}
                <strong className="text-gold-400 font-mono">
                  {formatCOP(ultimoCostoConocido)}/{insumoSeleccionado.unidad}
                </strong>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="cot-proveedor"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Proveedor
            </label>
            <select
              id="cot-proveedor"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
              <option value="__manual__">+ Otro proveedor (nombre manual)</option>
            </select>

            {proveedorId === '__manual__' && (
              <input
                type="text"
                value={proveedorManual}
                onChange={(e) => setProveedorManual(e.target.value)}
                placeholder="Ej: Distribuidora El Puente"
                aria-label="Nombre del proveedor manual"
                className="mt-2 w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="cot-costo"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Precio Cotizado (COP / {insumoSeleccionado?.unidad || 'unidad'})
              </label>
              <input
                id="cot-costo"
                type="number"
                min="1"
                step="1"
                value={costoUnitario}
                onChange={(e) => setCostoUnitario(e.target.value)}
                placeholder="Ej: 24500"
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm font-mono font-bold text-gold-400 focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="cot-fecha"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Fecha de Cotización
              </label>
              <input
                id="cot-fecha"
                type="date"
                value={fechaIso}
                onChange={(e) => setFechaIso(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {ultimoCostoConocido > 0 && costoNumerico > 0 && (
            <div
              className={`rounded-xl border p-3 text-xs flex items-start gap-2.5 ${
                esAlzaCriticaPreview
                  ? 'border-red-500/50 bg-red-500/10 text-red-200'
                  : variacionPreviewPct > 0
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                    : variacionPreviewPct < 0
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300'
              }`}
            >
              {esAlzaCriticaPreview ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              ) : variacionPreviewPct < 0 ? (
                <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <TrendingUp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <p className="font-bold">
                  Variación frente al último precio:{' '}
                  {variacionPreviewPct > 0 ? `+${variacionPreviewPct}%` : `${variacionPreviewPct}%`}
                </p>
                {esAlzaCriticaPreview ? (
                  <p className="text-[11px] mt-0.5">
                    Alza superior al 10%. Se emitirá una alerta de inflación de bodega y auditoría automática.
                  </p>
                ) : variacionPreviewPct < 0 ? (
                  <p className="text-[11px] mt-0.5">
                    Ahorro estimado de {formatCOP(ultimoCostoConocido - costoNumerico)} por{' '}
                    {insumoSeleccionado?.unidad || 'unidad'}.
                  </p>
                ) : null}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="cot-notas"
              className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5"
            >
              Observaciones / Condiciones (Opcional)
            </label>
            <input
              id="cot-notas"
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Precio mayorista llevando desde 20 kg, pago a 15 días..."
              className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs sm:text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm transition-colors disabled:opacity-40"
            >
              {guardando ? 'Guardando...' : 'Guardar Cotización'}
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
