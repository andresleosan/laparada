// src/utils/productImages.ts

/**
 * Resuelve imágenes culinarias fotorrealistas de alta gama para platos y categorías clave.
 * Si el producto o combo no tiene una imagen específica o tiene imágenes heredadas,
 * proporciona los activos culinarios optimizados de La Parada.
 */
export function getGourmetImage(nombre: string, fallbackUrl?: string): string | undefined {
  const n = (nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('tequeno')) return '/images/products/tequenos.jpg';
  if (n.includes('panceroti') || n.includes('panzerotti')) return '/images/products/panceroti.jpg';
  if (n.includes('hamburguesa') || n.includes('burger')) return '/images/products/hamburguesa.jpg';
  if (n.includes('perro') || n.includes('hot dog')) return '/images/products/perro-caliente.jpg';
  if (n.includes('salchipapa')) return '/images/products/salchipapa.jpg';
  if (n.includes('arepa')) return '/images/products/arepa.jpg';
  if (n.includes('empanada')) return '/images/products/empanadas.jpg';
  return fallbackUrl;
}
