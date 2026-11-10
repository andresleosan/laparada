import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { ModalCierreTanda } from '../ModalCierreTanda';
import type { TandaVitrina } from '@/types/tanda';
import { Timestamp } from 'firebase/firestore';

describe('ModalCierreTanda', () => {
  const dummyTime = Timestamp.now();
  const mockTanda: TandaVitrina = {
    id: 'tanda-1',
    negocioId: 'laparada',
    estado: 'abierta',
    fecha: dummyTime,
    items: [
      {
        productoId: 'prod-1',
        nombre: 'Panceroti Ranchero',
        precioUnitario: 4000,
        cantidadInicial: 25,
        adiciones: [{ id: 'a1', cantidad: 5, hora: dummyTime }],
        mermas: [{ id: 'm1', cantidad: 1, hora: dummyTime }],
      },
    ],
    transferencias: [
      { id: 't1', monto: 12000, metodo: 'nequi', hora: dummyTime },
    ],
    creadoEn: dummyTime,
    actualizadoEn: dummyTime,
  };

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <ModalCierreTanda
        isOpen={false}
        onClose={vi.fn()}
        tanda={mockTanda}
        onConfirmar={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza el desglose de productos y campos de sobrantes cuando está abierto', () => {
    const html = renderToStaticMarkup(
      <ModalCierreTanda
        isOpen={true}
        onClose={vi.fn()}
        tanda={mockTanda}
        onConfirmar={vi.fn()}
      />
    );

    expect(html).toContain('Cierre de Tanda y Conteo de Sobrantes');
    expect(html).toContain('Panceroti Ranchero');
    expect(html).toContain('Sobraron en vitrina');
    expect(html).toContain('Confirmar y Cerrar Tanda');
  });
});
