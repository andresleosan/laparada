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
 */
export function getUnsplashImageUrl(searchTerm: string): string {
  // Genera una URL directa a una imagen aleatorio de Unsplash
  // Formato: https://source.unsplash.com/400x500/?{search_term}
  return `https://source.unsplash.com/400x500/?${encodeURIComponent(searchTerm)}`;
}

/**
 * Busca imagen con fallback a URL directa
 */
export async function buscarImagenProducto(
  nombreProducto: string
): Promise<string | null> {
  console.log(`🔍 Buscando imagen para: ${nombreProducto}`);

  // Intentar primero con API de búsqueda
  const imageUrl = await searchUnsplashImage(nombreProducto);
  if (imageUrl) return imageUrl;

  // Fallback a URL directa (siempre funciona)
  console.log(`📸 Usando URL directa para: ${nombreProducto}`);
  return getUnsplashImageUrl(nombreProducto);
}
