import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type {
  ConfiguracionMetasPresupuesto,
  Gasto,
  Insumo,
  MovimientoKardex,
  Producto,
  Venta,
} from '@/types';
import {
  calcularPreviewConfiguracionMetas,
  calcularProgresoTemporalMes,
  calcularPuntoEquilibrio,
  calcularVentasNetasDeHoy,
  construirPlantillaRapidaPresupuesto,
  evaluarCentroMetasPresupuesto,
  evaluarPresupuestoCategorias,
  generarReporteMetasPresupuestoCSV,
  generarResumenMetasWhatsApp,
  getConfiguracionMetasDefault,
  obtenerMesKey,
  obtenerMesKeyAnterior,
  obtenerMesKeySiguiente,
} from '../metasPresupuestoUtils';

function fakeTimestamp(date: Date): Timestamp {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
  } as unknown as Timestamp;
}

function buildConfig(overrides: Partial<ConfiguracionMetasPresupuesto> = {}): ConfiguracionMetasPresupuesto {
  const base = getConfiguracionMetasDefault('laparada', '2026-11');
  base.metaVentasMensualCOP = 20_000_000;
  base.metaUtilidadNetaMensualCOP = 4_000_000;
  base.costosFijosBaseCOP = 2_000_000;
  base.foodCostObjetivoPct = 35;
  base.umbralAlertaGastoPct = 80;
  base.presupuestosPorCategoria.salarios = { presupuestoCOP: 3_000_000, tipoCosto: 'fijo' };
  base.presupuestosPorCategoria.servicios = { presupuestoCOP: 1_000_000, tipoCosto: 'fijo' };
  base.presupuestosPorCategoria.mantenimiento = { presupuestoCOP: 500_000, tipoCosto: 'fijo' };
  base.presupuestosPorCategoria.gas = { presupuestoCOP: 400_000, tipoCosto: 'variable' };
  base.presupuestosPorCategoria.insumos = { presupuestoCOP: 1_500_000, tipoCosto: 'variable' };
  base.configuradoManualmente = true;
  return { ...base, ...overrides };
}

function buildVenta(id: string, total: number, fecha: Date, estado: 'completada' | 'anulada' = 'completada'): Venta {
  return {
    id,
    negocioId: 'laparada',
    items: [
      {
        tipo: 'producto',
        referenciaId: 'prod-1',
        nombre: 'Hamburguesa Especial',
        cantidad: 2,
        precioUnitario: Math.round(total / 2),
        subtotal: total,
      },
    ],
    subtotal: total,
    total,
    metodoPago: 'efectivo',
    origen: 'pos',
    estado,
    fecha: fakeTimestamp(fecha),
  };
}

function buildGasto(id: string, categoria: Gasto['categoria'], monto: number, fecha: Date): Gasto {
  return {
    id,
    negocioId: 'laparada',
    concepto: `Gasto ${categoria}`,
    categoria,
    monto,
    fecha: fakeTimestamp(fecha),
  };
}

