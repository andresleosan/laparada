import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { MesaQrModal } from '../MesaQrModal';
import type { Mesa } from '@/types/mesa';

describe('MesaQrModal', () => {
  const mesaMock: Mesa = {
    id: 'm_4',
    numero: 4,
    nombre: 'Mesa Terraza 4',
    capacidad: 4,
    zona: 'Terraza',
    estado: 'libre',
    negocioId: 'laparada',
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <MesaQrModal
        isOpen={false}
        mesa={mesaMock}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza la cabecera, nombre de mesa, zona y botones de acción cuando está abierto', () => {
    const html = renderToStaticMarkup(
      <MesaQrModal
        isOpen={true}
        mesa={mesaMock}
        negocioNombre="La Parada Gourmet"
        negocioSlug="laparada"
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Código QR de Mesa');
    expect(html).toContain('Mesa Terraza 4');
    expect(html).toContain('Terraza');
    expect(html).toContain('Copiar Link');
    expect(html).toContain('Probar Vista');
    expect(html).toContain('Solo QR (PNG)');
    expect(html).toContain('Tarjetón Mesa');
  });

  it('no renderiza si la mesa es null', () => {
    const html = renderToStaticMarkup(
      <MesaQrModal
        isOpen={true}
        mesa={null}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });
});
