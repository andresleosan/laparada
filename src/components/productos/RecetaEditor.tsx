import { useMemo, useState } from 'react';
import { AlertCircle, ChefHat, Package, Plus, Trash2 } from 'lucide-react';
import type { Insumo, InsumoReceta } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { parseFiniteNumber } from '@/utils/adminInputValidation';
import { evaluarEstadoStockProducto } from '@/utils/recetasEscandallo';

export interface RecetaEditorProps {
  receta: InsumoReceta[];
  onChange: (nuevaReceta: InsumoReceta[]) => void;
  insumos: Insumo[];
  disabled?: boolean;
}

export function RecetaEditor({
  receta,
  onChange,
  insumos,
  disabled = false,
}: RecetaEditorProps) {
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadStr, setCantidadStr] = useState('1');
  const [errorInput, setErrorInput] = useState<string | null>(null);

  const selectedInsumo = useMemo(
    () => insumos.find((ins) => ins.id === selectedInsumoId),
    [insumos, selectedInsumoId]
  );

  const alertaStock = useMemo(
    () => evaluarEstadoStockProducto(receta, insumos),
    [receta, insumos]
  );

  const handleAddInsumo = () => {
    if (!selectedInsumo) {
      setErrorInput('Selecciona un insumo del inventario');
      return;
    }

    const cantidad = parseFiniteNumber(cantidadStr);
    if (cantidad === null || cantidad <= 0) {
      setErrorInput('La cantidad debe ser mayor a 0 (ej: 1, 0.5 o 0.05)');
      return;
    }

    const yaExiste = receta.some((r) => r.insumoId === selectedInsumo.id);
    if (yaExiste) {
      // Si ya existe, actualizamos su cantidad sumando
      const actualizada = receta.map((r) =>
        r.insumoId === selectedInsumo.id
          ? { ...r, cantidad: Number((r.cantidad + cantidad).toFixed(4)) }
          : r
      );
      onChange(actualizada);
    } else {
      const nuevo: InsumoReceta = {
        insumoId: selectedInsumo.id,
        nombreSnapshot: selectedInsumo.nombre,
        cantidad: Number(cantidad.toFixed(4)),
        unidadSnapshot: selectedInsumo.unidad || 'unidades',
      };
      onChange([...receta, nuevo]);
    }

    setSelectedInsumoId('');
    setCantidadStr('1');
    setErrorInput(null);
  };

  const handleRemoveInsumo = (insumoId: string) => {
    onChange(receta.filter((r) => r.insumoId !== insumoId));
  };

  return (
    <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-[#C9A84C]" aria-hidden="true" />
          <h4 className="text-sm font-bold text-neutral-200">
            Escandallo / Receta de Insumos
          </h4>
        </div>
        {receta.length > 0 && typeof alertaStock.porcionesDisponibles === 'number' && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              alertaStock.estado === 'agotado'
                ? 'bg-red-950/60 text-red-400 border border-red-800/60'
                : alertaStock.estado === 'bajo_stock'
                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
            }`}
          >
            {alertaStock.estado === 'agotado' && 'Agotado'}
            {alertaStock.estado === 'bajo_stock' && 'Stock Bajo'}
            {alertaStock.estado === 'disponible' && 'Stock OK'}: {alertaStock.porcionesDisponibles} porciones
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-400 leading-relaxed">
        Define los insumos que se consumen automáticamente al vender cada porción de este producto.
      </p>

      {/* Selector de nuevo insumo */}
      <div className="space-y-3 rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <label
              htmlFor="select-insumo-receta"
              className="block text-xs font-medium text-neutral-300 mb-1"
            >
              Insumo del Inventario
            </label>
            <select
              id="select-insumo-receta"
              value={selectedInsumoId}
              onChange={(e) => {
                setSelectedInsumoId(e.target.value);
                setErrorInput(null);
              }}
              disabled={disabled || insumos.length === 0}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-[#C9A84C] focus:outline-none focus:ring-1 focus:ring-[#C9A84C] disabled:opacity-50"
            >
              <option value="">
                {insumos.length === 0 ? 'Sin insumos en inventario' : '-- Seleccionar insumo --'}
              </option>
              {insumos.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.nombre} ({ins.stockActual} {ins.unidad})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <Input
              label={`Cantidad (${selectedInsumo?.unidad || 'unidad'})`}
              type="number"
              step="any"
              min="0.001"
              value={cantidadStr}
              onChange={(e) => {
                setCantidadStr(e.target.value);
                setErrorInput(null);
              }}
              disabled={disabled || !selectedInsumoId}
              placeholder="Ej: 0.05"
            />
          </div>

          <div className="flex items-end sm:col-span-2">
            <Button
              type="button"
              onClick={handleAddInsumo}
              disabled={disabled || !selectedInsumoId}
              variant="secondary"
              className="w-full min-h-[44px] border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10"
              aria-label="Agregar insumo a la receta"
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              <span>Añadir</span>
            </Button>
          </div>
        </div>

        {selectedInsumo && (
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Package className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
            <span>
              Disponible: <strong className="text-neutral-200">{selectedInsumo.stockActual} {selectedInsumo.unidad}</strong> (mínimo alerta: {selectedInsumo.stockMinimo})
            </span>
          </div>
        )}

        {errorInput && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{errorInput}</span>
          </div>
        )}
      </div>

      {/* Lista de insumos en la receta */}
      {receta.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-800 p-3 text-center text-xs text-neutral-500">
          No hay insumos asignados a este producto. La venta no deducirá inventario.
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Insumos requeridos por porción ({receta.length}):
          </label>
          <ul className="divide-y divide-neutral-800/80 rounded-lg border border-neutral-800 bg-neutral-900/40">
            {receta.map((item) => {
              const liveInsumo = insumos.find((ins) => ins.id === item.insumoId);
              const stock = liveInsumo?.stockActual ?? 0;
              const unidad = liveInsumo?.unidad || item.unidadSnapshot || '';
              const agotado = stock <= 0;
              const bajoStock = stock <= (liveInsumo?.stockMinimo ?? 0);

              return (
                <li
                  key={item.insumoId}
                  className="flex items-center justify-between px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        agotado
                          ? 'bg-red-500 ring-2 ring-red-950'
                          : bajoStock
                          ? 'bg-amber-500 ring-2 ring-amber-950'
                          : 'bg-emerald-500'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-neutral-200">{item.nombreSnapshot}</p>
                      <p className="text-xs text-neutral-400">
                        Consume: <strong className="text-neutral-200">{item.cantidad} {unidad}</strong> · En bodega: {stock} {unidad}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveInsumo(item.insumoId)}
                    disabled={disabled}
                    className="min-h-[44px] min-w-[44px] text-neutral-400 hover:text-red-400"
                    aria-label={`Eliminar insumo ${item.nombreSnapshot} de la receta`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

