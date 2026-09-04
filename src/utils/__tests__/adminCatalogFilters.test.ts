import { describe, expect, it } from 'vitest';
import { filterAdminCatalog } from '../adminCatalogFilters';

const productos = [
  {
    id: 'p-1',
    nombre: 'Tequeño clásico',
    descripcion: 'Queso blanco',
    categoria: 'Tequeños',
  },
  {
    id: 'p-2',
    nombre: 'Panceroti ranchero',
    descripcion: 'Jamón y queso',
    categoria: 'Pancerotis',
  },
];

const combos = [
  {
    id: 'c-1',
    nombre: 'Combo familiar',
    descripcion: 'Selección para compartir',
  },
];

describe('filterAdminCatalog', () => {
  it('encuentra productos ignorando acentos, mayúsculas y espacios sobrantes', () => {
    const result = filterAdminCatalog({
      productos,
      combos,
      query: '  tequeno CLASICO ',
      category: 'todos',
    });

    expect(result.productos.map((item) => item.id)).toEqual(['p-1']);
    expect(result.combos).toEqual([]);
  });

  it('combina búsqueda y categoría sin devolver productos de otra categoría', () => {
    const result = filterAdminCatalog({
      productos,
      combos,
      query: 'queso',
      category: 'Pancerotis',
    });

    expect(result.productos.map((item) => item.id)).toEqual(['p-2']);
    expect(result.combos).toEqual([]);
  });

  it('limita la vista de combos a combos coincidentes y los incluye en Todos', () => {
    expect(filterAdminCatalog({
      productos,
      combos,
      query: 'familiar',
      category: 'combos',
    })).toEqual({ productos: [], combos });

    expect(filterAdminCatalog({
      productos,
      combos,
      query: 'compartir',
      category: 'todos',
    })).toEqual({ productos: [], combos });
  });
});
