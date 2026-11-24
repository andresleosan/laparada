import React, { useEffect, useId, useState } from 'react';
import { Calendar, Package, RefreshCw, ShieldCheck, Thermometer, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import type {
  Insumo,
  RegistrarLoteManualInput,
  UbicacionBodegaLote,
} from '@/types';
import {
  parseFiniteNumber,
  validateNonNegativeAmount,
  validatePositiveAmount,
} from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import {
  esFechaIsoValida,
  generarCodigoLote,
  obtenerFechaIsoColombia,
  sumarDiasAFechaIso,
  UBICACIONES_BODEGA_LOTE_META,
  UBICACIONES_BODEGA_LOTE_ORDEN,
} from '@/utils/lotesInventarioUtils';

export interface RegistrarLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumos: Insumo[];
  insumoPreseleccionadoId?: string;
  onRegistrarLote: (input: RegistrarLoteManualInput) => Promise<string>;
  onSuccess?: () => void;
}

const PRESETS_DIAS_VENCIMIENTO = [3, 7, 15, 30] as const;

export function RegistrarLoteModal({
  isOpen,
  onClose,
  insumos,
  insumoPreseleccionadoId,
  onRegistrarLote,
  onSuccess,
}: RegistrarLoteModalProps) {
  const generatedId = useId();
  const titleId = `registrar-lote-modal-${generatedId.replace(/:/g, '')}-title`;

  let responsableDefault = 'Administrador';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro en pruebas unitarias sin AuthProvider
  }

  const [insumoId, setInsumoId] = useState('');
  const [codigoLote, setCodigoLote] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [sinCaducidad, setSinCaducidad] = useState(false);
  const [ubicacionBodega, setUbicacionBodega] =
    useState<UbicacionBodegaLote>('nevera_refrigeracion');
  const [temperaturaC, setTemperaturaC] = useState('');
  const [registroSanitario, setRegistroSanitario] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [soloTrazabilidad, setSoloTrazabilidad] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const elegido =
      insumoPreseleccionadoId &&
      insumos.some((i) => i.id === insumoPreseleccionadoId)
        ? insumoPreseleccionadoId
        : insumos[0]?.id || '';
    setInsumoId(elegido);
    setCodigoLote(generarCodigoLote('LOT'));
    setCantidad('');
    setCostoTotal('');
    setFechaVencimiento(sumarDiasAFechaIso(obtenerFechaIsoColombia(), 7));
    setSinCaducidad(false);
    setUbicacionBodega('nevera_refrigeracion');
    setTemperaturaC('');
    setRegistroSanitario('');
    setProveedor('');
    setNotas('');
    setSoloTrazabilidad(false);
  }, [isOpen, insumoPreseleccionadoId, insumos]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardando, onClose]);

  if (!isOpen) return null;

  const insumoSeleccionado = insumos.find((i) => i.id === insumoId) || null;
  const unidad = insumoSeleccionado?.unidad || 'unidades';
  const cantParsed = parseFiniteNumber(cantidad);
  const costoParsed = parseFiniteNumber(costoTotal);
  const costoUnitarioEstimado =
    cantParsed && cantParsed > 0 && costoParsed && costoParsed > 0
      ? Math.round(costoParsed / cantParsed)
      : insumoSeleccionado?.costoUnitario || 0;

  const aplicarPresetDias = (dias: number) => {
    setSinCaducidad(false);
    setFechaVencimiento(sumarDiasAFechaIso(obtenerFechaIsoColombia(), dias));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoSeleccionado) {
      createToast('Debes seleccionar un insumo válido', 'error');
      return;
    }

    const errCant = validatePositiveAmount(cantidad);
    if (errCant) {
      createToast(errCant, 'error');
      return;
    }

    if (costoTotal.trim()) {
      const errCosto = validateNonNegativeAmount(costoTotal);
      if (errCosto) {
        createToast(errCosto, 'error');
        return;
      }
    }

    const fechaFinal = sinCaducidad ? null : fechaVencimiento.trim();
    if (!sinCaducidad && fechaFinal && !esFechaIsoValida(fechaFinal)) {
      createToast('Ingresa una fecha de vencimiento válida (YYYY-MM-DD)', 'error');
      return;
    }

    const tempParsed = temperaturaC.trim() ? parseFiniteNumber(temperaturaC) : null;
    if (temperaturaC.trim() && tempParsed === null) {
      createToast('La temperatura de recepción debe ser un número válido', 'error');
      return;
    }

    setGuardando(true);
    try {
      await onRegistrarLote({
        insumoId: insumoSeleccionado.id,
        cantidad: cantParsed as number,
        costoTotal: costoParsed ?? 0,
        proveedor: proveedor.trim() || insumoSeleccionado.proveedor || 'Registro de Lote',
        codigoLote: codigoLote.trim() || undefined,
        fechaVencimiento: fechaFinal || null,
        ubicacionBodega,
        ...(tempParsed !== null ? { temperaturaRecepcionC: tempParsed } : {}),
        ...(registroSanitario.trim() ? { registroSanitario: registroSanitario.trim() } : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
        responsable: responsableDefault,
        soloTrazabilidadStockExistente: soloTrazabilidad,
      });

      createToast(
        soloTrazabilidad
          ? `Lote ${codigoLote} etiquetado para trazabilidad PEPS`
          : `Lote ${codigoLote} ingresado (+${cantParsed} ${unidad})`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar el lote';
      createToast(msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !guardando) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Registrar Lote y Vencimiento (PEPS / FIFO)
              </h2>
              <p className="text-xs text-neutral-400">
                Control de caducidad, cadena de frío y rotación sanitaria en bodega
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="grid h-11 w-11 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
            aria-label="Cerrar modal de registro de lote"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Insumo */}
          <div>
            <label
              htmlFor="lote-insumo-select"
              className="mb-1.5 block text-xs font-semibold text-neutral-300"
            >
              Insumo en Bodega
            </label>
            <select
              id="lote-insumo-select"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none"
              required
            >
              {insumos.length === 0 ? (
                <option value="">No hay insumos creados</option>
              ) : (
                insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} (Stock actual: {i.stockActual || 0} {i.unidad})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Código de Lote + Cantidad */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="lote-codigo-input"
                className="mb-1.5 block text-xs font-semibold text-neutral-300"
              >
                Código de Lote
              </label>
              <div className="flex gap-1.5">
                <input
                  id="lote-codigo-input"
                  type="text"
                  value={codigoLote}
                  onChange={(e) => setCodigoLote(e.target.value.toUpperCase())}
                  placeholder="LOT-20261123-A1B2"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm font-mono text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setCodigoLote(generarCodigoLote('LOT'))}
                  title="Generar código de lote automático"
                  aria-label="Regenerar código de lote"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-700 bg-neutral-900 text-gold-400 hover:bg-neutral-800"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <Input
              label={`Cantidad del Lote (${unidad})`}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Ej: 15"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>

          {/* Fecha de Vencimiento y Presets */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-gold-300">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Fecha de Vencimiento / Caducidad
              </span>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={sinCaducidad}
                  onChange={(e) => setSinCaducidad(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-gold-400 focus:ring-gold-400"
                />
                <span>Producto no perecedero</span>
              </label>
            </div>

            {!sinCaducidad && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS_DIAS_VENCIMIENTO.map((dias) => (
                    <button
                      key={dias}
                      type="button"
                      onClick={() => aplicarPresetDias(dias)}
                      className="min-h-[38px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 text-xs font-semibold text-neutral-200 hover:border-gold-400 hover:text-gold-300 transition-colors"
                    >
                      +{dias} días
                    </button>
                  ))}
                </div>
                <Input
                  label="Fecha límite de consumo"
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  required={!sinCaducidad}
                />
              </>
            )}
          </div>

          {/* Costo y Ubicación */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Costo Total del Lote COP (opcional)"
              type="number"
              min="0"
              placeholder="Ej: 150000"
              value={costoTotal}
              onChange={(e) => setCostoTotal(e.target.value)}
            />

            <div>
              <label
                htmlFor="lote-ubicacion-select"
                className="mb-1.5 block text-xs font-semibold text-neutral-300"
              >
                Ubicación en Bodega
              </label>
              <select
                id="lote-ubicacion-select"
                value={ubicacionBodega}
                onChange={(e) => setUbicacionBodega(e.target.value as UbicacionBodegaLote)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {UBICACIONES_BODEGA_LOTE_ORDEN.map((ub) => (
                  <option key={ub} value={ub}>
                    {UBICACIONES_BODEGA_LOTE_META[ub].label} (
                    {UBICACIONES_BODEGA_LOTE_META[ub].rangoTempSugerido})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {costoUnitarioEstimado > 0 && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 flex items-center justify-between">
              <span>Costo unitario de referencia:</span>
              <strong className="font-mono">{formatCOP(costoUnitarioEstimado)} / {unidad}</strong>
            </div>
          )}

          {/* Cadena de frío y registro sanitario */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label
                htmlFor="lote-temp-input"
                className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-neutral-300"
              >
                <Thermometer className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                Temp. °C (opc.)
              </label>
              <input
                id="lote-temp-input"
                type="number"
                step="0.1"
                placeholder="Ej: 3.5"
                value={temperaturaC}
                onChange={(e) => setTemperaturaC(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-sm text-white placeholder:text-neutral-500 focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-1">
              <Input
                label="Reg. Sanitario (opc.)"
                placeholder="INVIMA / RSA..."
                value={registroSanitario}
                onChange={(e) => setRegistroSanitario(e.target.value)}
              />
            </div>

            <div className="sm:col-span-1">
              <Input
                label="Proveedor / Factura"
                placeholder="Distribuidor..."
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
              />
            </div>
          </div>

          <Input
            label="Notas sanitarias o de recepción (opcional)"
            placeholder="Empaque sellado al vacío, lote refrigerado..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

          {/* Opción para etiquetar stock preexistente sin duplicar existencias */}
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs select-none">
            <input
              type="checkbox"
              checked={soloTrazabilidad}
              onChange={(e) => setSoloTrazabilidad(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-gold-400 focus:ring-gold-400"
            />
            <div>
              <span className="font-semibold text-white">
                Solo etiquetar stock existente en bodega (no sumar existencias nuevas)
              </span>
              <span className="mt-0.5 block text-[11px] text-neutral-400">
                Útil cuando el insumo ya tenía saldo en el sistema y solo necesitas asignarle lote y vencimiento PEPS.
              </span>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-800 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando || !insumoSeleccionado}
              className="min-h-[44px] px-5 gap-2"
            >
              <Package className="h-4 w-4" aria-hidden="true" />
              <span>Guardar Lote PEPS</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
