import { describe, expect, it } from 'vitest';
import type { BonoPrepago, MovimientoBono } from '@/types';
import {
  calcularFechaVencimientoBono,
  calcularMetricasBonos,
  construirFilasAuditoriaBonos,
  construirPayloadQrBono,
  escaparCeldaCsvBono,
  evaluarEstadoBono,
  evaluarRedencionBono,
  extraerCodigoDesdeQrOEntrada,
  filtrarFilasBonos,
  generarCodigoComprobanteBono,
  generarCodigoUnicoBono,
  generarCsvAuditoriaBonos,
  generarMensajeBonoWhatsApp,
  generarMensajeRecargaBonoWhatsApp,
  generarUrlWhatsAppBono,
  normalizarCodigoBono,
} from '../bonosUtils';

const ahora = new Date('2026-11-18T12:00:00.000Z');

function buildBonoBase(overrides: Partial<BonoPrepago> = {}): BonoPrepago {
  return {
    id: 'bono_1',
    negocioId: 'laparada',
    codigo: 'BON-2026-ABCDEF',
    tipo: 'bono_regalo',
    titularNombre: 'María Fernanda',
    titularTelefono: '3105551234',
    compradorNombre: 'Carlos Ruiz',
    mensajeRegalo: 'Feliz cumpleaños',
    montoInicial: 100000,
    saldoActual: 100000,
    totalCargadoHistorico: 100000,
    totalRedimidoHistorico: 0,
    cantidadRecargas: 0,
    cantidadRedenciones: 0,
    recargable: true,
    estado: 'activo',
    metodoPagoEmision: 'efectivo',
    fechaEmision: new Date('2026-11-01T12:00:00.000Z'),
    fechaVencimiento: new Date('2026-12-30T23:59:59.000Z'),
    creadoEn: new Date('2026-11-01T12:00:00.000Z'),
    actualizadoEn: new Date('2026-11-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('bonosUtils', () => {
  it('normaliza códigos, construye payloads QR y extrae el código desde QR, URL o texto manual', () => {
    expect(normalizarCodigoBono(' bon 2026 x1y2 ')).toBe('BON-2026-X1Y2');
    expect(construirPayloadQrBono('bon-2026-ab12')).toBe('LAPARADA:BONO:BON-2026-AB12');
    expect(extraerCodigoDesdeQrOEntrada('LAPARADA:BONO:pre-2026-zz99')).toBe('PRE-2026-ZZ99');
    expect(
      extraerCodigoDesdeQrOEntrada('https://laparada.pages.dev/bono?codigo=VAL-2026-K2M3')
    ).toBe('VAL-2026-K2M3');
    expect(extraerCodigoDesdeQrOEntrada('  bon-2026-88aa  ')).toBe('BON-2026-88AA');
  });

  it('genera códigos únicos por modalidad y comprobantes sin caracteres ambiguos', () => {
    const bon = generarCodigoUnicoBono('bono_regalo', ahora);
    const pre = generarCodigoUnicoBono('tarjeta_prepago', ahora);
    const val = generarCodigoUnicoBono('vale_consumo', ahora);

    expect(bon).toMatch(/^BON-2026-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(pre).toMatch(/^PRE-2026-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(val).toMatch(/^VAL-2026-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(generarCodigoComprobanteBono('redencion', ahora)).toMatch(/^RED-2026-/);
    expect(generarCodigoComprobanteBono('recarga', ahora)).toMatch(/^REC-2026-/);
  });

  it('evalúa correctamente vigencia, por vencer, vencido, agotado y bloqueado', () => {
    const activo = buildBonoBase();
    const evalActivo = evaluarEstadoBono(activo, ahora);
    expect(evalActivo.estadoEfectivo).toBe('activo');
    expect(evalActivo.puedeRedimir).toBe(true);
    expect(evalActivo.puedeRecargar).toBe(true);

    const porVencer = buildBonoBase({
      fechaVencimiento: new Date('2026-11-22T23:59:59.000Z'),
    });
    const evalPorVencer = evaluarEstadoBono(porVencer, ahora);
    expect(evalPorVencer.estadoEfectivo).toBe('por_vencer');
    expect(evalPorVencer.puedeRedimir).toBe(true);
    expect(evalPorVencer.diasParaVencer).toBeLessThanOrEqual(7);

    const vencido = buildBonoBase({
      fechaVencimiento: new Date('2026-11-10T23:59:59.000Z'),
    });
    const evalVencido = evaluarEstadoBono(vencido, ahora);
    expect(evalVencido.estadoEfectivo).toBe('vencido');
    expect(evalVencido.estaVencido).toBe(true);
    expect(evalVencido.puedeRedimir).toBe(false);
    expect(evalVencido.puedeRecargar).toBe(true);

    const agotado = buildBonoBase({
      saldoActual: 0,
      totalRedimidoHistorico: 100000,
      estado: 'agotado',
    });
    const evalAgotado = evaluarEstadoBono(agotado, ahora);
    expect(evalAgotado.estadoEfectivo).toBe('agotado');
    expect(evalAgotado.porcentajeConsumido).toBe(100);
    expect(evalAgotado.puedeRedimir).toBe(false);

    const bloqueado = buildBonoBase({ estado: 'bloqueado', motivoBloqueo: 'Extravío' });
    const evalBloq = evaluarEstadoBono(bloqueado, ahora);
    expect(evalBloq.estadoEfectivo).toBe('bloqueado');
    expect(evalBloq.puedeRedimir).toBe(false);
    expect(evalBloq.puedeRecargar).toBe(false);
  });

  it('evalúa redención parcial, total y rechaza montos inválidos o bonos vencidos', () => {
    const bono = buildBonoBase({ saldoActual: 60000 });

    // Cobertura parcial (orden de 90k con bono de 60k)
    const parcial = evaluarRedencionBono(bono, 90000, undefined, ahora);
    expect(parcial.valido).toBe(true);
    expect(parcial.montoAplicable).toBe(60000);
    expect(parcial.saldoRestanteBono).toBe(0);
    expect(parcial.excedentePorPagar).toBe(30000);
    expect(parcial.cubreTotal).toBe(false);

    // Cobertura total (orden de 45k con bono de 60k)
    const total = evaluarRedencionBono(bono, 45000, undefined, ahora);
    expect(total.valido).toBe(true);
    expect(total.montoAplicable).toBe(45000);
    expect(total.saldoRestanteBono).toBe(15000);
    expect(total.excedentePorPagar).toBe(0);
    expect(total.cubreTotal).toBe(true);

    // Redención parcial personalizada (usar solo 25k de 60k para una orden de 45k)
    const personalizado = evaluarRedencionBono(bono, 45000, 25000, ahora);
    expect(personalizado.valido).toBe(true);
    expect(personalizado.montoAplicable).toBe(25000);
    expect(personalizado.saldoRestanteBono).toBe(35000);
    expect(personalizado.excedentePorPagar).toBe(20000);

    // Excede saldo disponible
    const excedido = evaluarRedencionBono(bono, 90000, 75000, ahora);
    expect(excedido.valido).toBe(false);
    expect(excedido.motivoRechazo).toMatch(/supera el saldo/);

    // Bono vencido rechazado
    const vencido = buildBonoBase({
      fechaVencimiento: new Date('2026-11-05T12:00:00.000Z'),
    });
    const resVencido = evaluarRedencionBono(vencido, 30000, undefined, ahora);
    expect(resVencido.valido).toBe(false);
    expect(resVencido.motivoRechazo).toMatch(/venció/);
  });

  it('calcula métricas ejecutivas, auditoría de saldos, filtros y vencimientos', () => {
    expect(calcularFechaVencimientoBono(ahora, null)).toBeNull();
    expect(calcularFechaVencimientoBono(ahora, 0)).toBeNull();
    expect(calcularFechaVencimientoBono(ahora, 30)).toBeInstanceOf(Date);

    const b1 = buildBonoBase({
      id: 'b1',
      codigo: 'BON-2026-111111',
      montoInicial: 100000,
      saldoActual: 60000,
      totalCargadoHistorico: 100000,
      totalRedimidoHistorico: 40000,
    });
    const b2 = buildBonoBase({
      id: 'b2',
      codigo: 'PRE-2026-222222',
      tipo: 'tarjeta_prepago',
      titularNombre: 'Empresa Norte',
      montoInicial: 200000,
      saldoActual: 50000,
      totalCargadoHistorico: 200000,
      totalRedimidoHistorico: 150000,
      fechaVencimiento: new Date('2026-11-05T00:00:00.000Z'), // vencido con saldo 50k
    });

    const movs: MovimientoBono[] = [
      {
        id: 'm1',
        negocioId: 'laparada',
        bonoId: 'b1',
        bonoCodigo: 'BON-2026-111111',
        titularNombre: 'María Fernanda',
        tipo: 'emision',
        monto: 100000,
        saldoPrevio: 0,
        saldoResultante: 100000,
        codigoComprobante: 'EMI-2026-0001',
        metodoPago: 'efectivo',
        fecha: new Date('2026-11-05T12:00:00.000Z'),
      },
      {
        id: 'm2',
        negocioId: 'laparada',
        bonoId: 'b2',
        bonoCodigo: 'PRE-2026-222222',
        titularNombre: 'Empresa Norte',
        tipo: 'recarga',
        monto: 100000,
        saldoPrevio: 100000,
        saldoResultante: 200000,
        codigoComprobante: 'REC-2026-0002',
        metodoPago: 'transferencia',
        fecha: new Date('2026-11-10T12:00:00.000Z'),
      },
      {
        id: 'm3',
        negocioId: 'laparada',
        bonoId: 'b1',
        bonoCodigo: 'BON-2026-111111',
        titularNombre: 'María Fernanda',
        tipo: 'redencion',
        monto: 40000,
        saldoPrevio: 100000,
        saldoResultante: 60000,
        codigoComprobante: 'RED-2026-0003',
        origen: 'pos',
        fecha: new Date('2026-11-12T18:00:00.000Z'),
      },
    ];

    const metricas = calcularMetricasBonos([b1, b2], movs, ahora);
    expect(metricas.totalBonosEmitidos).toBe(2);
    expect(metricas.saldoCirculanteActivo).toBe(60000);
    expect(metricas.saldoVencidoNoRedimido).toBe(50000);
    expect(metricas.recaudadoMesEfectivo).toBe(100000);
    expect(metricas.recaudadoMesTransferencia).toBe(100000);
    expect(metricas.redimidoMesTotal).toBe(40000);
    expect(metricas.tasaRedencionPorcentaje).toBe(63); // 190k / 300k

    const filas = construirFilasAuditoriaBonos([b1, b2], ahora);
    expect(filtrarFilasBonos(filas, { busqueda: 'norte', tipo: 'todos', estado: 'todos' })).toHaveLength(1);
    expect(filtrarFilasBonos(filas, { busqueda: '', tipo: 'bono_regalo', estado: 'activo' })).toHaveLength(1);
  });

  it('genera mensajes WhatsApp 100% offline y protege celdas CSV contra inyección de fórmulas', () => {
    const bono = buildBonoBase();
    const msg = generarMensajeBonoWhatsApp(bono, 'La Parada');
    expect(msg).toContain('BON-2026-ABCDEF');
    expect(msg).toContain('María Fernanda');
    expect(msg).toContain('en efectivo o transferencia');

    const msgRecarga = generarMensajeRecargaBonoWhatsApp(
      bono,
      {
        id: 'm1',
        negocioId: 'laparada',
        bonoId: 'bono_1',
        bonoCodigo: bono.codigo,
        titularNombre: bono.titularNombre,
        tipo: 'recarga',
        monto: 50000,
        saldoPrevio: 100000,
        saldoResultante: 150000,
        codigoComprobante: 'REC-2026-ABCD',
        metodoPago: 'transferencia',
        referenciaTransferencia: 'Nequi 9012',
        fecha: ahora,
      },
      'La Parada'
    );
    expect(msgRecarga).toContain('REC-2026-ABCD');
    expect(msgRecarga).toContain('Nequi 9012');

    const url = generarUrlWhatsAppBono('3105551234', msg);
    expect(url).toMatch(/^https:\/\/wa\.me\/573105551234\?text=/);

    expect(escaparCeldaCsvBono('=SUM(A1)')).toBe("'=SUM(A1)");
    const filas = construirFilasAuditoriaBonos(
      [buildBonoBase({ titularNombre: '=CMD()' })],
      ahora
    );
    const csv = generarCsvAuditoriaBonos(filas);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=CMD()");
  });
});
