import * as admin from 'firebase-admin';
import { Producto, Combo } from '../types';
import {
  requireConfiguredValue,
  whatsappNegocioId,
} from '../config/integrationParams';

const getDb = () => admin.firestore();
const MAX_MENU_PRODUCTS = 20;
const MAX_MENU_COMBOS = 5;

export interface MenuCatalogItem {
  productoId: string;
  catalogoTipo: 'producto' | 'combo';
  nombre: string;
  precio: number;
  categoria?: string;
  descripcion?: string;
}

function getConfiguredTenantId(): string {
  return requireConfiguredValue(whatsappNegocioId.value(), 'WHATSAPP_NEGOCIO_ID');
}

/**
 * Genera menú con formato WhatsApp desde productos en BD
 */
export async function generarMenuDeProductos(limite: number = 10): Promise<string> {
  try {
    const negocioId = getConfiguredTenantId();
    const productosSnapshot = await getDb()
      .collection('productos')
      .where('negocioId', '==', negocioId)
      .orderBy('nombre')
      .limit(100)
      .get();

    const productosDisponibles = productosSnapshot.docs
      .map((document) => mapProductoMenu(document, negocioId))
      .filter((item): item is MenuCatalogItem => item !== null)
      .slice(0, Math.min(Math.max(limite, 1), MAX_MENU_PRODUCTS));
    if (productosDisponibles.length === 0) {
      return '📋 No hay productos disponibles en este momento.';
    }

    let menu = '📋 MENÚ DE PRODUCTOS:\n\n';

    productosDisponibles.forEach((producto, index) => {
      const numero = index + 1;
      const precio = (producto.precio || 0).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      });

      menu += `${numero}️⃣ *${producto.nombre}*\n`;
      menu += `   ${precio}`;

      if (producto.descripcion) {
        menu += ` - ${producto.descripcion.substring(0, 50)}`;
      }
      menu += '\n';
    });

    menu += '\n💬 Responde el número del producto para agregarlo a tu orden';

    return menu;
  } catch (error) {
    console.error('Error generating product menu:', error);
    throw error;
  }
}

/**
 * Genera menú con combos disponibles
 */
export async function generarMenuCombo(): Promise<string> {
  try {
    const negocioId = getConfiguredTenantId();
    const combosSnapshot = await getDb()
      .collection('combos')
      .where('negocioId', '==', negocioId)
      .orderBy('nombre')
      .limit(100)
      .get();

    const combosDisponibles = combosSnapshot.docs
      .map((document) => mapComboMenu(document, negocioId))
      .filter((item): item is MenuCatalogItem => item !== null)
      .slice(0, MAX_MENU_COMBOS);
    if (combosDisponibles.length === 0) {
      return '🎁 No hay combos disponibles.';
    }

    let menu = '🎁 COMBOS ESPECIALES:\n\n';

    combosDisponibles.forEach((combo, index) => {
      const numero = 100 + index + 1; // Comenzar desde 101 para diferenciar
      const precio = combo.precio.toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      });

      menu += `${numero}️⃣ *${combo.nombre}*\n`;
      menu += `   ${precio}\n`;
      menu += `   ${combo.descripcion || 'Combo disponible'}\n`;
    });

    menu += '\n💬 Responde el número para agregar el combo';

    return menu;
  } catch (error) {
    console.error('Error generating combo menu:', error);
    throw error;
  }
}

function mapProductoMenu(
  doc: admin.firestore.QueryDocumentSnapshot,
  negocioId: string
): MenuCatalogItem | null {
  const producto = doc.data() as Producto;
  if (
    producto.disponible === false
    || producto.negocioId !== negocioId
    || typeof producto.nombre !== 'string'
    || !producto.nombre.trim()
    || !Number.isFinite(producto.precio)
    || producto.precio <= 0
  ) {
    return null;
  }
  return {
    productoId: doc.id,
    catalogoTipo: 'producto',
    nombre: producto.nombre.trim().slice(0, 120),
    precio: producto.precio,
    ...(producto.categoria && { categoria: producto.categoria }),
    ...(producto.descripcion && { descripcion: producto.descripcion.slice(0, 100) }),
  };
}

function mapComboMenu(
  doc: admin.firestore.QueryDocumentSnapshot,
  negocioId: string
): MenuCatalogItem | null {
  const combo = doc.data() as Combo;
  if (
    combo.disponible === false
    || combo.negocioId !== negocioId
    || typeof combo.nombre !== 'string'
    || !combo.nombre.trim()
    || !Number.isFinite(combo.precioCombo)
    || combo.precioCombo <= 0
  ) {
    return null;
  }
  return {
    productoId: doc.id,
    catalogoTipo: 'combo',
    nombre: combo.nombre.trim().slice(0, 120),
    precio: combo.precioCombo,
    categoria: 'combo',
    descripcion: `Incluye: ${combo.items?.length || 0} productos`,
  };
}

