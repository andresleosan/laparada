import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { AplicarDescuentoModal } from '../AplicarDescuentoModal';
import { formatCOP } from '@/utils/formatCOP';

describe('AplicarDescuentoModal', () => {
  it('renderiza correctamente el modal cuando isOpen es true', () => {
    const html = renderToStaticMarkup(
      <AplicarDescuentoModal
        isOpen={true}
        subtotal={50000}
        descuentoActual={null}
        onAplicarDescuento={vi.fn()}
        onRemoverDescuento={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Descuento y Cortesía');
    expect(html).toContain('Porcentaje');
    expect(html).toContain('Valor Fijo');
    expect(html).toContain('Cortesía 100%');
    expect(html).toContain(formatCOP(50000));
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <AplicarDescuentoModal
        isOpen={false}
        subtotal={50000}
        descuentoActual={null}
        onAplicarDescuento={vi.fn()}
        onRemoverDescuento={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('muestra botón de quitar descuento cuando existe un descuentoActual', () => {
    const html = renderToStaticMarkup(
      <AplicarDescuentoModal
        isOpen={true}
        subtotal={50000}
        descuentoActual={{
          tipo: 'porcentaje',
          valor: 15,
          montoDescontadoCOP: 7500,
          motivo: 'Cliente VIP',
        }}
        onAplicarDescuento={vi.fn()}
        onRemoverDescuento={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Quitar Descuento');
  });
});
