// functions/src/webhook/menuBuilder.ts
/**
 * Generador dinámico del menú a partir de Firestore (MOCK - Fase 3)
 * Lee productos y combos con disponible: true y jornada activa
 *
 * TODO (Fase 4+): Implementar lectura real de Firestore
 * TODO (Fase 4+): Cachear menú cada hora para mejor performance
 * TODO (Fase 4+): Incluir fotos de productos
 */

export interface MenuItem {
  id: string;
  numero: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  disponible: boolean;
}

/**
 * Construir menú dinámico formateado para WhatsApp
 * MOCK: retorna menú hardcoded (reemplazar con Firestore en Fase 4+)
 */
export function buildMenu(jornada: 'mañana' | 'noche' = 'noche'): string {
  const jornadaEmoji = jornada === 'mañana' ? '🌅' : '🌙';
  const jornadaNombre = jornada === 'mañana' ? 'MAÑANA' : 'NOCHE';

  // TODO: Reemplazar con lectura de Firestore:
  // const combosSnap = await db.collection('combos')
  //   .where('disponible', '==', true)
  //   .where('jornada', 'in', [jornada, 'ambas'])
  //   .get();

  const menuItems: MenuItem[] = [
    {
      id: 'combo_1',
      numero: 1,
      nombre: 'Combo Pareja',
      precio: 38000,
      descripcion: '2 Perros + 1 Salchipapa + 2 Bebidas',
      disponible: true,
    },
    {
      id: 'combo_2',
      numero: 2,
      nombre: 'Combo Familiar',
      precio: 65000,
      descripcion: '3 Hamburguesas + 1 Orden Alitas + 2 Bebidas',
      disponible: true,
    },
    {
      id: 'prod_1',
      numero: 3,
      nombre: 'Hamburguesa Clásica',
      precio: 18000,
      descripcion: 'Con queso, lechuga y tomate',
      disponible: true,
    },
    {
      id: 'prod_2',
      numero: 4,
      nombre: 'Perro Corriente',
      precio: 12000,
      disponible: true,
    },
    {
      id: 'prod_3',
      numero: 5,
      nombre: 'Salchipapa',
      precio: 14000,
      disponible: true,
    },
  ];

  const availableItems = menuItems.filter((item) => item.disponible);

  let menu = `${jornadaEmoji} *Menú La Parada — ${jornadaNombre}* ${jornadaEmoji}\n\n`;

  const combos = availableItems.filter((item) => item.id.startsWith('combo'));
  const productos = availableItems.filter((item) => item.id.startsWith('prod'));

  if (combos.length > 0) {
    menu += '🎯 *COMBOS ESPECIALES*\n';
    combos.forEach((item) => {
      menu += `${item.numero}. *${item.nombre}* — $${formatCOP(item.precio)}\n`;
      if (item.descripcion) {
        menu += `   ${item.descripcion}\n`;
      }
    });
    menu += '\n';
  }

  if (productos.length > 0) {
    menu += '📦 *PRODUCTOS*\n';
    productos.forEach((item) => {
      menu += `${item.numero}. *${item.nombre}* — $${formatCOP(item.precio)}\n`;
      if (item.descripcion) {
        menu += `   ${item.descripcion}\n`;
      }
    });
    menu += '\n';
  }

  menu += '_Responde con el número del producto que deseas pedir._\n';
  menu += '_Ejemplo: "1" para el Combo Pareja_';

  return menu;
}

/**
 * Formatear número como COP (e.g., 38000 → 38.000)
 */
function formatCOP(amount: number): string {
  return amount.toLocaleString('es-CO');
}

/**
 * Obtener descripción de producto por número
 * Usado para confirmación de pedido
 */
export function getProductByNumber(numero: number): MenuItem | null {
  const items: MenuItem[] = [
    {
      id: 'combo_1',
      numero: 1,
      nombre: 'Combo Pareja',
      precio: 38000,
      disponible: true,
    },
    {
      id: 'combo_2',
      numero: 2,
      nombre: 'Combo Familiar',
      precio: 65000,
      disponible: true,
    },
    {
      id: 'prod_1',
      numero: 3,
      nombre: 'Hamburguesa Clásica',
      precio: 18000,
      disponible: true,
    },
    {
      id: 'prod_2',
      numero: 4,
      nombre: 'Perro Corriente',
      precio: 12000,
      disponible: true,
    },
    {
      id: 'prod_3',
      numero: 5,
      nombre: 'Salchipapa',
      precio: 14000,
      disponible: true,
    },
  ];

  return items.find((item) => item.numero === numero) || null;
}
