import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Insumo, MovimientoKardex, Producto } from '@/types';
import {
  calcularAnaliticaMermasOperativas,
  generarMermasOperativasCsv,
  obtenerInfoMotivoMerma,
  simularMermaProductoTerminado,
} from '../mermasOperativasUtils';

describe('mermasOperativasUtils', () => {
  const fakeTimestamp = (dateStr: string) =>
    ({
      toDate: () => new Date(dateStr),
      seconds: Math.floor(new Date(dateStr).getTime() / 1000),
      nanoseconds: 0,
    }) as unknown as Timestamp;

  const mockInsumos: Insumo[] = [
    {
      id: 'ins-pan',
      negocioId: 'laparada',
      nombre: 'Pan Brioche',
      stockActual: 20,
      stockMinimo: 5,
      unidad: 'unidades',
      costoUnitario: 1200,
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'ins-carne',
      negocioId: 'laparada',
      nombre: 'Carne Artesanal',
      stockActual: 15,
      stockMinimo: 5,
      unidad: 'unidades',
      costoUnitario: 4800,
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'ins-salsa',
      negocioId: 'laparada',
      nombre: 'Salsa de Ajo',
      stockActual: 4,
      stockMinimo: 1,
      unidad: 'litros',
      costoUnitario: 8000,
      esSubReceta: true,
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  const mockProductos: Producto[] = [
    {
      id: 'prod-hamb',
      negocioId: 'laparada',
      nombre: 'Hamburguesa La Parada',
      descripcion: 'Hamburguesa doble carne',
      precio: 18000,
      disponible: true,
      receta: [
        { insumoId: 'ins-pan', nombreSnapshot: 'Pan Brioche', cantidad: 1, unidadSnapshot: 'unidades' },
        { insumoId: 'ins-carne', nombreSnapshot: 'Carne Artesanal', cantidad: 2, unidadSnapshot: 'unidades' },
      ],
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'prod-sin-receta',
      negocioId: 'laparada',
      nombre: 'Gaseosa 400ml',
      descripcion: 'Bebida',
      precio: 5000,
      costoReferencia: 2200,
      disponible: true,
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  const mockCombos: Combo[] = [
    {
      id: 'combo-1',
      negocioId: 'laparada',
      nombre: 'Combo Parada Clásico',
      descripcion: 'Hamburguesa + Salsa',
      precioEspecial: 21000,
      disponible: true,
      items: [{ productoId: 'prod-hamb', cantidad: 1, nombreSnapshot: 'Hamburguesa La Parada' }],
      receta: [{ insumoId: 'ins-salsa', nombreSnapshot: 'Salsa de Ajo', cantidad: 0.05, unidadSnapshot: 'litros' }],
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  it('clasifica motivos de cocina, bodega y devolución correctamente', () => {
    expect(obtenerInfoMotivoMerma('devolucion_cliente')).toMatchObject({
      label: 'Devolución de Cliente',
      esDevolucion: true,
    });
    expect(obtenerInfoMotivoMerma('desperdicio_cocina')).toMatchObject({
      label: 'Desperdicio en Preparación',
      esCocina: true,
    });
    expect(obtenerInfoMotivoMerma('vencimiento')).toMatchObject({
      label: 'Vencimiento / Expirado',
      esBodega: true,
    });
  });

  it('simula la explosión de receta de un producto o combo terminado en unidades perdidas y costo P&L', () => {
    const sim = simularMermaProductoTerminado({
      referenciaId: 'prod-hamb',
      tipoReferencia: 'producto',
      cantidad: 2,
      productos: mockProductos,
      combos: mockCombos,
      insumos: mockInsumos,
    });

    expect(sim.tieneEscandallo).toBe(true);
    expect(sim.precioVentaPerdidoCOP).toBe(36000);
    // 2 * (1*1200 + 2*4800) = 2 * 10800 = 21600
    expect(sim.costoTotalInsumosCOP).toBe(21600);
    expect(sim.desgloseInsumos).toHaveLength(2);
    expect(sim.desgloseInsumos[1]).toMatchObject({
      insumoId: 'ins-carne',
      cantidadTotalMerma: 4,
      stockActual: 15,
      stockPosterior: 11,
      costoTotalMermaCOP: 19200,
    });

    const simFallback = simularMermaProductoTerminado({
      referenciaId: 'prod-sin-receta',
      tipoReferencia: 'producto',
      cantidad: 3,
      productos: mockProductos,
      combos: mockCombos,
      insumos: mockInsumos,
    });
    expect(simFallback.tieneEscandallo).toBe(false);
    expect(simFallback.costoTotalInsumosCOP).toBe(6600);
  });

  it('calcula analítica de mermas, ranking de insumos y evalúa umbrales optimo/preventivo/alerta/critico', () => {
    const ahora = new Date('2026-11-18T18:00:00Z');
    const movimientos: MovimientoKardex[] = [
      {
        id: 'm1',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Artesanal',
        cantidad: -4,
        costo: 19200,
        costoUnitario: 4800,
        proveedor: 'Merma Plato',
        motivo: 'devolucion_cliente',
        origenMerma: 'devolucion_cliente',
        fecha: fakeTimestamp('2026-11-18T16:00:00Z'),
        tipoMovimiento: 'merma',
        unidadMedida: 'unidades',
      },
      {
        id: 'm2',
        negocioId: 'laparada',
        insumoId: 'ins-pan',
        insumoNombre: 'Pan Brioche',
        cantidad: -10,
        costo: 12000,
        costoUnitario: 1200,
        proveedor: 'Merma Bodega',
        motivo: 'vencimiento',
        origenMerma: 'bodega',
        fecha: fakeTimestamp('2026-11-16T10:00:00Z'),
        tipoMovimiento: 'merma',
        unidadMedida: 'unidades',
      },
      {
        id: 'm3',
        negocioId: 'laparada',
        insumoId: 'ins-salsa',
        insumoNombre: 'Salsa de Ajo',
        cantidad: -1,
        costo: 8000,
        costoUnitario: 8000,
        proveedor: 'Merma Cocina',
        motivo: 'desperdicio_cocina',
        origenMerma: 'cocina_kds',
        fecha: fakeTimestamp('2026-11-18T17:00:00Z'),
        tipoMovimiento: 'merma',
        unidadMedida: 'litros',
      },
    ];

    // Total mermas = 39200. Con ventas = 1.000.000 => 3.9% > 3.0% => critico
    const critico = calcularAnaliticaMermasOperativas({
      movimientosKardex: movimientos,
      insumos: mockInsumos,
      ventasNetas: 1000000,
      cmvInsumos: 300000,
      ahora,
    });

    expect(critico.totalMermasCOP).toBe(39200);
    expect(critico.mermasDevolucionesCOP).toBe(19200);
    expect(critico.mermasBodegaCOP).toBe(12000);
    expect(critico.mermasCocinaCOP).toBe(8000);
    expect(critico.mermasHoyCOP).toBe(27200);
    expect(critico.porcentajeSobreVentasNetas).toBe(3.9);
    expect(critico.presupuestoMaximoMermaCOP).toBe(30000);
    expect(critico.excesoSobreUmbralCOP).toBe(9200);
    expect(critico.estadoUmbral).toBe('critico');
    expect(critico.topInsumosMerma[0].insumoId).toBe('ins-carne');

    // Con ventas = 1.400.000 => 2.8% => alerta (entre 2.5% y 3.0%)
    const alerta = calcularAnaliticaMermasOperativas({
      movimientosKardex: movimientos,
      insumos: mockInsumos,
      ventasNetas: 1400000,
      ahora,
    });
    expect(alerta.estadoUmbral).toBe('alerta');

    // Con ventas = 2.000.000 => 2.0% => preventivo (<= 2.5%)
    const preventivo = calcularAnaliticaMermasOperativas({
      movimientosKardex: movimientos,
      insumos: mockInsumos,
      ventasNetas: 2000000,
      ahora,
    });
    expect(preventivo.estadoUmbral).toBe('preventivo');

    // Con ventas = 4.000.000 => 1.0% => optimo (<= 1.5%)
    const optimo = calcularAnaliticaMermasOperativas({
      movimientosKardex: movimientos,
      insumos: mockInsumos,
      ventasNetas: 4000000,
      ahora,
    });
    expect(optimo.estadoUmbral).toBe('optimo');
  });

  it('genera CSV forense con BOM UTF-8 y sanitiza fórmulas contra CSV Injection', () => {
    const movimientos: MovimientoKardex[] = [
      {
        id: 'mov-inj',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Artesanal',
        cantidad: -2,
        costo: 9600,
        costoUnitario: 4800,
        proveedor: 'Merma Cocina',
        motivo: 'desperdicio_cocina',
        origenMerma: 'cocina_kds',
        estacionCocina: 'parrilla_plancha',
        productoMermaNombre: 'Hamburguesa La Parada',
        notas: '=CMD|calc',
        responsable: '+JefeCocina',
        fecha: fakeTimestamp('2026-11-18T17:00:00Z'),
        tipoMovimiento: 'merma',
        unidadMedida: 'unidades',
      },
    ];

    const csv = generarMermasOperativasCsv(movimientos, mockInsumos, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Impacto P&L COP');
    expect(csv).toContain("\"'=CMD|calc\"");
    expect(csv).toContain("\"'+JefeCocina\"");
    expect(csv).toContain('Hamburguesa La Parada');
  });
});
