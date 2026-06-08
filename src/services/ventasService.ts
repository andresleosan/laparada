// src/services/ventasService.ts
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/services/firebase';
import type { Venta, MetodoPago, Jornada } from '@/types';
import { detectJornadaActual } from '@/utils/jornadaUtils';

/**
 * Registra una nueva venta en Firestore
 */
export async function uploadFotoTransferencia(file: File): Promise<string> {
  try {
    const storage = getStorage();
    const timestamp = Date.now();
    const filename = `transferencias/${timestamp}_${file.name}`;
    const storageRef = ref(storage, filename);
    
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    return url;
  } catch (error) {
    console.error('Error uploading transfer photo:', error);
    throw error;
  }
}

export async function registrarVenta(
  items: any[],
  total: number,
  metodoPago: MetodoPago,
  jornada?: Jornada,
  direccion?: string,
  clienteTelefono?: string,
  fotoTransferenciaUrl?: string
): Promise<string> {
  const venta: Omit<Venta, 'id'> = {
    items,
    total,
    metodoPago,
    origen: 'pos',
    jornada: jornada || detectJornadaActual(),
    fecha: Timestamp.now(),
    ...(direccion && { direccion }),
    ...(clienteTelefono && { clienteTelefono }),
    ...(fotoTransferenciaUrl && { fotoTransferenciaUrl }),
  };

  const docRef = await addDoc(collection(db, 'ventas'), venta);
  return docRef.id;
}
