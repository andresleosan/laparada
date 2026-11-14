import { describe, it, expect } from 'vitest';
import {
  calcularTotalesItem,
  calcularResumenTanda,
  calcularAnaliticaTandas,
  generarHistorialTandasCsv,
  generarResumenTandaWhatsApp,
} from '../tandaUtils';
import type { ItemTanda, TandaVitrina, TransferenciaTanda } from '@/types/tanda';
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

  it('calcula analítica consolidada de tandas cerradas, ranking y salud de merma óptima', () => {
    const tandas: TandaVitrina[] = [
      {
        id: 'tanda-1',
        negocioId: 'laparada',
        estado: 'cerrada',
        fecha: dummyTime,
        fechaCierre: dummyTime,
        responsable: 'Carlos',
        items: [
          {
            productoId: 'p1',
            nombre: 'Panceroti Ranchero',
            categoria: 'Fritos',
            precioUnitario: 4000,
            cantidadInicial: 40,
            adiciones: [{ id: 'a1', cantidad: 10, hora: dummyTime }],
            mermas: [{ id: 'm1', cantidad: 1, hora: dummyTime, motivo: 'Quemado' }],
            sobrantes: 2,
          },
          {
            productoId: 'p2',
            nombre: 'Tequeño Clásico',
            categoria: 'Fritos',
            precioUnitario: 2000,
            cantidadInicial: 50,
            adiciones: [],
            mermas: [],
            sobrantes: 0,
          },
        ],
        transferencias: [
          { id: 'tr-1', monto: 50000, metodo: 'nequi', hora: dummyTime },
        ],
        creadoEn: dummyTime,
        actualizadoEn: dummyTime,
      },
      {
        id: 'tanda-2',
        negocioId: 'laparada',
        estado: 'cerrada',
        fecha: dummyTime,
        fechaCierre: dummyTime,
        responsable: 'Ana',
        items: [
          {
            productoId: 'p1',
            nombre: 'Panceroti Ranchero',
            categoria: 'Fritos',
            precioUnitario: 4000,
            cantidadInicial: 20,
            adiciones: [],
            mermas: [],
            sobrantes: 0,
          },
        ],
        transferencias: [],
        creadoEn: dummyTime,
        actualizadoEn: dummyTime,
      },
      {
        id: 'tanda-abierta',
        negocioId: 'laparada',
        estado: 'abierta',
        fecha: dummyTime,
        items: [
          {
            productoId: 'p3',
            nombre: 'Pastelito Carne',
            precioUnitario: 3000,
            cantidadInicial: 30,
            adiciones: [],
            mermas: [],
          },
        ],
        transferencias: [],
        creadoEn: dummyTime,
        actualizadoEn: dummyTime,
      },
    ];

    const analitica = calcularAnaliticaTandas(tandas);

    // Puestas cerradas: P1(50+20=70) + P2(50) = 120; Vendidos: P1(47+20=67) + P2(50) = 117
    // Merma: 1 (0.8%); Sobrantes: 2; Ingresos: P1(268.000) + P2(100.000) = 368.000
    expect(analitica.cantidadTandasCerradas).toBe(2);
    expect(analitica.cantidadTandasAbiertas).toBe(1);
    expect(analitica.totalUnidadesPuestas).toBe(120);
    expect(analitica.totalUnidadesVendidas).toBe(117);
    expect(analitica.totalUnidadesMerma).toBe(1);
    expect(analitica.totalUnidadesSobrantes).toBe(2);
    expect(analitica.ingresosTotalesVitrina).toBe(368000);
    expect(analitica.totalTransferenciasVitrina).toBe(50000);
    expect(analitica.totalEfectivoVitrina).toBe(318000);
    expect(analitica.valorComercialMerma).toBe(4000);
    expect(analitica.ticketPromedioPorTanda).toBe(184000);
    expect(analitica.tasaRotacionGlobalPct).toBe(97.5);
    expect(analitica.tasaMermaGlobalPct).toBe(0.8);
    expect(analitica.saludMerma).toBe('optima');

    expect(analitica.rankingProductos).toHaveLength(2);
    expect(analitica.rankingProductos[0].productoId).toBe('p1');
    expect(analitica.rankingProductos[0].tandasParticipadas).toBe(2);
    expect(analitica.rankingProductos[0].ingresosBrutos).toBe(268000);
    expect(analitica.productosMayorMerma).toHaveLength(1);
    expect(analitica.productosMayorMerma[0].productoId).toBe('p1');
  });

  it('clasifica saludMerma como atención (>3% y <=7%) y crítica (>7%)', () => {
    const tandaAtencion: TandaVitrina = {
      id: 't-at',
      negocioId: 'laparada',
      estado: 'cerrada',
      fecha: dummyTime,
      items: [
        {
          productoId: 'p1',
          nombre: 'Empanada',
          precioUnitario: 2000,
          cantidadInicial: 100,
          adiciones: [],
          mermas: [{ id: 'm1', cantidad: 5, hora: dummyTime }],
          sobrantes: 0,
        },
      ],
      transferencias: [],
      creadoEn: dummyTime,
      actualizadoEn: dummyTime,
    };

    expect(calcularAnaliticaTandas([tandaAtencion]).saludMerma).toBe('atencion');

    const tandaCritica: TandaVitrina = {
      ...tandaAtencion,
      id: 't-cr',
      items: [
        {
          ...tandaAtencion.items[0],
          mermas: [{ id: 'm2', cantidad: 12, hora: dummyTime }],
        },
      ],
    };

    expect(calcularAnaliticaTandas([tandaCritica]).saludMerma).toBe('critica');
  });

  it('genera CSV con BOM UTF-8, historial y resumen para WhatsApp correctamente', () => {
    const tanda: TandaVitrina = {
      id: 'tanda-csv-1',
      negocioId: 'laparada',
      estado: 'cerrada',
      fecha: dummyTime,
      fechaCierre: dummyTime,
      responsable: 'Luis "El Che"',
      notasCierre: 'Todo OK',
      items: [
        {
          productoId: 'p1',
          nombre: 'Panceroti Queso',
          precioUnitario: 3500,
          cantidadInicial: 20,
          adiciones: [],
          mermas: [{ id: 'm1', cantidad: 1, hora: dummyTime }],
          sobrantes: 2,
        },
      ],
      transferencias: [
        { id: 'tr-1', monto: 14000, metodo: 'nequi', hora: dummyTime },
      ],
      creadoEn: dummyTime,
      actualizadoEn: dummyTime,
    };

    const csv = generarHistorialTandasCsv([tanda], 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('HISTORIAL DE TANDAS CERRADAS');
    expect(csv).toContain('RENTABILIDAD Y ROTACIÓN POR PRODUCTO DE VITRINA');
    expect(csv).toContain('"Luis ""El Che"""');
    expect(csv).toContain('Panceroti Queso');

    const whatsapp = generarResumenTandaWhatsApp(tanda, 'La Parada');
    expect(whatsapp).toContain('ACTA DE CIERRE DE VITRINA — LA PARADA');
    expect(whatsapp).toContain('Panceroti Queso: 17/20 unds');
    expect(whatsapp).toContain('Todo OK');
  });
});
