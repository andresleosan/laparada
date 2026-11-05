import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Insumo } from '@/types';
import { AjusteStockModal } from '../AjusteStockModal';

describe('AjusteStockModal Component', () => {
  const mockInsumo: Insumo = {
    id: 'ins_queso',
    nombre: 'Queso Mozzarella',
    stockActual: 15,
    stockMinimo: 5,
    unidad: 'kg',
    negocioId: 'laparada',
    creadoEn: {} as any,
    actualizadoEn: {} as any,
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <AjusteStockModal
        isOpen={false}
        onClose={vi.fn()}
        insumo={mockInsumo}
        onEjecutarEntrada={vi.fn()}
        onEjecutarSalida={vi.fn()}
        onEjecutarMerma={vi.fn()}
        onEjecutarAjuste={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza pestañas de operación y datos del insumo cuando está abierto', () => {
    const html = renderToStaticMarkup(
      <AjusteStockModal
        isOpen={true}
        onClose={vi.fn()}
        insumo={mockInsumo}
        modoInicial="entrada"
        onEjecutarEntrada={vi.fn()}
        onEjecutarSalida={vi.fn()}
        onEjecutarMerma={vi.fn()}
        onEjecutarAjuste={vi.fn()}
      />
    );

    expect(html).toContain('Movimiento de Inventario');
    expect(html).toContain('Queso Mozzarella');
    expect(html).toContain('Entrada');
    expect(html).toContain('Salida');
    expect(html).toContain('Merma');
    expect(html).toContain('Conteo');
    expect(html).toContain('Registrar Entrada');
  });

  it('renderiza selector de motivos de merma cuando el modo inicial es merma', () => {
    const html = renderToStaticMarkup(
      <AjusteStockModal
        isOpen={true}
        onClose={vi.fn()}
        insumo={mockInsumo}
        modoInicial="merma"
        onEjecutarEntrada={vi.fn()}
        onEjecutarSalida={vi.fn()}
        onEjecutarMerma={vi.fn()}
        onEjecutarAjuste={vi.fn()}
      />
    );

    expect(html).toContain('Motivo de la Merma');
    expect(html).toContain('Vencimiento / Expirado');
    expect(html).toContain('Confirmar Merma');
  });

  it('renderiza cálculo de diferencia en vivo cuando el modo inicial es ajuste', () => {
    const html = renderToStaticMarkup(
      <AjusteStockModal
        isOpen={true}
        onClose={vi.fn()}
        insumo={mockInsumo}
        modoInicial="ajuste"
        onEjecutarEntrada={vi.fn()}
        onEjecutarSalida={vi.fn()}
        onEjecutarMerma={vi.fn()}
        onEjecutarAjuste={vi.fn()}
      />
    );

    expect(html).toContain('Stock Físico Real Contado');
    expect(html).toContain('Diferencia resultante:');
    expect(html).toContain('Guardar Ajuste Físico');
  });
});

