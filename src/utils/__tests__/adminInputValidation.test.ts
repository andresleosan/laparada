import { describe, expect, it } from 'vitest';
import {
  calculateInventoryStock,
  parseFiniteNumber,
  validateNonNegativeAmount,
  validatePositiveAmount,
  validateStockReduction,
} from '../adminInputValidation';

describe('validación de importes y existencias administrativas', () => {
  it('solo convierte cadenas numéricas finitas', () => {
    expect(parseFiniteNumber(' 18000 ')).toBe(18000);
    expect(parseFiniteNumber('')).toBeNull();
    expect(parseFiniteNumber('Infinity')).toBeNull();
    expect(parseFiniteNumber('18 mil')).toBeNull();
  });

  it('distingue importes positivos de cantidades no negativas', () => {
    expect(validatePositiveAmount('3500')).toBeUndefined();
    expect(validatePositiveAmount('0')).toBe('Debe ser mayor a 0');
    expect(validatePositiveAmount('-1')).toBe('Debe ser mayor a 0');
    expect(validateNonNegativeAmount('0')).toBeUndefined();
    expect(validateNonNegativeAmount('-1')).toBe('No puede ser negativo');
  });

  it('impide retirar más stock del disponible', () => {
    expect(validateStockReduction('4', 5)).toBeUndefined();
    expect(validateStockReduction('6', 5)).toBe('Solo hay 5 unidades disponibles');
    expect(validateStockReduction('0', 5)).toBe('Debe ser mayor a 0');
  });

  it('calcula ajustes de stock sin permitir saldos negativos', () => {
    expect(calculateInventoryStock(5, 2, 'entrada')).toBe(7);
    expect(calculateInventoryStock(5, 2, 'salida')).toBe(3);
    expect(() => calculateInventoryStock(5, 6, 'salida')).toThrow(
      'Stock insuficiente: hay 5 y solicitaste 6'
    );
    expect(() => calculateInventoryStock(5, -1, 'entrada')).toThrow(
      'La cantidad debe ser mayor a 0'
    );
  });
});
