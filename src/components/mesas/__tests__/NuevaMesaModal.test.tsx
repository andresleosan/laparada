import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NuevaMesaModal } from '../NuevaMesaModal';

describe('NuevaMesaModal', () => {
  it('no renderiza nada si isOpen es false', () => {
    const html = renderToStaticMarkup(
      <NuevaMesaModal
        isOpen={false}
        zonasExistentes={['Salón Principal']}
        siguienteNumero={5}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza título, inputs de número, capacidad y zona', () => {
    const html = renderToStaticMarkup(
      <NuevaMesaModal
        isOpen={true}
        zonasExistentes={['Salón Principal', 'Terraza']}
        siguienteNumero={7}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(html).toContain('Nueva Mesa en Salón');
    expect(html).toContain('Número');
    expect(html).toContain('Capacidad');
    expect(html).toContain('Zona o Ambiente');
    expect(html).toContain('Crear Mesa');
  });
});

