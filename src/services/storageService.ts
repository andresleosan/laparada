// src/services/storageService.ts
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Servicio para subir y administrar imágenes en Firebase Storage
 */

const STORAGE_BUCKET = 'productos';

/**
 * Sube una imagen a Firebase Storage
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

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('La imagen no debe superar 5MB');
    }

    // Crear ruta: productos/{nombreProducto}/{uuid}.{extension}
    const fileExtension = file.type.split('/')[1] || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;
    const storagePath = `${STORAGE_BUCKET}/${nombreProducto.replace(/\s+/g, '-').toLowerCase()}/${fileName}`;
    
    console.log(`📤 Subiendo imagen a: ${storagePath}`);
    
    // Subir archivo
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
    });

    // Obtener URL de descarga
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log(`✅ Imagen subida exitosamente:`, downloadUrl);
    
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
