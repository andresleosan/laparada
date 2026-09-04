import { describe, expect, it } from 'vitest';
import {
  buildAdminReportSummary,
  getAdminSalesPeriodRange,
  getRollingReportRange,
} from '../adminReports';

describe('resumen financiero administrativo', () => {
  it('calcula el resultado y agrupa solo las categorías observadas', () => {
    const result = buildAdminReportSummary(
      [
        {
          total: 10000,
          metodoPago: 'efectivo',
          items: [{ nombre: 'Tequeño', cantidad: 2 }],
        },
        {
          total: 8000,
          metodoPago: 'transferencia',
          items: [{ nombre: 'Panceroti', cantidad: 1 }],
        },
      ],
      [
        { monto: 3000, categoria: 'insumos' },
        { monto: 2000, categoria: 'insumos' },
      ]
    );

    expect(result).toEqual({
      totalVentas: 18000,
      ventasEfectivo: 10000,
      totalGastos: 5000,
      gananciaNeta: 13000,
      cantidadVentas: 2,
      ventaPromedio: 9000,
      productoMasVendido: { nombre: 'Tequeño', cantidad: 2 },
      gastosPorCategoria: { insumos: 5000 },
    });
  });

  it('ignora valores no finitos y no crea categorías vacías', () => {
    const result = buildAdminReportSummary(
      [{ total: Number.NaN, metodoPago: 'efectivo', items: [] }],
      [{ monto: Number.NaN, categoria: 'otros' }]
    );

    expect(result.totalVentas).toBe(0);
    expect(result.totalGastos).toBe(0);
    expect(result.gastosPorCategoria).toEqual({});
  });

  it('crea una ventana inclusiva y acotada de 30 días', () => {
    const range = getRollingReportRange(30, new Date('2026-09-04T12:30:00'));
    expect(range.inicio).toEqual(new Date('2026-08-06T00:00:00'));
    expect(range.fin).toEqual(new Date('2026-09-04T23:59:59.999'));
  });

  it.each([
    ['hoy', '2026-09-04T00:00:00', '2026-09-04T23:59:59.999'],
    ['semana', '2026-08-29T00:00:00', '2026-09-04T23:59:59.999'],
    ['mes', '2026-08-06T00:00:00', '2026-09-04T23:59:59.999'],
    ['todas', '2026-06-07T00:00:00', '2026-09-04T23:59:59.999'],
  ] as const)('acota el historial %s a una ventana explícita', (period, start, end) => {
    const range = getAdminSalesPeriodRange(period, new Date('2026-09-04T12:30:00'));

    expect(range.inicio).toEqual(new Date(start));
    expect(range.fin).toEqual(new Date(end));
    expect(range.finExclusivo).toEqual(new Date('2026-09-05T00:00:00'));
  });
});
