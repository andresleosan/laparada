import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Venta } from '@/types';
import { formatCOP } from '../formatCOP';
import { generarVentasCsvContent } from '../exportVentasCsv';

describe('exportVentasCsv', () => {
  const ventasEjemplo: Venta[] = [
    {
      id: 'VENTA-001',
      negocioId: 'laparada',
      total: 35000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
      origen: 'pos',
      fecha: Timestamp.fromDate(new Date('2026-11-03T12:00:00.000Z')),
      items: [
        {
          tipo: 'producto',
          referenciaId: 'prod-1',
          nombre: 'Hamburguesa Artesanal',
          cantidad: 1,
          precioUnitario: 25000,
          subtotal: 25000,
        },
        {
          tipo: 'producto',
          referenciaId: 'prod-2',
          nombre: 'Papas Francesas',
          cantidad: 1,
          precioUnitario: 10000,
          subtotal: 10000,
        },
      ],
    },
    {
      id: 'VENTA-002',
      negocioId: 'laparada',
      total: 18000,
      metodoPago: 'transferencia',
      tipoEntrega: 'domicilio',
      origen: 'whatsapp',
      fecha: Timestamp.fromDate(new Date('2026-11-03T13:30:00.000Z')),
      items: [
        {
          tipo: 'producto',
          referenciaId: 'prod-3',
          nombre: 'Panceroti Ranchero',
          cantidad: 2,
          precioUnitario: 9000,
          subtotal: 18000,
        },
      ],
    },
  ];

  it('incluye el Byte Order Mark (BOM) UTF-8 al inicio del archivo CSV', () => {
    const csv = generarVentasCsvContent(ventasEjemplo, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('incluye encabezados correctos de columnas', () => {
    const csv = generarVentasCsvContent(ventasEjemplo, 'La Parada');
    expect(csv).toContain('ID Venta,Fecha,Hora,Negocio,Origen,Método Pago,Tipo Entrega,Total COP,Cant. Ítems,Detalle Productos');
  });

  it('serializa las filas de ventas con formato numérico y detalle de productos', () => {
    const csv = generarVentasCsvContent(ventasEjemplo, 'La Parada');
    expect(csv).toContain('"VENTA-001"');
    expect(csv).toContain('"La Parada"');
    expect(csv).toContain('"pos"');
    expect(csv).toContain('"efectivo"');
    expect(csv).toContain('"mostrador"');
    expect(csv).toContain('35000');
    expect(csv).toContain('2');
    expect(csv).toContain(`1x Hamburguesa Artesanal (${formatCOP(25000)}) | 1x Papas Francesas (${formatCOP(10000)})`);

    expect(csv).toContain('"VENTA-002"');
    expect(csv).toContain('"whatsapp"');
    expect(csv).toContain('"transferencia"');
    expect(csv).toContain('"domicilio"');
    expect(csv).toContain('18000');
    expect(csv).toContain(`2x Panceroti Ranchero (${formatCOP(18000)})`);
  });

  it('maneja listas vacías sin errores', () => {
    const csv = generarVentasCsvContent([], 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('ID Venta,Fecha,Hora');
  });
});
