import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Gasto, MovimientoCaja } from '@/types';
import {
  calcularGastosQueDescuentanCajaTurno,
  calcularResumenCajaMenor,
  calcularResumenGastosOperativos,
  esGastoQueDescuentaCajaTurno,
  filtrarGastosOperativos,
  generarCsvGastosOperativos,
  generarResumenGastosWhatsApp,
  getCategoriaGastoMeta,
  getOrigenFondoGastoMeta,
} from '../gastosUtils';

function makeGasto(partial: Partial<Gasto> & { id: string }): Gasto {
  return {
    negocioId: 'laparada',
    concepto: 'Gasto de prueba',
    monto: 10000,
    categoria: 'servicios',
    fecha: Timestamp.fromDate(new Date('2026-11-19T12:00:00')),
    ...partial,
  };
}

describe('gastosUtils', () => {
  it('mapea correctamente categorías explícitas (Servicios Públicos, Arriendo, Aseo, Mantenimiento, Transporte)', () => {
    expect(getCategoriaGastoMeta('servicios').etiqueta).toBe('Servicios Públicos');
    expect(getCategoriaGastoMeta('arriendo').etiqueta).toBe('Arriendo');
    expect(getCategoriaGastoMeta('aseo').etiqueta).toBe('Aseo');
    expect(getCategoriaGastoMeta('mantenimiento').etiqueta).toBe('Mantenimiento');
    expect(getCategoriaGastoMeta('transporte').etiqueta).toBe('Transporte');
    expect(getOrigenFondoGastoMeta('banco_transferencia').impactaCajaTurno).toBe(false);
    expect(getOrigenFondoGastoMeta('caja_turno').impactaCajaTurno).toBe(true);
  });

  it('distingue con precisión qué gastos descuentan efectivo del cajón del turno vs banco/caja menor', () => {
    const gastos: Gasto[] = [
      makeGasto({ id: 'g1', monto: 50000, origenFondo: 'caja_turno' }),
      makeGasto({ id: 'g2', monto: 30000 }), // histórico sin origenFondo => caja_turno
      makeGasto({ id: 'g3', monto: 200000, origenFondo: 'banco_transferencia' }),
      makeGasto({ id: 'g4', monto: 25000, origenFondo: 'caja_menor' }),
      makeGasto({ id: 'g5', monto: 100000, origenFondo: 'efectivo_externo' }),
    ];

    expect(esGastoQueDescuentaCajaTurno(gastos[0])).toBe(true);
    expect(esGastoQueDescuentaCajaTurno(gastos[1])).toBe(true);
    expect(esGastoQueDescuentaCajaTurno(gastos[2])).toBe(false);
    expect(esGastoQueDescuentaCajaTurno(gastos[3])).toBe(false);
    expect(esGastoQueDescuentaCajaTurno(gastos[4])).toBe(false);

    // Solo g1 (50k) + g2 (30k) = 80k descuentan del cajón del turno
    expect(calcularGastosQueDescuentanCajaTurno(gastos)).toBe(80000);

    const resumen = calcularResumenGastosOperativos(gastos);
    expect(resumen.totalGastos).toBe(405000);
    expect(resumen.totalCajaTurno).toBe(80000);
    expect(resumen.totalCajaMenor).toBe(25000);
    expect(resumen.totalBancoTransferencia).toBe(200000);
    expect(resumen.totalEfectivoExterno).toBe(100000);
  });

  it('consolida el control de Caja Menor combinando gastos y movimientos sin duplicar vinculados', () => {
    const gastos: Gasto[] = [
      makeGasto({ id: 'g1', monto: 45000, origenFondo: 'caja_menor', categoria: 'aseo' }),
      makeGasto({
        id: 'g2',
        monto: 35000,
        origenFondo: 'caja_menor',
        categoria: 'transporte',
        movimientoCajaId: 'mov-1',
      }),
    ];
    const movs: MovimientoCaja[] = [
      {
        id: 'mov-1',
        negocioId: 'laparada',
        tipo: 'egreso_caja_menor',
        monto: 35000,
        motivo: 'Transporte vinculado',
        responsableNombre: 'Cajero',
        codigoComprobante: 'CMN-0001',
        fecha: new Date(),
      },
      {
        id: 'mov-2',
        negocioId: 'laparada',
        tipo: 'egreso_caja_menor',
        monto: 180000,
        motivo: 'Hielo y empaques',
        responsableNombre: 'Cajero',
        codigoComprobante: 'CMN-0002',
        fecha: new Date(),
      },
    ];

    const resumenCM = calcularResumenCajaMenor({
      gastos,
      movimientosCaja: movs,
      fondoAsignadoCOP: 300000,
    });

    // 45k + 35k (gastos) + 180k (mov-2 no vinculado) = 260k (86.7% >= 80% => alerta)
    expect(resumenCM.totalConsumidoCOP).toBe(260000);
    expect(resumenCM.saldoDisponibleCOP).toBe(40000);
    expect(resumenCM.alertaReposicion).toBe(true);
    expect(resumenCM.cantidadRegistros).toBe(3);
  });

  it('filtra gastos por categoría, origen de fondo, rango y texto libre', () => {
    const ahora = new Date('2026-11-19T14:00:00');
    const gastos: Gasto[] = [
      makeGasto({
        id: 'g1',
        concepto: 'Energía CENS',
        categoria: 'servicios',
        origenFondo: 'banco_transferencia',
        proveedorNombre: 'CENS',
        fecha: Timestamp.fromDate(new Date('2026-11-19T09:00:00')),
      }),
      makeGasto({
        id: 'g2',
        concepto: 'Detergente cocina',
        categoria: 'aseo',
        origenFondo: 'caja_menor',
        fecha: Timestamp.fromDate(new Date('2026-11-10T09:00:00')),
      }),
    ];

    const soloHoy = filtrarGastosOperativos(gastos, { rango: 'hoy', ahora });
    expect(soloHoy.map((g) => g.id)).toEqual(['g1']);

    const porTexto = filtrarGastosOperativos(gastos, {
      rango: 'todos',
      busqueda: 'detergente',
      ahora,
    });
    expect(porTexto.map((g) => g.id)).toEqual(['g2']);
  });

  it('genera CSV seguro contra inyección de fórmulas y resumen WhatsApp offline', () => {
    const gastos: Gasto[] = [
      makeGasto({
        id: 'g1',
        concepto: '=SUM(A1)',
        monto: 120000,
        categoria: 'arriendo',
        origenFondo: 'banco_transferencia',
        metodoPago: 'transferencia',
        deducible: true,
      }),
    ];

    const csv = generarCsvGastosOperativos(gastos, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"\'=SUM(A1)"');
    expect(csv).toContain('"Arriendo"');
    expect(csv).toContain('"Banco / Transf."');

    const resumen = calcularResumenGastosOperativos(gastos);
    const wa = generarResumenGastosWhatsApp(resumen, 'La Parada', 'Hoy');
    expect(wa).toContain('RESUMEN DE GASTOS OPERATIVOS');
    expect(wa).toContain('Arriendo');
  });
});
