import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { Domicilio, LiquidacionDomiciliario } from '@/types';
import {
  calcularDiferenciaRendicion,
  calcularLiquidacionConBase,
  calcularResumenBasesRutaTurno,
  formatearActaLiquidacionWhatsApp,
  generarCodigoActaLiquidacion,
  generarCsvLiquidacionesDomiciliarios,
  obtenerIdsDomiciliosYaLiquidados,
} from '../liquidacionDomiciliariosUtils';
import { calcularEfectivoEsperadoTurno } from '../movimientosCajaUtils';

function buildDomicilio(overrides: Partial<Domicilio>): Domicilio {
  return {
    id: 'dom-1',
    negocioId: 'laparada',
    clienteNombre: 'Carlos',
    clienteTelefono: '3001112233',
    direccion: 'Calle 10',
    barrio: 'Centro',
    items: [],
    total: 25000,
    metodoPago: 'efectivo',
    origen: 'pos',
    estado: 'entregado',
    creadoEn: new Date() as unknown as Timestamp,
    actualizadoEn: new Date() as unknown as Timestamp,
    ...overrides,
  };
}

describe('liquidacionDomiciliariosUtils', () => {
  it('genera códigos consecutivos LQ-XXXX correctamente', () => {
    expect(generarCodigoActaLiquidacion([])).toBe('LQ-0001');
    expect(
      generarCodigoActaLiquidacion([
        { codigoActa: 'LQ-0001' },
        { codigoActa: 'LQ-0004' },
      ])
    ).toBe('LQ-0005');
  });

  it('calcula liquidación integrando base inicial y excluyendo carreras ya liquidadas', () => {
    const domicilios: Domicilio[] = [
      buildDomicilio({ id: 'd1', domiciliarioId: 'rep-1', total: 30000, metodoPago: 'efectivo' }),
      buildDomicilio({ id: 'd2', domiciliarioId: 'rep-1', total: 20000, metodoPago: 'transferencia' }),
      buildDomicilio({ id: 'd3', domiciliarioId: 'rep-1', total: 15000, metodoPago: 'efectivo' }),
      buildDomicilio({ id: 'd4', domiciliarioId: 'rep-2', total: 50000, metodoPago: 'efectivo' }),
    ];

    const idsYaLiquidados = new Set<string>(['d3']);

    const resultado = calcularLiquidacionConBase(domicilios, {
      domiciliarioId: 'rep-1',
      montoBaseInicial: 50000,
      idsYaLiquidados,
    });

    expect(resultado.totalEntregas).toBe(2);
    expect(resultado.totalEfectivo).toBe(30000);
    expect(resultado.totalTransferencia).toBe(20000);
    expect(resultado.montoBaseInicial).toBe(50000);
    expect(resultado.efectivoEsperadoRendir).toBe(80000);
    expect(resultado.domicilioIds).toEqual(['d1', 'd2']);
  });

  it('evalúa cuadre, sobrante y faltante en rendición física', () => {
    expect(calcularDiferenciaRendicion(80000, 80000)).toEqual({
      diferencia: 0,
      estadoCuadre: 'cuadrado',
    });
    expect(calcularDiferenciaRendicion(80000, 82000)).toEqual({
      diferencia: 2000,
      estadoCuadre: 'sobrante',
    });
    expect(calcularDiferenciaRendicion(80000, 75000)).toEqual({
      diferencia: -5000,
      estadoCuadre: 'faltante',
    });
  });

  it('resume bases activas en ruta y liquidaciones cerradas del turno', () => {
    const lista: LiquidacionDomiciliario[] = [
      {
        id: '1',
        negocioId: 'laparada',
        codigoActa: 'LQ-0001',
        domiciliarioId: 'rep-1',
        domiciliarioNombre: 'Juan',
        estado: 'activa',
        montoBaseInicial: 50000,
        entregadoPor: 'Cajero',
        fechaEntregaBase: new Date(),
        totalEntregas: 0,
        domicilioIds: [],
        totalEfectivoCobrado: 0,
        totalTransferencias: 0,
        efectivoEsperadoRendir: 50000,
        efectivoEntregadoFisico: 0,
        diferencia: 0,
        conciliadoConCaja: false,
      },
      {
        id: '2',
        negocioId: 'laparada',
        codigoActa: 'LQ-0002',
        domiciliarioId: 'rep-2',
        domiciliarioNombre: 'Pedro',
        estado: 'liquidada',
        montoBaseInicial: 30000,
        entregadoPor: 'Cajero',
        fechaEntregaBase: new Date(),
        totalEntregas: 3,
        domicilioIds: ['d1', 'd2', 'd3'],
        totalEfectivoCobrado: 70000,
        totalTransferencias: 25000,
        efectivoEsperadoRendir: 100000,
        efectivoEntregadoFisico: 98000,
        diferencia: -2000,
        conciliadoConCaja: true,
        fechaLiquidacion: new Date(),
      },
    ];

    const resumen = calcularResumenBasesRutaTurno(lista);
    expect(resumen.cantidadBasesActivas).toBe(1);
    expect(resumen.totalBaseEnRutaActiva).toBe(50000);
    expect(resumen.cantidadLiquidadasHoy).toBe(1);
    expect(resumen.totalEfectivoRendidoHoy).toBe(98000);
    expect(resumen.totalTransferenciasValidadasHoy).toBe(25000);
    expect(resumen.totalDiferenciasHoy).toBe(-2000);

    const idsLiquidados = obtenerIdsDomiciliosYaLiquidados(lista);
    expect(idsLiquidados.has('d1')).toBe(true);
    expect(idsLiquidados.has('d3')).toBe(true);
  });

  it('concilia bases activas en ruta con el efectivo esperado del cajón de caja', () => {
    const efectivoConBaseEnCalle = calcularEfectivoEsperadoTurno({
      montoInicialCaja: 100000,
      ventasEfectivo: 35000,
      totalGastos: 0,
      basesEnRutaActivas: 50000,
    });
    expect(efectivoConBaseEnCalle).toBe(85000);

    const efectivoTrasLiquidar = calcularEfectivoEsperadoTurno({
      montoInicialCaja: 100000,
      ventasEfectivo: 35000,
      totalGastos: 0,
      basesEnRutaActivas: 0,
    });
    expect(efectivoTrasLiquidar).toBe(135000);
  });

  it('formatea acta WhatsApp y CSV seguro contra inyección de fórmulas', () => {
    const acta: LiquidacionDomiciliario = {
      id: 'l1',
      negocioId: 'laparada',
      codigoActa: 'LQ-0001',
      domiciliarioId: 'rep-1',
      domiciliarioNombre: '=CMD()',
      estado: 'liquidada',
      montoBaseInicial: 40000,
      entregadoPor: 'Admin',
      fechaEntregaBase: new Date('2026-11-19T12:00:00Z'),
      totalEntregas: 2,
      domicilioIds: ['d1', 'd2'],
      totalEfectivoCobrado: 45000,
      totalTransferencias: 15000,
      efectivoEsperadoRendir: 85000,
      efectivoEntregadoFisico: 85000,
      diferencia: 0,
      conciliadoConCaja: true,
      cajeroReceptor: 'Cajero 1',
      fechaLiquidacion: new Date('2026-11-19T18:00:00Z'),
    };

    const wa = formatearActaLiquidacionWhatsApp(acta, 'La Parada');
    expect(wa).toContain('LQ-0001');
    expect(wa).toContain('CUADRADO');

    const csv = generarCsvLiquidacionesDomiciliarios([acta]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=CMD()");
  });
});