describe('metasPresupuestoUtils', () => {
  it('maneja correctamente llaves de mes y progresión temporal local', () => {
    const fecha = new Date(2026, 10, 15, 14, 0, 0); // 15 de noviembre de 2026
    expect(obtenerMesKey(fecha)).toBe('2026-11');
    expect(obtenerMesKeyAnterior('2026-01')).toBe('2025-12');
    expect(obtenerMesKeySiguiente('2026-12')).toBe('2027-01');

    const tempActual = calcularProgresoTemporalMes('2026-11', fecha);
    expect(tempActual.diasEnMes).toBe(30);
    expect(tempActual.diasTranscurridos).toBe(15);
    expect(tempActual.diasRestantes).toBe(15);
    expect(tempActual.diasRestantesIncluyendoHoy).toBe(16);
    expect(tempActual.porcentajeMesTranscurrido).toBe(50);
    expect(tempActual.esMesActual).toBe(true);

    const tempPasado = calcularProgresoTemporalMes('2026-10', fecha);
    expect(tempPasado.esMesPasado).toBe(true);
    expect(tempPasado.diasTranscurridos).toBe(31);
    expect(tempPasado.porcentajeMesTranscurrido).toBe(100);

    const tempFuturo = calcularProgresoTemporalMes('2026-12', fecha);
    expect(tempFuturo.esMesFuturo).toBe(true);
    expect(tempFuturo.diasTranscurridos).toBe(0);
    expect(tempFuturo.diasRestantes).toBe(31);
  });

  it('calcula el Punto de Equilibrio usando margen estimado cuando hay pocas ventas iniciales', () => {
    const ahora = new Date(2026, 10, 10, 12, 0, 0);
    const config = buildConfig();
    // Fijos presupuestados = 2.0M base + 3.0M salarios + 1.0M servicios + 0.5M mant = 6.5M
    // FoodCost objetivo = 35% => Margen contribución estimado = 65%
    // Break-even = 6.500.000 / 0.65 = 10.000.000
    const temporalidad = calcularProgresoTemporalMes('2026-11', ahora);
    const lineas = evaluarPresupuestoCategorias([], config, temporalidad);

    const eq = calcularPuntoEquilibrio({
      ventasNetasMesCOP: 2_500_000,
      cantidadVentasMes: 2,
      ticketPromedioMesCOP: 1_250_000,
      cmvRealCOP: 900_000,
      mermasMesCOP: 0,
      lineasPresupuesto: lineas,
      config,
      temporalidad,
    });

    expect(eq.fuenteMargen).toBe('objetivo_estimado');
    expect(eq.costosFijosConsideradosCOP).toBe(6_500_000);
    expect(eq.margenContribucionAplicadoPct).toBe(65);
    expect(eq.puntoEquilibrioMensualCOP).toBe(10_000_000);
    expect(eq.puntoEquilibrioDiarioCOP).toBe(Math.round(10_000_000 / 30));
    expect(eq.faltanteParaEquilibrioCOP).toBe(7_500_000);
    expect(eq.equilibrioAlcanzado).toBe(false);
    expect(eq.porcentajeEquilibrioAlcanzado).toBe(25);
  });

  it('usa margen de contribución real cuando hay volumen suficiente y detecta superávit al cruzar el equilibrio', () => {
    const ahora = new Date(2026, 10, 20, 12, 0, 0);
    const config = buildConfig();
    const temporalidad = calcularProgresoTemporalMes('2026-11', ahora);
    const gastos: Gasto[] = [
      buildGasto('g1', 'gas', 300_000, ahora), // variable
    ];
    const lineas = evaluarPresupuestoCategorias(gastos, config, temporalidad);

    // Ventas = 15.000.000; Variables = 4.2M CMV + 0.3M gas = 4.5M => Margen = 70%
    // Costos fijos = 6.5M => Break-even = 6.5M / 0.7 = 9.285.714
    const eq = calcularPuntoEquilibrio({
      ventasNetasMesCOP: 15_000_000,
      cantidadVentasMes: 40,
      ticketPromedioMesCOP: 375_000,
      cmvRealCOP: 4_200_000,
      mermasMesCOP: 0,
      lineasPresupuesto: lineas,
      config,
      temporalidad,
    });

    expect(eq.fuenteMargen).toBe('real');
    expect(eq.margenContribucionAplicadoPct).toBe(70);
    expect(eq.puntoEquilibrioMensualCOP).toBe(9_285_714);
    expect(eq.equilibrioAlcanzado).toBe(true);
    expect(eq.faltanteParaEquilibrioCOP).toBe(0);
    expect(eq.superavitSobreEquilibrioVentasCOP).toBe(15_000_000 - 9_285_714);
    expect(eq.utilidadEstimadaPostEquilibrioCOP).toBeGreaterThan(3_900_000);
  });

  it('evalúa estados de presupuesto por categoría y prioriza alertas de desviación', () => {
    const ahora = new Date(2026, 10, 15, 18, 0, 0);
    const config = buildConfig();

    const insumos: Insumo[] = [
      {
        id: 'ins-1',
        nombre: 'Carne',
        stockActual: 50,
        stockMinimo: 10,
        unidad: 'kg',
        costoUnitario: 20_000,
        negocioId: 'laparada',
        creadoEn: fakeTimestamp(ahora),
        actualizadoEn: fakeTimestamp(ahora),
      },
    ];

    const productos: Producto[] = [
      {
        id: 'prod-1',
        nombre: 'Hamburguesa Especial',
        descripcion: 'Artesanal',
        precio: 25_000,
        disponible: true,
        negocioId: 'laparada',
        receta: [{ insumoId: 'ins-1', cantidad: 0.25, nombreSnapshot: 'Carne', unidadSnapshot: 'kg' }],
        creadoEn: fakeTimestamp(ahora),
        actualizadoEn: fakeTimestamp(ahora),
      },
    ];

    // 10 ventas por 500k c/u = 5M netos; cada venta consume 2 * 0.25kg = 0.5kg * 20k = 10k CMV => 100k CMV
    // Para probar food cost alto: hagamos ventas pequeñas con alto gasto o CMV alto
    const ventas: Venta[] = Array.from({ length: 6 }, (_, idx) =>
      buildVenta(`v-${idx}`, 500_000, new Date(2026, 10, 1 + idx, 15, 0))
    );
    // Agreguemos una venta hoy y una anulada que no debe contar
    ventas.push(buildVenta('v-hoy', 800_000, ahora));
    ventas.push(buildVenta('v-anulada', 1_000_000, ahora, 'anulada'));

    const gastos: Gasto[] = [
      buildGasto('g-gas', 'gas', 480_000, ahora), // presupuesto 400k => EXCEDIDO (120%)
      buildGasto('g-serv', 'servicios', 850_000, ahora), // presupuesto 1M => ALERTA (85%)
      buildGasto('g-varios', 'varios', 120_000, ahora), // presupuesto 0 => SIN PRESUPUESTO
      buildGasto('g-neg', 'otros', -50_000, ahora), // ignorado defensivamente
    ];

    const movimientos: MovimientoKardex[] = [];

    const resumen = evaluarCentroMetasPresupuesto({
      negocioId: 'laparada',
      mesKey: '2026-11',
      configuracion: config,
      ventasMes: ventas,
      gastosMes: gastos,
      movimientosKardexMes: movimientos,
      productos,
      combos: [],
      insumos,
      ahora,
    });

    expect(resumen.metaComercial.ventasNetasMesCOP).toBe(3_800_000);
    expect(resumen.metaComercial.ventasHoyCOP).toBe(800_000);
    expect(resumen.totalEjecutadoOpexCOP).toBe(1_450_000);

    const lineaGas = resumen.lineasPresupuesto.find((l) => l.categoria === 'gas');
    const lineaServ = resumen.lineasPresupuesto.find((l) => l.categoria === 'servicios');
    const lineaVarios = resumen.lineasPresupuesto.find((l) => l.categoria === 'varios');

    expect(lineaGas?.estado).toBe('excedido');
    expect(lineaGas?.excedidoCOP).toBe(80_000);
    expect(lineaServ?.estado).toBe('alerta');
    expect(lineaServ?.porcentajeEjecucion).toBe(85);
    expect(lineaVarios?.estado).toBe('sin_presupuesto');

    expect(resumen.saludPresupuestal).toBe('critica');
    expect(resumen.alertas[0].severidad).toBe('critica');
    expect(resumen.alertas[0].categoria).toBe('gas');
    expect(resumen.alertas.some((a) => a.tipo === 'presupuesto_preventivo')).toBe(true);
    expect(resumen.alertas.some((a) => a.tipo === 'gasto_sin_presupuesto')).toBe(true);
  });

  it('calcula correctamente ventas netas del día actual considerando descuentos y propinas', () => {
    const hoy = new Date(2026, 10, 16, 18, 0, 0);
    const ayer = new Date(2026, 10, 15, 18, 0, 0);

    const ventas: Venta[] = [
      {
        ...buildVenta('v1', 110_000, hoy),
        subtotal: 100_000,
        descuento: 10_000,
        propina: 20_000,
        total: 110_000,
      },
      buildVenta('v2', 50_000, ayer),
    ];

    expect(calcularVentasNetasDeHoy(ventas, hoy)).toBe(90_000);
  });

  it('genera plantillas rápidas, preview en modal, CSV con BOM y mensaje WhatsApp', () => {
    const plantilla = construirPlantillaRapidaPresupuesto('restaurante_medio');
    const preview = calcularPreviewConfiguracionMetas(plantilla);

    expect(preview.totalPresupuestoOpexCOP).toBeGreaterThan(0);
    expect(preview.puntoEquilibrioMensualCOP).toBeGreaterThan(preview.costosFijosTotalesCOP);

    const ahora = new Date(2026, 10, 16, 10, 0, 0);
    const resumen = evaluarCentroMetasPresupuesto({
      negocioId: 'laparada',
      mesKey: '2026-11',
      configuracion: {
        ...getConfiguracionMetasDefault('laparada', '2026-11'),
        ...plantilla,
        configuradoManualmente: true,
      },
      ventasMes: [buildVenta('v1', 500_000, ahora)],
      gastosMes: [],
      movimientosKardexMes: [],
      productos: [],
      combos: [],
      insumos: [],
      ahora,
    });

    const csv = generarReporteMetasPresupuestoCSV(resumen, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('PUNTO DE EQUILIBRIO');
    expect(csv).toContain('EJECUCIÓN DE PRESUPUESTO OPERATIVO');

    const wa = generarResumenMetasWhatsApp(resumen, 'La Parada');
    expect(wa).toContain('La Parada');
    expect(wa).toContain('Punto de Equilibrio');
  });
});
