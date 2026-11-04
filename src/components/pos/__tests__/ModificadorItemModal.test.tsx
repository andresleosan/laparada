import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ItemVenta } from '@/types';
import { ModificadorItemModal } from '../ModificadorItemModal';

describe('ModificadorItemModal', () => {
  const itemMock: ItemVenta = {
    tipo: 'producto',
    referenciaId: 'prod-burger',
    nombre: 'Hamburguesa La Parada',
    cantidad: 1,
    precioUnitario: 22000,
    subtotal: 22000,
    modificadores: ['Término 3/4'],
    notas: 'Salsas aparte',
  };

  it('no renderiza nada si isOpen es false o el item es null', () => {
    const htmlClosed = renderToStaticMarkup(
      <ModificadorItemModal isOpen={false} item={itemMock} onClose={vi.fn()} onGuardar={vi.fn()} />
    );
    expect(htmlClosed).toBe('');

    const htmlNull = renderToStaticMarkup(
      <ModificadorItemModal isOpen={true} item={null} onClose={vi.fn()} onGuardar={vi.fn()} />
    );
    expect(htmlNull).toBe('');
  });

  it('renderiza estructura accesible con categorías de términos y modificadores', () => {
    const html = renderToStaticMarkup(
      <ModificadorItemModal isOpen={true} item={itemMock} onClose={vi.fn()} onGuardar={vi.fn()} />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Términos y Modificadores');
    expect(html).toContain('Hamburguesa La Parada');
    expect(html).toContain('22.000');
    expect(html).toContain('Término de Cocción');
    expect(html).toContain('Término 3/4');
    expect(html).toContain('Término Medio');
    expect(html).toContain('Bien Asado');
    expect(html).toContain('Preferencias y Exclusiones');
    expect(html).toContain('Sin cebolla');
    expect(html).toContain('Sin salsas');
    expect(html).toContain('Queso extra');
    expect(html).toContain('Para llevar');
    expect(html).toContain('Guardar en Ticket');
    expect(html).toContain('Limpiar Modificadores');
  });
});

