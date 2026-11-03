import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModalEntregaDomicilio } from '../ModalEntregaDomicilio';
import type { Domicilio } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatCOP } from '@/utils/formatCOP';

const mockDomicilio: Domicilio = {
  id: 'dom-123',
  negocioId: 'laparada',
  clienteNombre: 'Camilo Torres',
  clienteTelefono: '3109876543',
  direccion: 'Calle 15 # 2-30',
  barrio: 'La Ceiba',
  items: [],
  total: 35000,
  metodoPago: 'efectivo',
  origen: 'pos',
  estado: 'en_camino',
  creadoEn: Timestamp.now(),
  actualizadoEn: Timestamp.now(),
};

describe('ModalEntregaDomicilio', () => {
  it('no renderiza nada cuando isOpen es false o el domicilio es nulo', () => {
    const closedHtml = renderToStaticMarkup(
      <ModalEntregaDomicilio
        isOpen={false}
        domicilio={mockDomicilio}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(closedHtml).toBe('');

    const nullHtml = renderToStaticMarkup(
      <ModalEntregaDomicilio
        isOpen={true}
        domicilio={null}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );
    expect(nullHtml).toBe('');
  });

  it('renderiza el diálogo con datos del cliente y botones de método de pago', () => {
    const html = renderToStaticMarkup(
      <ModalEntregaDomicilio
        isOpen={true}
        domicilio={mockDomicilio}
        onClose={vi.fn()}
        onConfirmar={vi.fn()}
      />
    );

    expect(html).toContain('Confirmar Entrega de Pedido');
    expect(html).toContain('Camilo Torres');
    expect(html).toContain('Calle 15 # 2-30');
    expect(html).toContain(formatCOP(35000));
    expect(html).toContain('Efectivo');
    expect(html).toContain('Transferencia');
    expect(html).toContain('Confirmar Entrega');
  });
});
