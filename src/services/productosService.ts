// src/services/productosService.ts
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Query,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { Producto, Combo, Jornada } from '@/types';

/**
 * Obtiene productos disponibles para una jornada específica
 */
export async function getProductos(jornada: Jornada): Promise<Producto[]> {
  const constraints: QueryConstraint[] = [];

  if (jornada !== 'ambas') {
    constraints.push(
      where('jornada', 'in', [jornada, 'ambas'])
    );
  }

  const q = query(collection(db, 'productos'), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Producto));
}

/**
 * Obtiene un producto por ID
 */
export async function getProductoById(id: string): Promise<Producto | null> {
  const q = query(collection(db, 'productos'), where('id', '==', id));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Producto;
}

/**
 * Obtiene combos disponibles para una jornada específica
 */
export async function getCombos(jornada: Jornada): Promise<Combo[]> {
  const constraints: QueryConstraint[] = [];

  if (jornada !== 'ambas') {
    constraints.push(
      where('jornada', 'in', [jornada, 'ambas'])
    );
  }

  const q = query(collection(db, 'combos'), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Combo));
}

/**
 * Obtiene un combo por ID
 */
export async function getComboById(id: string): Promise<Combo | null> {
  const q = query(collection(db, 'combos'), where('id', '==', id));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;
  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as Combo;
}

/**
 * Listener en tiempo real para cambios de disponibilidad en productos
 */
export function onProductosChange(
  jornada: Jornada,
  callback: (productos: Producto[]) => void
): () => void {
  const constraints: QueryConstraint[] = [];

  if (jornada !== 'ambas') {
    constraints.push(
      where('jornada', 'in', [jornada, 'ambas'])
    );
  }

  const q = query(collection(db, 'productos'), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const productos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Producto));
    callback(productos);
  });
}

/**
 * Listener en tiempo real para cambios de disponibilidad en combos
 */
export function onCombosChange(
  jornada: Jornada,
  callback: (combos: Combo[]) => void
): () => void {
  const constraints: QueryConstraint[] = [];

  if (jornada !== 'ambas') {
    constraints.push(
      where('jornada', 'in', [jornada, 'ambas'])
    );
  }

  const q = query(collection(db, 'combos'), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const combos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Combo));
    callback(combos);
  });
}