/**
 * Resuelve números visibles del menú a IDs estables del catálogo.
 * Carga cada colección una sola vez para mantener acotado el costo por mensaje.
 */
export async function obtenerItemsMenuPorNumeros(
  numeros: number[]
): Promise<Array<MenuCatalogItem | null>> {
  try {
    if (
      numeros.length < 1
      || numeros.length > 10
      || numeros.some((numero) => !Number.isInteger(numero) || numero < 1 || numero > 120)
    ) {
      return numeros.map(() => null);
    }
    const negocioId = getConfiguredTenantId();
    const necesitaProductos = numeros.some((numero) => numero < 100);
    const necesitaCombos = numeros.some((numero) => numero >= 100);
    const [productosSnapshot, combosSnapshot] = await Promise.all([
      necesitaProductos
        ? getDb()
          .collection('productos')
          .where('negocioId', '==', negocioId)
          .orderBy('nombre')
          .limit(100)
          .get()
        : null,
      necesitaCombos
        ? getDb()
        .collection('combos')
        .where('negocioId', '==', negocioId)
        .orderBy('nombre')
        .limit(100)
          .get()
        : null,
    ]);

    const productosDisponibles = (productosSnapshot?.docs || [])
      .map((document) => mapProductoMenu(document, negocioId))
      .filter((item): item is MenuCatalogItem => item !== null)
      .slice(0, MAX_MENU_PRODUCTS);
    const combosDisponibles = (combosSnapshot?.docs || [])
      .map((document) => mapComboMenu(document, negocioId))
      .filter((item): item is MenuCatalogItem => item !== null)
      .slice(0, MAX_MENU_COMBOS);

    return numeros.map((numero) => {
      if (numero >= 100) return combosDisponibles[numero - 101] || null;
      return productosDisponibles[numero - 1] || null;
    });
  } catch (error) {
    console.error('Error resolving menu items:', error);
    throw error;
  }
}

/**
 * Compatibilidad para resúmenes heredados que aún guardan un número de menú.
 */
export async function obtenerProductoPorNumero(numero: number): Promise<Producto | null> {
  const item = (await obtenerItemsMenuPorNumeros([numero]))[0];
  if (!item) return null;
  return {
    id: item.productoId,
    negocioId: getConfiguredTenantId(),
    nombre: item.nombre,
    precio: item.precio,
    ...(item.categoria && { categoria: item.categoria }),
  } as Producto;
}

/**
 * Busca productos por nombre
 */
export async function buscarProductoPorNombre(busqueda: string): Promise<Producto[]> {
  try {
    const negocioId = getConfiguredTenantId();
    const termino = busqueda.toLowerCase();

    // Firestore no tiene búsqueda full-text nativa, así que:
    // 1. Obtener todos los productos
    // 2. Filtrar en memoria

    const productosSnapshot = await getDb()
      .collection('productos')
      .where('negocioId', '==', negocioId)
      .get();

    const resultados = productosSnapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id } as Producto))
      .filter(
        (p) =>
          p.disponible !== false
          && typeof p.nombre === 'string'
          && (
            p.nombre.toLowerCase().includes(termino)
            || p.descripcion?.toLowerCase().includes(termino)
          )
      )
      .slice(0, 5); // Limitar a 5 resultados

    return resultados;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
}

/**
 * Cache de menú en Firestore para acceso rápido
 */
export async function actualizarCacheMenu(): Promise<void> {
  try {
    const negocioId = getConfiguredTenantId();
    const menu = await generarMenuDeProductos(20);
    const combos = await generarMenuCombo();

    const cacheRef = getDb().collection('cache').doc(`menu_actual_${negocioId}`);
    await cacheRef.set({
      negocioId,
      menuProductos: menu,
      menuCombos: combos,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      validoHasta: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 24 * 60 * 60 * 1000) // Válido 24 horas
      ),
    });

    console.log('Menu cache updated');
  } catch (error) {
    console.error('Error updating menu cache:', error);
  }
}

/**
 * Obtiene menú del cache si está vigente
 */
export async function obtenerMenuDelCache(): Promise<{ menuProductos: string; menuCombos: string } | null> {
  try {
    const negocioId = getConfiguredTenantId();
    const cacheRef = await getDb().collection('cache').doc(`menu_actual_${negocioId}`).get();

    if (!cacheRef.exists || cacheRef.data()?.negocioId !== negocioId) {
      return null;
    }

    const data = cacheRef.data();

    // Verificar si el cache sigue vigente
    if (data?.validoHasta) {
      const validoHasta =
        data.validoHasta instanceof admin.firestore.Timestamp
          ? data.validoHasta.toDate()
          : new Date(data.validoHasta);

      if (new Date() > validoHasta) {
        return null; // Cache expirado
      }
    }

    return {
      menuProductos: data?.menuProductos || '',
      menuCombos: data?.menuCombos || '',
    };
  } catch (error) {
    console.error('Error getting menu from cache:', error);
    return null;
  }
}
