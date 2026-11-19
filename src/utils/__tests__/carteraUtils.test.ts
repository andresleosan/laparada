import { describe, expect, it } from 'vitest';
import type { CuentaCorriente, MovimientoCartera } from '@/types';
import {
  calcularFechaVencimiento,
  calcularMetricasCartera,
  construirFilasCartera,
  escaparCeldaCsvCartera,
  evaluarDisponibilidadCupo,
  evaluarEstadoCartera,
  filtrarFilasCartera,
  generarCsvCarteraPorCobrar,
  generarCsvEstadoCuenta,
  generarMensajeEstadoCuentaWhatsApp,
  generarMensajeReciboAbonoWhatsApp,
  generarMensajeRecordatorioCobroWhatsApp,
  generarUrlWhatsAppCartera,
} from '../carteraUtils';

function buildCuenta(overrides: Partial<CuentaCorriente> = {}): CuentaCorriente {
  return {
    id: 'cc_laparada_cli1',
    negocioId: 'laparada',
    clienteId: 'cli1',
    clienteNombre: 'Carlos Mendoza',
    clienteTelefono: '3105551234',
    empresa: 'Clínica Norte SAS',
    nit: '900123456-1',
    cupoCredito: 200000,
    saldoActual: 80000,
    plazoDias: 15,
    estado: 'activa',
    totalConsumosHistorico: 150000,
    totalAbonosHistorico: 70000,
    cantidadConsumos: 3,
    cantidadAbonos: 1,
    creadoEn: new Date('2026-10-01T12:00:00Z'),
    actualizadoEn: new Date('2026-11-01T12:00:00Z'),
    ...overrides,
  };
}

