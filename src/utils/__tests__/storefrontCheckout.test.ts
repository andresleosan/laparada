import { describe, expect, it } from 'vitest';
import { parseCashAmountCOP } from '../storefrontCheckout';

describe('parseCashAmountCOP', () => {
  it('interpreta el valor escrito como pesos colombianos completos', () => {
    expect(parseCashAmountCOP('50000')).toBe(50_000);
  });

  it('omite valores vacíos, negativos o inválidos', () => {
    expect(parseCashAmountCOP('')).toBeUndefined();
    expect(parseCashAmountCOP('-1000')).toBeUndefined();
    expect(parseCashAmountCOP('cinco')).toBeUndefined();
  });
});
