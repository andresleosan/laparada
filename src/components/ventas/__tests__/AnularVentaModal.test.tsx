import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnularVentaModal } from '../AnularVentaModal';
import type { Venta } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('AnularVentaModal', () => {
  const mockVenta: Venta = {
    id: 'venta-test-123456',
    negocioId: 'laparada',
    items: [
      {
        tipo: 'producto',
        referenciaId: 'p1',
        nombre: 'Hamburguesa La Parada',
        cantidad: 2,
        precioUnitario: 22000,
        subtotal: 44000,
      },
    ],
    total: 44000,
    metodoPago: 'efectivo',
    origen: 'pos',
    fecha: Timestamp.now(),
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <AnularVentaModal
        venta={mockVenta}
        isOpen={false}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza la cabecera, el ID de venta, el total y los motivos cuando está abierto', () => {
    const html = renderToStaticMarkup(
      <AnularVentaModal
        venta={mockVenta}
        isOpen={true}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );

    expect(html).toContain('Anular Venta #123456');
    expect(html).toContain('Total a anular:');
    expect(html).toContain('Hamburguesa La Parada');
    expect(html).toContain('Error de digitación');
    expect(html).toContain('Cliente canceló el pedido');
    expect(html).toContain('Reintegrar ingredientes al inventario');
    expect(html).toContain('Confirmar anulación');
    expect(html).toContain('Conservar venta');
  });
});
