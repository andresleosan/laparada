import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Insumo, MovimientoKardex, Producto, Venta } from '@/types';
import { obtenerRangoFechaReporte } from '../analiticaFinancieraUtils';
import {
  calcularCostoReceta,
  calcularPrecioSugeridoFoodCost,
  construirMapaCostosInsumos,
  construirMatrizIngenieriaMenu,
  generarIngenieriaMenuCsv,
  generarResumenWhatsAppIngenieriaMenu,
  redondearPrecioComercialCOP,
  simularPrecioYCostoItem,
} from '../ingenieriaMenuUtils';

const NOW = Timestamp.now();

const baseInsumos: Insumo[] = [
  {
    id: 'ins-queso',
    nombre: 'Queso Costeño',
    stockActual: 20,
    stockMinimo: 5,
    unidad: 'kg',
    costoUnitario: 18000, // Fallback si no hay Kardex
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'ins-carne',
    nombre: 'Carne Molida',
    stockActual: 15,
    stockMinimo: 3,
    unidad: 'kg',
    costoUnitario: 24000,
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'ins-harina',
    nombre: 'Harina de Trigo',
    stockActual: 30,
    stockMinimo: 5,
    unidad: 'kg',
    costoUnitario: 4000,
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'ins-salsa',
    nombre: 'Salsa Especial',
    stockActual: 10,
    stockMinimo: 2,
    unidad: 'litro',
    // Sin costoUnitario ni entradas Kardex
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
];

const kardexMovs: MovimientoKardex[] = [
  {
    id: 'mov-1',
    negocioId: 'laparada',
    insumoId: 'ins-queso',
    insumoNombre: 'Queso Costeño',
    cantidad: 10,
    costo: 200000,
    costoUnitario: 20000, // Kardex más reciente debe prevalecer sobre 18000
    proveedor: 'Lácteos del Norte',
    tipoMovimiento: 'entrada',
    fecha: NOW,
  },
];

const baseProductos: Producto[] = [
  {
    id: 'prod-estrella',
    nombre: 'Tequeño Premium x6',
    descripcion: 'Relleno queso',
    categoria: 'Tequeños',
    precio: 18000,
    disponible: true,
    receta: [
      { insumoId: 'ins-queso', nombreSnapshot: 'Queso Costeño', cantidad: 0.2, unidadSnapshot: 'kg' }, // 0.2 * 20000 = 4000
      { insumoId: 'ins-harina', nombreSnapshot: 'Harina', cantidad: 0.25, unidadSnapshot: 'kg' }, // 0.25 * 4000 = 1000 => Costo 5000, Margen 13000
    ],
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'prod-caballo',
    nombre: 'Empanada Clásica',
    descripcion: 'Carne tradicional',
    categoria: 'Fritos',
    precio: 4500,
    disponible: true,
    receta: [
      { insumoId: 'ins-carne', nombreSnapshot: 'Carne Molida', cantidad: 0.1, unidadSnapshot: 'kg' }, // 2400
      { insumoId: 'ins-harina', nombreSnapshot: 'Harina', cantidad: 0.15, unidadSnapshot: 'kg' }, // 600 => Costo 3000, Margen 1500
    ],
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'prod-enigma',
    nombre: 'Tabla Gourmet Doble',
    descripcion: 'Especialidad de la casa',
    categoria: 'Especiales',
    precio: 32000,
    disponible: true,
    receta: [
      { insumoId: 'ins-queso', nombreSnapshot: 'Queso Costeño', cantidad: 0.3, unidadSnapshot: 'kg' }, // 6000
      { insumoId: 'ins-carne', nombreSnapshot: 'Carne Molida', cantidad: 0.2, unidadSnapshot: 'kg' }, // 4800 => Costo 10800, Margen 21200
    ],
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'prod-perro',
    nombre: 'Pastelito Sencillo',
    descripcion: 'Baja rotación y bajo margen',
    categoria: 'Fritos',
    precio: 4000,
    disponible: true,
    costoReferencia: 2500, // Margen 1500
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
  {
    id: 'prod-sincosto',
    nombre: 'Salsa Extra',
    descripcion: 'Sin receta con costo',
    categoria: 'Adiciones',
    precio: 3000,
    disponible: true,
    receta: [
      { insumoId: 'ins-salsa', nombreSnapshot: 'Salsa Especial', cantidad: 0.1, unidadSnapshot: 'litro' },
    ],
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
];

const baseCombos: Combo[] = [
  {
    id: 'combo-pareja',
    nombre: 'Combo Pareja Tequeños',
    categoria: 'Combos',
    descripcion: '1 Tequeño Premium + 2 Empanadas',
    items: [
      { productoId: 'prod-estrella', cantidad: 1, nombreSnapshot: 'Tequeño Premium x6' }, // 5000
      { productoId: 'prod-caballo', cantidad: 2, nombreSnapshot: 'Empanada Clásica' }, // 2 * 3000 = 6000
    ],
    precioEspecial: 25000, // Costo 11000, Margen 14000
    disponible: true,
    negocioId: 'laparada',
    creadoEn: NOW,
    actualizadoEn: NOW,
  },
];

describe('ingenieriaMenuUtils', () => {
  it('prioriza costos de compra recientes del Kardex sobre costoUnitario del insumo', () => {
    const mapa = construirMapaCostosInsumos(baseInsumos, kardexMovs);
    expect(mapa.get('ins-queso')).toEqual({ costoUnitario: 20000, fuente: 'kardex' });
    expect(mapa.get('ins-carne')).toEqual({ costoUnitario: 24000, fuente: 'insumo' });
    expect(mapa.get('ins-salsa')).toEqual({ costoUnitario: 0, fuente: 'sin_costo' });
  });

  it('calcula el costo de una receta con desglose porcentual y detecta ingredientes sin costo', () => {
    const insumosMap = new Map(baseInsumos.map((i) => [i.id, i]));
    const costosMap = construirMapaCostosInsumos(baseInsumos, kardexMovs);

    const res = calcularCostoReceta(
      [
        ...baseProductos[0].receta!,
        { insumoId: 'ins-salsa', nombreSnapshot: 'Salsa Especial', cantidad: 0.05, unidadSnapshot: 'litro' },
      ],
      insumosMap,
      costosMap
    );

    expect(res.costoTotalCOP).toBe(5000);
    expect(res.costeoIncompleto).toBe(true);
    expect(res.insumosSinCosto).toEqual(['Salsa Especial']);
    expect(res.desglose[0].participacionCostoPct).toBe(80);
    expect(res.desglose[1].participacionCostoPct).toBe(20);
  });

  it('calcula precio sugerido con redondeo comercial COP y soporte opcional de INC 8%', () => {
    // Costo 3000, FC objetivo 30% => base 10.000
    expect(calcularPrecioSugeridoFoodCost(3000, 30, '500', 0)).toBe(10000);

    // Costo 5000, FC objetivo 30% => 16.666,67 -> redondeo 500 hacia arriba = 17.000
    expect(calcularPrecioSugeridoFoodCost(5000, 30, '500', 0)).toBe(17000);
    expect(calcularPrecioSugeridoFoodCost(5000, 30, '100', 0)).toBe(16700);
    expect(calcularPrecioSugeridoFoodCost(5000, 30, '1000', 0)).toBe(17000);
    expect(calcularPrecioSugeridoFoodCost(5000, 30, 'exacto', 0)).toBe(16667);

    // Con INC 8% incluido: 16.666,67 * 1.08 = 18.000
    expect(calcularPrecioSugeridoFoodCost(5000, 30, '500', 8)).toBe(18000);
    expect(redondearPrecioComercialCOP(0, '500')).toBe(0);
  });

  it('clasifica correctamente la Matriz BCG (Estrella, Caballo, Rompecabezas, Perro, Sin Costear) e ignora ventas anuladas', () => {
    const ventas: Venta[] = [
      {
        id: 'v-1',
        negocioId: 'laparada',
        metodoPago: 'efectivo',
        origen: 'pos',
        fecha: NOW,
        total: 100000,
        items: [
          { tipo: 'producto', referenciaId: 'prod-estrella', nombre: 'Tequeño Premium x6', cantidad: 40, precioUnitario: 18000, subtotal: 720000 },
          { tipo: 'producto', referenciaId: 'prod-caballo', nombre: 'Empanada Clásica', cantidad: 60, precioUnitario: 4500, subtotal: 270000 },
          { tipo: 'producto', referenciaId: 'prod-enigma', nombre: 'Tabla Gourmet Doble', cantidad: 4, precioUnitario: 32000, subtotal: 128000 },
          { tipo: 'producto', referenciaId: 'prod-perro', nombre: 'Pastelito Sencillo', cantidad: 2, precioUnitario: 4000, subtotal: 8000 },
          { tipo: 'combo', referenciaId: 'combo-pareja', nombre: 'Combo Pareja Tequeños', cantidad: 14, precioUnitario: 25000, subtotal: 350000 },
        ],
      },
      {
        id: 'v-anulada',
        negocioId: 'laparada',
        metodoPago: 'efectivo',
        origen: 'pos',
        estado: 'anulada',
        fecha: NOW,
        total: 400000,
        items: [
          { tipo: 'producto', referenciaId: 'prod-perro', nombre: 'Pastelito Sencillo', cantidad: 100, precioUnitario: 4000, subtotal: 400000 },
        ],
      },
    ];

    const resumen = construirMatrizIngenieriaMenu({
      productos: baseProductos,
      combos: baseCombos,
      ventas,
      insumos: baseInsumos,
      movimientosKardex: kardexMovs,
      periodo: obtenerRangoFechaReporte('30dias'),
      foodCostObjetivoPct: 30,
      redondeo: '500',
    });

    // 5 ítems costeados (4 productos + 1 combo), 1 sin costear (prod-sincosto)
    expect(resumen.itemsCosteados).toBe(5);
    expect(resumen.itemsSinCosteo).toBe(1);
    // Total unidades vendidas en costeados = 40 + 60 + 4 + 2 + 14 = 120
    // Umbral popularidad 70%: (120 / 5) * 0.7 = 16.8
    expect(resumen.umbralPopularidadUnidades).toBe(16.8);

    const byId = new Map(resumen.items.map((i) => [i.id, i]));
    expect(byId.get('prod-estrella')?.cuadrante).toBe('estrella');
    expect(byId.get('prod-caballo')?.cuadrante).toBe('caballo_batalla');
    expect(byId.get('prod-enigma')?.cuadrante).toBe('rompecabezas');
    expect(byId.get('prod-perro')?.cuadrante).toBe('perro'); // Venta anulada ignorada!
    expect(byId.get('prod-sincosto')?.cuadrante).toBe('sin_costeo');

    // Combo hereda escandallo de sus componentes: 5000 + 2*3000 = 11000
    const combo = byId.get('combo-pareja')!;
    expect(combo.costoUnitarioCOP).toBe(11000);
    expect(combo.margenContribucionUnitario).toBe(14000);
    expect(combo.foodCostPct).toBe(44);
  });

  it('no clasifica ítems con 0 ventas como Estrella cuando no hay ventas en el período', () => {
    const resumen = construirMatrizIngenieriaMenu({
      productos: baseProductos.slice(0, 2),
      combos: [],
      ventas: [],
      insumos: baseInsumos,
      movimientosKardex: kardexMovs,
      periodo: obtenerRangoFechaReporte('hoy'),
    });

    expect(resumen.totalUnidadesVendidas).toBe(0);
    expect(resumen.conteoCuadrantes.estrella).toBe(0);
    expect(resumen.items.every((i) => !i.popularidadAlta)).toBe(true);
  });

  it('simula ajuste de precio y proyecta ganancia incremental y cambio de cuadrante', () => {
    const resumen = construirMatrizIngenieriaMenu({
      productos: baseProductos,
      combos: [],
      ventas: [
        {
          id: 'v-1',
          negocioId: 'laparada',
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: NOW,
          total: 270000,
          items: [
            { tipo: 'producto', referenciaId: 'prod-estrella', nombre: 'Tequeño Premium x6', cantidad: 30, precioUnitario: 18000, subtotal: 540000 },
            { tipo: 'producto', referenciaId: 'prod-caballo', nombre: 'Empanada Clásica', cantidad: 50, precioUnitario: 4500, subtotal: 225000 },
          ],
        },
      ],
      insumos: baseInsumos,
      movimientosKardex: kardexMovs,
      periodo: obtenerRangoFechaReporte('30dias'),
      foodCostObjetivoPct: 30,
    });

    const caballo = resumen.items.find((i) => i.id === 'prod-caballo')!;
    expect(caballo.cuadrante).toBe('caballo_batalla');
    // Costo 3000, FC objetivo 30% => sugerido 10000
    expect(caballo.precioSugeridoObjetivoCOP).toBe(10000);

    const sim = simularPrecioYCostoItem({
      item: caballo,
      precioSimuladoCOP: 10000,
      foodCostObjetivoPct: 30,
      umbralPopularidadUnidades: resumen.umbralPopularidadUnidades,
      umbralMargenContribucionCOP: resumen.umbralMargenContribucionCOP,
    });

    expect(sim.foodCostSimuladoPct).toBe(30);
    expect(sim.margenUnitarioSimuladoCOP).toBe(7000);
    expect(sim.deltaUtilidadPeriodoCOP).toBe((7000 - 1500) * 50);
    expect(sim.cumpleObjetivoFoodCost).toBe(true);
    expect(sim.nuevoCuadranteProyectado).toBe('estrella');
  });

  it('genera CSV con UTF-8 BOM y resumen ejecutivo de WhatsApp', () => {
    const resumen = construirMatrizIngenieriaMenu({
      productos: baseProductos,
      combos: baseCombos,
      ventas: [],
      insumos: baseInsumos,
      movimientosKardex: kardexMovs,
      periodo: obtenerRangoFechaReporte('30dias'),
    });

    const csv = generarIngenieriaMenuCsv(resumen, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Tequeño Premium x6');
    expect(csv).toContain('Combo Pareja Tequeños');

    const wa = generarResumenWhatsAppIngenieriaMenu(resumen, 'La Parada');
    expect(wa).toContain('Ingeniería de Menú — La Parada');
    expect(wa).toContain('Por costear:');
  });
});
