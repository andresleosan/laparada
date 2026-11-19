import { describe, expect, it } from 'vitest';
import {
  UMBRAL_ALERTA_SANGRIA_DEFAULT,
  calcularEfectivoEsperadoTurno,
  calcularResumenMovimientosCaja,
  filtrarMovimientosCaja,
  formatearActaCorteXTexto,
  formatearComprobanteMovimientoTexto,
  generarCodigoComprobanteCaja,
  generarCodigoCorteX,
  generarCsvMovimientosCaja,
  sanitizarMontoMovimientoCaja,
} from '../movimientosCajaUtils';
import type { CorteXParcial, MovimientoCaja } from '@/types';

const makeMov = (overrides: Partial<MovimientoCaja> = {}): MovimientoCaja => ({
  id: 'mov-1',
  negocioId: 'laparada',
  tipo: 'sangria_caja_fuerte',
  monto: 200000,
  motivo: 'Retiro preventivo a caja fuerte',
  responsableNombre: 'Andrés Cajero',
  codigoComprobante: 'SNG-0001',
  fecha: new Date('2026-11-19T15:00:00Z'),
  ...overrides,
});

describe('movimientosCajaUtils', () => {
  it('sanitiza montos positivos y rechaza valores negativos o NaN', () => {
    expect(sanitizarMontoMovimientoCaja(50000)).toBe(50000);
    expect(sanitizarMontoMovimientoCaja(12345.6)).toBe(12346);
    expect(sanitizarMontoMovimientoCaja(-1000)).toBe(0);
    expect(sanitizarMontoMovimientoCaja(NaN)).toBe(0);
  });

  it('genera códigos consecutivos de comprobantes y Cortes X', () => {
    const movs = [
      makeMov({ tipo: 'sangria_caja_fuerte', codigoComprobante: 'SNG-0001' }),
      makeMov({ tipo: 'sangria_caja_fuerte', codigoComprobante: 'SNG-0003' }),
      makeMov({ tipo: 'ingreso_sencillo', codigoComprobante: 'SEN-0002' }),
    ];

    expect(generarCodigoComprobanteCaja('sangria_caja_fuerte', movs)).toBe('SNG-0004');
    expect(generarCodigoComprobanteCaja('ingreso_sencillo', movs)).toBe('SEN-0003');
    expect(generarCodigoComprobanteCaja('egreso_caja_menor', movs)).toBe('CMN-0001');

    expect(generarCodigoCorteX([{ codigoCorte: 'CX-0002' }])).toBe('CX-0003');
    expect(generarCodigoCorteX([])).toBe('CX-0001');
  });

  it('calcula el resumen de movimientos y dispara alerta de exceso de efectivo al superar el umbral', () => {
    const movs: MovimientoCaja[] = [
      makeMov({ id: '1', tipo: 'ingreso_sencillo', monto: 50000 }),
      makeMov({ id: '2', tipo: 'sangria_caja_fuerte', monto: 200000 }),
      makeMov({ id: '3', tipo: 'egreso_caja_menor', monto: 15000 }),
    ];

    const resumenBajo = calcularResumenMovimientosCaja(movs, 300000);
    expect(resumenBajo.totalIngresosSencillo).toBe(50000);
    expect(resumenBajo.totalSangrias).toBe(200000);
    expect(resumenBajo.totalCajaMenor).toBe(15000);
    expect(resumenBajo.impactoNetoMovimientos).toBe(-165000);
    expect(resumenBajo.alertaExcesoEfectivo).toBe(false);
    expect(resumenBajo.umbralAlertaSangria).toBe(UMBRAL_ALERTA_SANGRIA_DEFAULT);

    const resumenAlto = calcularResumenMovimientosCaja(movs, 550000);
    expect(resumenAlto.alertaExcesoEfectivo).toBe(true);
  });

  it('calcula exactamente el efectivo esperado del turno sin permitir saldos negativos', () => {
    const movs: MovimientoCaja[] = [
      makeMov({ id: '1', tipo: 'ingreso_sencillo', monto: 40000 }),
      makeMov({ id: '2', tipo: 'sangria_caja_fuerte', monto: 150000 }),
      makeMov({ id: '3', tipo: 'egreso_caja_menor', monto: 20000 }),
    ];

    // 100k base + 300k ventas + 50k tandas + 40k sencillo - 150k sangria - 20k caja menor - 30k gastos = 290k
    const esperado = calcularEfectivoEsperadoTurno({
      montoInicialCaja: 100000,
      ventasEfectivo: 300000,
      ventasTandasEfectivo: 50000,
      totalGastos: 30000,
      movimientos: movs,
    });
    expect(esperado).toBe(290000);

    const pisoCero = calcularEfectivoEsperadoTurno({
      montoInicialCaja: 10000,
      ventasEfectivo: 0,
      totalGastos: 50000,
      movimientos: movs,
    });
    expect(pisoCero).toBe(0);
  });

  it('filtra movimientos por tipo y texto de búsqueda', () => {
    const movs: MovimientoCaja[] = [
      makeMov({ id: '1', tipo: 'sangria_caja_fuerte', motivo: 'Sobre caja fuerte', codigoComprobante: 'SNG-0001' }),
      makeMov({ id: '2', tipo: 'egreso_caja_menor', motivo: 'Compra de hielo', codigoComprobante: 'CMN-0001' }),
    ];

    expect(filtrarMovimientosCaja(movs, { tipo: 'egreso_caja_menor' })).toHaveLength(1);
    expect(filtrarMovimientosCaja(movs, { busqueda: 'hielo' })).toHaveLength(1);
    expect(filtrarMovimientosCaja(movs, { busqueda: 'SNG-0001' })).toHaveLength(1);
  });

  it('formatea comprobantes, actas de Corte X y CSV con protección contra inyección de fórmulas', () => {
    const mov = makeMov({
      motivo: '=SUM(A1:A2)',
      autorizadoPor: 'Admin',
      referencia: 'Sobre #4',
    });
    const textoMov = formatearComprobanteMovimientoTexto(mov, { nombre: 'La Parada' });
    expect(textoMov).toContain('SNG-0001');
    expect(textoMov).toContain('LA PARADA');

    const csv = generarCsvMovimientosCaja([mov]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(`"'=SUM(A1:A2)"`);

    const corte: CorteXParcial = {
      id: 'cx-1',
      negocioId: 'laparada',
      codigoCorte: 'CX-0001',
      cajeroSaliente: 'María',
      cajeroEntrante: 'Carlos',
      efectivoInicial: 100000,
      ventasEfectivo: 250000,
      ventasTransferencia: 80000,
      ingresosSencillo: 20000,
      sangriasCajaFuerte: 100000,
      egresosCajaMenor: 10000,
      gastosOperativos: 0,
      efectivoEsperado: 260000,
      arqueo: {
        denominaciones: { b50k: 5, b10k: 1 },
        totalBilletes: 260000,
        totalMonedas: 0,
        totalFisico: 260000,
        efectivoEsperado: 260000,
        diferencia: 0,
        estadoCuadre: 'cuadrado',
      },
      fecha: new Date('2026-11-19T16:00:00Z'),
    };
    const textoCorte = formatearActaCorteXTexto(corte, { nombre: 'La Parada' });
    expect(textoCorte).toContain('ACTA DE CORTE X');
    expect(textoCorte).toContain('CX-0001');
    expect(textoCorte).toContain('CUADRE EXACTO');
  });
});
