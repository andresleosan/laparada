// src/services/ventasService.ts
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { Venta, ItemVenta, MetodoPago, Jornada } from '@/types';
import { detectJornadaActual } from '@/utils/jornadaUtils';

/**
 * Registra una nueva venta en Firestore
 */
export async function registrarVenta(
  items: ItemVenta[],
  total: number,
  metodoPago: MetodoPago,
  jornada?: Jornada,
  direccion?: string,
  clienteTelefono?: string
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
  };

  const docRef = await addDoc(collection(db, 'ventas'), venta);
  return docRef.id;
}
