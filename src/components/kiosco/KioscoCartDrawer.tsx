import { useState } from 'react';
import { Banknote, Minus, Plus, QrCode, ShoppingBag, Trash2, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { ItemKioscoCustomizado, MetodoPago, TipoServicioKiosco } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { calcularTotalKiosco, formatearModificadores } from '@/utils/kioscoTurnosUtils';

export interface KioscoCartDrawerProps {
  items: ItemKioscoCustomizado[];
  modalidad: TipoServicioKiosco;
  onClose: () => void;
  onUpdateCantidad: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onConfirmarPedido: (datos: {
    clienteNombre: string;
    clienteTelefono?: string;
    mesaNumero?: string;
    metodoPago: MetodoPago;
    notas?: string;
  }) => void;
  isSubmitting?: boolean;
}

export function KioscoCartDrawer({
  items,
  modalidad,
  onClose,
  onUpdateCantidad,
  onRemoveItem,
  onConfirmarPedido,
  isSubmitting = false,
}: KioscoCartDrawerProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mesa, setMesa] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [notasGenerales, setNotasGenerales] = useState('');
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const total = calcularTotalKiosco(items);
  const esSalon = modalidad === 'salon';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorValidacion('Por favor ingresa tu nombre para llamarte con tu número de turno');
      return;
    }
    if (items.length === 0) {
      setErrorValidacion('Tu pedido está vacío');
      return;
    }
    setErrorValidacion(null);
    onConfirmarPedido({
      clienteNombre: nombre.trim(),
      clienteTelefono: telefono.trim() || undefined,
      mesaNumero: esSalon && mesa.trim() ? mesa.trim() : undefined,
      metodoPago,
      notas: notasGenerales.trim() || undefined,
    });
  };

  return (
    <StorefrontDialog
      labelledBy="drawer-carrito-titulo"
      onClose={onClose}
      className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl"
    >
      {/* Cabecera */}
      <header className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-400 text-black">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h2 id="drawer-carrito-titulo" className="font-display text-xl font-black text-white">
              Tu Pedido ({items.length})
            </h2>
            <span className="text-xs font-bold text-neutral-400">
              Modalidad: {esSalon ? '🍽️ Comer en Salón' : '🛍️ Para Llevar'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          aria-label="Cerrar resumen del pedido"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        {/* Lista de Ítems */}
        <div className="max-h-[30vh] overflow-y-auto pr-1 space-y-3 no-scrollbar border-b border-neutral-800 pb-4">
          {items.length === 0 ? (
            <p className="text-center py-6 text-sm text-neutral-500 font-bold">
              Aún no has agregado productos a tu orden
            </p>
          ) : (
            items.map((item, idx) => {
              const modsTexto = formatearModificadores(item.modificadores, item.notas);
              return (
                <div
                  key={`${item.referenciaId}_${idx}`}
                  className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5"
                >
                  <div className="flex-1 pr-3">
                    <span className="font-display text-sm font-black text-white block">
                      {item.nombre}
                    </span>
                    {modsTexto && (
                      <span className="text-[11px] text-gold-400/90 block mt-0.5 line-clamp-2">
                        ↳ {modsTexto}
                      </span>
                    )}
                    <span className="font-mono text-xs font-bold text-neutral-400 mt-1 block">
                      {formatCOP(item.subtotal)}
                    </span>
                  </div>

                  {/* Controles de Cantidad */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateCantidad(idx, -1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800"
                      aria-label="Restar una unidad"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-display text-sm font-black w-6 text-center">
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateCantidad(idx, 1)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800"
                      aria-label="Sumar una unidad"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-950/40 text-red-400 hover:bg-red-900/60 ml-1"
                      aria-label="Eliminar producto de la orden"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Datos del Cliente y Mesa */}
        <div className="space-y-3">
          <div>
            <label htmlFor="kiosco-nombre-cliente" className="block text-xs font-black uppercase tracking-wider text-neutral-300 mb-1.5">
              👤 Tu Nombre <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                id="kiosco-nombre-cliente"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Carlos Silva"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none min-h-[46px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="kiosco-tel-cliente" className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                📱 WhatsApp (Opcional)
              </label>
              <input
                id="kiosco-tel-cliente"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 3001234567"
                className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none min-h-[46px]"
              />
            </div>

            {esSalon && (
              <div>
                <label htmlFor="kiosco-mesa-cliente" className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">
                  🍽️ Número de Mesa (Opcional)
                </label>
                <input
                  id="kiosco-mesa-cliente"
                  type="text"
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  placeholder="Ej: 4"
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none min-h-[46px]"
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="kiosco-notas-pedido" className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-1.5">
              📝 Nota General para Cocina (Opcional)
            </label>
            <input
              id="kiosco-notas-pedido"
              type="text"
              value={notasGenerales}
              onChange={(e) => setNotasGenerales(e.target.value)}
              placeholder="Ej: Empacar salsas por separado, servilletas extra..."
              className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none min-h-[46px]"
            />
          </div>

          {/* Método de Pago Offline en Caja */}
          <div>
            <span className="block text-xs font-black uppercase tracking-wider text-neutral-400 mb-2">
              Forma de pago en caja
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                aria-pressed={metodoPago === 'efectivo'}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-black transition-all min-h-[48px] ${
                  metodoPago === 'efectivo'
                    ? 'border-gold-400 bg-gold-400 text-black shadow-md'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <Banknote className="h-4 w-4" />
                <span>Efectivo en Caja</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                aria-pressed={metodoPago === 'transferencia'}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-xs font-black transition-all min-h-[48px] ${
                  metodoPago === 'transferencia'
                    ? 'border-gold-400 bg-gold-400 text-black shadow-md'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>Transferencia / Nequi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de error de validación */}
        {errorValidacion && (
          <div className="rounded-xl border border-red-500/50 bg-red-950/40 p-3 text-center text-xs font-bold text-red-200">
            {errorValidacion}
          </div>
        )}

        {/* Total y Botón de Confirmación */}
        <div className="border-t border-neutral-800 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold text-neutral-400">Total a pagar:</span>
            <span className="font-display text-3xl font-black text-gold-400">
              {formatCOP(total)}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="w-full rounded-2xl bg-gold-400 py-4 text-base font-black text-black shadow-2xl transition-all hover:bg-gold-500 active:scale-[0.99] disabled:opacity-50 min-h-[56px] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent rounded-full" />
            ) : (
              <>
                <span>Confirmar y Emitir Turno</span>
                <span className="font-mono text-xs font-bold bg-black/20 px-2.5 py-1 rounded-lg">
                  {formatCOP(total)}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </StorefrontDialog>
  );
}
