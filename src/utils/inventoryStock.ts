export interface InventoryStockLevels {
  stockActual: number;
  stockMinimo: number;
}

export function isInventoryLowStock({
  stockActual,
  stockMinimo,
}: InventoryStockLevels): boolean {
  return stockActual < stockMinimo;
}

export function filterInventoryLowStock<T extends InventoryStockLevels>(
  insumos: readonly T[]
): T[] {
  return insumos.filter(isInventoryLowStock);
}

export function calculateInventoryStockPercentage({
  stockActual,
  stockMinimo,
}: InventoryStockLevels): number {
  if (stockMinimo === 0) return 100;
  return (stockActual / stockMinimo) * 100;
}
