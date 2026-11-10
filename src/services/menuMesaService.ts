import { requireTenantId } from '@/security/tenantScope';
import type { RondaComanda } from '@/types/mesa';
import type {
  AutopedidoMesaInput,
  SolicitudLlamadoMeseroInput,
  SolicitudPrecuentaMesaInput,
} from '@/types/menuMesa';
import { getMotivoLlamadoMeta, validarAutopedidoMesa } from '@/utils/menuMesaUtils';
import { crearNotificacion } from './notificacionesService';
import {
  abrirCuentaMesa,
  actualizarLlamadoMesa,
  agregarRondaACuenta,
  solicitarPrecierreMesa,
} from './mesasService';

/**
 * Emite una alerta de llamado o asistencia para el mesero desde el menú en mesa
 */
export async function enviarLlamadoMesero(
  input: SolicitudLlamadoMeseroInput
): Promise<string> {
  const tenantId = requireTenantId(input.negocioId);
  const meta = getMotivoLlamadoMeta(input.motivo);
  const ahoraIso = new Date().toISOString();

  const mensaje = input.notas?.trim()
    ? `${meta.label}: ${input.notas.trim()}`
    : meta.label;

  // 1. Crear notificación operativa en Firestore para cabecera, campana sonora y KDS
  const notifId = await crearNotificacion(tenantId, {
    modulo: 'salon',
    tipo: 'llamado_mesero',
    titulo: `Mesa ${input.mesaNumero} · Llamado de Mesero`,
    mensaje,
    urgencia: 'alta',
    enlace: '/mesas',
    metadata: {
      mesaId: input.mesaId,
      mesaNumero: input.mesaNumero,
      mesaNombre: input.mesaNombre,
      motivo: input.motivo,
      motivoLabel: meta.label,
      notas: input.notas?.trim() || '',
      clienteNombre: input.clienteNombre?.trim() || '',
      origen: 'qr_mesa',
      horaSolicitud: ahoraIso,
    },
    origen: 'automatico',
    creadaPor: input.clienteNombre?.trim() || `Comensal Mesa ${input.mesaNumero}`,
  });

  // 2. Reflejar el llamado en la tarjeta visual de la mesa en Salón
  try {
    await actualizarLlamadoMesa(tenantId, input.mesaId, {
      id: notifId,
      tipo: 'llamado',
      motivo: meta.label,
      hora: ahoraIso,
      clienteNombre: input.clienteNombre?.trim(),
      notas: input.notas?.trim(),
      atendido: false,
    });
  } catch (err) {
    console.warn('No se pudo actualizar llamado en el documento de mesa:', err);
  }

  return notifId;
}

/**
 * Solicita la pre-cuenta desde el dispositivo móvil del comensal
 */
export async function solicitarPrecuentaDesdeMesa(
  input: SolicitudPrecuentaMesaInput
): Promise<void> {
  const tenantId = requireTenantId(input.negocioId);
  const ahoraIso = new Date().toISOString();

  // 1. Actualizar estado de la mesa y la cuenta a 'por_cobrar'
  await solicitarPrecierreMesa(tenantId, input.mesaId, input.cuentaId);

  const metodoLabel = input.metodoPagoPreferido === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo';
  let mensaje = `Pide la cuenta con pago en ${metodoLabel}`;
  if (input.necesitaFactura) {
    mensaje += input.datosFactura?.nit ? ` (Factura NIT ${input.datosFactura.nit})` : ' (Requiere Factura)';
  }
  if (input.notas?.trim()) {
    mensaje += `. ${input.notas.trim()}`;
  }

  // 2. Notificación operativa para el cajero y mesero
  const notifId = await crearNotificacion(tenantId, {
    modulo: 'salon',
    tipo: 'solicitud_precuenta',
    titulo: `Mesa ${input.mesaNumero} · Solicitud de Pre-Cuenta`,
    mensaje,
    urgencia: 'alta',
    enlace: '/mesas',
    metadata: {
      mesaId: input.mesaId,
      mesaNumero: input.mesaNumero,
      mesaNombre: input.mesaNombre,
      cuentaId: input.cuentaId,
      metodoPago: input.metodoPagoPreferido,
      necesitaFactura: Boolean(input.necesitaFactura),
      datosFactura: input.datosFactura || null,
      notas: input.notas?.trim() || '',
      clienteNombre: input.clienteNombre?.trim() || '',
      origen: 'qr_mesa',
      horaSolicitud: ahoraIso,
    },
    origen: 'automatico',
    creadaPor: input.clienteNombre?.trim() || `Comensal Mesa ${input.mesaNumero}`,
  });

  // 3. Reflejar en la tarjeta de mesa
  try {
    await actualizarLlamadoMesa(tenantId, input.mesaId, {
      id: notifId,
      tipo: 'cuenta',
      motivo: `Solicitó Cuenta (${metodoLabel})`,
      hora: ahoraIso,
      clienteNombre: input.clienteNombre?.trim(),
      notas: input.notas?.trim(),
      atendido: false,
    });
  } catch (err) {
    console.warn('No se pudo actualizar estado de cuenta en el documento de mesa:', err);
  }
}

