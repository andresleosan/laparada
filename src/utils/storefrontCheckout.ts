export function parseCashAmountCOP(value: string): number | undefined {
  const normalizedValue = value.trim();
  if (!normalizedValue) return undefined;

  const amount = Number(normalizedValue);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) return undefined;

  return amount;
}
