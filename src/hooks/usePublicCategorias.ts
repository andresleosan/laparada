import { useEffect, useState } from 'react';
import type { CategoriaProducto } from '@/types';
import {
  CATEGORIAS_POR_DEFECTO,
  getCategorias,
  onCategoriasChange,
} from '@/services/categoriasService';
import { DEFAULT_NEGOCIO_ID } from '@/types/negocio';

const buildDefaultCategorias = (negocioId: string): CategoriaProducto[] =>
  CATEGORIAS_POR_DEFECTO.map((categoria, index) => ({
    id: `default-${index}`,
    negocioId,
    nombre: categoria.nombre,
    icono: categoria.icono,
    descripcion: categoria.descripcion,
    orden: categoria.orden,
    activo: true,
  }));

export function usePublicCategorias(negocioId = DEFAULT_NEGOCIO_ID) {
  const [categorias, setCategorias] = useState<CategoriaProducto[]>(() =>
    buildDefaultCategorias(negocioId)
  );

  useEffect(() => {
    let active = true;

    getCategorias(negocioId)
      .then((data) => {
        if (active && data.length > 0) setCategorias(data);
      })
      .catch((error) => {
        console.error('Error cargando categorías públicas:', error);
      });

    const unsubscribe = onCategoriasChange(negocioId, (data) => {
      if (active && data.length > 0) setCategorias(data);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [negocioId]);

  return categorias;
}
