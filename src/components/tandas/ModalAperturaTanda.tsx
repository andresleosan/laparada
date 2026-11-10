import React, { useState, useMemo } from 'react';
import { X, Search, Sparkles, Plus, Minus, Layers } from 'lucide-react';
import type { Producto } from '@/types';
import type { ItemInicialTandaInput } from '@/services/tandaVitrinaService';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ModalAperturaTandaProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmar: (items: ItemInicialTandaInput[], responsable?: string) => Promise<void>;
  productos: Producto[];
}

export function ModalAperturaTanda({
  isOpen,
  onClose,
  onConfirmar,
  productos,
}: ModalAperturaTandaProps) {
  const [busqueda, setBusqueda] = useState('');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [responsable, setResponsable] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const prodsDisponibles = productos.filter((p) => p.disponible);
    if (!q) return prodsDisponibles;
    return prodsDisponibles.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        (p.categoria && p.categoria.toLowerCase().includes(q))
    );
  }, [productos, busqueda]);

  const handleCantidadChange = (productoId: string, valor: number) => {
    const normalizado = Math.max(0, Math.floor(valor));
    setCantidades((prev) => ({
      ...prev,
      [productoId]: normalizado,
    }));
  };

  const incrementar = (productoId: string, delta: number) => {
    const actual = cantidades[productoId] || 0;
    handleCantidadChange(productoId, actual + delta);
  };

  const itemsSeleccionados = useMemo(() => {
    const resultado: ItemInicialTandaInput[] = [];
    for (const prod of productos) {
      const cant = cantidades[prod.id] || 0;
      if (cant > 0) {
        resultado.push({
          productoId: prod.id,
          nombre: prod.nombre,
          precioUnitario: prod.precio,
          categoria: prod.categoria,
          imagenUrl: prod.imagenUrl,
          cantidadInicial: cant,
        });
      }
    }
    return resultado;
  }, [productos, cantidades]);

  const totalUnidades = itemsSeleccionados.reduce((acc, it) => acc + it.cantidadInicial, 0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itemsSeleccionados.length === 0) {
      setErrorLocal('Selecciona al menos un producto con cantidad mayor a cero.');
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      await onConfirmar(itemsSeleccionados, responsable.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al abrir la tanda';
      setErrorLocal(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-apertura-tanda-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="modal-apertura-tanda-title"
                className="font-display text-lg font-bold text-white"
              >
                Abrir Tanda de Productos (Vitrina)
              </h2>
              <p className="text-xs text-neutral-400">
                Define el stock inicial de fritos u horneados con los que arrancas el turno
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

        {/* Buscador y responsable */}
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto por nombre o categoría..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="w-full sm:w-56">
            <Input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Responsable (opcional)"
              className="h-10 text-sm"
            />
          </div>
        </div>

        {errorLocal && (
          <div className="mt-2 rounded-lg bg-red-950/60 border border-red-800/80 p-2 text-xs text-red-200">
            {errorLocal}
          </div>
        )}

        {/* Lista de productos con inputs de cantidad */}
        <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
          {productosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              No se encontraron productos disponibles en el menú.
            </div>
          ) : (
            productosFiltrados.map((prod) => {
              const cant = cantidades[prod.id] || 0;
              const tieneCantidad = cant > 0;

              return (
                <div
                  key={prod.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors ${
                    tieneCantidad
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-neutral-800/80 bg-neutral-900/40 hover:bg-neutral-900/80'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{prod.nombre}</p>
                    <p className="text-xs text-amber-400/90 font-medium">{formatCOP(prod.precio)}</p>
                  </div>

                  {/* Botones de incremento rápido e input */}
                  <div className="flex items-center gap-1.5">
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => incrementar(prod.id, 10)}
                        className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
                        title="Sumar 10 unidades"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => incrementar(prod.id, 25)}
                        className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
                        title="Sumar 25 unidades"
                      >
                        +25
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => incrementar(prod.id, -1)}
                      disabled={cant === 0}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="number"
                      min={0}
                      value={cant === 0 ? '' : cant}
                      onChange={(e) =>
                        handleCantidadChange(prod.id, parseInt(e.target.value, 10) || 0)
                      }
                      placeholder="0"
                      className="h-8 w-14 rounded-lg border border-neutral-700 bg-neutral-900 text-center text-sm font-bold text-white focus:border-amber-500 focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => incrementar(prod.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-neutral-950 font-bold hover:bg-amber-400"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer con resumen y confirmación */}
        <div className="mt-4 flex flex-col gap-3 border-t border-neutral-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-neutral-400">
            <span className="font-bold text-amber-400">{itemsSeleccionados.length}</span> productos
            seleccionados •{' '}
            <span className="font-bold text-white">{totalUnidades} unidades</span> en tanda inicial
          </div>

          <div className="flex gap-2">
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
              disabled={guardando || itemsSeleccionados.length === 0}
              className="gap-1.5 bg-amber-500 font-bold text-neutral-950 hover:bg-amber-400 text-xs"
            >
              <Sparkles className="h-4 w-4" />
              {guardando ? 'Iniciando...' : 'Iniciar Tanda de Vitrina'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
