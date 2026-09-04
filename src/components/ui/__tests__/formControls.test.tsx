import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Select } from '../Select';
import { Textarea } from '../Textarea';

describe('controles administrativos compartidos', () => {
  it('asocia la etiqueta y el error del Select con su control', () => {
    const html = renderToStaticMarkup(
      <Select
        id="metodo-pago"
        label="Método de pago"
        error="Selecciona un método"
        options={[{ value: 'efectivo', label: 'Efectivo' }]}
      />
    );

    expect(html).toContain('<label for="metodo-pago"');
    expect(html).toContain('id="metodo-pago"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="metodo-pago-error"');
    expect(html).toContain('id="metodo-pago-error"');
  });

  it('genera una relación accesible para Textarea aun sin id explícito', () => {
    const html = renderToStaticMarkup(
      <Textarea label="Descripción" error="Describe el producto" />
    );
    const labelFor = html.match(/<label for="([^"]+)"/)?.[1];

    expect(labelFor).toBeTruthy();
    expect(html).toContain(`id="${labelFor}"`);
    expect(html).toContain(`aria-describedby="${labelFor}-error"`);
    expect(html).toContain(`id="${labelFor}-error"`);
  });

  it('evita submits accidentales y conserva el submit cuando se solicita', () => {
    expect(renderToStaticMarkup(<Button>Cancelar</Button>)).toContain('type="button"');
    expect(renderToStaticMarkup(<Button type="submit">Guardar</Button>)).toContain('type="submit"');
  });

  it('renderiza un botón real cuando un badge es interactivo', () => {
    const html = renderToStaticMarkup(<Badge onClick={() => undefined}>Disponible</Badge>);

    expect(html).toContain('<button');
    expect(html).toContain('type="button"');
    expect(html).not.toContain('role="button"');
  });
});
