// src/components/pos/Carrito.tsx
import { useId, useState, useEffect, useMemo } from 'react';
import type { ChangeEventHandler, Dispatch, SetStateAction } from 'react';
import { AlertTriangle, Camera, ShoppingCart, Tag, Trash2, UtensilsCrossed, X } from 'lucide-react';
import type { Cliente, Combo, Insumo, ItemVenta, MetodoPago, Producto, TipoEntrega } from '@/types';
import type { DescuentoAplicado } from '@/types/descuento';
import type { Promocion } from '@/types/promocion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ValoresRapidos } from '@/components/ui/ValoresRapidos';
import { ControladorCarrito } from './ControladorCarrito';
import { ClienteSelectorPOS } from './ClienteSelectorPOS';
import { ModificadorItemModal } from './ModificadorItemModal';
import { AplicarDescuentoModal } from './AplicarDescuentoModal';
import { PromocionBadgeBanner } from '@/components/promociones/PromocionBadgeBanner';
import { formatCOP } from '@/utils/formatCOP';
import { verificarStockSuficiente } from '@/utils/recetasEscandallo';
import { estaPromocionVigente } from '@/utils/promocionesUtils';
import {
  calcularSubtotal,
  calcularCambio,
  esMontoSuficiente,
  incrementarItem,
  decrementarItem,
  eliminarItem,
  actualizarModificadoresItem,
} from '@/utils/carritoUtils';
import {
  calcularPropina,
  formatearModificadoresYNotas,
  type OpcionPropina,
} from '@/utils/propinasYModificadores';
import {
  calcularDescuento,
  calcularTotalesConDescuentoYPropina,
} from '@/utils/descuentosUtils';

interface CarritoProps {
  items: ItemVenta[];
  onActualizarItems: Dispatch<SetStateAction<ItemVenta[]>>;
  onRegistrarVenta: (
    metodoPago: MetodoPago,
    tipoEntrega: TipoEntrega,
    montoRecibido?: number,
    clienteNombre?: string,
    clienteApellido?: string,
    clienteTelefono?: string,
    direccion?: string,
    barrio?: string,
    fotoTransferencia?: File | null,
    propina?: number,
    subtotal?: number,
    descuento?: number,
    descuentoMotivo?: string,
    promocionId?: string,
    codigoCupon?: string
  ) => Promise<void>;
  loading?: boolean;
  clientes?: Cliente[];
  clienteSeleccionado?: Cliente | null;
  onSeleccionarCliente?: (cliente: Cliente | null) => void;
  onCargarLoDeSiempre?: (items: ItemVenta[]) => void;
  onCanjearRecompensa?: (clienteId: string) => Promise<void>;
  productos?: Producto[];
  combos?: Combo[];
  insumos?: Insumo[];
  promociones?: Promocion[];
}

interface ComprobanteTransferenciaFieldProps {
  disabled?: boolean;
  previewFoto: string;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onClear: () => void;
}

