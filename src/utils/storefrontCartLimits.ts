import type { ItemVenta } from '@/types';

export const MAX_STOREFRONT_DISTINCT_ITEMS = 20;
export const MAX_STOREFRONT_TOTAL_ITEMS = 50;
export const MAX_STOREFRONT_QUANTITY_PER_ITEM = 20;

export type StorefrontCartLimitReason =
  | 'max-per-item'
  | 'max-total-items'
  | 'max-distinct-items';

export function getStorefrontCartLimitReason(
  items: ItemVenta[],
  tipo: 'producto' | 'combo',
  referenciaId: string
): StorefrontCartLimitReason | null {
  const existingItem = items.find(
    (item) => item.tipo === tipo && item.referenciaId === referenciaId
  );

  if (existingItem && existingItem.cantidad >= MAX_STOREFRONT_QUANTITY_PER_ITEM) {
    return 'max-per-item';
  }

  const totalItems = items.reduce((total, item) => total + item.cantidad, 0);
  if (totalItems >= MAX_STOREFRONT_TOTAL_ITEMS) return 'max-total-items';

  if (!existingItem && items.length >= MAX_STOREFRONT_DISTINCT_ITEMS) {
    return 'max-distinct-items';
  }

  return null;
}
