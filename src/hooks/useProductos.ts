// src/hooks/useProductos.ts
import { useState, useEffect } from 'react';
import type { Producto, Combo, Jornada } from '@/types';
import {
  getProductos,
  getCombos,
  onProductosChange,
  onCombosChange,
} from '@/services/productosService';
import { useNegocio } from '@/context/NegocioContext';

interface UseProductosReturn {
  productos: Producto[];
  combos: Combo[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener productos y combos de una jornada
 * Aislado automáticamente por el negocioActual (Multi-Tenant)
 */
export function useProductos(jornada: Jornada): UseProductosReturn {
  const { negocioActual } = useNegocio();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tenantId = negocioActual.id;

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribeProductos: (() => void) | null = null;
    let unsubscribeCombos: (() => void) | null = null;

    Promise.all([getProductos(jornada, tenantId), getCombos(jornada, tenantId)])
      .then(([prods, combs]) => {
        setProductos(prods);
        setCombos(combs);
        setLoading(false);

        // Configurar listeners en tiempo real
        unsubscribeProductos = onProductosChange(jornada, tenantId, (rawProds) => {
          setProductos(rawProds);
        });
        unsubscribeCombos = onCombosChange(jornada, tenantId, (rawCombs) => {
          setCombos(rawCombs);
        });
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });

    return () => {
      unsubscribeProductos?.();
      unsubscribeCombos?.();
    };
  }, [jornada, tenantId]);

  const refresh = async () => {
    try {
      setLoading(true);
      const [prods, combs] = await Promise.all([
        getProductos(jornada, tenantId),
        getCombos(jornada, tenantId),
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
