/**
 * Utilidades para navegación GPS y contacto telefónico del repartidor / domiciliario.
 */

/**
 * Normaliza y limpia un número telefónico eliminando espacios, guiones y caracteres no numéricos.
 */
export function cleanPhoneNumber(telefono: string): string {
  return (telefono || '').replace(/\D/g, '');
}

function formatBarrio(barrio: string): string {
  const b = barrio.trim();
  return b.toLowerCase().startsWith('barrio') ? b : `Barrio ${b}`;
}

/**
 * Construye el enlace para abrir la dirección en Google Maps.
 */
export function buildGoogleMapsUrl(
  direccion: string,
  barrio?: string,
  ciudad: string = 'Cúcuta'
): string {
  const partes = [direccion.trim()];
  if (barrio && barrio.trim()) {
    partes.push(formatBarrio(barrio));
  }
  if (ciudad && ciudad.trim()) {
    partes.push(ciudad.trim());
  }
  const query = partes.filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Construye el enlace para iniciar navegación guiada en Waze.
 */
export function buildWazeUrl(
  direccion: string,
  barrio?: string,
  ciudad: string = 'Cúcuta'
): string {
  const partes = [direccion.trim()];
  if (barrio && barrio.trim()) {
    partes.push(formatBarrio(barrio));
  }
  if (ciudad && ciudad.trim()) {
    partes.push(ciudad.trim());
  }
  const query = partes.filter(Boolean).join(', ');
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`;
}

/**
 * Construye el enlace de llamada telefónica directa (protocolo tel:).
 */
export function buildPhoneCallUrl(telefono: string): string {
  const limpio = cleanPhoneNumber(telefono);
  return `tel:${limpio}`;
}

/**
 * Construye el enlace directo de chat de WhatsApp con el cliente.
 * Prefija el indicativo internacional de Colombia (+57) si es un número móvil de 10 dígitos.
 */
export function buildWhatsAppContactUrl(
  telefono: string,
  negocioNombre?: string,
  clienteNombre?: string
): string {
  let limpio = cleanPhoneNumber(telefono);
  if (limpio.startsWith('0')) {
    limpio = limpio.replace(/^0+/, '');
  }
  if (limpio.length === 10 && limpio.startsWith('3')) {
    limpio = `57${limpio}`;
  }

  const saludo = clienteNombre ? `Hola ${clienteNombre.trim()}` : 'Hola';
  const remitente = negocioNombre ? ` de *${negocioNombre.trim()}*` : '';
  const mensaje = `¡${saludo}! Soy tu domiciliario${remitente}, voy en camino con tu pedido. 🛵💨`;

  return `https://wa.me/${limpio}?text=${encodeURIComponent(mensaje)}`;
}
