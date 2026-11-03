import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { TicketVentaData } from '@/types';
import { TicketVentaModal } from '../TicketVentaModal';

describe('TicketVentaModal', () => {
  const ticketMock: TicketVentaData = {
    ventaId: 'VENTA-987654',
    negocioNombre: 'La Parada Cúcuta',
    negocioSlug: 'laparada',
    negocioDireccion: 'Calle 10 # 5-20',
    negocioTelefono: '3101234567',
    fecha: new Date('2026-11-03T19:00:00.000Z'),
    items: [
      {
        tipo: 'producto',
        referenciaId: 'prod-1',
        nombre: 'Hamburguesa Doble Carne',
        cantidad: 1,
        precioUnitario: 28000,
        subtotal: 28000,
      },
    ],
    total: 28000,
    metodoPago: 'efectivo',
    tipoEntrega: 'mostrador',
    montoRecibido: 30000,
    cambio: 2000,
  };

  it('no renderiza nada si isOpen es false o el ticket es nulo', () => {
    const htmlClosed = renderToStaticMarkup(
      <TicketVentaModal ticket={ticketMock} isOpen={false} onClose={vi.fn()} />
    );
    expect(htmlClosed).toBe('');

    const htmlNull = renderToStaticMarkup(
      <TicketVentaModal ticket={null} isOpen={true} onClose={vi.fn()} />
    );
    expect(htmlNull).toBe('');
  });

  it('renderiza la estructura accesible del diálogo y los datos del ticket', () => {
    const html = renderToStaticMarkup(
      <TicketVentaModal ticket={ticketMock} isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-labelledby="ticket-modal-title"');
    expect(html).toContain('Comprobante de Venta');
    expect(html).toContain('LA PARADA CÚCUTA');
    expect(html).toContain('Calle 10 # 5-20');
    expect(html).toContain('1× Hamburguesa Doble Carne');
    expect(html).toContain('28.000 COP');
    expect(html).toContain('Cambio / Vueltas:');
    expect(html).toContain('2.000');
    expect(html).toContain('id="pos-ticket-impresion"');
    expect(html).toContain('aria-label="Imprimir ticket térmico"');
    expect(html).toContain('aria-label="Enviar comprobante por WhatsApp"');
  });

  it('renderiza información de entrega a domicilio y cliente cuando están presentes', () => {
    const ticketDomicilio: TicketVentaData = {
      ...ticketMock,
      tipoEntrega: 'domicilio',
      clienteNombre: 'Mario Casas',
      direccionEntrega: 'Calle 15 # 3-45',
      barrioEntrega: 'El Bosque',
    };

    const html = renderToStaticMarkup(
      <TicketVentaModal ticket={ticketDomicilio} isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('🛵 Domicilio');
    expect(html).toContain('Mario Casas');
    expect(html).toContain('Calle 15 # 3-45');
    expect(html).toContain('El Bosque');
  });
});
