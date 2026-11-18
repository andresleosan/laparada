import { describe, expect, it } from 'vitest';
import type { Combo, CotizacionComercial, Insumo, ItemCotizacion, Producto } from '@/types';
import {
  calcularMetricasCotizaciones,
  calcularTotalesCotizacion,
  construirItemsVentaDesdeCotizacion,
  construirMensajeAnticipoCotizacionWhatsApp,
  construirMensajeCotizacionWhatsApp,
  filtrarCotizaciones,
  generarCodigoCotizacion,
  generarCotizacionesCsv,
  generarUrlWhatsAppCotizacion,
  obtenerEstadoEfectivoCotizacion,
  simularCostosYMargenCotizacion,
} from '../cotizacionesUtils';

const mockInsumos: Insumo[] = [
  {
    id: 'ins-queso',
    nombre: 'Queso Costeño',
    stockActual: 5,
    stockMinimo: 2,
    unidad: 'kg',
    costoUnitario: 24000,
    negocioId: 'laparada',
    creadoEn: new Date() as unknown as Insumo['creadoEn'],
    actualizadoEn: new Date() as unknown as Insumo['actualizadoEn'],
  },
  {
    id: 'ins-masa',
    nombre: 'Masa Artesanal',
    stockActual: 10,
    stockMinimo: 3,
    unidad: 'kg',
    costoUnitario: 8000,
    negocioId: 'laparada',
    creadoEn: new Date() as unknown as Insumo['creadoEn'],
    actualizadoEn: new Date() as unknown as Insumo['actualizadoEn'],
  },
];

const mockProductos: Producto[] = [
  {
    id: 'prod-tequenos',
    nombre: 'Tequeños x6',
    descripcion: 'Clásicos',
    precio: 14000,
    disponible: true,
    negocioId: 'laparada',
    receta: [
      { insumoId: 'ins-queso', nombreSnapshot: 'Queso Costeño', cantidad: 0.2, unidadSnapshot: 'kg' },
      { insumoId: 'ins-masa', nombreSnapshot: 'Masa Artesanal', cantidad: 0.15, unidadSnapshot: 'kg' },
    ],
    creadoEn: new Date() as unknown as Producto['creadoEn'],
    actualizadoEn: new Date() as unknown as Producto['actualizadoEn'],
  },
  {
    id: 'prod-limonada',
    nombre: 'Limonada Natural',
    descripcion: 'Bebida',
    precio: 6000,
    disponible: true,
    costoReferencia: 1500,
    negocioId: 'laparada',
    creadoEn: new Date() as unknown as Producto['creadoEn'],
    actualizadoEn: new Date() as unknown as Producto['actualizadoEn'],
  },
];

const mockCombos: Combo[] = [
  {
    id: 'combo-corp',
    nombre: 'Combo Ejecutivo Parada',
    descripcion: 'Tequeños + Limonada',
    precioEspecial: 18000,
    disponible: true,
    negocioId: 'laparada',
    items: [
      { productoId: 'prod-tequenos', cantidad: 1, nombreSnapshot: 'Tequeños x6' },
      { productoId: 'prod-limonada', cantidad: 1, nombreSnapshot: 'Limonada Natural' },
    ],
    creadoEn: new Date() as unknown as Combo['creadoEn'],
    actualizadoEn: new Date() as unknown as Combo['actualizadoEn'],
  },
];

function buildMockCotizacion(
  overrides: Partial<CotizacionComercial> = {}
): CotizacionComercial {
  return {
    id: 'cot-1',
    negocioId: 'laparada',
    codigo: 'COT-2026-001',
    clienteNombre: 'Laura Gómez',
    empresa: 'Constructora Norte S.A.S.',
    nitEmpresa: '901.234.567-8',
    clienteTelefono: '3151234567',
    tipoEvento: 'corporativo',
    modalidadEntrega: 'domicilio_evento',
    fechaEvento: '2026-11-22',
    horaEvento: '12:30',
    fechaVencimiento: '2026-11-30',
    invitados: 30,
    direccionEvento: 'Av. Libertadores #12-40',
    barrioEvento: 'Caobos',
    items: [
      {
        id: 'i1',
        tipo: 'producto',
        referenciaId: 'prod-tequenos',
        nombre: 'Tequeños x6',
        cantidad: 30,
        precioUnitario: 14000,
        subtotal: 420000,
      },
    ],
    subtotal: 420000,
    descuento: 20000,
    descuentoMotivo: 'Volumen corporativo',
    costoLogistica: 15000,
    totalCotizado: 415000,
    costoEstimadoInsumos: 180000,
    utilidadEstimada: 235000,
    margenEstimadoPct: 56.6,
    anticipoMonto: 200000,
    anticipoMetodo: 'transferencia',
    anticipoEstado: 'verificado',
    anticipoReferencia: 'Nequi #88412',
    saldoPendiente: 215000,
    estado: 'aprobada',
    ...overrides,
  };
}

