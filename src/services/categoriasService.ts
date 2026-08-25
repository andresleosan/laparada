import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { CategoriaProducto } from '@/types';

export const CATEGORIAS_POR_DEFECTO: Array<Omit<CategoriaProducto, 'id' | 'creadoEn' | 'actualizadoEn'>> = [
  { nombre: 'Tequeños', icono: '🥟', descripcion: 'Tequeños de queso, bocadillo, jamón...', orden: 1, activo: true },
  { nombre: 'Pancerotis', icono: '🥟', descripcion: 'Ranchero, maíz tocineta, pollo...', orden: 2, activo: true },
  { nombre: 'Hamburguesas', icono: '🍔', descripcion: 'Sencillas, dobles, triples, especiales...', orden: 3, activo: true },
  { nombre: 'Perros Calientes', icono: '🌭', descripcion: 'Tradicionales y especiales...', orden: 4, activo: true },
  { nombre: 'Salchipapas', icono: '🍟', descripcion: 'Papas crunch, salchicha y salsas...', orden: 5, activo: true },
  { nombre: 'Arepas', icono: '🫓', descripcion: 'Rellenas de carne, pollo, queso...', orden: 6, activo: true },
  { nombre: 'Sandwiches', icono: '🥪', descripcion: 'Sandwiches y wraps...', orden: 7, activo: true },
  { nombre: 'Pollo & Alitas', icono: '🍗', descripcion: 'Alitas BBQ, broaster, nuggets...', orden: 8, activo: true },
  { nombre: 'Bebidas', icono: '🥤', descripcion: 'Jugos naturales, gaseosas, aguas...', orden: 9, activo: true },
  { nombre: 'Postres', icono: '🍰', descripcion: 'Dulces, postres y snacks...', orden: 10, activo: true },
];

/**
 * Obtiene las categorías de un negocio ordenadas.
 * Si está vacía la colección, inicializa automáticamente las categorías sugeridas.
 */
export async function getCategorias(negocioId: string = 'laparada'): Promise<CategoriaProducto[]> {
  try {
    const q = query(
      collection(db, 'categorias'),
      where('negocioId', '==', negocioId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Auto-inicializar para que nunca esté vacío
      await inicializarCategoriasPorDefecto(negocioId);
      const snapshotReintentar = await getDocs(q);
      return snapshotReintentar.docs
        .map((d) => ({ id: d.id, ...d.data() } as CategoriaProducto))
        .sort((a, b) => (a.orden || 99) - (b.orden || 99));
    }

    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as CategoriaProducto))
      .sort((a, b) => (a.orden || 99) - (b.orden || 99));
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

/**
 * Escucha cambios en tiempo real de categorías.
 * Si detecta 0 categorías, activa el auto-sembrado inicial.
 */
export function onCategoriasChange(
  negocioId: string = 'laparada',
  callback: (categorias: CategoriaProducto[]) => void
): () => void {
  const q = query(
    collection(db, 'categorias'),
    where('negocioId', '==', negocioId)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      if (snapshot.empty) {
        // Sembrar automáticamente si está vacío
        await inicializarCategoriasPorDefecto(negocioId);
        return;
      }
      const cats = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as CategoriaProducto))
        .sort((a, b) => (a.orden || 99) - (b.orden || 99));
      callback(cats);
    },
    (err) => {
      console.error('Error en listener de categorías:', err);
    }
  );
}

/**
 * Crea una nueva categoría
 */
export async function crearCategoria(
  data: Omit<CategoriaProducto, 'id' | 'creadoEn' | 'actualizadoEn'>,
  negocioId: string = 'laparada'
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'categorias'), {
    nombre: data.nombre.trim(),
    icono: data.icono?.trim() || '🏷️',
    descripcion: data.descripcion?.trim() || '',
    orden: data.orden ?? 99,
    activo: data.activo !== false,
    negocioId: negocioId || 'laparada',
    creadoEn: now,
    actualizadoEn: now,
  });

  return docRef.id;
}

/**
 * Actualiza una categoría existente
 */
export async function actualizarCategoria(
  id: string,
  data: Partial<Omit<CategoriaProducto, 'id'>>
): Promise<void> {
  const now = Timestamp.now();
  const docRef = doc(db, 'categorias', id);
  await updateDoc(docRef, {
    ...data,
    actualizadoEn: now,
  });
}

/**
 * Elimina una categoría
 */
export async function eliminarCategoria(id: string): Promise<void> {
  const docRef = doc(db, 'categorias', id);
  await deleteDoc(docRef);
}

/**
 * Inicializa / Siembra categorías por defecto para el negocio
 */
export async function inicializarCategoriasPorDefecto(negocioId: string = 'laparada'): Promise<void> {
  try {
    const q = query(
      collection(db, 'categorias'),
      where('negocioId', '==', negocioId)
    );
    const existing = await getDocs(q);
    const existingNames = new Set(existing.docs.map((d) => (d.data().nombre || '').toLowerCase().trim()));

    const now = Timestamp.now();
    const batchPromises = CATEGORIAS_POR_DEFECTO
      .filter((cat) => !existingNames.has(cat.nombre.toLowerCase().trim()))
      .map((cat) =>
        addDoc(collection(db, 'categorias'), {
          ...cat,
          activo: true,
          negocioId: negocioId || 'laparada',
          creadoEn: now,
          actualizadoEn: now,
        })
      );

    await Promise.all(batchPromises);
  } catch (error) {
    console.error('Error al inicializar categorías por defecto:', error);
  }
}
