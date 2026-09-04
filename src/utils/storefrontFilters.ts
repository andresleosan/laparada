interface MenuSearchableItem {
  nombre: string;
  descripcion?: string;
  categoria?: string;
}

export function normalizarTextoMenu(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function coincideConBusqueda(item: MenuSearchableItem, busqueda: string): boolean {
  const termino = normalizarTextoMenu(busqueda);
  if (!termino) return true;

  return normalizarTextoMenu(`${item.nombre} ${item.descripcion || ''}`).includes(termino);
}

export function filtrarProductosMenu<T extends MenuSearchableItem>(
  productos: T[],
  categoriaActiva: string,
  busqueda: string
): T[] {
  const categoria = normalizarTextoMenu(categoriaActiva);
  if (categoria === 'combos') return [];

  return productos.filter((producto) => {
    if (!coincideConBusqueda(producto, busqueda)) return false;
    if (categoria === 'todos') return true;

    const categoriaProducto = normalizarTextoMenu(producto.categoria || '');
    if (categoriaProducto) return categoriaProducto === categoria;

    const nombre = normalizarTextoMenu(producto.nombre);
    if (categoria === 'tequenos') return nombre.includes('tequeno');
    if (categoria === 'pancerotis') {
      return nombre.includes('panceroti') || nombre.includes('panzerotti');
    }
    if (categoria === 'hamburguesas') {
      return nombre.includes('hamburguesa') || nombre.includes('burger');
    }
    if (categoria === 'perros') return nombre.includes('perro') || nombre.includes('hot dog');
    if (categoria === 'salchipapas') {
      return nombre.includes('salchipapa') || nombre.includes('papa');
    }
    if (categoria === 'bebidas') {
      return ['jugo', 'gaseosa', 'bebida', 'coca'].some((token) => nombre.includes(token));
    }
    return categoria === 'otros';
  });
}

export function filtrarCombosMenu<T extends MenuSearchableItem>(
  combos: T[],
  categoriaActiva: string,
  busqueda: string
): T[] {
  const categoria = normalizarTextoMenu(categoriaActiva);
  if (categoria !== 'todos' && categoria !== 'combos') return [];

  return combos.filter((combo) => coincideConBusqueda(combo, busqueda));
}
