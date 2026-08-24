import { describe, it, expect } from 'vitest';
import { formatCOP, parseCOP } from '../formatCOP';

describe('formatCOP', () => {
  it('formatea números correctamente a pesos colombianos', () => {
    const formatted = formatCOP(15000);
    expect(formatted).toContain('15.000');
  });

  it('formatea 0 correctamente', () => {
    const formatted = formatCOP(0);
    expect(formatted).toContain('0');
  });

  it('parsea strings en COP a valores numéricos', () => {
    expect(parseCOP('$15.000')).toBe(15000);
    expect(parseCOP('50.000')).toBe(50000);
    expect(parseCOP('0')).toBe(0);
  });
});
