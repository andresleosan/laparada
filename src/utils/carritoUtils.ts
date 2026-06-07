// src/utils/carritoUtils.ts
import type { ItemVenta, MetodoPago } from '@/types';

/**
 * Calcula el subtotal de items en el carrito
 */
export function calcularSubtotal(items: ItemVenta[]): number {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

/**
 * Calcula el cambio si el método es efectivo
 */
export function calcularCambio(
  total: number,
  montoRecibido: number
): number {
  return Math.max(0, montoRecibido - total);
}

/**
 * Verifica si el monto recibido es suficiente (si es efectivo)
 */
export function esMontoSuficiente(
  total: number,
  montoRecibido: number,
  metodoPago: MetodoPago
): boolean {
  if (metodoPago !== 'efectivo') return true;
  return montoRecibido >= total;
}

/**
 * Encuentra un item en el carrito por ID y tipo
 */
export function findItemEnCarrito(
  items: ItemVenta[],
  tipo: 'producto' | 'combo',
  id: string
): ItemVenta | undefined {
  return items.find((item) => item.tipo === tipo && item.referenciaId === id);
}

/**
 * Incrementa la cantidad de un item
 */
export function incrementarItem(
  items: ItemVenta[],
  tipo: 'producto' | 'combo',
  id: string,
  nombre: string,
  precio: number
): ItemVenta[] {
  const existente = findItemEnCarrito(items, tipo, id);

  if (existente) {
    return items.map((item) =>
      item === existente
        ? {
            ...item,
            cantidad: item.cantidad + 1,
            subtotal: (item.cantidad + 1) * item.precioUnitario,
          }
        : item
    );
  }

  // Nuevo item
  return [
    ...items,
    {
      tipo,
      referenciaId: id,
      nombre,
      cantidad: 1,
      precioUnitario: precio,
      subtotal: precio,
    },
  ];
}

/**
 * Decrementa la cantidad de un item (lo elimina si llega a 0)
 */
export function decrementarItem(
  items: ItemVenta[],
  tipo: 'producto' | 'combo',
  id: string
): ItemVenta[] {
  return items
    .map((item) =>
      item.tipo === tipo && item.referenciaId === id
        ? {
            ...item,
            cantidad: Math.max(0, item.cantidad - 1),
            subtotal: Math.max(0, item.cantidad - 1) * item.precioUnitario,
          }
        : item
    )
    .filter((item) => item.cantidad > 0);
}

/**
 * Elimina un item del carrito
 */
export function eliminarItem(
  items: ItemVenta[],
  tipo: 'producto' | 'combo',
  id: string
): ItemVenta[] {
  return items.filter(
    (item) => !(item.tipo === tipo && item.referenciaId === id)
  );
}

/**
 * Limpia el carrito
 */
export function limpiarCarrito(): ItemVenta[] {
  return [];
}
