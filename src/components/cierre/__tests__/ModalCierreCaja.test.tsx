import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ModalCierreCaja } from '../ModalCierreCaja';
import type { ResumenDiaCierre } from '@/hooks/useCierreCaja';

describe('ModalCierreCaja', () => {
  const mockResumen: ResumenDiaCierre = {
    totalVentas: 200000,
    ventasPos: 140000,
    ventasWhatsapp: 60000,
    ventasEfectivo: 170000,
    ventasTransferencia: 30000,
    totalGastos: 40000,
    utilidadNeta: 160000,
    cantidadVentas: 10,
    cantidadGastos: 2,
    totalDescuentos: 0,
    cantidadDescuentos: 0,
    montoInicialCaja: 50000,
    saldoCajaEsperado: 180000,
  };

  it('no renderiza nada si isOpen es false', () => {
    const html = renderToStaticMarkup(
      <ModalCierreCaja
        isOpen={false}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
        resumenDia={mockResumen}
        cajaActual={null}
        guardando={false}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza la estructura accesible del diálogo y el paso inicial de arqueo', () => {
    const html = renderToStaticMarkup(
      <ModalCierreCaja
        isOpen={true}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
        resumenDia={mockResumen}
        cajaActual={null}
        guardando={false}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby="modal-cierre-title"');
    expect(html).toContain('Cierre de Turno y Arqueo de Efectivo');
    expect(html).toContain('1. Arqueo Físico COP');
    expect(html).toContain('2. Balance y Datos');
    expect(html).toContain('Total Físico en Caja');
    expect(html).toContain('Efectivo Esperado (Sistema)');
    expect(html).toContain('Continuar a Balance');
  });
});
