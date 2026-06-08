import * as admin from 'firebase-admin';
import { Producto, Combo } from '../types';

const db = admin.firestore();

/**
 * Genera menú con formato WhatsApp desde productos en BD
 */
export async function generarMenuDeProductos(limite: number = 10): Promise<string> {
  try {
    const productosSnapshot = await db
      .collection('productos')
      .orderBy('nombre')
      .limit(limite)
      .get();

    if (productosSnapshot.empty) {
      return '📋 No hay productos disponibles en este momento.';
    }

    let menu = '📋 MENÚ DE PRODUCTOS:\n\n';

    productosSnapshot.docs.forEach((doc, index) => {
      const producto = doc.data() as Producto;
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
    const combosSnapshot = await db.collection('combos').orderBy('nombre').limit(5).get();

    if (combosSnapshot.empty) {
      return '🎁 No hay combos disponibles.';
    }

    let menu = '🎁 COMBOS ESPECIALES:\n\n';

    combosSnapshot.docs.forEach((doc, index) => {
      const combo = doc.data() as Combo;
      const numero = 100 + index + 1; // Comenzar desde 101 para diferenciar
      const precio = (combo.precioCombo || 0).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      });

      menu += `${numero}️⃣ *${combo.nombre}*\n`;
      menu += `   ${precio}\n`;
      menu += `   Incluye: ${combo.items?.length || 0} productos\n`;
    });

    menu += '\n💬 Responde el número para agregar el combo';

    return menu;
  } catch (error) {
    console.error('Error generating combo menu:', error);
    throw error;
  }
}

/**
 * Obtiene producto por número de menú
 */
export async function obtenerProductoPorNumero(numero: number): Promise<Producto | null> {
  try {
    // Si es combo (100+), obtener de combos
    if (numero >= 100) {
      const comboIndex = numero - 101;
      const combosSnapshot = await db.collection('combos').orderBy('nombre').limit(100).get();

      if (comboIndex >= combosSnapshot.docs.length) {
        return null;
      }

      const combo = combosSnapshot.docs[comboIndex].data() as Combo;
      // Convertir combo a producto para compatibilidad
      return {
        id: comboIndex.toString(),
        nombre: combo.nombre,
        precio: combo.precioCombo,
        descripcion: `Combo: ${combo.items?.length} productos`,
        categoria: 'combo',
      } as any;
    }

    // Si es producto regular
    const productosSnapshot = await db
      .collection('productos')
      .orderBy('nombre')
      .limit(100)
      .get();

    const index = numero - 1;
    if (index >= productosSnapshot.docs.length) {
      return null;
    }

    const producto = productosSnapshot.docs[index].data() as Producto;
    return producto;
  } catch (error) {
    console.error('Error getting product by number:', error);
    return null;
  }
}

/**
 * Genera resumen del menú para búsqueda rápida
 */
export async function generarIndiceMenu(): Promise<Map<number, string>> {
  try {
    const indice = new Map<number, string>();

    // Productos
    const productosSnapshot = await db.collection('productos').orderBy('nombre').limit(50).get();

    productosSnapshot.docs.forEach((doc, index) => {
      const producto = doc.data() as Producto;
      indice.set(index + 1, producto.nombre);
    });

    // Combos
    const combosSnapshot = await db.collection('combos').orderBy('nombre').limit(20).get();

    combosSnapshot.docs.forEach((doc, index) => {
      const combo = doc.data() as Combo;
      indice.set(100 + index + 1, combo.nombre);
    });

    return indice;
  } catch (error) {
    console.error('Error generating menu index:', error);
    return new Map();
  }
}

/**
 * Busca productos por nombre
 */
export async function buscarProductoPorNombre(busqueda: string): Promise<Producto[]> {
  try {
    const termino = busqueda.toLowerCase();

    // Firestore no tiene búsqueda full-text nativa, así que:
    // 1. Obtener todos los productos
    // 2. Filtrar en memoria

    const productosSnapshot = await db.collection('productos').get();

    const resultados = productosSnapshot.docs
      .map((doc) => doc.data() as Producto)
      .filter(
        (p) =>
          p.nombre.toLowerCase().includes(termino) ||
          p.descripcion?.toLowerCase().includes(termino)
      )
      .slice(0, 5); // Limitar a 5 resultados

    return resultados;
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}

/**
 * Genera mensaje con disponibilidad del producto
 */
export async function verificarDisponibilidad(productoId: string): Promise<string> {
  try {
    const productoDoc = await db.collection('productos').doc(productoId).get();

    if (!productoDoc.exists) {
      return '❌ Producto no encontrado.';
    }

    const producto = productoDoc.data() as Producto;
    const disponible = producto.disponible !== false;

    if (!disponible) {
      return `❌ Lo sentimos, *${producto.nombre}* no está disponible en este momento.`;
    }

    const precio = (producto.precio || 0).toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    });

    return `✅ *${producto.nombre}* está disponible\n💰 Precio: ${precio}`;
  } catch (error) {
    console.error('Error checking availability:', error);
    return '⚠️ Error al verificar disponibilidad.';
  }
}

/**
 * Cache de menú en Firestore para acceso rápido
 */
export async function actualizarCacheMenu(): Promise<void> {
  try {
    const menu = await generarMenuDeProductos(20);
    const combos = await generarMenuCombo();

    const cacheRef = db.collection('cache').doc('menu_actual');
    await cacheRef.set({
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
    const cacheRef = await db.collection('cache').doc('menu_actual').get();

    if (!cacheRef.exists) {
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
