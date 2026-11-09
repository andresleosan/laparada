import type { TicketVentaData } from '@/types';
import { formatCOP } from './formatCOP';
import { formatFechaLarga, formatHora } from './dateUtils';
import { formatearModificadoresYNotas } from './propinasYModificadores';

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

  if (ticket.datosFiscales) {
    lineas.push(`🧾 *${ticket.datosFiscales.razonSocial.toUpperCase()}*`);
    if (ticket.datosFiscales.nombreComercial) {
      lineas.push(`_${ticket.datosFiscales.nombreComercial}_`);
    }
    lineas.push(`📑 NIT: ${ticket.datosFiscales.nit}-${ticket.datosFiscales.dv || '0'} · ${ticket.datosFiscales.regimen}`);
    lineas.push(`🏛️ Res. DIAN No. ${ticket.datosFiscales.numeroResolucion}`);
    lineas.push(`📄 *DOC. EQUIVALENTE POS No.:* ${ticket.datosFiscales.consecutivoFiscal}`);
  } else {
    lineas.push(`🧾 *${(ticket.negocioNombre || 'LA PARADA').toUpperCase()}*`);
  }
  if (ticket.estado === 'anulada') {
    lineas.push('🚨 *COMPROBANTE ANULADO - SIN VALOR FISCAL* 🚨');
    if (ticket.motivoAnulacion) {
      lineas.push(`Motivo de anulación: _${ticket.motivoAnulacion}_`);
    }
  } else {
    lineas.push(ticket.esPagoParcial ? `_Comprobante de Abono Parcial #${ticket.abonoNumero || 1}_` : `_Comprobante de Venta_`);
  }
  if (ticket.negocioDireccion) lineas.push(`📍 ${ticket.negocioDireccion}`);
  if (ticket.negocioTelefono) lineas.push(`📞 Tel: ${ticket.negocioTelefono}`);
  lineas.push('────────────────────────');
  lineas.push(`📅 *Fecha:* ${fechaTexto} - ${horaTexto}`);
  lineas.push(`🆔 *Venta:* #${ticket.ventaId.slice(-6).toUpperCase()}`);
  if (ticket.mesaNombre) {
    lineas.push(`🍽️ *Mesa:* ${ticket.mesaNombre}`);
  }
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
    const modsStr = formatearModificadoresYNotas(item);
    lineas.push(`• ${item.cantidad}× ${item.nombre}${modsStr ? ` ${modsStr}` : ''} → ${formatCOP(item.subtotal)}`);
  }

  lineas.push('────────────────────────');
  if (typeof ticket.subtotal === 'number') {
    lineas.push(`💵 *Subtotal:* ${formatCOP(ticket.subtotal)} COP`);
  }
  if (typeof ticket.descuento === 'number' && ticket.descuento > 0) {
    lineas.push(`🏷️ *Descuento (${ticket.descuentoMotivo || 'Promoción'}):* -${formatCOP(ticket.descuento)} COP`);
  }
  if (typeof ticket.propina === 'number' && ticket.propina > 0) {
    lineas.push(`🎁 *Propina voluntaria (10% sugerida):* ${formatCOP(ticket.propina)} COP`);
  }
  if (ticket.datosFiscales && typeof ticket.datosFiscales.baseGravable === 'number') {
    lineas.push(`📊 *Base Gravable (${ticket.datosFiscales.tipoImpuesto === 'iva' ? 'IVA 19%' : 'INC 8%'}):* ${formatCOP(ticket.datosFiscales.baseGravable)} COP`);
    if (typeof ticket.datosFiscales.impuesto === 'number') {
      lineas.push(`⚖️ *Impuesto liquidado (${ticket.datosFiscales.tarifa ?? 8}%):* +${formatCOP(ticket.datosFiscales.impuesto)} COP`);
    }
  }

  lineas.push(`💰 *TOTAL:* ${formatCOP(ticket.total)} COP`);
  lineas.push(`💵 *Método de Pago:* ${ticket.metodoPago === 'efectivo' ? 'Efectivo' : 'Transferencia manual'}`);

  if (ticket.metodoPago === 'efectivo' && typeof ticket.montoRecibido === 'number' && ticket.montoRecibido > 0) {
    lineas.push(`   Recibido: ${formatCOP(ticket.montoRecibido)}`);
    if (typeof ticket.cambio === 'number' && ticket.cambio >= 0) {
      lineas.push(`   Cambio: ${formatCOP(ticket.cambio)}`);
    }
  }

  if (ticket.esPagoParcial && typeof ticket.saldoPendiente === 'number') {
    lineas.push(`⏳ *Saldo pendiente por pagar de la mesa:* ${formatCOP(ticket.saldoPendiente)} COP`);
  }

  if (ticket.esOffline) {
    lineas.push('💾 _(Registrado en modo offline)_');
  }

  if (ticket.datosFiscales?.leyenda) {
    lineas.push(`_${ticket.datosFiscales.leyenda}_`);
  }

  lineas.push('────────────────────────');
  lineas.push('¡Muchas gracias por tu compra! 🙏🍔');

  if (ticket.encuestaUrl) {
    lineas.push('');
    lineas.push('⭐ *¿Cómo estuvo tu experiencia?*');
    lineas.push(`Califícanos en 1 toque aquí: ${ticket.encuestaUrl}`);
  }

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
