// src/hooks/useRastreoPedido.ts
import { useEffect, useState } from 'react';
import { onRastreoPedidoChange } from '@/services/orderTrackingService';
import type { RastreoPedido } from '@/types/tracking';

export interface UseRastreoPedidoResult {
  pedido: RastreoPedido | null;
  cargando: boolean;
  error: string | null;
}

export function useRastreoPedido(token?: string): UseRastreoPedidoResult {
  const [pedido, setPedido] = useState<RastreoPedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const activeToken = (token || '').trim();
    if (!activeToken) {
      setPedido(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    const unsubscribe = onRastreoPedidoChange(
      activeToken,
      (data) => {
        setPedido(data);
        setCargando(false);
      },
      (err) => {
        setError(err.message || 'Error al conectar con el servicio de rastreo');
        setCargando(false);
      }
    );

    return () => unsubscribe();
  }, [token]);

  return { pedido, cargando, error };
}

