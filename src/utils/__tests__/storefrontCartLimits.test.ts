import { describe, expect, it } from 'vitest';
import type { ItemVenta } from '@/types';
import { getStorefrontCartLimitReason } from '../storefrontCartLimits';

function item(id: string, cantidad: number): ItemVenta {
  return {
    tipo: 'producto',
    referenciaId: id,
    nombre: id,
    cantidad,
    precioUnitario: 1_000,
    subtotal: cantidad * 1_000,
  };
}

describe('getStorefrontCartLimitReason', () => {
  it('limita cada referencia a 20 unidades', () => {
    expect(getStorefrontCartLimitReason([item('p-1', 20)], 'producto', 'p-1')).toBe(
      'max-per-item'
    );
  });

  it('limita el pedido completo a 50 unidades', () => {
    expect(getStorefrontCartLimitReason([item('p-1', 30), item('p-2', 20)], 'combo', 'c-1')).toBe(
      'max-total-items'
    );
  });

  it('limita el pedido a 20 referencias distintas', () => {
    const items = Array.from({ length: 20 }, (_, index) => item(`p-${index}`, 1));
    expect(getStorefrontCartLimitReason(items, 'combo', 'c-1')).toBe('max-distinct-items');
  });

  it('permite incrementar mientras el pedido sigue dentro de los límites', () => {
    expect(getStorefrontCartLimitReason([item('p-1', 2)], 'producto', 'p-1')).toBeNull();
  });
});
