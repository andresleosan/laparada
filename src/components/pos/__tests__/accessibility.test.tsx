import type { ChangeEventHandler, ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import * as CarritoModule from '../Carrito';
import { ControladorCarrito } from '../ControladorCarrito';
import { ItemProducto } from '../ItemProducto';

type ReceiptFieldProps = {
  disabled?: boolean;
  previewFoto: string;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onClear: () => void;
};

describe('accesibilidad del punto de venta', () => {
  it('identifica el producto en las acciones del catálogo y del ticket', () => {
    const productHtml = renderToStaticMarkup(
      <ItemProducto
        nombre="Tequeño"
        precio={3500}
        disponible
        onAgregar={() => undefined}
      />
    );
    const controlsHtml = renderToStaticMarkup(
      <ControladorCarrito
        cantidad={2}
        nombreItem="Tequeño"
        onIncrement={() => undefined}
        onDecrement={() => undefined}
        onRemove={() => undefined}
      />
    );

    expect(productHtml).toContain('aria-label="Agregar Tequeño al ticket"');
    expect(controlsHtml).toContain('aria-label="Disminuir cantidad de Tequeño"');
    expect(controlsHtml).toContain('aria-label="Aumentar cantidad de Tequeño"');
    expect(controlsHtml).toContain('aria-label="Eliminar Tequeño del ticket"');
  });

  it('asocia el comprobante con su etiqueta y nombra la acción de quitarlo', () => {
    const ReceiptField = (
      CarritoModule as typeof CarritoModule & {
        ComprobanteTransferenciaField?: ComponentType<ReceiptFieldProps>;
      }
    ).ComprobanteTransferenciaField;

    expect(ReceiptField).toBeTypeOf('function');
    if (!ReceiptField) return;

    const html = renderToStaticMarkup(
      <ReceiptField
        previewFoto="data:image/png;base64,abc"
        onFileChange={() => undefined}
        onClear={() => undefined}
      />
    );
    const inputId = html.match(/<input[^>]+id="([^"]+)"[^>]+type="file"/)?.[1]
      ?? html.match(/<input[^>]+type="file"[^>]+id="([^"]+)"/)?.[1];

    expect(inputId).toBeTruthy();
    expect(html).toContain(`for="${inputId}"`);
    expect(html).toContain('aria-label="Quitar comprobante de transferencia"');
    expect(html).toContain('alt="Comprobante de transferencia seleccionado"');
  });
});