export function ComprobanteTransferenciaField({
  disabled = false,
  previewFoto,
  onFileChange,
  onClear,
}: ComprobanteTransferenciaFieldProps) {
  const generatedId = useId();
  const inputId = `comprobante-${generatedId.replace(/:/g, '')}`;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="flex items-center gap-2 text-sm font-medium text-neutral-700"
      >
        <Camera className="h-4 w-4" aria-hidden="true" />
        Foto de transferencia
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        disabled={disabled}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 focus:border-gold-400 focus:outline-none"
      />
      {previewFoto && (
        <div className="relative h-32 w-full overflow-hidden rounded-md bg-neutral-100">
          <img
            src={previewFoto}
            alt="Comprobante de transferencia seleccionado"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700 disabled:opacity-50"
            aria-label="Quitar comprobante de transferencia"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export function Carrito({
  items,
  onActualizarItems,
  onRegistrarVenta,
  loading = false,
  clientes = [],
  clienteSeleccionado = null,
  onSeleccionarCliente,
  onCargarLoDeSiempre,
  onCanjearRecompensa,
  productos = [],
  combos = [],
  insumos = [],
  promociones = [],
}: CarritoProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('mostrador');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteApellido, setClienteApellido] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [barrio, setBarrio] = useState('');
  const [fotoTransferencia, setFotoTransferencia] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string>('');
  const [error, setError] = useState('');

  // Control de Propina Sugerida
  const [opcionPropina, setOpcionPropina] = useState<OpcionPropina>(0);
  const [propinaLibre, setPropinaLibre] = useState<string>('');

  // Control de Descuento y Cortesía
  const [descuentoAplicado, setDescuentoAplicado] = useState<DescuentoAplicado | null>(null);
  const [modalDescuentoOpen, setModalDescuentoOpen] = useState(false);

  // Modal de modificadores
  const [itemParaModificar, setItemParaModificar] = useState<ItemVenta | null>(null);

  const alertasInventario = useMemo(
    () => verificarStockSuficiente(items, productos, combos, insumos),
    [items, productos, combos, insumos]
  );

  const categoriaPorProductoMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const prod of productos) {
      if (prod.categoria) {
        map[prod.id] = prod.categoria;
      }
    }
    return map;
  }, [productos]);

  const promocionesEnVivo = useMemo(() => {
    if (!promociones || promociones.length === 0) return [];
    return promociones.filter((p) => estaPromocionVigente(p));
  }, [promociones]);

  // Relleno reactivo cuando se selecciona un cliente frecuente
  useEffect(() => {
    if (clienteSeleccionado) {
      const partes = clienteSeleccionado.nombre.trim().split(' ');
      setClienteNombre(partes[0] || '');
      setClienteApellido(partes.slice(1).join(' ') || '');
      setClienteTelefono(clienteSeleccionado.telefono || '');
      if (clienteSeleccionado.direcciones && clienteSeleccionado.direcciones.length > 0) {
        setDireccion(clienteSeleccionado.direcciones[0]);
      }
      if (clienteSeleccionado.barrio) {
        setBarrio(clienteSeleccionado.barrio);
      }
    }
  }, [clienteSeleccionado]);

  const subtotal = calcularSubtotal(items);

  // Recalcular monto del descuento si el subtotal de ítems cambió
  const descuentoActivo = useMemo(() => {
    if (!descuentoAplicado) return null;
    return calcularDescuento(
      subtotal,
      descuentoAplicado.tipo,
      descuentoAplicado.valor,
      descuentoAplicado.motivo,
      descuentoAplicado.motivoId,
      descuentoAplicado.autorizadoPor
    );
  }, [subtotal, descuentoAplicado]);

  const totales = useMemo(() => {
    const baseParaPropina = Math.max(0, subtotal - (descuentoActivo?.montoDescontadoCOP || 0));
    const propinaCalculada = calcularPropina(baseParaPropina, opcionPropina, Number(propinaLibre));
    return calcularTotalesConDescuentoYPropina(subtotal, descuentoActivo, propinaCalculada);
  }, [subtotal, descuentoActivo, opcionPropina, propinaLibre]);

  const total = totales.total;
  const propina = totales.propina;
  const descuentoCOP = totales.descuentoCOP;
  const cambio = metodoPago === 'efectivo' ? calcularCambio(total, Number(montoRecibido) || 0) : 0;
  const montoInsuficiente =
    metodoPago === 'efectivo' && !esMontoSuficiente(total, Number(montoRecibido) || 0, metodoPago);

  const handleRegistrarVenta = async () => {
    if (items.length === 0) {
      setError('El carrito está vacío');
      return;
    }

    if (metodoPago === 'efectivo' && !montoRecibido) {
      setError('Ingresa el monto recibido');
      return;
    }

    if (montoInsuficiente) {
      setError('Monto insuficiente');
      return;
    }

    if (tipoEntrega === 'domicilio') {
      if (!clienteNombre) {
        setError('Ingresa el nombre del cliente');
        return;
      }
      if (!clienteApellido) {
        setError('Ingresa el apellido del cliente');
        return;
      }
      if (!clienteTelefono) {
        setError('Ingresa el teléfono del cliente');
        return;
      }
      if (!direccion) {
        setError('Ingresa la dirección de entrega');
        return;
      }
      if (!barrio) {
        setError('Ingresa el barrio');
        return;
      }
    }

    try {
      setError('');
      await onRegistrarVenta(
        metodoPago,
        tipoEntrega,
        Number(montoRecibido) || undefined,
        clienteNombre || undefined,
        clienteApellido || undefined,
        clienteTelefono || undefined,
        direccion || undefined,
        barrio || undefined,
        fotoTransferencia,
        propina > 0 ? propina : undefined,
        subtotal,
        descuentoCOP > 0 ? descuentoCOP : undefined,
        descuentoActivo?.motivo || undefined,
        descuentoActivo?.promocionId,
        descuentoActivo?.codigoCupon
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar venta');
    }
  };

  const handleGuardarModificadores = (modificadores: string[], notas?: string) => {
    if (!itemParaModificar) return;
    onActualizarItems((currentItems) =>
      actualizarModificadoresItem(
        currentItems,
        itemParaModificar.tipo,
        itemParaModificar.referenciaId,
        modificadores,
        notas
      )
    );
  };

  if (items.length === 0) {
    return (
      <Card className="space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Cobro</p>
            <h2 className="text-lg font-bold text-white">Ticket actual</h2>
          </div>
          <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-neutral-400">
            0 ítems
          </span>
        </div>

        {/* Buscador de cliente frecuente con acceso directo a "Lo de siempre" */}
        <ClienteSelectorPOS
          clientes={clientes}
          clienteSeleccionado={clienteSeleccionado}
          onSeleccionarCliente={onSeleccionarCliente || (() => {})}
          onCargarLoDeSiempre={onCargarLoDeSiempre || (() => {})}
          onCanjearRecompensa={onCanjearRecompensa}
          disabled={loading}
        />

        <div className="py-6 text-center">
          <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-neutral-500" aria-hidden="true" />
          <p className="text-sm font-bold text-white">Ticket vacío</p>
          <p className="mt-1 text-xs text-neutral-400">
            Agrega un producto o busca un cliente frecuente para cargar lo de siempre.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="space-y-4 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">Cobro</p>
            <h2 className="text-lg font-bold text-white">Ticket actual</h2>
          </div>
          <span className="rounded-full bg-gold-400 px-2.5 py-1 text-xs font-black text-base-dark">
            {items.reduce((sum, item) => sum + item.cantidad, 0)} ítems
          </span>
        </div>

        {/* Buscador de cliente frecuente */}
        <ClienteSelectorPOS
          clientes={clientes}
          clienteSeleccionado={clienteSeleccionado}
          onSeleccionarCliente={onSeleccionarCliente || (() => {})}
          onCargarLoDeSiempre={onCargarLoDeSiempre || (() => {})}
          onCanjearRecompensa={onCanjearRecompensa}
          disabled={loading}
        />

        {/* Items */}
        <div className="space-y-3 max-h-56 overflow-y-auto">
          {items.map((item) => {
            const modsStr = formatearModificadoresYNotas(item);
            return (
              <div
                key={`${item.tipo}-${item.referenciaId}`}
                className="flex flex-col gap-2 rounded-xl border border-neutral-800 bg-neutral-800/90 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-50 truncate">{item.nombre}</p>
                    <p className="text-xs text-neutral-400">
                      {formatCOP(item.precioUnitario)} x {item.cantidad}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gold-400 shrink-0">
                    {formatCOP(item.subtotal)}
                  </span>
                </div>

                {/* Modificadores o Términos asignados */}
                {modsStr && (
                  <p className="text-[11px] font-medium text-amber-300/90 bg-amber-950/30 rounded-lg px-2 py-0.5 border border-amber-500/20">
                    {modsStr}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-700/50">
                  <button
                    type="button"
                    onClick={() => setItemParaModificar(item)}
                    disabled={loading}
                    aria-label={`Modificadores de ${item.nombre}`}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-700/60 px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                  >
                    <UtensilsCrossed className="h-3.5 w-3.5 text-amber-400" />
                    <span>{item.modificadores?.length || item.notas ? 'Editar Términos' : '+ Términos/Notas'}</span>
                  </button>

                  <ControladorCarrito
                    cantidad={item.cantidad}
                    nombreItem={item.nombre}
                    disabled={loading}
                    onIncrement={() =>
                      onActualizarItems((currentItems) =>
                        incrementarItem(
                          currentItems,
                          item.tipo,
                          item.referenciaId,
                          item.nombre,
                          item.precioUnitario
                        )
                      )
                    }
                    onDecrement={() =>
                      onActualizarItems((currentItems) =>
                        decrementarItem(currentItems, item.tipo, item.referenciaId)
                      )
                    }
                    onRemove={() =>
                      onActualizarItems((currentItems) =>
                        eliminarItem(currentItems, item.tipo, item.referenciaId)
                      )
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Propina Voluntaria Sugerida */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Propina Voluntaria Sugerida
            </span>
            <span className="text-xs font-bold text-amber-400">
              {propina > 0 ? `+${formatCOP(propina)}` : '0 COP (Opcional)'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setOpcionPropina(0)}
              aria-pressed={opcionPropina === 0}
              className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                opcionPropina === 0
                  ? 'bg-neutral-700 text-white font-black border border-neutral-600 shadow-sm'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              0%
            </button>
            <button
              type="button"
              onClick={() => setOpcionPropina(10)}
              aria-pressed={opcionPropina === 10}
              className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                opcionPropina === 10
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              10% (Sugerida)
            </button>
            <button
              type="button"
              onClick={() => setOpcionPropina(15)}
              aria-pressed={opcionPropina === 15}
              className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                opcionPropina === 15
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              15%
            </button>
            <button
              type="button"
              onClick={() => setOpcionPropina('libre')}
              aria-pressed={opcionPropina === 'libre'}
              className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                opcionPropina === 'libre'
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Otro
            </button>
          </div>

          {opcionPropina === 'libre' && (
            <div className="pt-1">
              <input
                type="number"
                min="0"
                placeholder="Valor de propina en COP (ej. 3000)"
                value={propinaLibre}
                onChange={(e) => setPropinaLibre(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-2.5 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Botón o Banner de Descuento y Cortesía */}
        <div className="border-t border-neutral-700 pt-3">
          {promocionesEnVivo.length > 0 && !descuentoActivo && (
            <div className="mb-2">
              <PromocionBadgeBanner
                promocionesEnVivo={promocionesEnVivo}
                onAplicarPromo={() => setModalDescuentoOpen(true)}
                compacto
              />
            </div>
          )}
          {descuentoActivo && descuentoActivo.montoDescontadoCOP > 0 ? (
            <div className="rounded-xl border border-amber-400/40 bg-amber-950/20 p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Tag className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-300 truncate">
                    {descuentoActivo.tipo === 'cortesia_100'
                      ? 'Cortesía 100%'
                      : descuentoActivo.tipo === 'porcentaje'
                      ? `Descuento ${descuentoActivo.valor}%`
                      : 'Descuento Fijo'}
                    {' · '}
                    <span className="font-normal text-neutral-300">{descuentoActivo.motivo}</span>
                  </p>
                  <p className="text-[11px] text-amber-400 font-bold font-display">
                    Ahorro: -{formatCOP(descuentoActivo.montoDescontadoCOP)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalDescuentoOpen(true)}
                  className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setDescuentoAplicado(null)}
                  aria-label="Quitar descuento"
                  className="rounded-lg p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setModalDescuentoOpen(true)}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 px-3 py-2 text-xs font-semibold text-neutral-300 hover:border-amber-400/60 hover:text-amber-400 hover:bg-neutral-900 transition-all"
            >
              <Tag className="h-4 w-4" aria-hidden="true" />
              Aplicar Descuento o Cortesía
            </button>
          )}
        </div>

        {/* Resumen Financiero */}
        <div className="border-t border-neutral-700 pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Subtotal consumos:</span>
            <span className="text-neutral-50 font-semibold">{formatCOP(subtotal)}</span>
          </div>
          {descuentoCOP > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-400 font-medium">
                Descuento ({descuentoActivo?.motivo || 'Beneficio'}):
              </span>
              <span className="text-amber-400 font-bold">-{formatCOP(descuentoCOP)}</span>
            </div>
          )}
          {propina > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-amber-400 font-medium">Propina voluntaria:</span>
              <span className="text-amber-400 font-bold">+{formatCOP(propina)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline text-lg">
            <span className="font-semibold text-neutral-50">Total a Pagar:</span>
            <span className="font-display font-black text-gold-400 text-2xl">{formatCOP(total)}</span>
          </div>
        </div>

        <Select
          label="Tipo de Pedido"
          value={tipoEntrega}
          onChange={(e) => setTipoEntrega(e.target.value as TipoEntrega)}
          options={[
            { value: 'mostrador', label: 'Mostrador' },
            { value: 'domicilio', label: 'Domicilio' },
          ]}
          disabled={loading}
        />

        {/* Método de pago */}
        <Select
          label="Método de Pago"
          value={metodoPago}
          onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
          options={[
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'transferencia', label: 'Transferencia manual' },
          ]}
          disabled={loading}
        />

        {/* Campos de cliente / domicilio */}
        {tipoEntrega === 'domicilio' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Nombre"
                type="text"
                placeholder="Ej: Juan"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                disabled={loading}
              />
              <Input
                label="Apellido"
                type="text"
                placeholder="Ej: Pérez"
                value={clienteApellido}
                onChange={(e) => setClienteApellido(e.target.value)}
                disabled={loading}
              />
            </div>
            <Input
              label="Teléfono"
              type="tel"
              placeholder="Ej: 3001234567"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              disabled={loading}
            />
            <Input
              label="Dirección de Entrega"
              type="text"
              placeholder="Ej: Cra 5 #12-34"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={loading}
            />
            <Input
              label="Barrio"
              type="text"
              placeholder="Ej: Centro"
              value={barrio}
              onChange={(e) => setBarrio(e.target.value)}
              disabled={loading}
            />
          </>
        )}

        {/* Campo de foto para transferencia */}
        {metodoPago === 'transferencia' && tipoEntrega === 'mostrador' && (
          <ComprobanteTransferenciaField
            previewFoto={previewFoto}
            disabled={loading}
            onFileChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFotoTransferencia(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                  setPreviewFoto(reader.result as string);
                };
                reader.readAsDataURL(file);
              }
            }}
            onClear={() => {
              setFotoTransferencia(null);
              setPreviewFoto('');
            }}
          />
        )}

        {/* Monto recibido (si efectivo) */}
        {metodoPago === 'efectivo' && (
          <>
            <Input
              label="Monto Recibido"
              type="number"
              min="0"
              placeholder="0"
              value={montoRecibido}
              onChange={(e) => setMontoRecibido(e.target.value)}
              disabled={loading}
            />

            {/* Valores rápidos: cada botón fija el monto recibido (no se acumulan) */}
            <ValoresRapidos value={montoRecibido} onChange={setMontoRecibido} disabled={loading} />

            {montoRecibido && (
              <div className="flex justify-between bg-neutral-800 p-3 rounded-lg">
                <span className="text-sm text-neutral-400">Cambio:</span>
                <span className="font-display text-base font-bold text-green-500">
                  {formatCOP(cambio)}
                </span>
              </div>
            )}
          </>
        )}

        {/* Alertas preventivas de inventario / escandallo */}
        {alertasInventario.length > 0 && (
          <div role="status" className="rounded-lg border border-amber-800/80 bg-amber-950/40 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>Alerta de Inventario ({alertasInventario.length} insumos con déficit)</span>
            </div>
            <ul className="text-xs text-amber-200/90 space-y-1 pl-1">
              {alertasInventario.map((a) => (
                <li key={a.insumoId} className="flex items-center justify-between">
                  <span>{a.nombre}:</span>
                  <span className="font-semibold text-amber-300">
                    faltan {a.faltante} {a.unidad || ''} (hay {a.stockActual})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div role="alert" className="rounded-lg bg-status-error/20 border border-status-error p-2">
            <p className="text-xs text-status-error">{error}</p>
          </div>
        )}

        {/* Botón registrar */}
        {metodoPago === 'transferencia' && tipoEntrega === 'domicilio' && (
          <p className="rounded-lg border border-neutral-300 bg-neutral-100 p-3 text-xs text-neutral-600">
            El domicilio guardará el método de pago. En este paso no se adjunta comprobante.
          </p>
        )}
        <Button
          onClick={handleRegistrarVenta}
          fullWidth
          loading={loading}
          disabled={loading || items.length === 0}
          size="lg"
        >
          {loading ? 'Registrando...' : 'Registrar Venta'}
        </Button>
      </Card>

      {/* Modal de Modificadores */}
      <ModificadorItemModal
        isOpen={Boolean(itemParaModificar)}
        item={itemParaModificar}
        onClose={() => setItemParaModificar(null)}
        onGuardar={handleGuardarModificadores}
      />

      {/* Modal de Descuento y Cortesía */}
      <AplicarDescuentoModal
        isOpen={modalDescuentoOpen}
        subtotal={subtotal}
        descuentoActual={descuentoAplicado}
        promociones={promociones}
        items={items}
        categoriaPorProductoMap={categoriaPorProductoMap}
        onAplicarDescuento={(desc) => setDescuentoAplicado(desc)}
        onRemoverDescuento={() => setDescuentoAplicado(null)}
        onClose={() => setModalDescuentoOpen(false)}
      />
    </>
  );
}
