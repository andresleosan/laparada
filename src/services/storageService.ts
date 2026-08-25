// src/services/storageService.ts
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTaskSnapshot,
} from 'firebase/storage';
import { storage } from '@/services/firebase';
import {
  normalizarNombreParaStorage,
  validarNegocioIdParaStorage,
} from '@/utils/storagePaths';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para subir y administrar imágenes en Firebase Storage
 * Con compresión automática para optimizar tamaño y rendimiento
 */

const STORAGE_BUCKET = 'productos';
const MAX_WIDTH = 800; // Ancho óptimo para cards de producto
const JPEG_QUALITY = 0.75; // Calidad JPEG balanceada y ligera
const UPLOAD_TIMEOUT_MS = 20_000;

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
 * Sube una imagen comprimida a una ruta aislada por negocio.
 * Un fallo de Storage se informa al usuario: no se persisten DataURL en
 * Firestore porque pueden superar el límite de tamaño de un documento.
 */
export async function subirImagenProducto(
  file: Blob | File,
  nombreProducto: string,
  negocioId: string
): Promise<string> {
  const { blob: compressedBlob } = await comprimirImagen(file);

  if (!storage) {
    throw new Error('Firebase Storage no está disponible');
  }

  try {
    const fileName = `${uuidv4()}.jpg`;
    const tenant = validarNegocioIdParaStorage(negocioId);
    const cleanName = normalizarNombreParaStorage(nombreProducto);
    const storagePath = `${STORAGE_BUCKET}/${tenant}/${cleanName}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    });

    const snapshot = await new Promise<UploadTaskSnapshot>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        uploadTask.cancel();
        reject(new Error('TIMEOUT_STORAGE'));
      }, UPLOAD_TIMEOUT_MS);

      uploadTask.then(
        (result) => {
          window.clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          window.clearTimeout(timeoutId);
          reject(error);
        }
      );
    });

    return await getDownloadURL(snapshot.ref);
  } catch (error: unknown) {
    console.error('No se pudo subir la imagen a Firebase Storage:', error);

    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : '';
    const message = error instanceof Error ? error.message : '';

    if (message === 'TIMEOUT_STORAGE') {
      throw new Error('La subida tardó demasiado. Revisa la conexión e inténtalo de nuevo.');
    }

    if (code === 'storage/unauthorized') {
      throw new Error('Tu usuario no tiene permiso para guardar fotos en este negocio.');
    }

    if (code === 'storage/bucket-not-found') {
      throw new Error('El bucket de Firebase Storage todavía no está creado.');
    }

    throw new Error(
      'No se pudo guardar la foto en Firebase Storage. Verifica que el bucket exista y que las reglas estén publicadas.'
    );
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
