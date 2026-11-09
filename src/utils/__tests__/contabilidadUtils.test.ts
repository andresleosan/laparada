import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { CierreCaja, Gasto, Venta } from '@/types';
import type { ConfiguracionFiscal } from '@/types/facturacion';
import {
  calcularConciliacionVentasVsCaja,
  calcularLiquidacionFormulario310,
  exportarConciliacionCSV,
  exportarFormulario310CSV,
  exportarLibroFiscalCSV,
  exportarSoftwareContableCSV,
  generarAsientosContablesVentas,
  generarLibroFiscalDiario,
  generarResumenWhatsAppContable,
  getBimestresAno,
  getMapeoPucDefault,
  getRangoFechaContable,
} from '../contabilidadUtils';

describe('contabilidadUtils', () => {
  const dummyConfigFiscal: ConfiguracionFiscal = {
    id: 'cfg-test',
    negocioId: 'test-restaurante',
    habilitado: true,
    razonSocial: 'COMERCIALIZADORA GASTRONOMICA SAS',
    nombreComercial: 'LA PARADA',
    nit: '901458789',
    dv: '4',
    tipoDocumentoIdentidad: 'NIT',
    regimenFiscal: 'responsable_inc',
    responsabilidad: 'Responsable de Impuesto Nacional al Consumo (INC 8%)',
    direccionFiscal: 'Av 0 # 10-20',
    municipio: 'Cúcuta',
    departamento: 'Norte de Santander',
    telefonoContacto: '3101234567',
    tarifaDefault: { tipo: 'inc', porcentaje: 8, nombre: 'Impoconsumo (INC 8%)' },
    preciosIncluyenImpuesto: true,
    resolucion: {
      numeroResolucion: '18764012345678',
      fechaExpedicion: '2026-01-01',
      fechaVencimiento: '2027-01-01',
      prefijo: 'POS',
      rangoInicial: 1,
      rangoFinal: 10000,
      consecutivoActual: 100,
    },
    alertas: { diasAnticipacionVencimiento: 30, consecutivosMinimosRestantes: 100 },
  };

  const fecha1 = Timestamp.fromDate(new Date('2026-03-15T12:00:00.000Z'));
  const fecha2 = Timestamp.fromDate(new Date('2026-03-16T15:30:00.000Z'));

  const ventasMuestra: Venta[] = [
    {
      id: 'v1',
      negocioId: 'test-restaurante',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Hamburguesa Especial',
          cantidad: 2,
          precioUnitario: 25000,
          subtotal: 50000,
        },
      ],
      subtotal: 50000,
      descuento: 5000,
      total: 45000,
      metodoPago: 'efectivo',
      origen: 'pos',
      fecha: fecha1,
      consecutivoFiscal: 'POS-00101',
      baseGravable: 41667,
      valorImpuesto: 3333,
      tarifaImpuesto: 8,
      tipoImpuesto: 'inc',
      propina: 2000,
      clienteNombre: 'Carlos Gomez',
    },
    {
      id: 'v2',
      negocioId: 'test-restaurante',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p2',
          nombre: 'Combo Tequeños',
          cantidad: 1,
          precioUnitario: 30000,
          subtotal: 30000,
        },
      ],
      subtotal: 30000,
      total: 30000,
      metodoPago: 'transferencia',
      origen: 'whatsapp',
      fecha: fecha1,
      consecutivoFiscal: 'POS-00102',
      baseGravable: 27778,
      valorImpuesto: 2222,
      tarifaImpuesto: 8,
      tipoImpuesto: 'inc',
      clienteNombre: 'Maria Perez',
    },
    {
      id: 'v3',
      negocioId: 'test-restaurante',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p3',
          nombre: 'Panceroti Mixto',
          cantidad: 1,
          precioUnitario: 20000,
          subtotal: 20000,
        },
      ],
      subtotal: 20000,
      total: 20000,
      metodoPago: 'efectivo',
      origen: 'pos',
      fecha: fecha2,
      consecutivoFiscal: 'POS-00103',
      baseGravable: 18519,
      valorImpuesto: 1481,
      tarifaImpuesto: 8,
      tipoImpuesto: 'inc',
    },
    {
      id: 'v-anulada',
      negocioId: 'test-restaurante',
      items: [],
      total: 15000,
      metodoPago: 'efectivo',
      origen: 'pos',
      fecha: fecha2,
      estado: 'anulada',
      consecutivoFiscal: 'POS-00104',
    },
  ];

  const gastosMuestra: Gasto[] = [
    {
      id: 'g1',
      negocioId: 'test-restaurante',
      concepto: 'Compra de queso y tocineta',
      monto: 35000,
      categoria: 'insumos',
      fecha: fecha1,
    },
  ];

  const cierresMuestra: CierreCaja[] = [
    {
      id: 'c1',
      negocioId: 'test-restaurante',
      fecha: fecha1,
      totalIngresos: 75000,
      totalGastos: 35000,
      utilidadNeta: 40000,
      ventasPos: 45000,
      ventasWhatsapp: 30000,
      cajeroNombre: 'Juan Cajero',
      arqueo: {
        denominaciones: {},
        totalBilletes: 10000,
        totalMonedas: 0,
        totalFisico: 10000,
        efectivoEsperado: 10000, // 45000 cobrado en efectivo - 35000 gastos = 10000
        diferencia: 0,
        estadoCuadre: 'cuadrado',
      },
    },
  ];

  it('obtiene los 6 bimestres oficiales de un año', () => {
    const bimestres = getBimestresAno(2026);
    expect(bimestres).toHaveLength(6);
    expect(bimestres[0].fechaInicio).toBe('2026-01-01');
    expect(bimestres[0].fechaFin).toBe('2026-02-28');
    expect(bimestres[1].etiqueta).toContain('Marzo - Abril');
    expect(bimestres[5].fechaFin).toBe('2026-12-31');
  });

  it('calcula los rangos de fecha contable correctamente', () => {
    const ref = new Date('2026-03-15T10:00:00.000Z');
    const rMes = getRangoFechaContable('mes_actual', ref);
    expect(rMes.tipo).toBe('mes_actual');
    expect(rMes.inicio.getMonth()).toBe(2); // marzo

    const rBim = getRangoFechaContable('bimestre_actual', ref);
    expect(rBim.bimestre).toBe(2); // Marzo cae en Bimestre 2
    expect(rBim.inicio.toISOString().slice(0, 10)).toBe('2026-03-01');
  });

  it('genera el Libro Fiscal de Operaciones Diarias (Art. 616 E.T.)', () => {
    const periodo = getRangoFechaContable('mes_actual', new Date('2026-03-15'));
    const libro = generarLibroFiscalDiario(ventasMuestra, gastosMuestra, periodo, dummyConfigFiscal);

    expect(libro.totalDiasConOperacion).toBe(2);
    expect(libro.totalDocumentosEmitidos).toBe(3);
    expect(libro.totalDocumentosAnulados).toBe(1);

    // Día 1: v1 (50000 - 5000 = 45000 neto) + v2 (30000 neto) = 75000 ventas netas
    const dia1 = libro.entradas[0];
    expect(dia1.fecha).toBe('2026-03-15');
    expect(dia1.consecutivoInicial).toBe('POS-00101');
    expect(dia1.consecutivoFinal).toBe('POS-00102');
    expect(dia1.totalVentasNetas).toBe(75000);
    expect(dia1.totalEgresosGastos).toBe(35000);
    expect(dia1.saldoNetoOperacional).toBe(40000); // 75000 - 35000
    expect(dia1.totalCobradoEfectivo).toBe(45000);
    expect(dia1.totalCobradoTransferencia).toBe(30000);
    expect(dia1.propinasRecaudadas).toBe(2000);

    // Acumulados globales
    expect(libro.acumuladoVentasNetas).toBe(95000); // 75000 + 20000
    expect(libro.acumuladoEgresosGastos).toBe(35000);
    expect(libro.acumuladoSaldoNeto).toBe(60000);
  });

  it('liquida la Declaración de Impoconsumo (Formulario 310 DIAN)', () => {
    const liq = calcularLiquidacionFormulario310(ventasMuestra, 2026, 2, dummyConfigFiscal);

    expect(liq.bimestre).toBe(2);
    expect(liq.totalOperacionesPos).toBe(3);
    expect(liq.descuentosYAnulaciones).toBe(5000);
    expect(liq.tarifaImpuesto).toBe(8);

    // Verificación de renglones oficiales DIAN
    const r28 = liq.renglones.find((r) => r.numeroRenglon === 28);
    const r30 = liq.renglones.find((r) => r.numeroRenglon === 30);
    const r31 = liq.renglones.find((r) => r.numeroRenglon === 31);
    const r40 = liq.renglones.find((r) => r.numeroRenglon === 40);
    const r52 = liq.renglones.find((r) => r.numeroRenglon === 52);
    const r98 = liq.renglones.find((r) => r.numeroRenglon === 98);

    expect(r28).toBeDefined();
    expect(r30?.valor).toBe(5000);
    expect(r31?.valor).toBe(liq.ingresosNetosGravados8);
    expect(r40?.valor).toBe(liq.impuestoGenerado8);
    expect(r52?.valor).toBe(liq.saldoAPagar);
    expect(r98?.valor).toBe(2000); // Propinas voluntarias
  });

  it('concilia ventas vs caja e identifica cuadre óptimo', () => {
    const periodo = getRangoFechaContable('mes_actual', new Date('2026-03-15'));
    const conc = calcularConciliacionVentasVsCaja(ventasMuestra, cierresMuestra, gastosMuestra, periodo);

    expect(conc.items.length).toBeGreaterThanOrEqual(1);
    const dia1 = conc.items.find((it) => it.fecha === '2026-03-15');
    expect(dia1).toBeDefined();
    expect(dia1?.estado).toBe('cuadrado');
    expect(dia1?.ventasEfectivoSistema).toBe(45000);
    expect(dia1?.ventasTransferenciaSistema).toBe(30000);
    expect(dia1?.totalEgresosCaja).toBe(35000);
  });

  it('genera asientos contables en partida doble (Sum Débito === Sum Crédito)', () => {
    const mapeo = getMapeoPucDefault();
    const asientos = generarAsientosContablesVentas(ventasMuestra, mapeo, 'LA PARADA');

    expect(asientos.length).toBeGreaterThan(0);

    const totalDebito = asientos.reduce((acc, a) => acc + a.debito, 0);
    const totalCredito = asientos.reduce((acc, a) => acc + a.credito, 0);

    // Tolerancia por redondeos de pesos
    expect(Math.abs(totalDebito - totalCredito)).toBeLessThanOrEqual(2);
  });

  it('exporta archivos CSV con BOM UTF-8 y cabeceras correctas', () => {
    const periodo = getRangoFechaContable('mes_actual', new Date('2026-03-15'));
    const libro = generarLibroFiscalDiario(ventasMuestra, gastosMuestra, periodo, dummyConfigFiscal);
    const csvLibro = exportarLibroFiscalCSV(libro, 'LA PARADA', '901458789');

    expect(csvLibro.startsWith('\uFEFF')).toBe(true);
    expect(csvLibro).toContain('LIBRO FISCAL DE REGISTRO DE OPERACIONES DIARIAS');
    expect(csvLibro).toContain('INGRESOS_GRAVADOS_INC8');

    const liq = calcularLiquidacionFormulario310(ventasMuestra, 2026, 2, dummyConfigFiscal);
    const csv310 = exportarFormulario310CSV(liq, 'LA PARADA', '901458789');
    expect(csv310.startsWith('\uFEFF')).toBe(true);
    expect(csv310).toContain('FORMULARIO 310 DIAN');

    const conc = calcularConciliacionVentasVsCaja(ventasMuestra, cierresMuestra, gastosMuestra, periodo);
    const csvConc = exportarConciliacionCSV(conc, 'LA PARADA');
    expect(csvConc.startsWith('\uFEFF')).toBe(true);
    expect(csvConc).toContain('CONCILIACION CONTABLE');

    const mapeo = getMapeoPucDefault();
    const asientos = generarAsientosContablesVentas(ventasMuestra, mapeo, 'LA PARADA');
    const csvSiigo = exportarSoftwareContableCSV(asientos, 'siigo', 'LA PARADA');
    expect(csvSiigo).toContain('INTERFAZ CONTABLE DE VENTAS E INGRESOS PARA SIIGO');

    const csvWorld = exportarSoftwareContableCSV(asientos, 'world_office', 'LA PARADA');
    expect(csvWorld).toContain('WORLD OFFICE');

    const csvHelisa = exportarSoftwareContableCSV(asientos, 'helisa', 'LA PARADA');
    expect(csvHelisa).toContain('HELISA');
  });

  it('genera resumen para WhatsApp del contador', () => {
    const periodo = getRangoFechaContable('mes_actual', new Date('2026-03-15'));
    const libro = generarLibroFiscalDiario(ventasMuestra, gastosMuestra, periodo, dummyConfigFiscal);
    const liq = calcularLiquidacionFormulario310(ventasMuestra, 2026, 2, dummyConfigFiscal);
    const conc = calcularConciliacionVentasVsCaja(ventasMuestra, cierresMuestra, gastosMuestra, periodo);

    const txt = generarResumenWhatsAppContable(liq, conc, libro, 'La Parada');
    expect(txt).toContain('INFORME CONTABLE & TRIBUTARIO');
    expect(txt).toContain('FORMULARIO 310 DIAN');
    expect(txt).toContain('LIBRO FISCAL');
  });
});
