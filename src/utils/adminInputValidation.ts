export function parseFiniteNumber(value: string): number | null {
  if (!value.trim()) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validatePositiveAmount(value: string): string | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === null) return 'Ingresa un número válido';
  if (parsed <= 0) return 'Debe ser mayor a 0';
  return undefined;
}

export function validateNonNegativeAmount(value: string): string | undefined {
  const parsed = parseFiniteNumber(value);
  if (parsed === null) return 'Ingresa un número válido';
  if (parsed < 0) return 'No puede ser negativo';
  return undefined;
}

export function validateStockReduction(
  requestedValue: string,
  availableStock: number,
  unit = 'unidades'
): string | undefined {
  const amountError = validatePositiveAmount(requestedValue);
  if (amountError) return amountError;

  const requested = parseFiniteNumber(requestedValue) as number;
  if (requested > availableStock) {
    return `Solo hay ${availableStock} ${unit} disponibles`;
  }

  return undefined;
}

export function calculateInventoryStock(
  currentStock: number,
  amount: number,
  movement: 'entrada' | 'salida'
): number {
  if (!Number.isFinite(currentStock) || currentStock < 0) {
    throw new Error('El stock actual no es válido');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  const nextStock = movement === 'entrada'
    ? currentStock + amount
    : currentStock - amount;

  if (nextStock < 0) {
    throw new Error(`Stock insuficiente: hay ${currentStock} y solicitaste ${amount}`);
  }

  return nextStock;
}
