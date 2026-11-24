import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { LoteInventario } from '@/types';
import {
  calcularDiasParaVencer,
  calcularFechaVencimientoDesdeHoras,
  calcularResumenSanitarioBodega,
  construirAlertasSanitariasLotes,
  escapeCsvSeguro,
  esFechaIsoValida,
  evaluarLotesSanitarios,
  evaluarSemaforoLote,
  filtrarLotesInventario,
  generarCodigoLote,
  generarCsvTrazabilidadSanitaria,
  generarResumenSanitarioWhatsApp,
  normalizarCodigoLote,
  obtenerFechaIsoColombia,
  obtenerResumenLotesPorInsumo,
  ordenarLotesPeps,
  planificarConsumoPeps,
  sumarDiasAFechaIso,
} from '../lotesInventarioUtils';
import { sintetizarAlertasOperativasEnVivo } from '../notificacionesUtils';

function makeTs(isoUtc: string): Timestamp {
  const date = new Date(isoUtc);
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
  } as unknown as Timestamp;
}

function makeLote(overrides: Partial<LoteInventario> = {}): LoteInventario {
  return {
    id: 'lote-1',
    negocioId: 'laparada',
    insumoId: 'ins-queso',
    insumoNombre: 'Queso Costeño',
    unidadMedida: 'kg',
    codigoLote: 'LOT-20261123-AA01',
    cantidadInicial: 10,
    cantidadDisponible: 10,
    cantidadConsumida: 0,
    cantidadMerma: 0,
    costoUnitario: 18000,
    costoTotalInicial: 180000,
    proveedor: 'Lácteos del Norte',
    fechaIngreso: makeTs('2026-11-20T12:00:00Z'),
    fechaVencimiento: '2026-11-30',
    estado: 'activo',
    origen: 'compra_entrada',
    ubicacionBodega: 'nevera_refrigeracion',
    creadoEn: makeTs('2026-11-20T12:00:00Z'),
    actualizadoEn: makeTs('2026-11-20T12:00:00Z'),
    ...overrides,
  };
}