describe('cotizacionesUtils', () => {
  it('genera códigos correlativos por año de forma determinista', () => {
    const fecha = new Date('2026-11-18T12:00:00');
    expect(generarCodigoCotizacion([], fecha)).toBe('COT-2026-001');
    expect(
      generarCodigoCotizacion(
        [{ codigo: 'COT-2026-001' }, { codigo: 'COT-2026-009' }, { codigo: 'COT-2025-099' }],
        fecha
      )
    ).toBe('COT-2026-010');
  });

  it('calcula totales comerciales defensivamente evitando montos negativos o descuentos excedentes', () => {
    const items: ItemCotizacion[] = [
      {
        id: '1',
        tipo: 'producto',
        referenciaId: 'prod-tequenos',
        nombre: 'Tequeños x6',
        cantidad: 10,
        precioUnitario: 14000,
        subtotal: 140000,
      },
      {
        id: '2',
        tipo: 'servicio_extra',
        nombre: 'Menaje',
        cantidad: 1,
        precioUnitario: 30000,
        subtotal: 30000,
      },
    ];

    const res = calcularTotalesCotizacion({
      items,
      descuento: 999999,
      costoLogistica: 15000,
      anticipoMonto: 25000,
      anticipoEstado: 'verificado',
    });

    expect(res.subtotalProductos).toBe(140000);
    expect(res.subtotalServiciosExtras).toBe(30000);
    expect(res.subtotal).toBe(170000);
    expect(res.descuento).toBe(170000);
    expect(res.totalCotizado).toBe(15000);
    expect(res.anticipoAplicable).toBe(15000);
    expect(res.saldoPendiente).toBe(0);
  });

  it('simula costos de insumos por escandallo, detecta déficit de bodega y calcula margen bruto del evento', () => {
    const items: ItemCotizacion[] = [
      {
        id: 'i1',
        tipo: 'producto',
        referenciaId: 'prod-tequenos',
        nombre: 'Tequeños x6',
        cantidad: 30, // Requiere 30 * 0.2 = 6 kg queso (stock 5 -> faltante 1 kg) y 4.5 kg masa (stock 10 -> OK)
        precioUnitario: 14000,
        subtotal: 420000,
      },
      {
        id: 'i2',
        tipo: 'producto',
        referenciaId: 'prod-limonada',
        nombre: 'Limonada Natural',
        cantidad: 30, // Costo referencia: 30 * 1500 = 45000
        precioUnitario: 6000,
        subtotal: 180000,
      },
      {
        id: 'i3',
        tipo: 'servicio_extra',
        nombre: 'Mesero evento',
        cantidad: 1,
        precioUnitario: 90000,
        subtotal: 90000,
        costoUnitarioEstimado: 60000,
      },
    ];

    const sim = simularCostosYMargenCotizacion({
      items,
      productos: mockProductos,
      combos: mockCombos,
      insumos: mockInsumos,
      descuentoPorcentaje: 10,
      costoLogistica: 20000,
      invitados: 30,
    });

    // Queso: 6 * 24000 = 144000; Masa: 4.5 * 8000 = 36000; Limonada ref: 45000 -> Insumos = 225000
    expect(sim.costoInsumosCOP).toBe(225000);
    expect(sim.costoServiciosEstimadoCOP).toBe(60000);
    expect(sim.costoTotalEstimadoCOP).toBe(285000);
    // Subtotal = 690000, Dcto 10% = 69000, Logistica = 20000 -> Total = 641000
    expect(sim.totalCotizadoCOP).toBe(641000);
    expect(sim.utilidadBrutaCOP).toBe(356000);
    expect(sim.margenBrutoPct).toBeCloseTo(55.5, 1);
    expect(sim.nivelRentabilidad).toBe('optimo');
    expect(sim.insumosConDeficit).toHaveLength(1);
    expect(sim.insumosConDeficit[0]).toMatchObject({
      insumoId: 'ins-queso',
      cantidadRequerida: 6,
      stockActual: 5,
      faltante: 1,
      tieneStockSuficiente: false,
    });
  });

  it('detecta vencimiento efectivo únicamente para borradores o enviadas expiradas', () => {
    const ahoraMs = new Date('2026-12-05T10:00:00').getTime();
    expect(
      obtenerEstadoEfectivoCotizacion(
        { estado: 'enviada', fechaVencimiento: '2026-11-30' },
        ahoraMs
      )
    ).toBe('vencida');
    expect(
      obtenerEstadoEfectivoCotizacion(
        { estado: 'aprobada', fechaVencimiento: '2026-11-30' },
        ahoraMs
      )
    ).toBe('aprobada');
    expect(
      obtenerEstadoEfectivoCotizacion(
        { estado: 'convertida', fechaVencimiento: '2026-11-30' },
        ahoraMs
      )
    ).toBe('convertida');
  });

  it('construye propuesta formal por WhatsApp sin filtrar jamás costos internos ni márgenes', () => {
    const cot = buildMockCotizacion();
    const mensaje = construirMensajeCotizacionWhatsApp(cot, {
      nombre: 'La Parada Grill',
      telefono: '3109998877',
      direccion: 'Calle 10 #4-25',
    });

    expect(mensaje).toContain('PROPUESTA COMERCIAL & CATERING — LA PARADA GRILL');
    expect(mensaje).toContain('COT-2026-001');
    expect(mensaje).toContain('Constructora Norte S.A.S.');
    expect(mensaje).toContain('901.234.567-8');
    expect(mensaje).toContain('30× Tequeños x6');
    expect(mensaje).toContain('Nequi #88412');
    // Verificación crítica de privacidad comercial:
    expect(mensaje).not.toMatch(/margen|utilidad|food cost|180\.000|235\.000|56\.6/i);

    const url = generarUrlWhatsAppCotizacion(cot, { nombre: 'La Parada Grill' });
    expect(url).toMatch(/^https:\/\/wa\.me\/573151234567\?text=/);

    const msgAnticipo = construirMensajeAnticipoCotizacionWhatsApp(cot, 'La Parada Grill');
    expect(msgAnticipo).toContain('CONFIRMACIÓN DE ANTICIPO');
    expect(msgAnticipo).toContain('Nequi #88412');
  });

  it('convierte ítems de cotización + logística a ItemVenta[] válidos para POS y KDS', () => {
    const cot = buildMockCotizacion();
    const itemsVenta = construirItemsVentaDesdeCotizacion(cot.items, cot.costoLogistica);
    expect(itemsVenta).toHaveLength(2);
    expect(itemsVenta[0]).toMatchObject({
      tipo: 'producto',
      referenciaId: 'prod-tequenos',
      cantidad: 30,
      subtotal: 420000,
    });
    expect(itemsVenta[1]).toMatchObject({
      referenciaId: 'servicio_logistica_catering',
      subtotal: 15000,
    });
  });

  it('calcula métricas del pipeline, filtra y genera CSV protegido contra inyección de fórmulas', () => {
    const ahoraMs = new Date('2026-11-18T12:00:00').getTime();
    const lista: CotizacionComercial[] = [
      buildMockCotizacion({ id: 'c1', estado: 'aprobada', fechaEvento: '2026-11-22' }),
      buildMockCotizacion({
        id: 'c2',
        codigo: 'COT-2026-002',
        empresa: '=HYPERLINK("http://malicioso","Empresa")',
        estado: 'convertida',
        totalCotizado: 500000,
        anticipoMonto: 250000,
        saldoPendiente: 0,
      }),
    ];

    const metricas = calcularMetricasCotizaciones(lista, ahoraMs);
    expect(metricas.total).toBe(2);
    expect(metricas.aprobadas).toBe(1);
    expect(metricas.convertidas).toBe(1);
    expect(metricas.pipelineActivoCOP).toBe(415000);
    expect(metricas.totalConvertidoCOP).toBe(500000);
    expect(metricas.totalAnticiposVerificadosCOP).toBe(450000);
    expect(metricas.eventosProximos7Dias).toBe(1);
    expect(metricas.tasaConversionPct).toBe(50);

    const filtradas = filtrarCotizaciones(
      lista,
      { estado: 'aprobada', tipoEvento: 'corporativo', busqueda: 'Constructora' },
      ahoraMs
    );
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].id).toBe('c1');

    const csv = generarCotizacionesCsv(lista, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    // Protección contra fórmula maliciosa en Excel:
    expect(csv).toContain(`"'=HYPERLINK(""http://malicioso"",""Empresa"")"`);
  });
});
