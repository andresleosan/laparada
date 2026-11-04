import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AbrirMesaModal } from '../AbrirMesaModal';
import type { Mesa } from '@/types/mesa';

describe('AbrirMesaModal', () => {
  const mockMesa: Mesa = {
    id: 'm1',
    numero: 3,
    nombre: 'Mesa 3',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'libre',
    negocioId: 'test_tenant',
  };

  it('no renderiza nada si isOpen es false o no hay mesa', () => {
    const htmlClosed = renderToStaticMarkup(
      <AbrirMesaModal isOpen={false} mesa={mockMesa} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(htmlClosed).toBe('');

    const htmlNoMesa = renderToStaticMarkup(
      <AbrirMesaModal isOpen={true} mesa={null} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(htmlNoMesa).toBe('');
  });

  it('renderiza título con nombre de mesa, zona y opciones de comensales', () => {
    const html = renderToStaticMarkup(
      <AbrirMesaModal isOpen={true} mesa={mockMesa} onClose={vi.fn()} onSubmit={vi.fn()} />
    );

    expect(html).toContain('Abrir Mesa 3');
    expect(html).toContain('Salón Principal');
    expect(html).toContain('Número de Comensales');
    expect(html).toContain('Mesero / Atendido por');
    expect(html).toContain('Confirmar Apertura');
  });
});