describe('carteraUtils', () => {
  it('evalúa disponibilidad de cupo autorizando montos dentro del disponible y bloqueando sobregiros', () => {
    const cuenta = buildCuenta({ cupoCredito: 200000, saldoActual: 150000 });

    const ok = evaluarDisponibilidadCupo(cuenta, 50000);
    expect(ok.puedeFiarse).toBe(true);
    expect(ok.cupoDisponible).toBe(50000);
    expect(ok.saldoProyectado).toBe(200000);
    expect(ok.porcentajeUsoProyectado).toBe(100);

    const excedido = evaluarDisponibilidadCupo(cuenta, 60000);
    expect(excedido.puedeFiarse).toBe(false);
    expect(excedido.excedente).toBe(10000);
    expect(excedido.motivoRechazo).toContain('Cupo insuficiente');

    const bloqueada = evaluarDisponibilidadCupo(
      buildCuenta({ estado: 'bloqueada', bloqueoMotivo: 'Mora > 30 días' }),
      10000
    );
    expect(bloqueada.puedeFiarse).toBe(false);
    expect(bloqueada.motivoRechazo).toContain('Mora > 30 días');

    const montoCero = evaluarDisponibilidadCupo(cuenta, -500);
    expect(montoCero.puedeFiarse).toBe(false);
  });

  it('calcula vencimientos y clasifica cartera al día, por vencer y vencida con bucket de mora', () => {
    const ahora = new Date('2026-11-18T12:00:00Z');
    const venc = calcularFechaVencimiento(new Date('2026-11-01T12:00:00Z'), 15);
    expect(venc.toISOString().slice(0, 10)).toBe('2026-11-16');

    const cuentaVencida = buildCuenta({
      saldoActual: 90000,
      fechaVencimientoMasAntiguo: new Date('2026-11-08T12:00:00Z'),
    });
    const evalVencida = evaluarEstadoCartera(cuentaVencida, [], ahora);
    expect(evalVencida.estadoCartera).toBe('vencida');
    expect(evalVencida.diasMora).toBe(10);
    expect(evalVencida.bucketMora).toBe('8_15_dias');

    const cuentaPorVencer = buildCuenta({
      saldoActual: 40000,
      fechaVencimientoMasAntiguo: new Date('2026-11-20T12:00:00Z'),
    });
    const evalPorVencer = evaluarEstadoCartera(cuentaPorVencer, [], ahora);
    expect(evalPorVencer.estadoCartera).toBe('por_vencer');
    expect(evalPorVencer.diasMora).toBe(0);

    const cuentaSinDeuda = buildCuenta({ saldoActual: 0 });
    expect(evaluarEstadoCartera(cuentaSinDeuda, [], ahora).estadoCartera).toBe('sin_deuda');
  });

  it('consolida métricas ejecutivas de cartera, mora y recaudos offline del mes', () => {
    const ahora = new Date('2026-11-18T12:00:00Z');
    const c1 = buildCuenta({
      id: 'c1',
      cupoCredito: 300000,
      saldoActual: 120000,
      fechaVencimientoMasAntiguo: new Date('2026-11-10T12:00:00Z'),
    });
    const c2 = buildCuenta({
      id: 'c2',
      cupoCredito: 200000,
      saldoActual: 50000,
      fechaVencimientoMasAntiguo: new Date('2026-11-28T12:00:00Z'),
    });
    const movs: MovimientoCartera[] = [
      {
        id: 'm1',
        negocioId: 'laparada',
        cuentaCorrienteId: 'c1',
        clienteId: 'cli1',
        clienteNombre: 'Carlos Mendoza',
        clienteTelefono: '3105551234',
        tipo: 'abono',
        monto: 40000,
        saldoPrevio: 160000,
        saldoResultante: 120000,
        codigoComprobante: 'ABN-2026-1111',
        metodoPago: 'efectivo',
        fecha: new Date('2026-11-15T15:00:00Z'),
      },
      {
        id: 'm2',
        negocioId: 'laparada',
        cuentaCorrienteId: 'c2',
        clienteId: 'cli2',
        clienteNombre: 'Ana',
        clienteTelefono: '3112223333',
        tipo: 'abono',
        monto: 30000,
        saldoPrevio: 80000,
        saldoResultante: 50000,
        codigoComprobante: 'ABN-2026-2222',
        metodoPago: 'transferencia',
        fecha: new Date('2026-11-16T15:00:00Z'),
      },
    ];

    const metricas = calcularMetricasCartera([c1, c2], movs, ahora);
    expect(metricas.totalCarteraPorCobrar).toBe(170000);
    expect(metricas.totalCarteraVencida).toBe(120000);
    expect(metricas.totalCarteraAlDia).toBe(50000);
    expect(metricas.clientesEnMora).toBe(1);
    expect(metricas.recaudadoMesTotal).toBe(70000);
    expect(metricas.recaudadoMesEfectivo).toBe(40000);
    expect(metricas.recaudadoMesTransferencia).toBe(30000);
    expect(metricas.cupoTotalDisponible).toBe(330000);
  });

  it('filtra filas de cartera, genera mensajes WhatsApp 100% offline y protege CSV contra inyección de fórmulas', () => {
    const ahora = new Date('2026-11-18T12:00:00Z');
    const cuenta = buildCuenta({
      clienteNombre: '=CMD() Carlos',
      saldoActual: 80000,
      fechaVencimientoMasAntiguo: new Date('2026-11-12T12:00:00Z'),
    });
    const filas = construirFilasCartera([cuenta], [], ahora);
    expect(filtrarFilasCartera(filas, { busqueda: 'carlos', estado: 'vencida' })).toHaveLength(1);
    expect(filtrarFilasCartera(filas, { busqueda: 'inexistente', estado: 'todas' })).toHaveLength(0);

    const estadoWa = generarMensajeEstadoCuentaWhatsApp(cuenta, [], 'La Parada', ahora);
    expect(estadoWa).toContain('Estado de Cuenta');
    expect(estadoWa).toContain('efectivo');
    expect(estadoWa).toContain('transferencia');

    const recordatorioWa = generarMensajeRecordatorioCobroWhatsApp(
      cuenta,
      filas[0].evaluacion,
      'La Parada'
    );
    expect(recordatorioWa).toContain('saldo vencido');

    const reciboWa = generarMensajeReciboAbonoWhatsApp(
      cuenta,
      {
        id: 'm1',
        negocioId: 'laparada',
        cuentaCorrienteId: cuenta.id,
        clienteId: cuenta.clienteId,
        clienteNombre: cuenta.clienteNombre,
        clienteTelefono: cuenta.clienteTelefono,
        tipo: 'abono',
        monto: 30000,
        saldoPrevio: 80000,
        saldoResultante: 50000,
        codigoComprobante: 'ABN-2026-9999',
        metodoPago: 'transferencia',
        referenciaTransferencia: 'Nequi #1234',
        fecha: ahora,
      },
      'La Parada'
    );
    expect(reciboWa).toContain('ABN-2026-9999');
    expect(reciboWa).toContain('Nequi #1234');

    expect(generarUrlWhatsAppCartera('3105551234', 'Hola')).toContain('https://wa.me/573105551234');
    expect(escaparCeldaCsvCartera('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");

    const csvCartera = generarCsvCarteraPorCobrar(filas);
    expect(csvCartera.startsWith('\uFEFF')).toBe(true);
    expect(csvCartera).toContain("'=CMD() Carlos");

    const csvEstado = generarCsvEstadoCuenta(cuenta, []);
    expect(csvEstado.startsWith('\uFEFF')).toBe(true);
    expect(csvEstado).toContain('Saldo_Actual_COP,80000');
  });
});
