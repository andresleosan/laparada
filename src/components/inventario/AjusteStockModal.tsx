// src/components/inventario/AjusteStockModal.tsx
import React, { useState, useEffect, useId } from 'react';
import type { Insumo, MotivoAjusteInventario, MotivoMerma } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { MOTIVOS_MERMA, MOTIVOS_AJUSTE } from '@/utils/kardexInventarioUtils';
import { formatCOP } from '@/utils/formatCOP';
import {
  parseFiniteNumber,
  validateNonNegativeAmount,
  validatePositiveAmount,
  validateStockReduction,
} from '@/utils/adminInputValidation';
import {
  Plus,
  Minus,
  AlertTriangle,
  SlidersHorizontal,
  Package,
  X,
} from 'lucide-react';

export type ModoAjuste = 'entrada' | 'salida' | 'merma' | 'ajuste';

export interface AjusteStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumo: Insumo | null;
  modoInicial?: ModoAjuste;
  insumosDisponibles?: Insumo[];
  onEjecutarEntrada: (
    insumoId: string,
    cantidad: number,
    costo: number,
    proveedor?: string,
    notas?: string,
    responsable?: string
  ) => Promise<unknown>;
  onEjecutarSalida: (
    insumoId: string,
    cantidad: number,
    notas?: string,
    responsable?: string
  ) => Promise<unknown>;
  onEjecutarMerma: (
    insumoId: string,
    cantidad: number,
    motivo: MotivoMerma | string,
    notas?: string,
    responsable?: string
  ) => Promise<unknown>;
  onEjecutarAjuste: (
    insumoId: string,
    nuevoStockFisico: number,
    motivo: MotivoAjusteInventario | string,
    notas?: string,
    responsable?: string
  ) => Promise<unknown>;
  onSuccess?: () => void;
}

