import { describe, expect, it } from 'vitest';
import {
  calcularPropina,
  calcularTotalConPropina,
  calcularSaldoPendienteCuenta,
  formatearModificadoresYNotas,
  MODIFICADORES_PREDEFINIDOS,
} from '../propinasYModificadores';
import type { PagoParcialMesa } from '@/types/mesa';

describe('propinasYModificadores utilities', () => {
  describe('calcularPropina', () => {
    it('calcula la propina voluntaria sugerida del 10% en COP', () => {
      expect(calcularPropina(50000, 10)).toBe(5000);
      expect(calcularPropina(18000, 10)).toBe(1800);
      expect(calcularPropina(25450, 10)).toBe(2545);
    });

    it('calcula la propina voluntaria del 15% en COP', () => {
      expect(calcularPropina(50000, 15)).toBe(7500);
      expect(calcularPropina(20000, 15)).toBe(3000);
    });

    it('calcula propina con valor libre ingresado por el usuario', () => {
      expect(calcularPropina(50000, 'libre', 4000)).toBe(4000);
      expect(calcularPropina(50000, 'libre', 0)).toBe(0);
      expect(calcularPropina(50000, 'libre', -500)).toBe(0);
      expect(calcularPropina(50000, 'libre', NaN)).toBe(0);
    });

    it('retorna 0 si la opción de propina es 0%', () => {
      expect(calcularPropina(50000, 0)).toBe(0);
    });

    it('sanitiza montos negativos o no numéricos', () => {
      expect(calcularPropina(-50000, 10)).toBe(0);
      expect(calcularPropina(NaN, 10)).toBe(0);
    });
  });

  describe('calcularTotalConPropina', () => {
    it('suma el subtotal y la propina de forma segura', () => {
      expect(calcularTotalConPropina(35000, 3500)).toBe(38500);
      expect(calcularTotalConPropina(50000, 0)).toBe(50000);
    });

    it('protege contra valores negativos o no numéricos', () => {
      expect(calcularTotalConPropina(-10, -5)).toBe(0);
      expect(calcularTotalConPropina(NaN, NaN)).toBe(0);
    });
  });

  describe('calcularSaldoPendienteCuenta', () => {
    it('calcula correctamente el saldo pendiente sin abonos', () => {
      const res = calcularSaldoPendienteCuenta(100000, []);
      expect(res.totalEsperado).toBe(100000);
      expect(res.totalAbonado).toBe(0);
      expect(res.saldoRestante).toBe(100000);
      expect(res.estaSaldada).toBe(false);
    });

    it('deduce abonos parciales y determina si la cuenta está saldada', () => {
      const pagos: PagoParcialMesa[] = [
        {
          id: 'p1',
          monto: 30000,
          metodoPago: 'efectivo',
          fecha: { seconds: 12345, nanoseconds: 0 },
        },
        {
          id: 'p2',
          monto: 30000,
          metodoPago: 'transferencia',
          fecha: { seconds: 12346, nanoseconds: 0 },
        },
      ];

      const res = calcularSaldoPendienteCuenta(100000, pagos);
      expect(res.totalAbonado).toBe(60000);
      expect(res.saldoRestante).toBe(40000);
      expect(res.estaSaldada).toBe(false);

      // Agregamos el último pago restante de 40.000
      const pagosCompletos = [
        ...pagos,
        {
          id: 'p3',
          monto: 40000,
          metodoPago: 'efectivo' as const,
          fecha: { seconds: 12347, nanoseconds: 0 },
        },
      ];
      const resCompleta = calcularSaldoPendienteCuenta(100000, pagosCompletos);
      expect(resCompleta.totalAbonado).toBe(100000);
      expect(resCompleta.saldoRestante).toBe(0);
      expect(resCompleta.estaSaldada).toBe(true);
    });

    it('incluye propina general si está asignada a la cuenta', () => {
      const res = calcularSaldoPendienteCuenta(100000, [], 10000);
      expect(res.totalEsperado).toBe(110000);
      expect(res.saldoRestante).toBe(110000);
    });
  });

  describe('formatearModificadoresYNotas', () => {
    it('formatea modificadores predefinidos y notas correctamente', () => {
      const formatted = formatearModificadoresYNotas({
        modificadores: ['Término 3/4', 'Sin cebolla'],
        notas: 'Salsas aparte',
      });
      expect(formatted).toBe('(Término 3/4, Sin cebolla · Nota: Salsas aparte)');
    });

    it('retorna solo modificadores si no hay notas', () => {
      const formatted = formatearModificadoresYNotas({
        modificadores: ['Bien Asado', 'Para llevar'],
      });
      expect(formatted).toBe('(Bien Asado, Para llevar)');
    });

    it('retorna cadena vacía si no hay modificadores ni notas', () => {
      expect(formatearModificadoresYNotas({})).toBe('');
      expect(formatearModificadoresYNotas({ modificadores: [], notas: '   ' })).toBe('');
    });
  });

  describe('MODIFICADORES_PREDEFINIDOS', () => {
    it('incluye términos de cocción y requerimientos comunes de cocina', () => {
      expect(MODIFICADORES_PREDEFINIDOS).toContain('Término 3/4');
      expect(MODIFICADORES_PREDEFINIDOS).toContain('Sin salsas');
      expect(MODIFICADORES_PREDEFINIDOS).toContain('Queso extra');
      expect(MODIFICADORES_PREDEFINIDOS).toContain('Para llevar');
    });
  });
});

