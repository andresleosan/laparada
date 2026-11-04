import { describe, expect, it } from 'vitest';
import type { TicketVentaData } from '@/types';
import { formatCOP } from '../formatCOP';
import {
  buildWhatsAppReceiptText,
  buildWhatsAppReceiptUrl,
  formatearFechaTicket,
} from '../ticketWhatsApp';

describe('ticketWhatsApp', () => {
  const ticketBase: TicketVentaData = {
    ventaId: 'VENTA-ABC123456',
    negocioNombre: 'La Parada Fast Food',
    negocioSlug: 'laparada',
    negocioDireccion: 'Calle 10 # 5-20, Cúcuta',
    negocioTelefono: '3101234567',
    fecha: new Date('2026-11-03T18:30:00.000Z'),
    items: [
      {
        tipo: 'producto',
        referenciaId: 'prod-1',
        nombre: 'Perro Caliente Especial',
        cantidad: 2,
        precioUnitario: 16000,
        subtotal: 32000,
      },
      {
        tipo: 'producto',
        referenciaId: 'prod-2',
        nombre: 'Gaseosa 400ml',
        cantidad: 1,
        precioUnitario: 4000,
        subtotal: 4000,
      },
    ],
    total: 36000,
    metodoPago: 'efectivo',
    tipoEntrega: 'mostrador',
    montoRecibido: 40000,
    cambio: 4000,
  };

  it('formatea la fecha y hora correctamente sin lanzar excepciones', () => {
    const formatted = formatearFechaTicket(ticketBase.fecha);
    expect(formatted.fechaTexto).toBeTruthy();
    expect(formatted.horaTexto).toBeTruthy();
  });

  it('genera el texto completo del recibo para WhatsApp con todos los detalles', () => {
    const texto = buildWhatsAppReceiptText(ticketBase);

    expect(texto).toContain('*LA PARADA FAST FOOD*');
    expect(texto).toContain('_Comprobante de Venta_');
    expect(texto).toContain('📍 Calle 10 # 5-20, Cúcuta');
    expect(texto).toContain('📞 Tel: 3101234567');
    expect(texto).toContain('#123456');
    expect(texto).toContain('🏪 *Entrega:* Mostrador');
    expect(texto).toContain(`• 2× Perro Caliente Especial → ${formatCOP(32000)}`);
    expect(texto).toContain(`• 1× Gaseosa 400ml → ${formatCOP(4000)}`);
    expect(texto).toContain(`💰 *TOTAL:* ${formatCOP(36000)} COP`);
    expect(texto).toContain('💵 *Método de Pago:* Efectivo');
    expect(texto).toContain(`Recibido: ${formatCOP(40000)}`);
    expect(texto).toContain(`Cambio: ${formatCOP(4000)}`);
    expect(texto).toContain('¡Muchas gracias por tu compra!');
  });

  it('incluye datos de domicilio y cliente cuando están presentes', () => {
    const ticketDomicilio: TicketVentaData = {
      ...ticketBase,
      tipoEntrega: 'domicilio',
      clienteNombre: 'Carlos Santana',
      clienteTelefono: '3159876543',
      direccionEntrega: 'Av 3 # 12-40',
      barrioEntrega: 'La Playa',
      metodoPago: 'transferencia',
      montoRecibido: undefined,
      cambio: undefined,
    };

    const texto = buildWhatsAppReceiptText(ticketDomicilio);
    expect(texto).toContain('🛵 *Entrega:* Domicilio');
    expect(texto).toContain('👤 *Cliente:* Carlos Santana');
    expect(texto).toContain('🏠 *Dirección:* Av 3 # 12-40 (La Playa)');
    expect(texto).toContain('💵 *Método de Pago:* Transferencia manual');
  });

  it('indica si la venta fue registrada en modo offline', () => {
    const ticketOffline: TicketVentaData = {
      ...ticketBase,
      esOffline: true,
    };

    const texto = buildWhatsAppReceiptText(ticketOffline);
    expect(texto).toContain('💾 _(Registrado en modo offline)_');
  });

  it('incluye desglose de descuento comercial o cortesía cuando está presente', () => {
    const ticketConDescuento: TicketVentaData = {
      ...ticketBase,
      subtotal: 36000,
      descuento: 6000,
      descuentoMotivo: 'Cliente VIP',
      total: 30000,
    };

    const texto = buildWhatsAppReceiptText(ticketConDescuento);
    expect(texto).toContain(`💵 *Subtotal:* ${formatCOP(36000)} COP`);
    expect(texto).toContain(`🏷️ *Descuento (Cliente VIP):* -${formatCOP(6000)} COP`);
    expect(texto).toContain(`💰 *TOTAL:* ${formatCOP(30000)} COP`);
  });

  it('incluye advertencia destacada cuando la venta fue anulada', () => {
    const ticketAnulado: TicketVentaData = {
      ...ticketBase,
      estado: 'anulada',
      motivoAnulacion: 'Error de digitación en mostrador',
    };

    const texto = buildWhatsAppReceiptText(ticketAnulado);
    expect(texto).toContain('🚨 *COMPROBANTE ANULADO - SIN VALOR FISCAL* 🚨');
    expect(texto).toContain('Motivo de anulación: _Error de digitación en mostrador_');
  });

  it('construye la URL de WhatsApp con el número limpio y prefijo internacional', () => {
    const url = buildWhatsAppReceiptUrl(ticketBase, '300 123 4567');
    expect(url).toContain('https://wa.me/573001234567?text=');
    expect(url).toContain(encodeURIComponent('LA PARADA FAST FOOD'));
  });

  it('construye la URL sin teléfono específico si no se proporciona', () => {
    const url = buildWhatsAppReceiptUrl(ticketBase);
    expect(url).toContain('https://wa.me/?text=');
  });
});
