import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { CategoriaProducto } from '@/types';
import {
  deduplicarCategorias,
  getCategoriaPorDefectoId,
} from '@/utils/categoriasUtils';
import { requireTenantId } from '@/security/tenantScope';

export const CATEGORIAS_POR_DEFECTO: Array<Omit<CategoriaProducto, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>> = [
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
 * Obtiene las categorías de un negocio.
 * La lectura nunca escribe: si no hay datos, la UI usa su fallback local y un
 * empleado puede sembrar las sugeridas mediante una acción explícita.
 */
export async function getCategorias(negocioId: string): Promise<CategoriaProducto[]> {
  try {
    const tenantId = requireTenantId(negocioId);
    const q = query(
      collection(db, 'categorias'),
      where('negocioId', '==', tenantId)
    );
    const snapshot = await getDocs(q);

    return deduplicarCategorias(snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as CategoriaProducto))
    );
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return [];
  }
}

/** Escucha cambios en tiempo real de categorías sin producir escrituras. */
export function onCategoriasChange(
  negocioId: string,
  callback: (categorias: CategoriaProducto[]) => void
): () => void {
  const q = query(
    collection(db, 'categorias'),
    where('negocioId', '==', requireTenantId(negocioId))
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const cats = deduplicarCategorias(snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as CategoriaProducto))
      );
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
  data: Omit<CategoriaProducto, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>,
  negocioId: string
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'categorias'), {
    nombre: data.nombre.trim(),
    icono: data.icono?.trim() || '🏷️',
    descripcion: data.descripcion?.trim() || '',
    orden: data.orden ?? 99,
    activo: data.activo !== false,
    negocioId: tenantId,
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
  data: Partial<Omit<CategoriaProducto, 'id' | 'negocioId'>>,
  negocioId: string
): Promise<void> {
  const now = Timestamp.now();
  const docRef = doc(db, 'categorias', id);
  const tenantId = requireTenantId(negocioId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
    throw new Error('La categoría no pertenece al negocio activo');
  }
  await updateDoc(docRef, {
    ...data,
    negocioId: tenantId,
    actualizadoEn: now,
  });
}

/**
 * Elimina una categoría
 */
export async function eliminarCategoria(id: string, negocioId: string): Promise<void> {
  const docRef = doc(db, 'categorias', id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists() || snapshot.data().negocioId !== requireTenantId(negocioId)) {
    throw new Error('La categoría no pertenece al negocio activo');
  }
  await deleteDoc(docRef);
}

/**
 * Inicializa / Siembra categorías por defecto para el negocio
 */
export async function inicializarCategoriasPorDefecto(negocioId: string): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const refs = CATEGORIAS_POR_DEFECTO.map((cat) =>
      doc(db, 'categorias', getCategoriaPorDefectoId(cat.nombre, tenantId))
    );

    await runTransaction(db, async (transaction) => {
      const missing: boolean[] = [];
      for (const ref of refs) {
        const snapshot = await transaction.get(ref);
        missing.push(!snapshot.exists());
      }

      const now = Timestamp.now();
      CATEGORIAS_POR_DEFECTO.forEach((cat, index) => {
        if (missing[index]) {
          transaction.set(refs[index], {
            ...cat,
            activo: true,
            negocioId: tenantId,
            creadoEn: now,
            actualizadoEn: now,
          });
        }
      });
    });
  } catch (error) {
    console.error('Error al inicializar categorías por defecto:', error);
  }
}
