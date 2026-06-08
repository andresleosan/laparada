// src/components/pos/Carrito.tsx
import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { ItemVenta, MetodoPago } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { ControladorCarrito } from './ControladorCarrito';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularSubtotal,
  calcularCambio,
  esMontoSuficiente,
  incrementarItem,
  decrementarItem,
  eliminarItem,
} from '@/utils/carritoUtils';

interface CarritoProps {
  items: ItemVenta[];
  onActualizarItems: (items: ItemVenta[]) => void;
  onRegistrarVenta: (metodoPago: MetodoPago, montoRecibido?: number, clienteNombre?: string, clienteApellido?: string, clienteTelefono?: string, direccion?: string, barrio?: string, fotoTransferencia?: File | null) => Promise<void>;
  loading?: boolean;
}

export function Carrito({
  items,
  onActualizarItems,
  onRegistrarVenta,
  loading = false,
}: CarritoProps) {
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteApellido, setClienteApellido] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [barrio, setBarrio] = useState('');
  const [fotoTransferencia, setFotoTransferencia] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string>('');
  const [error, setError] = useState('');

  const subtotal = calcularSubtotal(items);
  const cambio = metodoPago === 'efectivo' ? calcularCambio(subtotal, Number(montoRecibido) || 0) : 0;
  const montoInsuficiente =
    metodoPago === 'efectivo' && !esMontoSuficiente(subtotal, Number(montoRecibido) || 0, metodoPago);

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

    if (metodoPago === 'domicilio') {
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
        Number(montoRecibido) || undefined,
        clienteNombre || undefined,
        clienteApellido || undefined,
        clienteTelefono || undefined,
        direccion || undefined,
        barrio || undefined,
        fotoTransferencia
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar venta');
    }
  };

  if (items.length === 0) {
    return (
      <Card className="p-6 text-center">
        <ShoppingCart className="h-12 w-12 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-400 text-sm">Carrito vacío</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gold-400">Carrito</h3>

      {/* Items */}
      <div className="space-y-3 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.tipo}-${item.referenciaId}`}
            className="flex items-center justify-between bg-neutral-800 p-3 rounded-lg"
          >
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-50">{item.nombre}</p>
              <p className="text-xs text-neutral-400">
                {formatCOP(item.precioUnitario)} x {item.cantidad}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gold-400 w-16 text-right">
                {formatCOP(item.subtotal)}
              </span>

              <ControladorCarrito
                cantidad={item.cantidad}
                onIncrement={() =>
                  onActualizarItems(
                    incrementarItem(
                      items,
                      item.tipo,
                      item.referenciaId,
                      item.nombre,
                      item.precioUnitario
                    )
                  )
                }
                onDecrement={() =>
                  onActualizarItems(
                    decrementarItem(items, item.tipo, item.referenciaId)
                  )
                }
                onRemove={() =>
                  onActualizarItems(
                    eliminarItem(items, item.tipo, item.referenciaId)
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div className="border-t border-neutral-700 pt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-400">Subtotal:</span>
          <span className="text-neutral-50 font-semibold">{formatCOP(subtotal)}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="font-semibold text-neutral-50">Total:</span>
          <span className="font-bold text-gold-400">{formatCOP(subtotal)}</span>
        </div>
      </div>

      {/* Método de pago */}
      <Select
        label="Método de Pago"
        value={metodoPago}
        onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
        options={[
          { value: 'efectivo', label: 'Efectivo' },
          { value: 'transferencia', label: 'Transferencia' },
          { value: 'domicilio', label: 'Domicilio' },
        ]}
        disabled={loading}
      />

      {/* Campos de domicilio */}
      {metodoPago === 'domicilio' && (
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
      {metodoPago === 'transferencia' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-neutral-700">
            📸 Foto de Transferencia
          </label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
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
            disabled={loading}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:border-gold-400"
          />
          {previewFoto && (
            <div className="relative w-full h-32 bg-neutral-100 rounded-md overflow-hidden">
              <img
                src={previewFoto}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setFotoTransferencia(null);
                  setPreviewFoto('');
                }}
                disabled={loading}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Monto recibido (si efectivo) */}
      {metodoPago === 'efectivo' && (
        <>
          <Input
            label="Monto Recibido"
            type="number"
            placeholder="0"
            value={montoRecibido}
            onChange={(e) => setMontoRecibido(e.target.value)}
            disabled={loading}
          />

          {/* Valores rápidos seleccionables (se suman) */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-400 px-1">Valores rápidos (haz clic para sumar):</p>
            <div className="grid grid-cols-4 gap-2">
              {[1000, 2000, 5000, 10000, 20000, 50000, 100000].map((valor) => (
                <button
                  key={valor}
                  onClick={() => {
                    const currentMonto = Number(montoRecibido) || 0;
                    setMontoRecibido((currentMonto + valor).toString());
                  }}
                  disabled={loading}
                  className={`py-2 px-2 rounded text-xs font-semibold transition-colors bg-neutral-700 text-neutral-50 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {(valor / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
            
            {/* Botón para limpiar */}
            {montoRecibido && (
              <button
                onClick={() => setMontoRecibido('')}
                disabled={loading}
                className="w-full py-2 px-2 rounded text-xs font-semibold bg-neutral-600 text-neutral-50 hover:bg-neutral-500 disabled:opacity-50 transition-colors"
              >
                🗑️ Limpiar Monto
              </button>
            )}
          </div>

          {montoRecibido && (
            <div className="flex justify-between bg-neutral-800 p-3 rounded-lg">
              <span className="text-sm text-neutral-400">Cambio:</span>
              <span className="text-sm font-bold text-green-500">
                {formatCOP(cambio)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Errores */}
      {error && (
        <div className="rounded-lg bg-status-error/20 border border-status-error p-2">
          <p className="text-xs text-status-error">{error}</p>
        </div>
      )}

      {/* Botón registrar */}
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
  );
}
