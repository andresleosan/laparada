import { useMemo, useState } from 'react';
import { Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import type { Insumo, InsumoReceta, MovimientoKardex } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { parseFiniteNumber } from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularCostoRecetaEmpaque,
  esInsumoEmpaque,
  filtrarInsumosEmpaque,
  resolverCostoUnitarioInsumo,
} from '@/utils/empaquesUtils';
import { calcularCostosUnitariosRecientes } from '@/utils/kardexInventarioUtils';

export interface RecetaEmpaqueEditorProps {
  recetaEmpaque: InsumoReceta[];
  onChange: (nuevaReceta: InsumoReceta[]) => void;
  insumos: Insumo[];
  disabled?: boolean;
  movimientosKardex?: MovimientoKardex[];
}

export function RecetaEmpaqueEditor({
  recetaEmpaque,
  onChange,
  insumos,
  disabled = false,
  movimientosKardex = [],
}: RecetaEmpaqueEditorProps) {
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadStr, setCantidadStr] = useState('1');
  const [errorInput, setErrorInput] = useState<string | null>(null);

  const empaquesDisponibles = useMemo(() => filtrarInsumosEmpaque(insumos), [insumos]);
  const otrosInsumos = useMemo(
    () => insumos.filter((ins) => !esInsumoEmpaque(ins) && !ins.esSubReceta),
    [insumos]
  );

  const selectedInsumo = useMemo(
    () => insumos.find((ins) => ins.id === selectedInsumoId),
    [insumos, selectedInsumoId]
  );

  const costosKardex = useMemo(
    () => (movimientosKardex.length > 0 ? calcularCostosUnitariosRecientes(movimientosKardex) : {}),
    [movimientosKardex]
  );

  const insumosMap = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos]);

  const costoEmpaqueUnitarioCOP = useMemo(
    () => calcularCostoRecetaEmpaque(recetaEmpaque, insumos, movimientosKardex),
    [recetaEmpaque, insumos, movimientosKardex]
  );

  const handleAddEmpaque = () => {
    if (!selectedInsumo) {
      setErrorInput('Selecciona un empaque o desechable de bodega');
      return;
    }

    const cantidad = parseFiniteNumber(cantidadStr);
    if (cantidad === null || cantidad <= 0) {
      setErrorInput('La cantidad debe ser mayor a 0 (ej: 1 o 2)');
      return;
    }

    const yaExiste = recetaEmpaque.some((r) => r.insumoId === selectedInsumo.id);
    if (yaExiste) {
      const actualizada = recetaEmpaque.map((r) =>
        r.insumoId === selectedInsumo.id
          ? { ...r, cantidad: Number((r.cantidad + cantidad).toFixed(4)) }
          : r
      );
      onChange(actualizada);
    } else {
      onChange([
        ...recetaEmpaque,
        {
          insumoId: selectedInsumo.id,
          nombreSnapshot: selectedInsumo.nombre,
          cantidad: Number(cantidad.toFixed(4)),
          unidadSnapshot: selectedInsumo.unidad,
        },
      ]);
    }

    setSelectedInsumoId('');
    setCantidadStr('1');
    setErrorInput(null);
  };

  const handleRemove = (insumoId: string) => {
    onChange(recetaEmpaque.filter((r) => r.insumoId !== insumoId));
  };

  const handleCantidadChange = (insumoId: string, valStr: string) => {
    const val = parseFiniteNumber(valStr);
    if (val === null || val <= 0) return;
    onChange(
      recetaEmpaque.map((r) =>
        r.insumoId === insumoId ? { ...r, cantidad: Number(val.toFixed(4)) } : r
      )
    );
  };

  return (
    <div className="rounded-xl border border-teal-500/30 bg-neutral-950/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-teal-400" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-bold text-white">
              Empaques, Bolsas y Desechables (Para Llevar / Domicilio)
            </h4>
            <p className="text-[11px] text-neutral-400">
              Se descuentan automáticamente de bodega solo cuando el pedido no es en salón.
            </p>
          </div>
        </div>
        {costoEmpaqueUnitarioCOP > 0 && (
          <span className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-2.5 py-1 text-xs font-bold text-teal-300">
            Costo Empaque: {formatCOP(costoEmpaqueUnitarioCOP)} / ud
          </span>
        )}
      </div>

      {insumos.length === 0 ? (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-400">
          No tienes empaques ni insumos en bodega. Regístralos en <span className="text-teal-300 font-semibold">/inventario</span> marcando &quot;Es Empaque&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
          <div className="sm:col-span-7">
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Empaque / Desechable de Bodega
            </label>
            <select
              value={selectedInsumoId}
              onChange={(e) => {
                setSelectedInsumoId(e.target.value);
                setErrorInput(null);
              }}
              disabled={disabled}
              aria-label="Seleccionar empaque o desechable"
              className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-teal-400 focus:outline-none"
            >
              <option value="">Seleccionar empaque o bolsa...</option>
              {empaquesDisponibles.length > 0 && (
                <optgroup label="Empaques y Desechables">
                  {empaquesDisponibles.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nombre} ({ins.stockActual} {ins.unidad})
                      {ins.costoUnitario ? ` · ${formatCOP(ins.costoUnitario)}` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
              {otrosInsumos.length > 0 && (
                <optgroup label="Otros Insumos de Bodega">
                  {otrosInsumos.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nombre} ({ins.stockActual} {ins.unidad})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="sm:col-span-3">
            <Input
              label={`Cant.${selectedInsumo ? ` (${selectedInsumo.unidad})` : ''}`}
              type="number"
              min="0.01"
              step="any"
              value={cantidadStr}
              onChange={(e) => {
                setCantidadStr(e.target.value);
                setErrorInput(null);
              }}
              disabled={disabled}
              placeholder="1"
            />
          </div>

          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddEmpaque}
              disabled={disabled || !selectedInsumoId}
              aria-label="Agregar empaque a la receta"
              className="w-full min-h-[44px] border-teal-500/40 bg-teal-500/10 text-teal-300 hover:bg-teal-500/20"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {errorInput && <p className="text-xs text-red-400">{errorInput}</p>}

      {recetaEmpaque.length > 0 && (
        <div className="space-y-2 pt-1">
          {recetaEmpaque.map((item) => {
            const ins = insumosMap.get(item.insumoId);
            const costoUnit = resolverCostoUnitarioInsumo(item.insumoId, insumosMap, costosKardex);
            const subtotal = Math.round(costoUnit * item.cantidad);
            return (
              <div
                key={item.insumoId}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="h-3.5 w-3.5 text-teal-400 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="font-semibold text-white truncate block">
                      {ins?.nombre || item.nombreSnapshot}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Stock: {ins ? `${ins.stockActual} ${ins.unidad}` : 'N/A'}
                      {subtotal > 0 ? ` · Costo: ${formatCOP(subtotal)}` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.cantidad}
                    onChange={(e) => handleCantidadChange(item.insumoId, e.target.value)}
                    disabled={disabled}
                    aria-label={`Cantidad de ${item.nombreSnapshot}`}
                    className="w-16 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-right text-xs text-white focus:border-teal-400 focus:outline-none"
                  />
                  <span className="text-neutral-400 text-[11px]">
                    {item.unidadSnapshot || ins?.unidad || 'ud'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.insumoId)}
                    disabled={disabled}
                    aria-label={`Quitar empaque ${item.nombreSnapshot}`}
                    className="rounded p-1.5 text-neutral-400 hover:bg-red-500/15 hover:text-red-400 min-h-[36px] min-w-[36px] flex items-center justify-center"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
