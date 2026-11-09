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

  it('renderiza desglose de propina sugerida y modificadores de cocina', () => {
    const ticketConPropina: TicketVentaData = {
      ...ticketMock,
      subtotal: 28000,
      propina: 2800,
      total: 30800,
      items: [
        {
          tipo: 'producto',
          referenciaId: 'prod-1',
          nombre: 'Hamburguesa Doble Carne',
          cantidad: 1,
          precioUnitario: 28000,
          subtotal: 28000,
          modificadores: ['Término 3/4', 'Sin salsas'],
          notas: 'Para mesa',
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TicketVentaModal ticket={ticketConPropina} isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('Término 3/4, Sin salsas · Nota: Para mesa');
    expect(html).toContain('Propina voluntaria (10% sugerida):');
    expect(html).toContain('2.800');
    expect(html).toContain('30.800 COP');
  });

  it('renderiza comprobante de abono parcial y saldo pendiente de mesa', () => {
    const ticketAbono: TicketVentaData = {
      ...ticketMock,
      esPagoParcial: true,
      abonoNumero: 2,
      total: 15000,
      saldoPendiente: 35000,
      mesaNombre: 'Mesa 4',
    };

    const html = renderToStaticMarkup(
      <TicketVentaModal ticket={ticketAbono} isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('Saldo pendiente de la mesa:');
    expect(html).toContain('35.000 COP');
    expect(html).toContain('🍽️ Mesa 4');
  });

  it('renderiza encabezado fiscal DIAN, consecutivo POS y desglose de base e impoconsumo', () => {
    const ticketFiscal: TicketVentaData = {
      ...ticketMock,
      datosFiscales: {
        razonSocial: 'COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S.',
        nombreComercial: 'LA PARADA',
        nit: '901.845.123',
        dv: '5',
        regimen: 'responsable_inc',
        responsabilidad: 'Responsable de Impuesto Nacional al Consumo (INC 8%)',
        consecutivoFiscal: 'POS-00154',
        numeroResolucion: '18764089123456',
        prefijo: 'POS',
        rangoTexto: 'del 1 al 10000',
        vigenciaTexto: 'hasta 2027-01-15',
        baseGravable: 25926,
        impuesto: 2074,
        tarifa: 8,
        tipoImpuesto: 'inc',
        leyenda: 'Documento Equivalente Electrónico POS conforme a resolución DIAN',
      },
    };

    const html = renderToStaticMarkup(
      <TicketVentaModal ticket={ticketFiscal} isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S.');
    expect(html).toContain('NIT: 901.845.123-5');
    expect(html).toContain('DOC. EQUIVALENTE POS No. POS-00154');
    expect(html).toContain('Res. DIAN No. 18764089123456');
    expect(html).toContain('Base Gravable (INC 8%):');
    expect(html).toContain('25.926');
    expect(html).toContain('Impuesto liquidado (8%):');
    expect(html).toContain('2.074');
    expect(html).toContain('Documento Equivalente Electrónico POS conforme a resolución DIAN');
  });
});
