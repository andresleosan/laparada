import { describe, it, expect } from 'vitest';
import { calcularTotalesItem, calcularResumenTanda } from '../tandaUtils';
import type { ItemTanda, TransferenciaTanda } from '@/types/tanda';
import { Timestamp } from 'firebase/firestore';

describe('tandaUtils', () => {
  const dummyTime = Timestamp.now();

  it('calcula correctamente los totales de un item con adiciones y mermas', () => {
    const item: ItemTanda = {
      productoId: 'prod-1',
      nombre: 'Panceroti Ranchero',
      precioUnitario: 4000,
      cantidadInicial: 25,
      adiciones: [
        { id: 'ad-1', cantidad: 10, hora: dummyTime },
        { id: 'ad-2', cantidad: 5, hora: dummyTime },
      ],
      mermas: [
        { id: 'm-1', cantidad: 1, hora: dummyTime, motivo: 'Quemado' },
      ],
      sobrantes: 3,
    };

    const res = calcularTotalesItem(item);

    expect(res.totalAdiciones).toBe(15);
    expect(res.totalMermas).toBe(1);
    expect(res.totalPuesto).toBe(40); // 25 + 15
    expect(res.sobrantes).toBe(3);
    expect(res.vendidos).toBe(36); // 40 - 1 - 3
    expect(res.subtotal).toBe(144000); // 36 * 4000
  });

  it('no permite vendidos negativos si sobrantes supera lo puesto', () => {
    const item: ItemTanda = {
      productoId: 'prod-2',
      nombre: 'Empanadita',
      precioUnitario: 1000,
      cantidadInicial: 10,
      adiciones: [],
      mermas: [],
      sobrantes: 15, // error de conteo
    };

    const res = calcularTotalesItem(item);
    expect(res.vendidos).toBe(0);
    expect(res.subtotal).toBe(0);
  });

  it('calcula el resumen general de la tanda cruzando efectivo y transferencias', () => {
    const items: ItemTanda[] = [
      {
        productoId: 'prod-1',
        nombre: 'Panceroti Ranchero',
        precioUnitario: 4000,
        cantidadInicial: 25,
        adiciones: [{ id: 'a1', cantidad: 5, hora: dummyTime }],
        mermas: [],
        sobrantes: 0, // se vendieron 30 => $120.000
      },
      {
        productoId: 'prod-2',
        nombre: 'Empanadas Pollo',
        precioUnitario: 2500,
        cantidadInicial: 20,
        adiciones: [],
        mermas: [{ id: 'm1', cantidad: 1, hora: dummyTime }],
        sobrantes: 4, // se vendieron 15 => $37.500
      },
    ];

    const transferencias: TransferenciaTanda[] = [
      {
        id: 't-1',
        monto: 30000,
        metodo: 'nequi',
        hora: dummyTime,
      },
      {
        id: 't-2',
        monto: 20000,
        metodo: 'daviplata',
        hora: dummyTime,
      },
    ];

    const resumen = calcularResumenTanda(items, transferencias);

    // Total venta estimada: 120.000 + 37.500 = 157.500
    expect(resumen.totalVentaEstimada).toBe(157500);
    expect(resumen.totalInicial).toBe(45);
    expect(resumen.totalAdiciones).toBe(5);
    expect(resumen.totalMermas).toBe(1);
    expect(resumen.totalSobrantes).toBe(4);
    expect(resumen.totalVendidos).toBe(45); // 30 + 15
    expect(resumen.totalTransferencias).toBe(50000); // 30.000 + 20.000
    expect(resumen.totalEfectivoEsperado).toBe(107500); // 157.500 - 50.000
  });
});
