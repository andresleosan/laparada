// src/hooks/useCategorias.ts
import { useState, useEffect } from 'react';
import type { CategoriaProducto } from '@/types';
import {
  getCategorias,
  onCategoriasChange,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from '@/services/categoriasService';
import { useNegocio } from '@/context/NegocioContext';

export function useCategorias() {
  const { negocioActual } = useNegocio();
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tenantId = negocioActual?.id || 'laparada';

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Carga inicial
    getCategorias(tenantId)
      .then((data) => {
        setCategorias(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });

    // Suscripción en tiempo real
    const unsubscribe = onCategoriasChange(tenantId, (data) => {
      setCategorias(data);
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

  return {
    categorias,
    loading,
    error,
    agregarCategoria,
    editarCategoria,
    borrarCategoria,
  };
}
