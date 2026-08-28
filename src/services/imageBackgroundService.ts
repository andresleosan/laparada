import { httpsCallable } from 'firebase/functions';
import { appCheckConfigured, functions } from '@/services/firebase';

const MAX_PROCESSING_SIZE = 1200;
const DEFAULT_BACKGROUND_THRESHOLD = 72;
const DEFAULT_TABLE_BACKGROUND_URL = '/assets/background-table.jpg';
const MAX_COMPOSITION_SIZE = 1600;
const PRODUCT_TARGET_HEIGHT_RATIO = 0.78;

interface RemoveBackgroundRequest {
  imageBase64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

interface RemoveBackgroundResponse {
  imageBase64: string;
  mimeType: 'image/png';
}

export interface FondoUniformeOptions {
  color: string;
  threshold?: number;
}

function validarColorFondo(color: string): string {
  const colorNormalizado = color.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(colorNormalizado)) {
    throw new Error('El color de fondo no es válido');
  }
  return colorNormalizado;
}

function cargarImagen(source: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);

    image.onload = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo cargar una imagen para aplicar el fondo'));
    };

    if (typeof source === 'string') {
      if (!/^(https?:\/\/|data:image\/|\/)/i.test(source)) {
        reject(new Error('La fuente de imagen no es válida'));
        return;
      }
      if (/^https?:\/\//i.test(source)) image.crossOrigin = 'anonymous';
      image.src = source;
    } else {
      image.src = objectUrl!;
    }
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const separatorIndex = value.indexOf(',');
      if (separatorIndex < 0) {
        reject(new Error('No se pudo preparar la imagen para editarla'));
        return;
      }
      resolve(value.slice(separatorIndex + 1));
    };
    reader.onerror = () => reject(new Error('No se pudo leer la imagen seleccionada'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function friendlyProcessingError(error: unknown): Error {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';

  if (code.includes('unauthenticated')) return new Error('Debes iniciar sesión para editar fotos');
  if (code.includes('permission-denied')) return new Error('Tu perfil no puede editar fotos de productos');
  if (code.includes('resource-exhausted')) return new Error('Alcanzaste el límite temporal de ediciones. Intenta más tarde.');
  if (code.includes('failed-precondition')) return new Error('La edición de fotos no está configurada o la imagen no pudo procesarse');
  if (code.includes('unavailable')) return new Error('El servicio de edición no está disponible. Conservamos tu foto original.');
  return error instanceof Error ? error : new Error('No se pudo editar la foto');
}

/**
 * Envía una imagen al backend protegido. La API key de remove.bg nunca se entrega al navegador.
 */
export async function removerFondoProducto(source: Blob): Promise<Blob> {
  if (!functions || !appCheckConfigured) {
    throw new Error('La edición de fotos requiere una sesión y App Check configurado');
  }

  const mimeType = source.type as RemoveBackgroundRequest['mimeType'];
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error('El formato de imagen no está permitido');
  }

  try {
    const callable = httpsCallable<RemoveBackgroundRequest, RemoveBackgroundResponse>(
      functions,
      'removerFondoProducto',
      { limitedUseAppCheckTokens: true }
    );
    const result = await callable({
      imageBase64: await blobToBase64(source),
      mimeType,
    });
    if (
      !result.data
      || result.data.mimeType !== 'image/png'
      || typeof result.data.imageBase64 !== 'string'
      || !result.data.imageBase64
    ) {
      throw new Error('El proveedor devolvió una imagen inválida');
    }
    return base64ToBlob(result.data.imageBase64, result.data.mimeType);
  } catch (error) {
    throw friendlyProcessingError(error);
  }
}

function findAlphaBounds(image: HTMLImageElement): { x: number; y: number; width: number; height: number; canvas: HTMLCanvasElement } {
  const scale = Math.min(1, MAX_COMPOSITION_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No se pudo analizar el recorte del producto');

  context.drawImage(image, 0, 0, width, height);
  let data: Uint8ClampedArray;
  try {
    data = context.getImageData(0, 0, width, height).data;
  } catch {
    throw new Error('No se pudo leer el recorte del producto');
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < 0 || maxY < 0) throw new Error('No se encontró un producto en la imagen recortada');
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, canvas };
}

/**
 * Compone el recorte transparente sobre la mesa y lo centra sin deformarlo.
 * El producto ocupa aproximadamente 78 % del alto, con un límite horizontal para fotos anchas.
 */
export async function componerImagenSobreMesa(
  productoRecortado: Blob,
  backgroundUrl = DEFAULT_TABLE_BACKGROUND_URL
): Promise<File> {
  const [productImage, backgroundImage] = await Promise.all([
    cargarImagen(productoRecortado),
    cargarImagen(backgroundUrl),
  ]);
  const productBounds = findAlphaBounds(productImage);
  const backgroundScale = Math.min(
    1,
    MAX_COMPOSITION_SIZE / Math.max(backgroundImage.naturalWidth, backgroundImage.naturalHeight)
  );
  const backgroundWidth = Math.max(1, Math.round(backgroundImage.naturalWidth * backgroundScale));
  const backgroundHeight = Math.max(1, Math.round(backgroundImage.naturalHeight * backgroundScale));
  const canvas = document.createElement('canvas');
  canvas.width = backgroundWidth;
  canvas.height = backgroundHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo preparar el fondo de mesa');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(backgroundImage, 0, 0, backgroundWidth, backgroundHeight);

  const targetHeight = backgroundHeight * PRODUCT_TARGET_HEIGHT_RATIO;
  const maxWidth = backgroundWidth * 0.88;
  const productScale = Math.min(targetHeight / productBounds.height, maxWidth / productBounds.width);
  const productWidth = productBounds.width * productScale;
  const productHeight = productBounds.height * productScale;
  const productX = (backgroundWidth - productWidth) / 2;
  const productY = (backgroundHeight - productHeight) / 2;
  context.drawImage(
    productBounds.canvas,
    productBounds.x,
    productBounds.y,
    productBounds.width,
    productBounds.height,
    productX,
    productY,
    productWidth,
    productHeight
  );

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la foto final'))),
      'image/jpeg',
      0.92
    );
  });
  return new File([outputBlob], 'producto-fondo-mesa.jpg', { type: 'image/jpeg' });
}

