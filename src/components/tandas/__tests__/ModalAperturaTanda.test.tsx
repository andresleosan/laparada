import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ModalAperturaTanda } from '../ModalAperturaTanda';
import type { Producto } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('ModalAperturaTanda', () => {
  const dummyTime = Timestamp.now();
  const mockProductos: Producto[] = [
    {
      id: 'prod-1',
      nombre: 'Panceroti Ranchero',
      precio: 4000,
      disponible: true,
      descripcion: 'Delicioso panceroti',
      categoria: 'Pancerotis',
      negocioId: 'laparada',
      creadoEn: dummyTime,
      actualizadoEn: dummyTime,
    },
    {
      id: 'prod-2',
      nombre: 'Empanadita de Carne',
      precio: 1000,
      disponible: true,
      descripcion: 'Empanada frita',
      categoria: 'Empanadas',
      negocioId: 'laparada',
      creadoEn: dummyTime,
      actualizadoEn: dummyTime,
    },
  ];

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <ModalAperturaTanda
        isOpen={false}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
        productos={mockProductos}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza la lista de productos y controles cuando isOpen es true', () => {
    const html = renderToStaticMarkup(
      <ModalAperturaTanda
        isOpen={true}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
        productos={mockProductos}
      />
    );

    expect(html).toContain('Abrir Tanda de Productos (Vitrina)');
    expect(html).toContain('Panceroti Ranchero');
    expect(html).toContain('Empanadita de Carne');
    expect(html).toContain('Iniciar Tanda de Vitrina');
  });
});
