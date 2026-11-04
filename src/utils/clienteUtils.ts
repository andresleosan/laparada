import type { Cliente } from '@/types/cliente';

/**
 * Normaliza un número de teléfono para almacenamiento y búsqueda uniforme.
 * Remueve espacios, guiones, paréntesis y estandariza números colombianos (elimina prefijo 57 si aplica).
 */
export function normalizarTelefono(telefono: string): string {
  if (!telefono) return '';
  const soloNumeros = telefono.replace(/\D/g, '');
  if (soloNumeros.length === 12 && soloNumeros.startsWith('57')) {
    return soloNumeros.slice(2);
  }
  return soloNumeros;
}

/**
 * Formatea un número de teléfono colombiano de 10 dígitos para presentación amigable (ej: "300 123 4567").
 */
export function formatearTelefonoVisual(telefono: string): string {
  const norm = normalizarTelefono(telefono);
  if (norm.length === 10) {
    return `${norm.slice(0, 3)} ${norm.slice(3, 6)} ${norm.slice(6)}`;
  }
  return telefono;
}

/**
 * Determina si un cliente califica como frecuente / habitual (al menos 3 compras completadas).
 */
export function esClienteFrecuente(cliente: Pick<Cliente, 'totalPedidos'>): boolean {
  return (cliente.totalPedidos || 0) >= 3;
}

/**
 * Genera el enlace de chat de WhatsApp para el cliente.
 */
export function obtenerEnlaceWhatsAppCliente(telefono: string, mensaje?: string): string {
  const norm = normalizarTelefono(telefono);
  if (!norm) return '#';
  const numeroCompleto = norm.startsWith('57') ? norm : `57${norm}`;
  const base = `https://wa.me/${numeroCompleto}`;
  if (mensaje && mensaje.trim()) {
    return `${base}?text=${encodeURIComponent(mensaje.trim())}`;
  }
  return base;
}

/**
 * Calcula el ticket promedio gastado por un cliente.
 */
export function calcularTicketPromedioCliente(cliente: Pick<Cliente, 'totalConsumido' | 'totalPedidos'>): number {
  if (!cliente.totalPedidos || cliente.totalPedidos <= 0) return 0;
  return Math.round(cliente.totalConsumido / cliente.totalPedidos);
}

export interface KpisClientes {
  totalClientes: number;
  clientesFrecuentes: number;
  totalConsumidoGlobal: number;
  ticketPromedioGlobal: number;
}

/**
 * Calcula los KPIs ejecutivos del directorio de clientes.
 */
export function calcularKpisClientes(clientes: Cliente[]): KpisClientes {
  const totalClientes = clientes.length;
  let clientesFrecuentes = 0;
  let totalConsumidoGlobal = 0;
  let totalPedidosGlobal = 0;

  for (const c of clientes) {
    if (esClienteFrecuente(c)) {
      clientesFrecuentes += 1;
    }
    totalConsumidoGlobal += c.totalConsumido || 0;
    totalPedidosGlobal += c.totalPedidos || 0;
  }

  const ticketPromedioGlobal =
    totalPedidosGlobal > 0 ? Math.round(totalConsumidoGlobal / totalPedidosGlobal) : 0;

  return {
    totalClientes,
    clientesFrecuentes,
    totalConsumidoGlobal,
    ticketPromedioGlobal,
  };
}