function distanciaColor(
  data: Uint8ClampedArray,
  index: number,
  background: [number, number, number]
): number {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  return Math.sqrt(
    (red - background[0]) ** 2 +
      (green - background[1]) ** 2 +
      (blue - background[2]) ** 2
  );
}

function estimarColorDeFondo(
  data: Uint8ClampedArray,
  width: number,
  height: number
): [number, number, number] {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const channels = [0, 1, 2].map((channel) => {
    const values = points
      .map(([x, y]) => data[(y * width + x) * 4 + channel])
      .sort((a, b) => a - b);
    return Math.round((values[1] + values[2]) / 2);
  });

  return [channels[0], channels[1], channels[2]];
}

function marcarFondoConectado(
  imageData: ImageData,
  background: [number, number, number],
  threshold: number
): Uint8Array {
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];

  const esFondo = (x: number, y: number): boolean => {
    const index = (y * width + x) * 4;
    return data[index + 3] > 0 && distanciaColor(data, index, background) <= threshold;
  };

  const agregar = (x: number, y: number) => {
    const position = y * width + x;
    if (!visited[position] && esFondo(x, y)) {
      visited[position] = 1;
      queue.push(position);
    }
  };

  for (let x = 0; x < width; x += 1) {
    agregar(x, 0);
    agregar(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    agregar(0, y);
    agregar(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const position = queue[cursor];
    const x = position % width;
    const y = Math.floor(position / width);
    if (x > 0) agregar(x - 1, y);
    if (x < width - 1) agregar(x + 1, y);
    if (y > 0) agregar(x, y - 1);
    if (y < height - 1) agregar(x, y + 1);
  }

  return visited;
}

function dibujarColorFondo(ctx: CanvasRenderingContext2D, color: string, width: number, height: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Elimina el fondo exterior conectado a los bordes y compone la imagen sobre
 * un color uniforme. Conserva los objetos claros que no tocan ese fondo.
 */
export async function procesarImagenConFondoUniforme(
  source: string | Blob,
  options: FondoUniformeOptions
): Promise<Blob> {
  const color = validarColorFondo(options.color);
  const threshold = options.threshold ?? DEFAULT_BACKGROUND_THRESHOLD;
  if (!Number.isFinite(threshold) || threshold < 1 || threshold > 200) {
    throw new Error('El umbral del fondo no es válido');
  }

  const image = await cargarImagen(source);
  const scale = Math.min(1, MAX_PROCESSING_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo preparar la edición de la imagen');

  ctx.drawImage(image, 0, 0, width, height);
  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    throw new Error('No se pudo leer la imagen para eliminar su fondo');
  }

  const background = estimarColorDeFondo(imageData.data, width, height);
  const fondoConectado = marcarFondoConectado(imageData, background, threshold);
  for (let position = 0; position < fondoConectado.length; position += 1) {
    if (!fondoConectado[position]) continue;
    const index = position * 4;
    const distance = distanciaColor(imageData.data, index, background);
    const alpha = Math.max(0, Math.min(1, (distance - threshold * 0.55) / (threshold * 0.45)));
    imageData.data[index + 3] = Math.round(imageData.data[index + 3] * alpha);
  }

  const cutoutCanvas = document.createElement('canvas');
  cutoutCanvas.width = width;
  cutoutCanvas.height = height;
  const cutoutCtx = cutoutCanvas.getContext('2d');
  if (!cutoutCtx) throw new Error('No se pudo preparar el recorte de la imagen');
  cutoutCtx.putImageData(imageData, 0, 0);

  ctx.clearRect(0, 0, width, height);
  dibujarColorFondo(ctx, color, width, height);
  ctx.drawImage(cutoutCanvas, 0, 0);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen con fondo uniforme'))),
      'image/jpeg',
      0.9
    );
  });
}
