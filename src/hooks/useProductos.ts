// src/hooks/useProductos.ts
import { useState, useEffect, useRef } from 'react';
import type { Producto, Combo } from '@/types';
import {
  getProductos,
  getCombos,
  onProductosChange,
  onCombosChange,
} from '@/services/productosService';
import { useNegocio } from '@/context/NegocioContext';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';
import {
  guardarCatalogoEnCache,
  obtenerCatalogoEnCache,
} from '@/services/offlineSyncService';

interface UseProductosReturn {
  productos: Producto[];
  combos: Combo[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para obtener el catálogo de productos y combos
 * Aislado automáticamente por el negocioActual (Multi-Tenant)
 * con respaldo automático en IndexedDB para modo offline.
 */
export function useProductos(): UseProductosReturn {
  const { negocioActual } = useNegocio();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const tenantId = negocioActual.id;
  const scopeKey = tenantId;
  const activeScopeRef = useRef(scopeKey);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = scopeKey;

  // Refs para guardar en caché combinando productos y combos
  const productosRef = useRef<Producto[]>([]);
  const combosRef = useRef<Combo[]>([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let unsubscribeProductos: (() => void) | null = null;
    let unsubscribeCombos: (() => void) | null = null;
    let cancelled = false;

    Promise.all([getProductos(tenantId), getCombos(tenantId)])
      .then(([prods, combs]) => {
        if (cancelled) return;
        setProductos(prods);
        setCombos(combs);
        productosRef.current = prods;
        combosRef.current = combs;
        setLoading(false);

        // Respaldar en caché local para emergencias offline
        void guardarCatalogoEnCache(tenantId, prods, combs).catch(() => {});

        // Configurar listeners en tiempo real
        unsubscribeProductos = onProductosChange(tenantId, (rawProds) => {
          if (!cancelled) {
            setProductos(rawProds);
            productosRef.current = rawProds;
            void guardarCatalogoEnCache(tenantId, rawProds, combosRef.current).catch(() => {});
          }
        });
        unsubscribeCombos = onCombosChange(tenantId, (rawCombs) => {
          if (!cancelled) {
            setCombos(rawCombs);
            combosRef.current = rawCombs;
            void guardarCatalogoEnCache(tenantId, productosRef.current, rawCombs).catch(() => {});
          }
        });
      })
      .catch(async (err) => {
        if (cancelled) return;
        // Si falló la red (modo offline), intentar recuperar de IndexedDB
        try {
          const cache = await obtenerCatalogoEnCache(tenantId);
          if (cache && (cache.productos.length > 0 || cache.combos.length > 0)) {
            setProductos(cache.productos);
            setCombos(cache.combos);
            productosRef.current = cache.productos;
            combosRef.current = cache.combos;
            setLoading(false);
            return;
          }
        } catch {
          // Ignorar fallo de lectura local y continuar con error de red
        }

        setError(err instanceof Error ? err : new Error('Error al cargar catálogo'));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      refreshGuardRef.current.invalidate();
      unsubscribeProductos?.();
      unsubscribeCombos?.();
    };
  }, [tenantId]);

  const refresh = async () => {
    const request = refreshGuardRef.current.begin(scopeKey);
    try {
      setLoading(true);
      const [prods, combs] = await Promise.all([
        getProductos(tenantId),
        getCombos(tenantId),
      ]);
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setProductos(prods);
      setCombos(combs);
      productosRef.current = prods;
      combosRef.current = combs;
      setError(null);
      void guardarCatalogoEnCache(tenantId, prods, combs).catch(() => {});
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      // Intento de fallback a caché local si la red falló durante el refresh
      try {
        const cache = await obtenerCatalogoEnCache(tenantId);
        if (cache && (cache.productos.length > 0 || cache.combos.length > 0)) {
          setProductos(cache.productos);
          setCombos(cache.combos);
          setError(null);
          return;
        }
      } catch {
        // Fallback a error estándar
      }
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      if (refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) {
        setLoading(false);
      }
    }
  };

  return { productos, combos, loading, error, refresh };
}
