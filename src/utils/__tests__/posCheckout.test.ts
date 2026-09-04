import { describe, expect, it } from 'vitest';
import { resolvePosCheckoutJornada } from '../posCheckout';

describe('jornada de cobro en POS', () => {
  it('usa la selección explícita del operador', () => {
    expect(resolvePosCheckoutJornada('noche', 'mañana')).toBe('noche');
  });

  it('acepta la jornada global cuando ya es concreta', () => {
    expect(resolvePosCheckoutJornada(null, 'mañana')).toBe('mañana');
  });

  it('no inventa una jornada cuando el contexto está en ambas', () => {
    expect(resolvePosCheckoutJornada(null, 'ambas')).toBeNull();
  });
});
