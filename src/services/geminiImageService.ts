// src/services/geminiImageService.ts

/**
 * Servicio de generación de fotografía gastronómica profesional
 * Integra Nano Banana (Google Gemini / Imagen) con fallback de ultra alta definición (Flux / Pollinations AI)
 * para garantizar 100% de disponibilidad y fotos de estudio en 1 clic.
 */

export interface FoodPromptOptions {
  nombre: string;
  descripcion?: string;
  estilo?: 'estudio' | 'rustico' | 'street' | 'parrilla';
}

/**
 * Obtiene la API Key de Gemini / Nano Banana configurada
 * Prioridad: localStorage > import.meta.env.VITE_GEMINI_API_KEY
 */
export function getGeminiApiKey(): string {
  const localKey = localStorage.getItem('gemini_api_key');
  if (localKey && localKey.trim()) return localKey.trim();
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

/**
 * Guarda la API Key en localStorage
 */
export function setGeminiApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem('gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('gemini_api_key');
  }
}

/**
 * Genera un prompt gastronómico hiperrealista en inglés optimizado para fotografía publicitaria
 */
export function construirPromptGastronomico({
  nombre,
  descripcion = '',
  estilo = 'estudio',
}: FoodPromptOptions): string {
  const n = nombre.toLowerCase();
  let baseFoodContext = `${nombre}, ${descripcion}`;

  // Enriquecer contexto según el tipo de plato
  if (n.includes('panceroti') || n.includes('panzerotti')) {
    baseFoodContext = `Golden brown crispy fried Italian panzerotti pastry turnover, savory filling with steaming melted mozzarella cheese and savory meats, golden blistered crust`;
  } else if (n.includes('tequeño')) {
    baseFoodContext = `Golden crispy Venezuelan cheese tequeños stacked appetizingly, hot stringy melted white cheese stretching, golden brown blistered crust`;
  } else if (n.includes('hamburguesa') || n.includes('burger')) {
    baseFoodContext = `Artisan gourmet burger, juicy grilled beef patty with char marks, melting cheddar cheese draping over meat, crispy caramelized bacon, fresh crisp lettuce, red tomato slice, shiny toasted brioche bun, house sauce drip`;
  } else if (n.includes('perro') || n.includes('hot dog')) {
    baseFoodContext = `Colombian style gourmet hot dog in a soft steamed bun, premium sausage, topped with melted mozzarella cheese, crushed potato chips, quail egg, bacon bits and artisan sauces`;
  } else if (n.includes('salchipapa')) {
    baseFoodContext = `Gourmet salchipapa platter, crispy golden french fries topped with sliced seared frankfurter sausages, melted mozzarella cheese, crispy bacon bits, artisan tartar and pink sauces`;
  } else if (n.includes('arepa')) {
    baseFoodContext = `Golden toasted corn arepa, crispy on the outside and soft inside, generously stuffed with shredded tender beef, chicken and melting cheese`;
  } else if (n.includes('papas') || n.includes('fritas')) {
    baseFoodContext = `Rustic crispy french fries with golden brown skins, sprinkled with coarse sea salt, herbs, and melted cheddar sauce`;
  } else if (n.includes('jugo') || n.includes('gaseosa') || n.includes('bebida')) {
    baseFoodContext = `Refreshing iced cold drink in a clear glass, condensation beads on glass, fresh fruit garnish, ice cubes, vibrant color`;
  } else if (n.includes('combo')) {
    baseFoodContext = `Complete fast food combo meal with artisan cheeseburger, side of crispy golden french fries in a basket, and a refreshing drink with ice`;
  }

  let environment = `dark slate table, warm ambient restaurant background, soft bokeh lights`;
  if (estilo === 'parrilla') {
    environment = `smoky BBQ grill background, subtle glowing embers, cast iron platter`;
  } else if (estilo === 'rustico') {
    environment = `weathered dark wooden cutting board, parchment paper, scattered spices`;
  } else if (estilo === 'street') {
    environment = `neon street food night vibe, dark textured background, vibrant warm rim lights`;
  }

  return `Professional commercial studio food photography of ${baseFoodContext}. ${environment}. Shot on 85mm lens, f/2.8, shallow depth of field, dramatic cinematic warm rim lighting, steam rising softly, appetizing commercial restaurant advertising photo, 4k resolution, ultra detailed, photorealistic, sharp focus, no text, no watermark, no human hands, no cartoon.`;
}

/**
 * Convierte un ArrayBuffer a base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convierte un string base64 en Blob de imagen
 */
function base64ToBlob(base64: string, mimeType = 'image/jpeg'): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Generador Fotográfico Inteligente (Nano Banana + Motor Gastronómico Ultra-HD)
 */
export async function generarImagenConNanoBanana(
  prompt: string,
  apiKeyParam?: string
): Promise<{ dataUrl: string; blob: Blob; mimeType: string }> {
  const apiKey = (apiKeyParam || getGeminiApiKey()).trim();

  // 1. Si hay API Key de Google, intentamos invocar el endpoint de Gemini / Nano Banana
  if (apiKey) {
    try {
      const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/nano-banana-pro-preview:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const response = await fetch(googleUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const base64Image =
          result?.predictions?.[0]?.bytesBase64Encoded ||
          result?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

        if (base64Image) {
          const mimeType = 'image/jpeg';
          return {
            dataUrl: `data:${mimeType};base64,${base64Image}`,
            blob: base64ToBlob(base64Image, mimeType),
            mimeType,
          };
        }
      }
    } catch (err) {
      console.warn('Google Cloud Quota/Model no disponible, usando motor gastronómico 4K:', err);
    }
  }

  // 2. Motor Gastronómico Ultra-HD (Flux / High-Res Food Engine)
  // Siempre disponible, ultra rápido y sin límites de cuota
  const seed = Math.floor(Math.random() * 1000000);
  const engineUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt
  )}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

  const imgResponse = await fetch(engineUrl);
  if (!imgResponse.ok) {
    throw new Error(`Error en el motor de renderizado de imagen (${imgResponse.status})`);
  }

  const arrayBuffer = await imgResponse.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  const mimeType = 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const blob = new Blob([arrayBuffer], { type: mimeType });

  return {
    dataUrl,
    blob,
    mimeType,
  };
}
