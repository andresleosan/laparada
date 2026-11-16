import { useState, useEffect, useId, type FormEvent } from 'react';
import {
  X,
  ShoppingCart,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  Save,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  Proveedor,
  ItemOrdenCompra,
  CrearOrdenCompraInput,
  SugerenciaReabastecimiento,
} from '@/types/proveedor';
import type { Insumo } from '@/types';
import {
  convertirSugerenciasAItemsOrden,
  calcularTotalesOrdenCompra,
  generarMensajeWhatsAppOrdenCompra,
  construirUrlWhatsAppOrdenCompra,
} from '@/utils/ordenesCompraYConteoUtils';
import { formatCOP } from '@/utils/formatCOP';

interface NuevaOrdenCompraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<CrearOrdenCompraInput, 'negocioId'>) => Promise<string>;
  proveedores: Proveedor[];
  insumos: Insumo[];
  sugerencias: SugerenciaReabastecimiento[];
  numeroOrdenSugerido: string;
  proveedorPreseleccionado?: Proveedor | null;
  itemsPreseleccionados?: ItemOrdenCompra[] | null;
  nombreNegocio?: string;
}

export function NuevaOrdenCompraModal({
  isOpen,
  onClose,
  onSubmit,
  proveedores,
  insumos,
  sugerencias,
  numeroOrdenSugerido,
  proveedorPreseleccionado,
  itemsPreseleccionados,
  nombreNegocio = 'La Parada',
}: NuevaOrdenCompraModalProps) {
  const generatedId = useId();
  const titleId = `modal-nueva-orden-${generatedId.replace(/:/g, '')}-title`;

  const [proveedorId, setProveedorId] = useState('');
  const [numeroOrden, setNumeroOrden] = useState(numeroOrdenSugerido);
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemOrdenCompra[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    setNumeroOrden(numeroOrdenSugerido);
    setNotas('');

    const provInicial =
      proveedorPreseleccionado ||
      proveedores[0] ||
      null;
    setProveedorId(provInicial?.id || '');

    if (itemsPreseleccionados && itemsPreseleccionados.length > 0) {
      setItems(itemsPreseleccionados);
      return;
    }

    if (provInicial) {
      const sugDelProv = sugerencias.filter(
        (s) => s.proveedorSugeridoId === provInicial.id
      );
      if (sugDelProv.length > 0) {
        setItems(convertirSugerenciasAItemsOrden(sugDelProv));
        return;
      }
    }

    if (sugerencias.length > 0) {
      setItems(convertirSugerenciasAItemsOrden(sugerencias.slice(0, 5)));
    } else if (insumos.length > 0) {
      const primero = insumos[0];
      const costoRef = Math.max(0, Math.round(primero.costoUnitario || 0));
      setItems([
        {
          insumoId: primero.id,
          insumoNombre: primero.nombre,
          unidad: primero.unidad || 'unidades',
          stockActualSnapshot: primero.stockActual || 0,
          stockMinimoSnapshot: primero.stockMinimo || 0,
          cantidadSolicitada: Math.max(1, primero.stockMinimo || 5),
          costoUnitarioEstimado: costoRef,
          subtotalEstimado: Math.round(Math.max(1, primero.stockMinimo || 5) * costoRef),
        },
      ]);
    } else {
      setItems([]);
    }
  }, [
    isOpen,
    numeroOrdenSugerido,
    proveedorPreseleccionado,
    itemsPreseleccionados,
    proveedores,
    sugerencias,
    insumos,
  ]);

  if (!isOpen) return null;

  const proveedorSeleccionado = proveedores.find((p) => p.id === proveedorId);
  const { totalEstimado } = calcularTotalesOrdenCompra(items);

  const handleCargarSugerenciasStockBajo = () => {
    const sugParaProv = sugerencias.filter(
      (s) => !s.proveedorSugeridoId || s.proveedorSugeridoId === proveedorId
    );
    const fuente = sugParaProv.length > 0 ? sugParaProv : sugerencias;
    if (fuente.length === 0) {
      setErrorLocal('No hay insumos en quiebre de stock mínimo en este momento.');
      return;
    }
    setErrorLocal(null);
    setItems(convertirSugerenciasAItemsOrden(fuente));
  };

  const handleAgregarLinea = () => {
    const insumoDisponible =
      insumos.find((i) => !items.some((it) => it.insumoId === i.id)) || insumos[0];
    if (!insumoDisponible) return;

    const costoRef = Math.max(0, Math.round(insumoDisponible.costoUnitario || 0));
    setItems((prev) => [
      ...prev,
      {
        insumoId: insumoDisponible.id,
        insumoNombre: insumoDisponible.nombre,
        unidad: insumoDisponible.unidad || 'unidades',
        stockActualSnapshot: insumoDisponible.stockActual || 0,
        stockMinimoSnapshot: insumoDisponible.stockMinimo || 0,
        cantidadSolicitada: 5,
        costoUnitarioEstimado: costoRef,
        subtotalEstimado: costoRef * 5,
      },
    ]);
  };

  const handleEliminarLinea = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCambiarInsumoLinea = (idx: number, nuevoInsumoId: string) => {
    const insumo = insumos.find((i) => i.id === nuevoInsumoId);
    if (!insumo) return;

    const sug = sugerencias.find((s) => s.insumoId === insumo.id);
    const cantidad = sug ? sug.cantidadSugerida : Math.max(1, insumo.stockMinimo || 5);
    const costo = sug
      ? sug.costoUnitarioReferencia
      : Math.max(0, Math.round(insumo.costoUnitario || 0));

    setItems((prev) => {
      const copia = [...prev];
      copia[idx] = {
        insumoId: insumo.id,
        insumoNombre: insumo.nombre,
        unidad: insumo.unidad || 'unidades',
        stockActualSnapshot: insumo.stockActual || 0,
        stockMinimoSnapshot: insumo.stockMinimo || 0,
        cantidadSolicitada: cantidad,
        costoUnitarioEstimado: costo,
        subtotalEstimado: Math.round(cantidad * costo),
      };
      return copia;
    });
  };

  const handleActualizarCampoLinea = (
    idx: number,
    campo: 'cantidadSolicitada' | 'costoUnitarioEstimado',
    valor: number
  ) => {
    setItems((prev) => {
      const copia = [...prev];
      const actual = { ...copia[idx] };
      if (campo === 'cantidadSolicitada') {
        actual.cantidadSolicitada = Math.max(0, valor);
      } else {
        actual.costoUnitarioEstimado = Math.max(0, Math.round(valor));
      }
      actual.subtotalEstimado = Math.round(
        actual.cantidadSolicitada * actual.costoUnitarioEstimado
      );
      copia[idx] = actual;
      return copia;
    });
  };

  const ejecutarGuardado = async (enviarWhatsApp: boolean) => {
    setErrorLocal(null);

    if (!proveedorSeleccionado) {
      setErrorLocal('Selecciona un proveedor válido para emitir la orden.');
      return;
    }

    const itemsValidos = items.filter((i) => i.insumoId && i.cantidadSolicitada > 0);
    if (itemsValidos.length === 0) {
      setErrorLocal('Agrega al menos un insumo con cantidad mayor a 0.');
      return;
    }

    try {
      setEnviando(true);
      await onSubmit({
        numeroOrden: numeroOrden.trim() || numeroOrdenSugerido,
        proveedorId: proveedorSeleccionado.id,
        proveedorNombre: proveedorSeleccionado.nombre,
        proveedorTelefono: proveedorSeleccionado.telefono,
        estado: enviarWhatsApp ? 'enviada' : 'borrador',
        items: itemsValidos,
        notas: notas.trim(),
      });

      if (enviarWhatsApp && proveedorSeleccionado.telefono) {
        const mensaje = generarMensajeWhatsAppOrdenCompra(
          {
            numeroOrden: numeroOrden.trim() || numeroOrdenSugerido,
            proveedorNombre: proveedorSeleccionado.nombre,
            items: itemsValidos,
            totalEstimado,
            notas: notas.trim(),
          },
          nombreNegocio
        );
        const url = construirUrlWhatsAppOrdenCompra(
          proveedorSeleccionado.telefono,
          mensaje
        );
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'Error al guardar la orden de compra'
      );
    } finally {
      setEnviando(false);
    }
  };

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    await ejecutarGuardado(true);
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
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2
              id={titleId}
              className="font-display font-bold text-lg sm:text-xl text-white"
            >
              Nueva Orden de Compra Inteligente
            </h2>
            <p className="text-xs text-neutral-400">
              Sugerencia por quiebre de stock mínimo y despacho directo por WhatsApp
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de orden de compra"
          className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Cuerpo */}
      <form onSubmit={handleSubmitForm} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
        {errorLocal && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
            {errorLocal}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Proveedor Destino *
            </label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
              required
            >
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({p.telefono})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              N° Orden de Compra
            </label>
            <input
              type="text"
              value={numeroOrden}
              onChange={(e) => setNumeroOrden(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-gold-400 font-mono font-bold text-sm focus:border-gold-400 focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Barra de acciones de insumos */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
            Insumos Solicitados ({items.length})
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {sugerencias.length > 0 && (
              <button
                type="button"
                onClick={handleCargarSugerenciasStockBajo}
                className="h-11 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Cargar Quiebres de Stock ({sugerencias.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAgregarLinea}
              disabled={insumos.length === 0}
              className="h-11 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>+ Agregar Insumo</span>
            </button>
          </div>
        </div>

        {/* Lista de ítems */}
        <div className="space-y-2.5">
          {items.map((item, idx) => (
            <div
              key={`${item.insumoId}-${idx}`}
              className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
            >
              <div className="sm:col-span-5">
                <label className="block text-[11px] text-neutral-500 mb-1">
                  Insumo de Bodega
                </label>
                <select
                  value={item.insumoId}
                  onChange={(e) => handleCambiarInsumoLinea(idx, e.target.value)}
                  className="w-full h-10 px-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
                >
                  {insumos.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nombre} (Stock: {ins.stockActual} / Mín: {ins.stockMinimo} {ins.unidad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] text-neutral-500 mb-1">
                  Cantidad ({item.unidad})
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={item.cantidadSolicitada}
                  onChange={(e) =>
                    handleActualizarCampoLinea(
                      idx,
                      'cantidadSolicitada',
                       parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full h-10 px-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white font-bold text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] text-neutral-500 mb-1">
                  Costo Unit. Est. (COP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={item.costoUnitarioEstimado}
                  onChange={(e) =>
                    handleActualizarCampoLinea(
                      idx,
                      'costoUnitarioEstimado',
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="w-full h-10 px-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-gold-400 font-semibold text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-4">
                <span className="font-display font-bold text-xs sm:text-sm text-white">
                  {formatCOP(item.subtotalEstimado)}
                </span>
                <button
                  type="button"
                  onClick={() => handleEliminarLinea(idx)}
                  aria-label={`Quitar ${item.insumoNombre} de la orden`}
                  className="w-11 h-11 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Notas */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
            Instrucciones de Entrega / Observaciones
          </label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Entregar en bodega antes de las 3:00 PM, facturar a nombre de La Parada..."
            className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Pie con Total y Botones */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-neutral-400 block">
              Presupuesto Total Estimado
            </span>
            <span className="font-display font-black text-2xl text-gold-400">
              {formatCOP(totalEstimado)}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => ejecutarGuardado(false)}
              disabled={enviando}
              className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs sm:text-sm flex items-center gap-2 transition-colors disabled:opacity-40"
            >
              <Save className="w-4 h-4 text-gold-400" />
              <span>Guardar Borrador</span>
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg disabled:opacity-40"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{enviando ? 'Procesando...' : 'Emitir y Enviar por WhatsApp'}</span>
            </button>
          </div>
        </div>
      </form>
      </div>
    </StorefrontDialog>
  );
}
