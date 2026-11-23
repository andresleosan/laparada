import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlergenosDietaSelector } from '../AlergenosDietaSelector';
import { perfilFormDesdeFuente } from '@/utils/alergenosUtils';

describe('AlergenosDietaSelector', () => {
  it('muestra estado sin declarar por defecto sin alertas', () => {
    const html = renderToStaticMarkup(
      <AlergenosDietaSelector valor={perfilFormDesdeFuente()} onChange={vi.fn()} />
    );

    expect(html).toContain('Sin declarar');
    expect(html).toContain('Sin alérgenos principales');
    expect(html).not.toContain('role="alert"');
  });

  it('renderiza declaración verificada, etiqueta activa y calorías', () => {
    const html = renderToStaticMarkup(
      <AlergenosDietaSelector
        valor={{
          declarado: true,
          alergenos: [],
          etiquetas: ['vegano'],
          caloriasStr: '450',
          porcionGramosStr: '300',
        }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('Declaración de alérgenos verificada');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('value="450"');
  });

  it('muestra advertencia de incoherencia entre alérgenos y etiquetas dietéticas', () => {
    const html = renderToStaticMarkup(
      <AlergenosDietaSelector
        valor={{
          declarado: true,
          alergenos: ['gluten'],
          etiquetas: ['sin_gluten'],
          caloriasStr: '',
          porcionGramosStr: '',
        }}
        onChange={vi.fn()}
      />
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('no es compatible con');
  });

  it('muestra nota de combo y mensaje de error cuando corresponde', () => {
    const html = renderToStaticMarkup(
      <AlergenosDietaSelector
        valor={perfilFormDesdeFuente()}
        onChange={vi.fn()}
        esCombo
        error="Campo dietético inválido"
      />
    );

    expect(html).toContain('se suman automáticamente');
    expect(html).toContain('Campo dietético inválido');
  });
});
