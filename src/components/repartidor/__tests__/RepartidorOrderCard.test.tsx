import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RepartidorOrderCard } from '../RepartidorOrderCard';
import type { Domicilio } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { formatCOP } from '@/utils/formatCOP';

const mockDomicilio: Domicilio = {
  id: 'dom-123',
  negocioId: 'laparada',
  clienteNombre: 'Andrés Sanabria',
  clienteTelefono: '3101234567',
  direccion: 'Calle 10 # 5-20',
  barrio: 'Guaimaral',
  items: [
    { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa La Parada', cantidad: 2, precioUnitario: 22000, subtotal: 44000 },
  ],
  total: 44000,
  metodoPago: 'efectivo',
  origen: 'whatsapp',
  estado: 'en_preparacion',
  creadoEn: Timestamp.now(),
  actualizadoEn: Timestamp.now(),
};

describe('RepartidorOrderCard', () => {
  it('muestra los datos del cliente, dirección, barrio y total a cobrar', () => {
    const html = renderToStaticMarkup(<RepartidorOrderCard domicilio={mockDomicilio} />);

    expect(html).toContain('Andrés Sanabria');
    expect(html).toContain('Calle 10 # 5-20');
    expect(html).toContain('Barrio: Guaimaral');
    expect(html).toContain(formatCOP(44000));
    expect(html).toContain('En Cocina');
  });

  it('cuenta con enlaces táctiles de Maps, Waze, WhatsApp y Teléfono', () => {
    const html = renderToStaticMarkup(<RepartidorOrderCard domicilio={mockDomicilio} />);

    expect(html).toContain('google.com/maps');
    expect(html).toContain('waze.com');
    expect(html).toContain('wa.me/573101234567');
    expect(html).toContain('href="tel:3101234567"');
    expect(html).toContain('aria-label="Abrir dirección de Andrés Sanabria en Google Maps"');
  });

  it('muestra botón de tomar pedido cuando está en preparación', () => {
    const html = renderToStaticMarkup(<RepartidorOrderCard domicilio={mockDomicilio} />);
    expect(html).toContain('Tomar Pedido y Salir a Ruta');
  });

  it('muestra botón de finalizar entrega cuando está en camino', () => {
    const domicilioEnCamino: Domicilio = { ...mockDomicilio, estado: 'en_camino' };
    const html = renderToStaticMarkup(<RepartidorOrderCard domicilio={domicilioEnCamino} />);
    expect(html).toContain('Finalizar Entrega y Cobro');
  });
});
