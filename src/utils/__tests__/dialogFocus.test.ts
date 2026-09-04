import { describe, expect, it } from 'vitest';
import { getNextDialogFocusIndex } from '../dialogFocus';

describe('getNextDialogFocusIndex', () => {
  it('mantiene el foco dentro del diálogo al avanzar con Tab', () => {
    expect(getNextDialogFocusIndex(0, 3, false)).toBe(1);
    expect(getNextDialogFocusIndex(2, 3, false)).toBe(0);
    expect(getNextDialogFocusIndex(-1, 3, false)).toBe(0);
  });

  it('mantiene el foco dentro del diálogo al retroceder con Shift+Tab', () => {
    expect(getNextDialogFocusIndex(2, 3, true)).toBe(1);
    expect(getNextDialogFocusIndex(0, 3, true)).toBe(2);
  });

  it('indica que no hay destino cuando el diálogo no tiene controles', () => {
    expect(getNextDialogFocusIndex(0, 0, false)).toBe(-1);
  });
});
