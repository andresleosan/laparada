import type { CategoriaProducto } from '@/types';

/**
 * Normaliza un nombre para comparar categorías sin distinguir mayúsculas,
 * acentos ni espacios repetidos.
 */
export function normalizarNombreCategoria(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * ID estable para las categorías sugeridas. Permite que varias inicializaciones
 * concurrentes escriban el mismo documento en lugar de crear duplicados.
 */
export function getCategoriaPorDefectoId(nombre: string, negocioId = 'laparada'): string {
  const tenantSlug = normalizarNombreCategoria(negocioId)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const slug = normalizarNombreCategoria(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return `default-${tenantSlug || 'sin-negocio'}-${slug || 'sin-nombre'}`;
}

/**
 * Elimina duplicados por nombre conservando la primera categoría estable.
 * Las categorías por defecto tienen prioridad para que la UI sea estable
 * durante una eventual limpieza de datos pendiente.
 */
export function deduplicarCategorias(categorias: CategoriaProducto[]): CategoriaProducto[] {
  const vistos = new Set<string>();

  return [...categorias]
    .sort((a, b) => {
      const ordenA = a.orden ?? 99;
      const ordenB = b.orden ?? 99;
      if (ordenA !== ordenB) return ordenA - ordenB;

      const estableA = a.id.startsWith('default-') ? 0 : 1;
      const estableB = b.id.startsWith('default-') ? 0 : 1;
      if (estableA !== estableB) return estableA - estableB;

      return a.id.localeCompare(b.id);
    })
    .filter((categoria) => {
      const nombre = normalizarNombreCategoria(categoria.nombre);
      if (!nombre || vistos.has(nombre)) return false;
      vistos.add(nombre);
      return true;
    });
}
