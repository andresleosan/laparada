import { describe, expect, it } from 'vitest';
import {
  buildChannelMix,
  buildHourlySales,
  buildProductPerformance,
  countSalesOnDate,
} from '../adminAnalytics';

const sales = [
  {
    total: 21000,
    origen: 'pos',
    jornada: 'mañana',
    fecha: new Date('2026-09-04T08:15:00'),
    items: [
      { nombre: 'Tequeño', cantidad: 2, precioUnitario: 3500 },
      { nombre: 'Panceroti', cantidad: 1, precioUnitario: 14000 },
    ],
  },
  {
    total: 7000,
    origen: 'web',
    jornada: 'noche',
    fecha: { toDate: () => new Date('2026-09-04T20:30:00') },
    items: [{ nombre: 'Tequeño', cantidad: 2, precioUnitario: 3500 }],
  },
  {
    total: 10000,
    origen: 'whatsapp',
    jornada: 'noche',
    fecha: new Date('fecha-invalida'),
    items: [],
  },
];

describe('analytics administrativo basado en ventas reales', () => {
  it('agrupa órdenes e ingresos por hora y respeta la jornada', () => {
    expect(buildHourlySales(sales, 'todas')).toEqual([
      { hora: '08:00', ordenes: 1, ingresos: 21000 },
      { hora: '20:00', ordenes: 1, ingresos: 7000 },
    ]);
    expect(buildHourlySales(sales, 'noche')).toEqual([
      { hora: '20:00', ordenes: 1, ingresos: 7000 },
    ]);
  });

  it('ordena productos por unidades y calcula ingresos sin inventar margen', () => {
    expect(buildProductPerformance(sales)).toEqual([
      { producto: 'Tequeño', unidades: 4, ingresos: 14000 },
      { producto: 'Panceroti', unidades: 1, ingresos: 14000 },
    ]);
  });

  it('no mezcla referencias diferentes aunque compartan el mismo nombre visible', () => {
    const result = buildProductPerformance([
      {
        total: 7000,
        origen: 'pos',
        jornada: 'mañana',
        fecha: new Date('2026-09-04T09:00:00'),
        items: [{ referenciaId: 'producto-a', nombre: 'Tequeño', cantidad: 1, precioUnitario: 3500 }],
      },
      {
        total: 9000,
        origen: 'pos',
        jornada: 'mañana',
        fecha: new Date('2026-09-04T09:05:00'),
        items: [{ referenciaId: 'combo-a', nombre: 'Tequeño', cantidad: 1, precioUnitario: 9000 }],
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((row) => row.referenciaId).sort()).toEqual(['combo-a', 'producto-a']);
  });

  it('calcula la mezcla de canales sobre el total observado', () => {
    expect(buildChannelMix(sales)).toEqual([
      { canal: 'POS', ordenes: 1, porcentaje: 33 },
      { canal: 'Tienda web', ordenes: 1, porcentaje: 33 },
      { canal: 'WhatsApp', ordenes: 1, porcentaje: 33 },
    ]);
    expect(buildChannelMix([])).toEqual([]);
  });

  it('cuenta ventas de un día sin mezclar el histórico', () => {
    expect(countSalesOnDate(sales, new Date('2026-09-04T12:00:00'))).toBe(2);
    expect(countSalesOnDate(sales, new Date('2026-09-05T12:00:00'))).toBe(0);
  });
});
