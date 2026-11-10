import React, { useState, useMemo } from 'react';
import { X, Calculator, CheckSquare } from 'lucide-react';
import type { TandaVitrina, ResumenTanda } from '@/types/tanda';
import { formatCOP } from '@/utils/formatCOP';
import { calcularTotalesItem } from '@/utils/tandaUtils';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

interface ModalCierreTandaProps {
  isOpen: boolean;
  onClose: () => void;
  tanda: TandaVitrina;
  onConfirmar: (sobrantesMap: Record<string, number>, notasCierre?: string) => Promise<ResumenTanda>;
}

export function ModalCierreTanda({
  isOpen,
  onClose,
  tanda,
  onConfirmar,
}: ModalCierreTandaProps) {
  const [sobrantesMap, setSobrantesMap] = useState<Record<string, number>>({});
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const handleSobranteChange = (productoId: string, valor: number) => {
    const val = Math.max(0, Math.floor(valor));
    setSobrantesMap((prev) => ({
      ...prev,
      [productoId]: val,
    }));
  };

  // Cálculo en tiempo real de todos los productos
  const detalleCalculado = useMemo(() => {
    let totalVendidas = 0;
    let totalVentaCOP = 0;
    let totalPuestas = 0;
    let totalMermas = 0;
    let totalSobrantes = 0;

    const items = tanda.items.map((item) => {
      const sobrante = sobrantesMap[item.productoId] ?? 0;
      const calc = calcularTotalesItem({ ...item, sobrantes: sobrante });

      totalVendidas += calc.vendidos;
      totalVentaCOP += calc.subtotal;
      totalPuestas += calc.totalPuesto;
      totalMermas += calc.totalMermas;
      totalSobrantes += calc.sobrantes;

      return {
        ...item,
        calc,
        sobrante,
      };
    });

    const totalTransf = (tanda.transferencias || []).reduce((acc, t) => acc + (t.monto || 0), 0);
    const efectivoEsperado = Math.max(0, totalVentaCOP - totalTransf);

    return {
      items,
      totalVendidas,
      totalVentaCOP,
      totalPuestas,
      totalMermas,
      totalSobrantes,
      totalTransf,
      efectivoEsperado,
    };
  }, [tanda, sobrantesMap]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      setErrorLocal(null);
      await onConfirmar(sobrantesMap, notas.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cerrar la tanda';
      setErrorLocal(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-cierre-tanda-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Calculator className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="modal-cierre-tanda-title"
                className="font-display text-lg font-bold text-white"
              >
                Cierre de Tanda y Conteo de Sobrantes
              </h2>
              <p className="text-xs text-neutral-400">
                Anota lo que quedó en vitrina para calcular automáticamente las unidades vendidas y el dinero
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal"
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorLocal && (
          <div className="mt-2 rounded-lg bg-red-950/60 border border-red-800/80 p-2 text-xs text-red-200">
            {errorLocal}
          </div>
        )}

        {/* Lista de productos para ingresar conteo de vitrina */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {detalleCalculado.items.map((item) => {
            const { calc, sobrante } = item;
            return (
              <div
                key={item.productoId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white truncate">{item.nombre}</span>
                    <span className="text-xs text-neutral-400">({formatCOP(item.precioUnitario)})</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                    <span className="bg-neutral-800 px-2 py-0.5 rounded text-[11px]">
                      Inicial: <strong className="text-white">{item.cantidadInicial}</strong>
                    </span>
                    {calc.totalAdiciones > 0 && (
                      <span className="bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded text-[11px]">
                        +Recargas: <strong>{calc.totalAdiciones}</strong>
                      </span>
                    )}
                    {calc.totalMermas > 0 && (
                      <span className="bg-red-950/50 text-red-300 border border-red-800/50 px-2 py-0.5 rounded text-[11px]">
                        -Mermas: <strong>{calc.totalMermas}</strong>
                      </span>
                    )}
                    <span className="text-neutral-500 font-mono">
                      = Puesto neto: <strong className="text-neutral-200">{calc.totalPuesto - calc.totalMermas}</strong>
                    </span>
                  </div>
                </div>

                {/* Input de sobrantes y resultado de vendidos */}
                <div className="flex items-center gap-4 bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-2 sm:px-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-400 mb-0.5">
                      Sobraron en vitrina:
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={sobrante === 0 ? '' : sobrante}
                      onChange={(e) =>
                        handleSobranteChange(
                          item.productoId,
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      placeholder="0"
                      className="h-8 w-20 rounded-lg border border-neutral-700 bg-neutral-900 text-center text-sm font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="text-right min-w-[90px]">
                    <span className="block text-[11px] text-neutral-400 font-medium">
                      Vendidos: <strong className="text-emerald-400">{calc.vendidos}</strong>
                    </span>
                    <span className="block text-xs font-bold text-white">
                      {formatCOP(calc.subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen Financiero Consolidado */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-neutral-800 pt-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5">
            <span className="block text-[11px] text-neutral-400">Unidades Vendidas</span>
            <span className="font-display text-lg font-bold text-emerald-400">
              {detalleCalculado.totalVendidas} unds
            </span>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5">
            <span className="block text-[11px] text-neutral-400">Venta Bruta Vitrina</span>
            <span className="font-display text-lg font-bold text-white">
              {formatCOP(detalleCalculado.totalVentaCOP)}
            </span>
          </div>

          <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-2.5">
            <span className="block text-[11px] text-purple-300">(-) Transferencias</span>
            <span className="font-display text-lg font-bold text-purple-300">
              {formatCOP(detalleCalculado.totalTransf)}
            </span>
          </div>

          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5">
            <span className="block text-[11px] text-amber-300 font-medium">(=) Efectivo Esperado</span>
            <span className="font-display text-lg font-bold text-amber-400">
              {formatCOP(detalleCalculado.efectivoEsperado)}
            </span>
          </div>
        </div>

        {/* Notas u observaciones */}
        <div className="mt-3">
          <Textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observaciones de cierre de tanda (opcional)..."
            rows={2}
            className="text-xs"
          />
        </div>

        {/* Footer */}
        <div className="mt-3 flex justify-end gap-2 border-t border-neutral-800 pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={guardando}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={guardando}
            className="gap-1.5 bg-amber-500 font-bold text-neutral-950 hover:bg-amber-400 text-xs"
          >
            <CheckSquare className="h-4 w-4" />
            {guardando ? 'Finalizando...' : 'Confirmar y Cerrar Tanda'}
          </Button>
        </div>
      </div>
    </div>
  );
}
