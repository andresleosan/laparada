// src/hooks/useProductos.ts
import { useState, useEffect, useCallback } from 'react';
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

  const filterByTenant = useCallback(
    <T extends { negocioId?: string }>(items: T[]): T[] => {
      const tenantId = negocioActual?.id || 'laparada';
      if (tenantId === 'laparada') {
        return items.filter((i) => !i.negocioId || i.negocioId === 'laparada');
      }
      return items.filter((i) => i.negocioId === tenantId);
    },
    [negocioActual?.id]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribeProductos: (() => void) | null = null;
    let unsubscribeCombos: (() => void) | null = null;

    Promise.all([getProductos(jornada), getCombos(jornada)])
      .then(([prods, combs]) => {
        setProductos(filterByTenant(prods));
        setCombos(filterByTenant(combs));
        setLoading(false);

        // Configurar listeners en tiempo real
        unsubscribeProductos = onProductosChange(jornada, (rawProds) => {
          setProductos(filterByTenant(rawProds));
        });
        unsubscribeCombos = onCombosChange(jornada, (rawCombs) => {
          setCombos(filterByTenant(rawCombs));
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
  }, [jornada, filterByTenant]);

  const refresh = async () => {
    try {
      setLoading(true);
      const [prods, combs] = await Promise.all([
        getProductos(jornada),
        getCombos(jornada),
      ]);
      setProductos(filterByTenant(prods));
      setCombos(filterByTenant(combs));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return { productos, combos, loading, error, refresh };
}
