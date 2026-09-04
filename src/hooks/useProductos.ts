// src/hooks/useProductos.ts
import { useState, useEffect, useRef } from 'react';
import type { Producto, Combo, Jornada } from '@/types';
import {
  getProductos,
  getCombos,
  onProductosChange,
  onCombosChange,
} from '@/services/productosService';
import { useNegocio } from '@/context/NegocioContext';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

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
  const scopeKey = `${tenantId}:${jornada}`;
  const activeScopeRef = useRef(scopeKey);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = scopeKey;

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribeProductos: (() => void) | null = null;
    let unsubscribeCombos: (() => void) | null = null;
    let cancelled = false;

    Promise.all([getProductos(jornada, tenantId), getCombos(jornada, tenantId)])
      .then(([prods, combs]) => {
        if (cancelled) return;
        setProductos(prods);
        setCombos(combs);
        setLoading(false);

        // Configurar listeners en tiempo real
        unsubscribeProductos = onProductosChange(jornada, tenantId, (rawProds) => {
          if (!cancelled) setProductos(rawProds);
        });
        unsubscribeCombos = onCombosChange(jornada, tenantId, (rawCombs) => {
          if (!cancelled) setCombos(rawCombs);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      refreshGuardRef.current.invalidate();
      unsubscribeProductos?.();
      unsubscribeCombos?.();
    };
  }, [jornada, tenantId]);

  const refresh = async () => {
    const request = refreshGuardRef.current.begin(scopeKey);
    try {
      setLoading(true);
      const [prods, combs] = await Promise.all([
        getProductos(jornada, tenantId),
        getCombos(jornada, tenantId),
      ]);
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setProductos(prods);
      setCombos(combs);
      setError(null);
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      if (refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) {
        setLoading(false);
      }
    }
  };

  return { productos, combos, loading, error, refresh };
}
