import { describe, it, expect } from 'vitest';
import {
  calcularSubtotal,
  calcularCambio,
  esMontoSuficiente,
  incrementarItem,
  decrementarItem,
  eliminarItem,
  limpiarCarrito,
} from '../carritoUtils';
import type { ItemVenta } from '@/types';

describe('carritoUtils', () => {
  const mockItems: ItemVenta[] = [
    {
      tipo: 'producto',
      referenciaId: 'prod-1',
      nombre: 'Hamburguesa Clásica',
      cantidad: 2,
      precioUnitario: 15000,
      subtotal: 30000,
    },
    {
      tipo: 'producto',
      referenciaId: 'prod-2',
      nombre: 'Papas Fritas',
      cantidad: 1,
      precioUnitario: 8000,
      subtotal: 8000,
    },
  ];

  it('calcula el subtotal correctamente', () => {
    expect(calcularSubtotal(mockItems)).toBe(38000);
  });

  it('calcula el cambio para pagos en efectivo', () => {
    expect(calcularCambio(38000, 50000)).toBe(12000);
    expect(calcularCambio(38000, 30000)).toBe(0);
  });

  it('valida si el monto es suficiente según método de pago', () => {
    expect(esMontoSuficiente(38000, 50000, 'efectivo')).toBe(true);
    expect(esMontoSuficiente(38000, 30000, 'efectivo')).toBe(false);
    expect(esMontoSuficiente(38000, 0, 'transferencia')).toBe(true);
  });

  it('incrementa un item existente o agrega uno nuevo', () => {
    const incrementado = incrementarItem(mockItems, 'producto', 'prod-1', 'Hamburguesa Clásica', 15000);
    expect(incrementado.find(i => i.referenciaId === 'prod-1')?.cantidad).toBe(3);
    expect(incrementado.find(i => i.referenciaId === 'prod-1')?.subtotal).toBe(45000);

    const nuevo = incrementarItem(mockItems, 'producto', 'prod-3', 'Gaseosa', 5000);
    expect(nuevo.length).toBe(3);
    expect(nuevo.find(i => i.referenciaId === 'prod-3')?.cantidad).toBe(1);
  });

  it('decrementa un item y lo elimina si llega a 0', () => {
    const decrementado = decrementarItem(mockItems, 'producto', 'prod-1');
    expect(decrementado.find(i => i.referenciaId === 'prod-1')?.cantidad).toBe(1);

    const eliminado = decrementarItem(mockItems, 'producto', 'prod-2');
    expect(eliminado.find(i => i.referenciaId === 'prod-2')).toBeUndefined();
  });

  it('elimina un item del carrito', () => {
    const result = eliminarItem(mockItems, 'producto', 'prod-1');
    expect(result.length).toBe(1);
    expect(result[0].referenciaId).toBe('prod-2');
  });

  it('limpia el carrito completamente', () => {
    expect(limpiarCarrito()).toEqual([]);
  });
});