/**
 * Procesa y envía un autopedido directo del comensal a la comanda de la mesa y KDS
 */
export async function enviarAutopedidoMesa(
  input: AutopedidoMesaInput
): Promise<RondaComanda> {
  const tenantId = requireTenantId(input.negocioId);
  const ahoraIso = new Date().toISOString();

  // Validar ítems
  const validacion = validarAutopedidoMesa(input.items);
  if (!validacion.valido) {
    throw new Error(validacion.error || 'Ítems de pedido no válidos.');
  }

  let cuentaId = input.cuentaId?.trim();

  // Si la mesa no tiene cuenta abierta, abrirla automáticamente
  if (!cuentaId) {
    cuentaId = await abrirCuentaMesa(tenantId, {
      mesaId: input.mesaId,
      comensales: 1,
      clienteNombre: input.clienteNombre?.trim() || 'Comensal QR',
      notas: input.notas?.trim() || 'Apertura por Autopedido Digital',
    });
  }

  // Agregar la ronda con envío automático a KDS de Cocina
  const nuevaRonda = await agregarRondaACuenta(tenantId, cuentaId, {
    items: input.items,
    notas: input.notas?.trim() ? `Autopedido: ${input.notas.trim()}` : 'Autopedido desde Menú QR en Mesa',
    enviarAKDS: true,
  });

  // Notificación operativa para Cocina y Salón
  const cantTotal = input.items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);
  const notifId = await crearNotificacion(tenantId, {
    modulo: 'salon',
    tipo: 'autopedido_mesa',
    titulo: `Mesa ${input.mesaNumero} · Nuevo Autopedido Digital`,
    mensaje: `Ronda ${nuevaRonda.numero}: ${cantTotal} platos/bebidas enviados directamente a cocina`,
    urgencia: 'alta',
    enlace: '/cocina',
    metadata: {
      mesaId: input.mesaId,
      mesaNumero: input.mesaNumero,
      mesaNombre: input.mesaNombre,
      cuentaId,
      rondaNumero: nuevaRonda.numero,
      itemsCount: cantTotal,
      totalRonda: nuevaRonda.total,
      clienteNombre: input.clienteNombre?.trim() || '',
      origen: 'qr_mesa',
      horaSolicitud: ahoraIso,
    },
    origen: 'automatico',
    creadaPor: input.clienteNombre?.trim() || `Comensal Mesa ${input.mesaNumero}`,
  });

  try {
    await actualizarLlamadoMesa(tenantId, input.mesaId, {
      id: notifId,
      tipo: 'autopedido',
      motivo: `Nuevo Autopedido (Ronda ${nuevaRonda.numero})`,
      hora: ahoraIso,
      clienteNombre: input.clienteNombre?.trim(),
      atendido: false,
    });
  } catch (err) {
    console.warn('No se pudo actualizar aviso de autopedido en mesa:', err);
  }

  return nuevaRonda;
}
