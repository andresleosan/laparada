// src/hooks/useProductos.ts
import { useState, useEffect } from 'react';
import type { Producto, Combo, Jornada } from '@/types';
import {
  getProductos,
  getCombos,
  onProductosChange,
  onCombosChange,
} from '@/services/productosService';

interface UseProductosReturn {
  productos: Producto[];
  combos: Combo[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener productos y combos de una jornada
 * Usa listeners en tiempo real para cambios de disponibilidad
 */
export function useProductos(jornada: Jornada): UseProductosReturn {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Cargar datos iniciales y configurar listeners
  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribeProductos: (() => void) | null = null;
    let unsubscribeCombos: (() => void) | null = null;

    Promise.all([getProductos(jornada), getCombos(jornada)])
      .then(([prods, combs]) => {
        setProductos(prods);
        setCombos(combs);
        setLoading(false);

        // Configurar listeners en tiempo real
        unsubscribeProductos = onProductosChange(jornada, setProductos);
        unsubscribeCombos = onCombosChange(jornada, setCombos);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });

    return () => {
      unsubscribeProductos?.();
      unsubscribeCombos?.();
    };
  }, [jornada]);

  const refresh = async () => {
    try {
      setLoading(true);
      const [prods, combs] = await Promise.all([
        getProductos(jornada),
        getCombos(jornada),
      ]);
      setProductos(prods);
      setCombos(combs);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return { productos, combos, loading, error, refresh };
}
