import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  ComprobanteMovimientoCajaModal,
  CorteXModal,
  MovimientoCajaCard,
  RegistrarMovimientoCajaModal,
} from '../index';
import type { CorteXParcial, MovimientoCaja } from '@/types';

const movMock: MovimientoCaja = {
  id: 'mov-1',
  negocioId: 'laparada',
  tipo: 'sangria_caja_fuerte',
  monto: 200000,
  motivo: 'Retiro preventivo a caja fuerte',
  responsableNombre: 'Andrés Cajero',
  autorizadoPor: 'Admin',
  referencia: 'Sobre #02',
  codigoComprobante: 'SNG-0001',
  fecha: new Date('2026-11-19T15:00:00Z'),
};

const corteMock: CorteXParcial = {
  id: 'cx-1',
  negocioId: 'laparada',
  codigoCorte: 'CX-0001',
  cajeroSaliente: 'Luisa',
  cajeroEntrante: 'Mateo',
  efectivoInicial: 100000,
  ventasEfectivo: 250000,
  ventasTransferencia: 60000,
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

describe('Componentes de Movimientos de Caja y Corte X', () => {
  it('renderiza MovimientoCajaCard con código, monto y botón de comprobante', () => {
    const html = renderToStaticMarkup(
      <MovimientoCajaCard movimiento={movMock} onVerComprobante={vi.fn()} />
    );
    expect(html).toContain('SNG-0001');
    expect(html).toContain('Retiro preventivo a caja fuerte');
    expect(html).toContain('Sobre #02');
    expect(html).toContain('Comprobante');
  });

  it('renderiza RegistrarMovimientoCajaModal cuando está abierto', () => {
    const html = renderToStaticMarkup(
      <RegistrarMovimientoCajaModal
        isOpen={true}
        efectivoActualEsperado={450000}
        guardando={false}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('Registrar Movimiento de Caja');
    expect(html).toContain('Sangría (-)');
    expect(html).toContain('Caja Menor (-)');
    expect(html).toContain('Sencillo (+)');
  });

  it('renderiza CorteXModal con comparador de arqueo y campos de relevo', () => {
    const html = renderToStaticMarkup(
      <CorteXModal
        isOpen={true}
        efectivoInicial={100000}
        ventasEfectivo={200000}
        ventasTransferencia={0}
        ingresosSencillo={0}
        sangriasCajaFuerte={0}
        egresosCajaMenor={0}
        gastosOperativos={0}
        efectivoEsperado={300000}
        guardando={false}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(html).toContain('Corte X — Arqueo Parcial de Relevo');
    expect(html).toContain('Cajero Saliente (Entrega)');
    expect(html).toContain('Cajero Entrante');
  });

  it('renderiza ComprobanteMovimientoCajaModal para movimiento y para Corte X', () => {
    const htmlMov = renderToStaticMarkup(
      <ComprobanteMovimientoCajaModal
        isOpen={true}
        movimiento={movMock}
        negocio={{ nombre: 'La Parada' }}
        onClose={vi.fn()}
      />
    );
    expect(htmlMov).toContain('id="comprobante-movimiento-caja-impresion"');
    expect(htmlMov).toContain('SNG-0001');

    const htmlCorte = renderToStaticMarkup(
      <ComprobanteMovimientoCajaModal
        isOpen={true}
        corteX={corteMock}
        negocio={{ nombre: 'La Parada' }}
        onClose={vi.fn()}
      />
    );
    expect(htmlCorte).toContain('CX-0001');
    expect(htmlCorte).toContain('CUADRADO ($0)');
  });
});
