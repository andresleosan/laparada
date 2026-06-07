// src/services/productosService.ts
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  Timestamp,
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

/**
 * ===================== CRUD FUNCIONES (Fase 4) =====================
 */

/**
 * Crear nuevo producto
 */
export async function crearProducto(
  data: Omit<Producto, 'id'>
): Promise<string> {
  try {
    const productosRef = collection(db, 'productos');
    const docRef = await addDoc(productosRef, {
      ...data,
      creadoEn: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating producto:', error);
    throw error;
  }
}

/**
 * Actualizar producto
 */
export async function actualizarProducto(
  id: string,
  updates: Partial<Producto>
): Promise<void> {
  try {
    const docRef = doc(db, 'productos', id);
    await updateDoc(docRef, {
      ...updates,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating producto:', error);
    throw error;
  }
}

/**
 * Eliminar producto
 */
export async function eliminarProducto(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'productos', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting producto:', error);
    throw error;
  }
}

/**
 * Toggle disponibilidad de producto
 */
export async function toggleProductoDisponibilidad(
  id: string,
  disponible: boolean
): Promise<void> {
  try {
    const docRef = doc(db, 'productos', id);
    await updateDoc(docRef, { disponible });
  } catch (error) {
    console.error('Error toggling producto disponibilidad:', error);
    throw error;
  }
}

/**
 * Obtener todos los productos (sin filtro jornada)
 */
export async function getTodosProductos(): Promise<Producto[]> {
  try {
    const productosRef = collection(db, 'productos');
    const q = query(productosRef, orderBy('nombre', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Producto));
  } catch (error) {
    console.error('Error fetching todos productos:', error);
    return [];
  }
}

/**
 * Listener en tiempo real para TODOS los productos (sin filtro)
 */
export function onTodosProductosChange(
  callback: (productos: Producto[]) => void
): () => void {
  const productosRef = collection(db, 'productos');
  const q = query(productosRef, orderBy('nombre', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const productos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Producto));
    callback(productos);
  });
}

/**
 * Crear nuevo combo
 */
export async function crearCombo(
  data: Omit<Combo, 'id'>
): Promise<string> {
  try {
    const combosRef = collection(db, 'combos');
    const docRef = await addDoc(combosRef, {
      ...data,
      creadoEn: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating combo:', error);
    throw error;
  }
}

/**
 * Actualizar combo
 */
export async function actualizarCombo(
  id: string,
  updates: Partial<Combo>
): Promise<void> {
  try {
    const docRef = doc(db, 'combos', id);
    await updateDoc(docRef, {
      ...updates,
      actualizadoEn: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating combo:', error);
    throw error;
  }
}

/**
 * Eliminar combo
 */
export async function eliminarCombo(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'combos', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting combo:', error);
    throw error;
  }
}

/**
 * Toggle disponibilidad de combo
 */
export async function toggleComboDisponibilidad(
  id: string,
  disponible: boolean
): Promise<void> {
  try {
    const docRef = doc(db, 'combos', id);
    await updateDoc(docRef, { disponible });
  } catch (error) {
    console.error('Error toggling combo disponibilidad:', error);
    throw error;
  }
}

/**
 * Obtener todos los combos (sin filtro jornada)
 */
export async function getTodosCombos(): Promise<Combo[]> {
  try {
    const combosRef = collection(db, 'combos');
    const q = query(combosRef, orderBy('nombre', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Combo));
  } catch (error) {
    console.error('Error fetching todos combos:', error);
    return [];
  }
}

/**
 * Listener en tiempo real para TODOS los combos (sin filtro)
 */
export function onTodosCombosChange(
  callback: (combos: Combo[]) => void
): () => void {
  const combosRef = collection(db, 'combos');
  const q = query(combosRef, orderBy('nombre', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const combos = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Combo));
    callback(combos);
  });
}