describe('lotesInventarioUtils', () => {
  // 2026-11-23 23:00 Bogota = 2026-11-24 04:00 UTC (verifica corte correcto en America/Bogota)
  const ahoraBogota = new Date('2026-11-24T04:00:00Z');

  it('calcula fechas calendario en America/Bogota y valida fechas ISO reales', () => {
    expect(obtenerFechaIsoColombia(ahoraBogota)).toBe('2026-11-23');
    expect(esFechaIsoValida('2026-11-23')).toBe(true);
    expect(esFechaIsoValida('2026-02-31')).toBe(false);
    expect(esFechaIsoValida('2026-13-01')).toBe(false);
    expect(sumarDiasAFechaIso('2026-11-23', 7)).toBe('2026-11-30');
    expect(calcularFechaVencimientoDesdeHoras(48, ahoraBogota)).toBe('2026-11-25');
  });

  it('evalúa correctamente los 5 estados del semáforo sanitario', () => {
    expect(calcularDiasParaVencer('2026-11-22', ahoraBogota)).toBe(-1);
    expect(evaluarSemaforoLote('2026-11-22', ahoraBogota)).toBe('vencido');
    expect(evaluarSemaforoLote('2026-11-23', ahoraBogota)).toBe('critico_3d');
    expect(evaluarSemaforoLote('2026-11-26', ahoraBogota)).toBe('critico_3d');
    expect(evaluarSemaforoLote('2026-11-27', ahoraBogota)).toBe('proximo_7d');
    expect(evaluarSemaforoLote('2026-11-30', ahoraBogota)).toBe('proximo_7d');
    expect(evaluarSemaforoLote('2026-12-01', ahoraBogota)).toBe('vigente');
    expect(evaluarSemaforoLote(null, ahoraBogota)).toBe('sin_vencimiento');
  });

  it('ordena lotes por criterio PEPS (fecha de vencimiento ascendente y luego ingreso FIFO)', () => {
    const lSinFecha = makeLote({ id: 'l-sin', fechaVencimiento: null });
    const lLejano = makeLote({
      id: 'l-lejano',
      fechaVencimiento: '2026-12-10',
      fechaIngreso: makeTs('2026-11-18T10:00:00Z'),
    });
    const lMismoDiaNuevo = makeLote({
      id: 'l-dia-nuevo',
      fechaVencimiento: '2026-11-25',
      fechaIngreso: makeTs('2026-11-21T10:00:00Z'),
    });
    const lMismoDiaViejo = makeLote({
      id: 'l-dia-viejo',
      fechaVencimiento: '2026-11-25',
      fechaIngreso: makeTs('2026-11-19T10:00:00Z'),
    });

    const ordenados = ordenarLotesPeps([lSinFecha, lLejano, lMismoDiaNuevo, lMismoDiaViejo]);
    expect(ordenados.map((l) => l.id)).toEqual([
      'l-dia-viejo',
      'l-dia-nuevo',
      'l-lejano',
      'l-sin',
    ]);

    const evaluados = evaluarLotesSanitarios([lSinFecha, lLejano, lMismoDiaNuevo, lMismoDiaViejo], ahoraBogota);
    expect(evaluados.find((l) => l.id === 'l-dia-viejo')?.esPrimeroPeps).toBe(true);
    expect(evaluados.filter((l) => l.esPrimeroPeps)).toHaveLength(1);
  });

  it('planificarConsumoPeps consume en cascada PEPS, omite lotes vencidos y cuarentena, y reporta excedente sin lote', () => {
    const lotes: LoteInventario[] = [
      makeLote({
        id: 'l-vencido',
        codigoLote: 'LOT-VENC',
        cantidadDisponible: 5,
        fechaVencimiento: '2026-11-20',
      }),
      makeLote({
        id: 'l-cuarentena',
        codigoLote: 'LOT-CUAR',
        cantidadDisponible: 5,
        fechaVencimiento: '2026-11-24',
        estado: 'cuarentena',
      }),
      makeLote({
        id: 'l-peps-1',
        codigoLote: 'LOT-P1',
        cantidadDisponible: 3,
        fechaVencimiento: '2026-11-25',
      }),
      makeLote({
        id: 'l-peps-2',
        codigoLote: 'LOT-P2',
        cantidadDisponible: 4,
        fechaVencimiento: '2026-11-29',
      }),
    ];

    const plan = planificarConsumoPeps('ins-queso', 8.5, lotes, { ahora: ahoraBogota });

    expect(plan.lotesVencidosOmitidos).toBe(1);
    expect(plan.cantidadCubiertaPorLotes).toBe(7);
    expect(plan.cantidadSinLote).toBe(1.5);
    expect(plan.asignaciones).toEqual([
      {
        loteId: 'l-peps-1',
        codigoLote: 'LOT-P1',
        cantidadConsumida: 3,
        cantidadRestante: 0,
        nuevoEstado: 'agotado',
        fechaVencimiento: '2026-11-25',
      },
      {
        loteId: 'l-peps-2',
        codigoLote: 'LOT-P2',
        cantidadConsumida: 4,
        cantidadRestante: 0,
        nuevoEstado: 'agotado',
        fechaVencimiento: '2026-11-29',
      },
    ]);
  });

  it('calcula resumen sanitario de bodega, resumen por insumo, filtros y alertas deduplicables', () => {
    const lotes: LoteInventario[] = [
      makeLote({
        id: 'l1',
        insumoId: 'ins-1',
        insumoNombre: 'Queso',
        codigoLote: 'LOT-01',
        cantidadDisponible: 2,
        costoUnitario: 10000,
        fechaVencimiento: '2026-11-22', // vencido -> 20,000
      }),
      makeLote({
        id: 'l2',
        insumoId: 'ins-1',
        insumoNombre: 'Queso',
        codigoLote: 'LOT-02',
        cantidadDisponible: 3,
        costoUnitario: 10000,
        fechaVencimiento: '2026-11-25', // critico_3d -> 30,000
      }),
      makeLote({
        id: 'l3',
        insumoId: 'ins-2',
        insumoNombre: 'Pan',
        codigoLote: 'LOT-03',
        cantidadDisponible: 5,
        costoUnitario: 2000,
        fechaVencimiento: '2026-11-28', // proximo_7d -> 10,000
      }),
      makeLote({
        id: 'l4',
        insumoId: 'ins-3',
        insumoNombre: 'Aceite',
        codigoLote: 'LOT-04',
        cantidadDisponible: 10,
        costoUnitario: 5000,
        fechaVencimiento: '2026-12-20', // vigente -> 50,000
      }),
      makeLote({
        id: 'l5',
        insumoId: 'ins-4',
        insumoNombre: 'Salsa Cuarentena',
        codigoLote: 'LOT-05',
        cantidadDisponible: 4,
        estado: 'cuarentena',
        fechaVencimiento: '2026-11-24',
      }),
    ];

    const resumen = calcularResumenSanitarioBodega(lotes, ahoraBogota);
    expect(resumen.totalLotesActivos).toBe(4);
    expect(resumen.vencidosCount).toBe(1);
    expect(resumen.criticos3dCount).toBe(1);
    expect(resumen.proximos7dCount).toBe(1);
    expect(resumen.vigentesCount).toBe(1);
    expect(resumen.cuarentenaCount).toBe(1);
    expect(resumen.valorVencidoCOP).toBe(20000);
    expect(resumen.valorProximo7dCOP).toBe(40000);
    expect(resumen.valorEnRiesgoCOP).toBe(60000);
    expect(resumen.estadoGlobal).toBe('critico');
    expect(resumen.loteMasUrgente?.id).toBe('l1');

    const porInsumo = obtenerResumenLotesPorInsumo(lotes, ahoraBogota);
    expect(porInsumo['ins-1'].cantidadLotesActivos).toBe(2);
    expect(porInsumo['ins-1'].peorSemaforo).toBe('vencido');
    expect(porInsumo['ins-1'].proximoVencimiento).toBe('2026-11-22');

    const evaluados = evaluarLotesSanitarios(lotes, ahoraBogota);
    const soloRiesgo = filtrarLotesInventario(evaluados, {
      estadoLote: 'activo',
      estadoSemaforo: 'en_riesgo',
    });
    expect(soloRiesgo.map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);

    const alertas = construirAlertasSanitariasLotes(lotes, ahoraBogota);
    expect(alertas).toHaveLength(3);
    expect(alertas[0].urgencia).toBe('critica');
    expect(alertas[0].metadata?.claveSanitaria).toBe('l1_vencido_2026-11-23');
    expect(alertas[1].urgencia).toBe('alta');
    expect(alertas[2].urgencia).toBe('media');

    const alertasUnificadas = sintetizarAlertasOperativasEnVivo({
      lotes,
      ahora: ahoraBogota,
    });
    expect(alertasUnificadas).toHaveLength(3);
  });

  it('exporta CSV con UTF-8 BOM neutralizando inyección de fórmulas y genera resumen WhatsApp', () => {
    expect(escapeCsvSeguro('=SUM(A1:A2)')).toBe(`"'=SUM(A1:A2)"`);
    expect(escapeCsvSeguro('-1500')).toBe(`"-1500"`);
    expect(escapeCsvSeguro('@cmd')).toBe(`"'@cmd"`);

    const lotePeligroso = makeLote({
      insumoNombre: '=HYPERLINK("http://evil")',
      proveedor: '+Distribuidora',
      notas: '@revisar',
    });

    const csv = generarCsvTrazabilidadSanitaria([lotePeligroso], 'La Parada', ahoraBogota);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"")"`);
    expect(csv).toContain(`"'+Distribuidora"`);
    expect(csv).toContain(`"'@revisar"`);

    const waEncoded = generarResumenSanitarioWhatsApp([lotePeligroso], 'La Parada', ahoraBogota);
    const waText = decodeURIComponent(waEncoded);
    expect(waText).toContain('SEMÁFORO SANITARIO PEPS');
    expect(waText).toContain('LOT-20261123-AA01');
  });

  it('normaliza y genera códigos de lote válidos', () => {
    const gen = generarCodigoLote('prep', ahoraBogota);
    expect(gen).toMatch(/^PREP-20261123-[A-Z0-9]{4}$/);
    expect(normalizarCodigoLote(' lot 001 ', 'LOT', ahoraBogota)).toBe('LOT-001');
    expect(normalizarCodigoLote('', 'LOT', ahoraBogota)).toMatch(/^LOT-20261123-[A-Z0-9]{4}$/);
  });
});
