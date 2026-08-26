import { describe, expect, it } from 'vitest';
import type { CategoriaProducto } from '@/types';
import {
  deduplicarCategorias,
  getCategoriaPorDefectoId,
  normalizarNombreCategoria,
} from '../categoriasUtils';

const categoria = (id: string, nombre: string, orden = 1): CategoriaProducto => ({
  id,
  negocioId: 'laparada',
  nombre,
  orden,
  activo: true,
});

describe('categoriasUtils', () => {
  it('normaliza acentos, mayúsculas y espacios', () => {
    expect(normalizarNombreCategoria('  TequeÑos   ')).toBe('tequenos');
  });

  it('genera IDs determinísticos para categorías por defecto', () => {
    expect(getCategoriaPorDefectoId('Pollo & Alitas', 'laparada')).toBe(
      'default-laparada-pollo-alitas'
    );
  });

  it('deduplica por nombre y prioriza el ID estable', () => {
    const categorias = deduplicarCategorias([
      categoria('zzzz', 'Tequeños'),
      categoria('default-laparada-tequenos', 'TEQUEÑOS'),
      categoria('pancerotis', 'Pancerotis', 2),
    ]);

    expect(categorias.map(({ id }) => id)).toEqual(['default-laparada-tequenos', 'pancerotis']);
  });
});