export function AjusteStockModal({
  isOpen,
  onClose,
  insumo,
  modoInicial = 'entrada',
  insumosDisponibles = [],
  onEjecutarEntrada,
  onEjecutarSalida,
  onEjecutarMerma,
  onEjecutarAjuste,
  onSuccess,
}: AjusteStockModalProps) {
  const generatedId = useId();
  const titleId = `ajuste-stock-modal-title-${generatedId.replace(/:/g, '')}`;

  let responsable = 'Administrador';
  try {
    const authCtx = useAuth();
    responsable = authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro si se renderiza en pruebas unitarias sin AuthProvider
  }

  const [insumoSeleccionadoId, setInsumoSeleccionadoId] = useState<string>('');
  const [modo, setModo] = useState<ModoAjuste>(modoInicial);
  const [cantidad, setCantidad] = useState('');
  const [costo, setCosto] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [motivoMerma, setMotivoMerma] = useState<MotivoMerma>('vencimiento');
  const [motivoAjuste, setMotivoAjuste] = useState<MotivoAjusteInventario>('conteo_fisico');
  const [nuevoStockFisico, setNuevoStockFisico] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Insumo activo
  const insumoActivo = insumo
    ? insumo
    : insumosDisponibles.find((i) => i.id === insumoSeleccionadoId) || insumosDisponibles[0] || null;

  useEffect(() => {
    if (isOpen) {
      setModo(modoInicial);
      setCantidad('');
      setCosto('');
      setProveedor('');
      setNotas('');
      setMotivoMerma('vencimiento');
      setMotivoAjuste('conteo_fisico');
      if (insumo) {
        setInsumoSeleccionadoId(insumo.id);
        setNuevoStockFisico(String(insumo.stockActual || 0));
      } else if (insumosDisponibles.length > 0) {
        setInsumoSeleccionadoId(insumosDisponibles[0].id);
        setNuevoStockFisico(String(insumosDisponibles[0].stockActual || 0));
      }
    }
  }, [isOpen, insumo, modoInicial, insumosDisponibles]);

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

  const stockActual = typeof insumoActivo?.stockActual === 'number' ? insumoActivo.stockActual : 0;
  const unidad = insumoActivo?.unidad || 'unidades';

  // Diferencia estimada para el modo ajuste
  const stockFisicoNum = parseFloat(nuevoStockFisico);
  const diferenciaAjuste = Number.isFinite(stockFisicoNum) ? Number((stockFisicoNum - stockActual).toFixed(2)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insumoActivo) {
      createToast('Debes seleccionar un insumo', 'error');
      return;
    }

    setGuardando(true);
    try {
      if (modo === 'entrada') {
        const errorCant = validatePositiveAmount(cantidad);
        const errorCosto = costo.trim() ? validateNonNegativeAmount(costo) : undefined;
        if (errorCant || errorCosto) {
          createToast(errorCant || errorCosto || 'Revisa los valores', 'error');
          setGuardando(false);
          return;
        }

        const cantNum = parseFiniteNumber(cantidad) as number;
        const costoNum = costo.trim() ? (parseFiniteNumber(costo) as number) : 0;

        await onEjecutarEntrada(
          insumoActivo.id,
          cantNum,
          costoNum,
          proveedor.trim() || 'Compra / Abastecimiento',
          notas.trim(),
          responsable
        );
        createToast(`Entrada registrada: +${cantNum} ${unidad} en ${insumoActivo.nombre}`, 'success');
      } else if (modo === 'salida') {
        const errorRed = validateStockReduction(cantidad, stockActual, unidad);
        if (errorRed) {
          createToast(errorRed, 'error');
          setGuardando(false);
          return;
        }

        const cantNum = parseFiniteNumber(cantidad) as number;
        await onEjecutarSalida(insumoActivo.id, cantNum, notas.trim(), responsable);
        createToast(`Salida registrada: -${cantNum} ${unidad} en ${insumoActivo.nombre}`, 'success');
      } else if (modo === 'merma') {
        const errorRed = validateStockReduction(cantidad, stockActual, unidad);
        if (errorRed) {
          createToast(errorRed, 'error');
          setGuardando(false);
          return;
        }

        const cantNum = parseFiniteNumber(cantidad) as number;
        await onEjecutarMerma(insumoActivo.id, cantNum, motivoMerma, notas.trim(), responsable);
        createToast(`Merma registrada: -${cantNum} ${unidad} (${motivoMerma})`, 'success');
      } else if (modo === 'ajuste') {
        const errorStock = validateNonNegativeAmount(nuevoStockFisico);
        if (errorStock) {
          createToast(errorStock, 'error');
          setGuardando(false);
          return;
        }

        const stockFinal = parseFiniteNumber(nuevoStockFisico) as number;
        await onEjecutarAjuste(insumoActivo.id, stockFinal, motivoAjuste, notas.trim(), responsable);
        createToast(
          `Ajuste guardado: ${insumoActivo.nombre} fijado en ${stockFinal} ${unidad} (dif: ${diferenciaAjuste >= 0 ? '+' : ''}${diferenciaAjuste})`,
          'success'
        );
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar movimiento';
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
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-400/10 text-gold-400 border border-gold-400/20">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Movimiento de Inventario
              </h2>
              <p className="text-xs text-neutral-400">
                Entradas, salidas, mermas o ajuste físico auditado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="grid h-10 w-10 place-items-center rounded-full border border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Selector de Insumo (si no vino predefinido) */}
          {!insumo && insumosDisponibles.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                Seleccionar Insumo
              </label>
              <div className="relative">
                <select
                  value={insumoSeleccionadoId}
                  onChange={(e) => {
                    setInsumoSeleccionadoId(e.target.value);
                    const ins = insumosDisponibles.find((i) => i.id === e.target.value);
                    if (ins) setNuevoStockFisico(String(ins.stockActual || 0));
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                >
                  {insumosDisponibles.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nombre} (Stock: {i.stockActual || 0} {i.unidad})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Ficha rápida del insumo seleccionado */}
          {insumoActivo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-900/90 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gold-400 shrink-0" aria-hidden="true" />
                <div>
                  <span className="font-semibold text-white text-sm">{insumoActivo.nombre}</span>
                  <span className="ml-2 text-neutral-400">({insumoActivo.unidad})</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-neutral-400">
                  Stock actual: <strong className="text-white text-sm">{stockActual}</strong> {unidad}
                </span>
                <span className="text-neutral-500">· Mínimo: {insumoActivo.stockMinimo} {unidad}</span>
              </div>
            </div>
          )}

          {/* Pestañas de Modo con Touch Targets >= 44px */}
          <div
            role="tablist"
            aria-label="Tipo de operación de inventario"
            className="grid grid-cols-2 gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-1 sm:grid-cols-4"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'entrada'}
              onClick={() => setModo('entrada')}
              className={`min-h-[44px] rounded-lg px-2.5 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                modo === 'entrada'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Plus className="h-4 w-4" /> Entrada
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={modo === 'salida'}
              onClick={() => setModo('salida')}
              className={`min-h-[44px] rounded-lg px-2.5 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                modo === 'salida'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Minus className="h-4 w-4" /> Salida
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={modo === 'merma'}
              onClick={() => setModo('merma')}
              className={`min-h-[44px] rounded-lg px-2.5 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                modo === 'merma'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <AlertTriangle className="h-4 w-4" /> Merma
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={modo === 'ajuste'}
              onClick={() => setModo('ajuste')}
              className={`min-h-[44px] rounded-lg px-2.5 py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                modo === 'ajuste'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" /> Conteo
            </button>
          </div>

          {/* Formulario según modo */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {modo === 'entrada' && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label={`Cantidad a agregar (${unidad})`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ej: 50"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    autoFocus
                    required
                  />
                  <Input
                    label="Costo total compra COP (opcional)"
                    type="number"
                    min="0"
                    placeholder="Ej: 120000"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                  />
                </div>

                {costo.trim() && parseFloat(cantidad) > 0 && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300">
                    Costo unitario calculado: <strong>{formatCOP(Math.round(parseFloat(costo) / parseFloat(cantidad)))}</strong> / {unidad}
                  </div>
                )}

                <Input
                  label="Proveedor / Factura (opcional)"
                  placeholder="Ej: Distribuidora San José / Fac #4821"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                />
              </>
            )}

            {modo === 'salida' && (
              <>
                <Input
                  label={`Cantidad a restar (${unidad})`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={stockActual}
                  placeholder="Ej: 5"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-xs text-neutral-400">
                  Máximo disponible: {stockActual} {unidad}
                </p>
              </>
            )}

            {modo === 'merma' && (
              <>
                <Input
                  label={`Cantidad de merma / desperdicio (${unidad})`}
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={stockActual}
                  placeholder="Ej: 3"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  autoFocus
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Motivo de la Merma
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {MOTIVOS_MERMA.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMotivoMerma(m.id)}
                        className={`min-h-[44px] rounded-xl border p-2.5 text-left text-xs transition-all ${
                          motivoMerma === m.id
                            ? 'border-red-500 bg-red-500/15 text-white font-semibold'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <div className="font-medium text-white">{m.label}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{m.descripcion}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {modo === 'ajuste' && (
              <>
                <Input
                  label={`Stock Físico Real Contado (${unidad})`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 48"
                  value={nuevoStockFisico}
                  onChange={(e) => setNuevoStockFisico(e.target.value)}
                  autoFocus
                  required
                />

                <div
                  className={`rounded-xl border p-3 text-xs ${
                    diferenciaAjuste === 0
                      ? 'border-neutral-800 bg-neutral-900 text-neutral-300'
                      : diferenciaAjuste > 0
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/30 bg-red-500/10 text-red-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>Diferencia resultante:</span>
                    <strong className="text-sm font-display">
                      {diferenciaAjuste > 0 ? `+${diferenciaAjuste}` : diferenciaAjuste} {unidad}
                    </strong>
                  </div>
                  <div className="mt-1 text-[11px] opacity-80">
                    {diferenciaAjuste > 0
                      ? 'Ajuste positivo: Había más insumo físico que en el sistema'
                      : diferenciaAjuste < 0
                      ? 'Ajuste negativo: Faltante detectado en conteo físico'
                      : 'El conteo coincide con el sistema (sin variación)'}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-1">
                    Motivo del Ajuste
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {MOTIVOS_AJUSTE.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMotivoAjuste(m.id)}
                        className={`min-h-[44px] rounded-xl border p-2.5 text-left text-xs transition-all ${
                          motivoAjuste === m.id
                            ? 'border-amber-500 bg-amber-500/15 text-white font-semibold'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                        }`}
                      >
                        <div className="font-medium text-white">{m.label}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{m.descripcion}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notas libres opcionales para cualquier modo */}
            <Input
              label="Notas / Justificación interna (opcional)"
              placeholder="Observaciones de cocina o bodega..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
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
                disabled={guardando || !insumoActivo}
                className="min-h-[44px] px-5"
              >
                {modo === 'entrada' && 'Registrar Entrada'}
                {modo === 'salida' && 'Registrar Salida'}
                {modo === 'merma' && 'Confirmar Merma'}
                {modo === 'ajuste' && 'Guardar Ajuste Físico'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
