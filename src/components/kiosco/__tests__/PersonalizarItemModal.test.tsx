import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PersonalizarItemModal } from '../PersonalizarItemModal';
import type { Producto } from '@/types';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('PersonalizarItemModal', () => {
  const mockProducto: Producto = {
    id: 'prod_1',
    nombre: 'Hamburguesa Doble Carne',
    descripcion: 'Doble carne artesanal con queso cheddar',
    precio: 25000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: { seconds: 1600000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1600000000, nanoseconds: 0 } as any,
  };

  it('renderiza nombre del producto, modificadores predeterminados y controles de cantidad', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    const html = renderToStaticMarkup(
      <PersonalizarItemModal
        item={mockProducto}
        isCombo={false}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    );

    expect(html).toContain('Hamburguesa Doble Carne');
    expect(html).toContain('Sin cebolla');
    expect(html).toContain('Salsas aparte');
    expect(html).toContain('Queso extra');
    expect(html).toContain('Instrucciones para Cocina');
    expect(html).toContain('Agregar al Pedido');
  });
});
