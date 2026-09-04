import { describe, expect, it } from 'vitest';
import { filtrarCombosMenu, filtrarProductosMenu } from '../storefrontFilters';

const productos = [
  {
    id: 'p-1',
    nombre: 'Tequeños tradicionales',
    descripcion: 'Queso y salsa de la casa',
    categoria: 'Tequeños',
  },
  {
    id: 'p-2',
    nombre: 'Panceroti ranchero',
    descripcion: 'Carne, queso y maíz',
    categoria: 'Pancerotis',
  },
];

const combos = [
  {
    id: 'c-1',
    nombre: 'Combo ranchero',
    descripcion: 'Panceroti y bebida',
  },
  {
    id: 'c-2',
    nombre: 'Combo para dos',
    descripcion: 'Tequeños y bebidas',
  },
];

describe('filtros de la tienda pública', () => {
  it('no mezcla productos individuales dentro de la categoría de combos', () => {
    expect(filtrarProductosMenu(productos, 'combos', '')).toEqual([]);
  });

  it('incluye combos que coinciden con la búsqueda por nombre o descripción', () => {
    expect(filtrarCombosMenu(combos, 'todos', 'ranchero').map(({ id }) => id)).toEqual([
      'c-1',
    ]);
    expect(filtrarCombosMenu(combos, 'todos', 'bebidas').map(({ id }) => id)).toEqual([
      'c-2',
    ]);
  });

  it('filtra productos por categoría sin depender de mayúsculas o tildes', () => {
    expect(filtrarProductosMenu(productos, 'tequenos', '').map(({ id }) => id)).toEqual([
      'p-1',
    ]);
  });
});
