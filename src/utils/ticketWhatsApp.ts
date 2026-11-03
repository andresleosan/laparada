import type { TicketVentaData } from '@/types';
import { formatCOP } from './formatCOP';
import { formatFechaLarga, formatHora } from './dateUtils';

export function formatearFechaTicket(fecha: Date | string): { fechaTexto: string; horaTexto: string } {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const fechaValida = !isNaN(d.getTime()) ? d : new Date();
  return {
    fechaTexto: formatFechaLarga(fechaValida),
    horaTexto: formatHora(fechaValida),
  };
}

export function buildWhatsAppReceiptText(ticket: TicketVentaData): string {
  const { fechaTexto, horaTexto } = formatearFechaTicket(ticket.fecha);
  const lineas: string[] = [];

  lineas.push(`🧾 *${(ticket.negocioNombre || 'LA PARADA').toUpperCase()}*`);
  lineas.push(`_Comprobante de Venta_`);
  if (ticket.negocioDireccion) lineas.push(`📍 ${ticket.negocioDireccion}`);
  if (ticket.negocioTelefono) lineas.push(`📞 Tel: ${ticket.negocioTelefono}`);
  lineas.push('────────────────────────');
  lineas.push(`📅 *Fecha:* ${fechaTexto} - ${horaTexto}`);
  lineas.push(`🆔 *Venta:* #${ticket.ventaId.slice(-6).toUpperCase()}`);
  lineas.push(ticket.tipoEntrega === 'domicilio' ? '🛵 *Entrega:* Domicilio' : '🏪 *Entrega:* Mostrador');
  if (ticket.clienteNombre) {
    lineas.push(`👤 *Cliente:* ${ticket.clienteNombre}`);
  }
  if (ticket.direccionEntrega) {
    lineas.push(`🏠 *Dirección:* ${ticket.direccionEntrega}${ticket.barrioEntrega ? ` (${ticket.barrioEntrega})` : ''}`);
  }
  lineas.push('────────────────────────');
  lineas.push('*DETALLE DE PRODUCTOS:*');

  for (const item of ticket.items) {
    lineas.push(`• ${item.cantidad}× ${item.nombre} → ${formatCOP(item.subtotal)}`);
  }

  lineas.push('────────────────────────');
  lineas.push(`💰 *TOTAL:* ${formatCOP(ticket.total)} COP`);
  lineas.push(`💵 *Método de Pago:* ${ticket.metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia manual'}`);

  if (ticket.metodoPago === 'efectivo' && typeof ticket.montoRecibido === 'number' && ticket.montoRecibido > 0) {
    lineas.push(`   Recibido: ${formatCOP(ticket.montoRecibido)}`);
    if (typeof ticket.cambio === 'number' && ticket.cambio >= 0) {
      lineas.push(`   Cambio: ${formatCOP(ticket.cambio)}`);
    }
  }

  if (ticket.esOffline) {
    lineas.push('💾 _(Registrado en modo offline)_');
  }

  lineas.push('────────────────────────');
  lineas.push('¡Muchas gracias por tu compra! 🙏🍔');

  return lineas.join('\n');
}

export function buildWhatsAppReceiptUrl(ticket: TicketVentaData, telefonoCliente?: string): string {
  const texto = buildWhatsAppReceiptText(ticket);
  const encoded = encodeURIComponent(texto);
  const rawPhone = (telefonoCliente || ticket.clienteTelefono || '').replace(/\D/g, '');

  if (rawPhone) {
    const fullPhone = rawPhone.startsWith('57') ? rawPhone : `57${rawPhone}`;
    return `https://wa.me/${fullPhone}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
