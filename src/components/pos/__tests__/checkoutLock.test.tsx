import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ControladorCarrito } from '../ControladorCarrito';
import { ItemProducto } from '../ItemProducto';

describe('bloqueo de mutaciones durante el cobro', () => {
  it('deshabilita incremento, decremento y eliminación del ticket', () => {
    const html = renderToStaticMarkup(
      <ControladorCarrito
        cantidad={2}
        disabled
        onIncrement={() => undefined}
        onDecrement={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });

  it('deshabilita la adición de productos aun cuando están disponibles', () => {
    const html = renderToStaticMarkup(
      <ItemProducto
        nombre="Tequeño"
        precio={3500}
        disponible
        disabled
        onAgregar={() => undefined}
      />
    );

    expect(html).toContain('disabled=""');
  });
});
