// src/services/imageService.ts

/**
 * Servicio para buscar y obtener imágenes libres de derechos
 * Usa Unsplash API (gratis, sin autenticación requerida para búsquedas básicas)
 */

interface UnsplashImage {
  id: string;
  urls: {
    small: string;
    regular: string;
    full: string;
  };
  user: {
    name: string;
  };
  description: string;
}

/**
 * Busca una imagen en Unsplash basada en un término de búsqueda
 * @param searchTerm - Término de búsqueda (ej: "tequeño", "panceroti")
 * @returns URL de la imagen o null si no encuentra
 */
export async function searchUnsplashImage(searchTerm: string): Promise<string | null> {
  try {
    if (!searchTerm.trim()) return null;

    // Usar endpoint público de Unsplash sin autenticación requerida
    // Para mejor confiabilidad, usamos "regular" que es 1080px de ancho
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
        searchTerm
      )}&per_page=1&orientation=portrait`,
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Version': 'v1',
        },
      }
    );

    if (!response.ok) {
      console.warn('⚠️ Error fetching from Unsplash:', response.statusText);
      return null;
    }

    const data: { results: UnsplashImage[] } = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log(`ℹ️ No images found for: ${searchTerm}`);
      return null;
    }

    const image = data.results[0];
    console.log(`✅ Image found for "${searchTerm}":`, image.urls.regular);

    return image.urls.regular;
  } catch (error) {
    console.error('❌ Error searching Unsplash:', error);
    return null;
  }
}

/**
 * Función alternativa: genera URL directo a imagen de Unsplash sin API
 * Útil si Unsplash API falla
 * Usa proxy images.weserv.nl para manejar CORS correctamente
 */
export function getUnsplashImageUrl(searchTerm: string): string {
  // URL directa a Unsplash
  const unsplashUrl = `https://source.unsplash.com/400x500/?${encodeURIComponent(searchTerm)}`;
  // Usar proxy images.weserv.nl para manejar CORS (gratuito y confiable)
  // Este proxy sirve imágenes con headers CORS correctos
  return `https://images.weserv.nl/?url=${encodeURIComponent(unsplashUrl)}&n=-1`;
}

/**
 * Busca imagen con fallback a URL directa
 * Usa Unsplash source (funciona sin autenticación)
 */
export async function buscarImagenProducto(
  nombreProducto: string
): Promise<string | null> {
  console.log(`🔍 Buscando imagen para: ${nombreProducto}`);

  if (!nombreProducto.trim()) {
    console.warn('⚠️ Nombre de producto vacío');
    return null;
  }

  // Usar URL directa de Unsplash que funciona sin autenticación
  // Formato: https://source.unsplash.com/{width}x{height}/?{query}
  const imageUrl = getUnsplashImageUrl(nombreProducto);
  console.log(`📸 URL generada: ${imageUrl}`);
  
  return imageUrl;
}

/**
 * Colores de fondo para productos como fallback
 */
const PRODUCT_COLORS: Record<string, string> = {
  default: 'bg-neutral-800',
  cafe: 'bg-amber-900',
  tequeño: 'bg-red-900',
  hamburguesa: 'bg-orange-900',
  panceroti: 'bg-yellow-900',
  pizza: 'bg-red-800',
  sandwich: 'bg-amber-800',
};

/**
 * Obtiene una clase de color Tailwind para un producto
 */
export function getProductColorClass(productName: string): string {
  const lower = productName.toLowerCase();
  for (const [key, color] of Object.entries(PRODUCT_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return PRODUCT_COLORS.default;
}
