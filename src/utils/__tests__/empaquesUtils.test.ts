import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Insumo, ItemVenta, MovimientoKardex, Producto, Venta } from '@/types';
import {
  calcularConsumoEmpaques,
  calcularCostoEmpaquesPedido,
  calcularCostoRecetaEmpaque,
  canalRequiereEmpaque,
  esInsumoEmpaque,
  filtrarInsumosEmpaque,
  resolverCanalServicio,
} from '../empaquesUtils';
import { calcularConsumoInsumos } from '../recetasEscandallo';
import { calcularEstadoResultados } from '../analiticaFinancieraUtils';

const now = Timestamp.now();

const insumosMock: Insumo[] = [
  {
    id: 'ins-carne',
    nombre: 'Carne Molida',
    stockActual: 50,
    stockMinimo: 10,
    unidad: 'kg',
    costoUnitario: 20000,
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
  {
    id: 'emp-caja',
    nombre: 'Caja Hamburguesa Cartón',
    stockActual: 200,
    stockMinimo: 30,
    unidad: 'unidades',
    costoUnitario: 450,
    esEmpaque: true,
    categoriaEmpaque: 'caja_contenedor',
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
  {
    id: 'emp-bolsa',
    nombre: 'Bolsa Kraft Mediana',
    stockActual: 150,
    stockMinimo: 25,
    unidad: 'unidades',
    costoUnitario: 300,
    esEmpaque: true,
    categoriaEmpaque: 'bolsa',
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
];

const productosMock: Producto[] = [
  {
    id: 'prod-burger',
    nombre: 'Hamburguesa Artesanal',
    descripcion: 'Clásica',
    precio: 18000,
    disponible: true,
    receta: [{ insumoId: 'ins-carne', nombreSnapshot: 'Carne Molida', cantidad: 0.2, unidadSnapshot: 'kg' }],
    recetaEmpaque: [
      { insumoId: 'emp-caja', nombreSnapshot: 'Caja Hamburguesa Cartón', cantidad: 1, unidadSnapshot: 'unidades' },
      { insumoId: 'emp-bolsa', nombreSnapshot: 'Bolsa Kraft Mediana', cantidad: 1, unidadSnapshot: 'unidades' },
    ],
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
];

const combosMock: Combo[] = [
  {
    id: 'combo-duo',
    nombre: 'Combo Dúo',
    descripcion: '2 Burgers',
    items: [{ productoId: 'prod-burger', cantidad: 2, nombreSnapshot: 'Hamburguesa Artesanal' }],
    precioEspecial: 34000,
    disponible: true,
    recetaEmpaque: [
      { insumoId: 'emp-bolsa', nombreSnapshot: 'Bolsa Kraft Mediana', cantidad: 1, unidadSnapshot: 'unidades' },
    ],
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  },
];

describe('empaquesUtils', () => {
  it('identifica correctamente insumos de empaque y filtra la lista', () => {
    expect(esInsumoEmpaque(insumosMock[0])).toBe(false);
    expect(esInsumoEmpaque(insumosMock[1])).toBe(true);
    expect(filtrarInsumosEmpaque(insumosMock)).toHaveLength(2);
  });

  it('determina si el canal requiere empaque y resuelve el canal efectivo', () => {
    expect(canalRequiereEmpaque('salon')).toBe(false);
    expect(canalRequiereEmpaque('para_llevar')).toBe(true);
    expect(canalRequiereEmpaque('domicilio')).toBe(true);
    expect(canalRequiereEmpaque(undefined, 'domicilio')).toBe(true);
    expect(canalRequiereEmpaque(undefined, 'mostrador')).toBe(false);

    expect(resolverCanalServicio('mostrador', 'salon')).toBe('salon');
    expect(resolverCanalServicio('mostrador', 'para_llevar')).toBe('para_llevar');
    expect(resolverCanalServicio('domicilio', 'salon')).toBe('domicilio');
  });

  it('no calcula consumo de empaques para pedidos en salón', () => {
    const items: ItemVenta[] = [
      { tipo: 'producto', referenciaId: 'prod-burger', nombre: 'Hamburguesa', cantidad: 2, precioUnitario: 18000, subtotal: 36000 },
    ];
    expect(calcularConsumoEmpaques(items, productosMock, combosMock, 'salon')).toEqual([]);
    const resumen = calcularCostoEmpaquesPedido(items, productosMock, combosMock, insumosMock, 'salon');
    expect(resumen.aplicaEmpaque).toBe(false);
    expect(resumen.costoTotalCOP).toBe(0);
    expect(resumen.cantidadUnidadesEmpaque).toBe(0);
  });

  it('calcula consumo y costo automático de empaques para Para Llevar y Domicilio', () => {
    const items: ItemVenta[] = [
      { tipo: 'producto', referenciaId: 'prod-burger', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 18000, subtotal: 18000 },
      { tipo: 'combo', referenciaId: 'combo-duo', nombre: 'Combo Dúo', cantidad: 1, precioUnitario: 34000, subtotal: 34000 },
    ];
    // 1 burger (1 caja + 1 bolsa) + 1 combo (1 bolsa directa + 2*(1 caja + 1 bolsa) de prod-burger) = 3 cajas, 4 bolsas
    const resumen = calcularCostoEmpaquesPedido(items, productosMock, combosMock, insumosMock, 'para_llevar');
    expect(resumen.aplicaEmpaque).toBe(true);
    expect(resumen.cantidadUnidadesEmpaque).toBe(7);
    expect(resumen.costoTotalCOP).toBe(3 * 450 + 4 * 300); // 1350 + 1200 = 2550

    const costoUnitarioProd = calcularCostoRecetaEmpaque(productosMock[0].recetaEmpaque, insumosMock);
    expect(costoUnitarioProd).toBe(750);
  });

  it('integra empaques en calcularConsumoInsumos únicamente cuando incluirEmpaques=true y canal requiere empaque', () => {
    const items: ItemVenta[] = [
      { tipo: 'producto', referenciaId: 'prod-burger', nombre: 'Hamburguesa', cantidad: 2, precioUnitario: 18000, subtotal: 36000 },
    ];

    const soloComida = calcularConsumoInsumos(items, productosMock, combosMock, {
      canalServicio: 'salon',
      incluirEmpaques: true,
    });
    expect(soloComida).toHaveLength(1);
    expect(soloComida[0].insumoId).toBe('ins-carne');

    const conEmpaque = calcularConsumoInsumos(items, productosMock, combosMock, {
      canalServicio: 'domicilio',
      incluirEmpaques: true,
    });
    expect(conEmpaque).toHaveLength(3);
    const caja = conEmpaque.find((c) => c.insumoId === 'emp-caja');
    expect(caja?.cantidadTotal).toBe(2);
  });

  it('concilia cmvAlimentos y cmvEmpaques en el Estado de Resultados P&L por canal', () => {
    const ventas: Venta[] = [
      {
        id: 'v1',
        negocioId: 'laparada',
        items: [{ tipo: 'producto', referenciaId: 'prod-burger', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 18000, subtotal: 18000 }],
        total: 18000,
        metodoPago: 'efectivo',
        tipoEntrega: 'mostrador',
        tipoServicio: 'salon',
        origen: 'pos',
        fecha: now,
      },
      {
        id: 'v2',
        negocioId: 'laparada',
        items: [{ tipo: 'producto', referenciaId: 'prod-burger', nombre: 'Hamburguesa', cantidad: 1, precioUnitario: 18000, subtotal: 18000 }],
        total: 18000,
        metodoPago: 'efectivo',
        tipoEntrega: 'mostrador',
        tipoServicio: 'para_llevar',
        origen: 'pos',
        fecha: now,
      },
    ];
    const movs: MovimientoKardex[] = [];
    const pl = calcularEstadoResultados({
      periodo: { tipo: 'hoy', inicio: new Date(), fin: new Date(), etiqueta: 'Hoy' },
      ventas,
      gastos: [],
      productos: productosMock,
      combos: combosMock,
      insumos: insumosMock,
      movimientosKardex: movs,
    });

    // 2 burgers = 0.4 kg carne * 20000 = 8000 alimentos
    // Solo v2 (para_llevar) consume empaque = 1 caja (450) + 1 bolsa (300) = 750
    expect(pl.cmvAlimentos).toBe(8000);
    expect(pl.cmvEmpaques).toBe(750);
    expect(pl.cmvInsumos).toBe(8750);
    expect(pl.insumosClaveCMV.some((i) => i.esEmpaque === true)).toBe(true);
  });
});
