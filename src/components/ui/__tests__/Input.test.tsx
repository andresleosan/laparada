import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('vincula la etiqueta visible con su control aunque no se entregue un id', () => {
    const html = renderToStaticMarkup(<Input label="Barrio" name="barrio" />);
    const labelFor = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
    const inputId = html.match(/<input[^>]*id="([^"]+)"/)?.[1];

    expect(labelFor).toBeTruthy();
    expect(inputId).toBe(labelFor);
  });

  it('conserva el id explícito para integrarse con formularios existentes', () => {
    const html = renderToStaticMarkup(<Input id="telefono-cliente" label="Teléfono" />);

    expect(html).toContain('for="telefono-cliente"');
    expect(html).toContain('id="telefono-cliente"');
  });
});
