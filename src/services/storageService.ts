// src/services/storageService.ts
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para subir y administrar imágenes en Firebase Storage
 * Con compresión automática para optimizar tamaño y rendimiento
 */

const STORAGE_BUCKET = 'productos';
const MAX_WIDTH = 800; // Ancho óptimo para cards de producto
const JPEG_QUALITY = 0.75; // Calidad JPEG balanceada y ligera

/**
 * Comprime una imagen usando Canvas y retorna Blob + DataUrl
 */
export async function comprimirImagen(file: Blob | File): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar si supera MAX_WIDTH
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto de canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ blob, dataUrl });
            } else {
              resolve({ blob: file, dataUrl });
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };

      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Sube una imagen a Firebase Storage con compresión y timeout de seguridad.
 * Si Storage no responde o falla, retorna el DataURL comprimido directamente sin bloquear al usuario.
 */
export async function subirImagenProducto(
  file: Blob | File,
  nombreProducto: string
): Promise<string> {
  const { blob: compressedBlob, dataUrl } = await comprimirImagen(file);

  if (!storage) {
    console.warn('⚠️ Firebase Storage no disponible, usando DataUrl');
    return dataUrl;
  }

  try {
    const fileName = `${uuidv4()}.jpg`;
    const cleanName = (nombreProducto || 'item').replace(/\s+/g, '-').toLowerCase();
    const storagePath = `${STORAGE_BUCKET}/${cleanName}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // Timeout de 4 segundos para evitar que la UI quede congelada en "Guardando..."
    const uploadPromise = async () => {
      const snapshot = await uploadBytes(storageRef, compressedBlob, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      });
      return await getDownloadURL(snapshot.ref);
    };

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_STORAGE')), 4000)
    );

    const downloadUrl = await Promise.race([uploadPromise(), timeoutPromise]);
    return downloadUrl;
  } catch (error: any) {
    console.warn('⚠️ No se pudo subir a Storage (o timeout), usando DataUrl optimizado:', error?.message);
    return dataUrl;
  }
}

/**
 * Elimina una imagen de Firebase Storage basada en su URL
 */
export async function eliminarImagenProducto(imageUrl: string): Promise<void> {
  if (!storage || !imageUrl || imageUrl.startsWith('data:')) return;
  try {
    const urlParams = new URL(imageUrl);
    const pathMatch = urlParams.pathname.match(/o\/(.+)$/);
    if (!pathMatch) return;

    const filePath = decodeURIComponent(pathMatch[1]);
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn('Error eliminando imagen:', error);
  }
}
