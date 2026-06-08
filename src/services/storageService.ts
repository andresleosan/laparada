// src/services/storageService.ts
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para subir y administrar imágenes en Firebase Storage
 * Con compresión automática para optimizar tamaño y rendimiento
 */

const STORAGE_BUCKET = 'productos';
const MAX_WIDTH = 1200; // Ancho máximo en píxeles
const JPEG_QUALITY = 0.8; // Calidad JPEG (0-1, donde 1 es máxima calidad)

/**
 * Comprime una imagen usando Canvas
 * @param file - Archivo de imagen
 * @returns Blob comprimido en JPEG
 */
async function comprimirImagen(file: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Crear canvas para redimensionar y comprimir
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Si la imagen es muy ancha, redimensionar manteniendo aspecto
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada en canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto de canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a JPEG comprimido
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const originalSize = (file.size / 1024).toFixed(2);
              const compressedSize = (blob.size / 1024).toFixed(2);
              console.log(
                `📸 Imagen comprimida: ${originalSize}KB → ${compressedSize}KB (${(
                  ((1 - blob.size / file.size) * 100).toFixed(1)
                )}% reducción)`
              );
              resolve(blob);
            } else {
              reject(new Error('No se pudo comprimir la imagen'));
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
 * Sube una imagen a Firebase Storage con compresión automática
 * @param file - Archivo de imagen (blob o File)
 * @param nombreProducto - Nombre del producto (para organizar en carpetas)
 * @returns URL de descarga de la imagen
 */
export async function subirImagenProducto(
  file: Blob | File,
  nombreProducto: string
): Promise<string> {
  try {
    const storage = getStorage();
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen válida');
    }

    // Validar tamaño inicial (máximo 10MB sin comprimir)
    const maxSizeUncompressed = 10 * 1024 * 1024;
    if (file.size > maxSizeUncompressed) {
      throw new Error('La imagen no debe superar 10MB');
    }

    console.log(`📦 Comprimiendo imagen (tamaño original: ${(file.size / 1024).toFixed(2)}KB)...`);
    
    // Comprimir imagen
    const compressedBlob = await comprimirImagen(file);
    
    // Validar tamaño después de comprimir (máximo 2MB)
    const maxSizeCompressed = 2 * 1024 * 1024;
    if (compressedBlob.size > maxSizeCompressed) {
      throw new Error('La imagen comprimida aún es muy grande, intenta con una imagen más pequeña');
    }

    // Crear ruta: productos/{nombreProducto}/{uuid}.jpg
    const fileName = `${uuidv4()}.jpg`;
    const storagePath = `${STORAGE_BUCKET}/${nombreProducto.replace(/\s+/g, '-').toLowerCase()}/${fileName}`;
    
    console.log(`📤 Subiendo imagen comprimida a: ${storagePath}`);
    
    // Subir archivo comprimido
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000', // Cache por 1 año (immutable)
    });

    // Obtener URL de descarga
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log(`✅ Imagen subida exitosamente (tamaño final: ${(compressedBlob.size / 1024).toFixed(2)}KB)`);
    
    return downloadUrl;
  } catch (error) {
    console.error('❌ Error al subir imagen:', error);
    throw new Error(error instanceof Error ? error.message : 'Error desconocido al subir imagen');
  }
}

/**
 * Elimina una imagen de Firebase Storage basada en su URL
 * @param imageUrl - URL de descarga de la imagen
 */
export async function eliminarImagenProducto(imageUrl: string): Promise<void> {
  try {
    const storage = getStorage();
    
    // Extraer la ruta del archivo de la URL
    // Las URLs de Firebase Storage tienen formato: 
    // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
    const urlParams = new URL(imageUrl);
    const pathMatch = urlParams.pathname.match(/o\/(.+)$/);
    
    if (!pathMatch) {
      console.warn('⚠️ No se pudo extraer la ruta del archivo');
      return;
    }

    const filePath = decodeURIComponent(pathMatch[1]);
    console.log(`🗑️ Eliminando imagen: ${filePath}`);
    
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
    console.log(`✅ Imagen eliminada exitosamente`);
  } catch (error) {
    console.error('❌ Error al eliminar imagen:', error);
    // No lanzar error, solo registrar el problema
  }
}

/**
 * Convierte un blob de canvas en File
 * Útil para captura de webcam
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}
