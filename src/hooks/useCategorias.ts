// src/hooks/useCategorias.ts
import { useState, useEffect } from 'react';
import type { CategoriaProducto } from '@/types';
import {
  getCategorias,
  onCategoriasChange,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  inicializarCategoriasPorDefecto,
  CATEGORIAS_POR_DEFECTO,
} from '@/services/categoriasService';
import { useNegocio } from '@/context/NegocioContext';

const DEFAULT_CATEGORIAS_STATE: CategoriaProducto[] = CATEGORIAS_POR_DEFECTO.map(
  (c, index) => ({
    id: `default-${index}`,
    nombre: c.nombre,
    icono: c.icono,
    descripcion: c.descripcion,
    orden: c.orden,
    activo: true,
  })
);

export function useCategorias() {
  const { negocioActual } = useNegocio();
  const [categorias, setCategorias] = useState<CategoriaProducto[]>(DEFAULT_CATEGORIAS_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tenantId = negocioActual?.id || 'laparada';

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Carga inicial
    getCategorias(tenantId)
      .then((data) => {
        if (data.length > 0) {
          setCategorias(data);
        } else {
          setCategorias(DEFAULT_CATEGORIAS_STATE);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });

    // Suscripción en tiempo real
    const unsubscribe = onCategoriasChange(tenantId, (data) => {
      if (data.length > 0) {
        setCategorias(data);
      } else {
        setCategorias(DEFAULT_CATEGORIAS_STATE);
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [tenantId]);

  const agregarCategoria = async (
    data: Omit<CategoriaProducto, 'id' | 'creadoEn' | 'actualizadoEn'>
  ) => {
    return await crearCategoria(data, tenantId);
  };

  const editarCategoria = async (
    id: string,
    data: Partial<Omit<CategoriaProducto, 'id'>>
  ) => {
    return await actualizarCategoria(id, data);
  };

  const borrarCategoria = async (id: string) => {
    return await eliminarCategoria(id);
  };

  const restaurarSugeridas = async () => {
    await inicializarCategoriasPorDefecto(tenantId);
  };

  return {
    categorias,
    loading,
    error,
    agregarCategoria,
    editarCategoria,
    borrarCategoria,
    restaurarSugeridas,
  };
}
