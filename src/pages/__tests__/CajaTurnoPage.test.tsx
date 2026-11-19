import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    usuarioNegocio: { nombre: 'Andrés Cajero', email: 'cajero@laparada.co', rol: 'cajero' },
  }),
}));

vi.mock('@/hooks/useCaja', () => ({
  useCaja: () => ({
    cajaActual: {
      id: 'caja-1',
      negocioId: 'laparada',
      montoInicial: 100000,
      ingresos: 450000,
      egresos: 50000,
      saldoActual: 500000,
    },
    loading: false,
    error: null,
    ventasEfectivo: 400000,
    movimientosHoy: [],
    resumenMovimientos: {
      totalIngresosSencillo: 50000,
      cantidadIngresosSencillo: 1,
      totalSangrias: 0,
      cantidadSangrias: 0,
      totalCajaMenor: 0,
      cantidadCajaMenor: 0,
      impactoNetoMovimientos: 50000,
      alertaExcesoEfectivo: true,
      umbralAlertaSangria: 500000,
    },
    crearCajaHoy: vi.fn(),
    refresh: vi.fn(),
    reiniciarCajaHoy: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCierreCaja', () => ({
  useCierreCaja: () => ({
    cierreHoy: null,
    ultimosCierres: [],
    resumenDia: {
      totalVentas: 500000,
      ventasPos: 400000,
      ventasWhatsapp: 100000,
      ventasEfectivo: 400000,
      ventasTransferencia: 100000,
      totalGastos: 50000,
      utilidadNeta: 450000,
      cantidadVentas: 12,
      cantidadGastos: 1,
      totalDescuentos: 0,
      cantidadDescuentos: 0,
      montoInicialCaja: 100000,
      saldoCajaEsperado: 500000,
    },
    loading: false,
    error: null,
    ejecutarCierreHoy: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMovimientosCaja', () => ({
  useMovimientosCaja: () => ({
    movimientos: [
      {
        id: 'm1',
        negocioId: 'laparada',
        tipo: 'ingreso_sencillo',
        monto: 50000,
        motivo: 'Ingreso de sencillo para vueltas',
        responsableNombre: 'Andrés Cajero',
        codigoComprobante: 'SEN-0001',
        fecha: new Date('2026-11-19T14:00:00Z'),
      },
    ],
    cortesX: [],
    resumen: {
      totalIngresosSencillo: 50000,
      cantidadIngresosSencillo: 1,
      totalSangrias: 0,
      cantidadSangrias: 0,
      totalCajaMenor: 0,
      cantidadCajaMenor: 0,
      impactoNetoMovimientos: 50000,
      alertaExcesoEfectivo: true,
      umbralAlertaSangria: 500000,
    },
    loading: false,
    error: null,
    registrarMovimiento: vi.fn(),
    ejecutarCorteX: vi.fn(),
    exportarCSV: vi.fn(),
  }),
}));

import { CajaTurnoPage } from '../CajaTurnoPage';

describe('CajaTurnoPage', () => {
  it('renderiza KPIs, alerta de exceso de efectivo y movimientos del turno', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <CajaTurnoPage />
      </MemoryRouter>
    );
    expect(html).toContain('Movimientos de Caja');
    expect(html).toContain('Corte X');
    expect(html).toContain('Exceso de efectivo en cajón');
    expect(html).toContain('SEN-0001');
    expect(html).toContain('Ingreso de sencillo para vueltas');
  });
});
