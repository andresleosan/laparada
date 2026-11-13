import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RegistrarWalkInModal } from '../RegistrarWalkInModal';

describe('RegistrarWalkInModal', () => {
  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <RegistrarWalkInModal
        isOpen={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        zonasDisponibles={['Salón Principal', 'Terraza']}
        estimarTiempo={() => 15}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza campos de registro walk-in y estimación dinámica cuando isOpen es true', () => {
    const html = renderToStaticMarkup(
      <RegistrarWalkInModal
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        zonasDisponibles={['Salón Principal', 'Terraza']}
        estimarTiempo={() => 20}
      />
    );

    expect(html).toContain('Registrar Comensal en Puerta');
    expect(html).toContain('~20 min');
    expect(html).toContain('Terraza');
    expect(html).toContain('Agregar a Lista de Espera');
  });
});
