// src/hooks/useOfflineSync.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  MetodoPago,
  SyncResult,
  TipoEntrega,
  ItemVenta,
  VentaPendienteOffline,
} from '@/types';
import {
  contarVentasPendientes,
  guardarVentaOffline,
  obtenerVentasPendientes,
  sincronizarVentasPendientes,
  eliminarVentaPendiente,
} from '@/services/offlineSyncService';
import { registrarVenta } from '@/services/ventasService';

export interface GuardarVentaParams {
  items: ItemVenta[];
  total: number;
  subtotal?: number;
  propina?: number;
  metodoPago: MetodoPago;
  tipoEntrega?: TipoEntrega;
  direccion?: string;
  barrio?: string;
  clienteTelefono?: string;
  clienteNombre?: string;
  fotoTransferenciaPath?: string;
}

export type GuardarVentaResultado =
  | { guardadoEn: 'nube'; ventaId: string }
  | { guardadoEn: 'offline'; ventaOffline: VentaPendienteOffline };

export function useOfflineSync(negocioId: string) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [ventasPendientes, setVentasPendientes] = useState<VentaPendienteOffline[]>([]);
  const [sincronizando, setSincronizando] = useState<boolean>(false);
  const [ultimoResultado, setUltimoResultado] = useState<SyncResult | null>(null);

  const syncLockRef = useRef<boolean>(false);

  // Recarga la lista de ventas pendientes desde IndexedDB
  const refrescarPendientes = useCallback(async () => {
    if (!negocioId) return;
    try {
      const pendientes = await obtenerVentasPendientes(negocioId);
      setVentasPendientes(pendientes);
    } catch (error) {
      console.warn('No se pudieron leer ventas pendientes de IndexedDB:', error);
    }
  }, [negocioId]);

  // Sincronización manual o automática de ventas pendientes
  const sincronizarAhora = useCallback(async (): Promise<SyncResult> => {
    if (!negocioId || syncLockRef.current) {
      return { exitosas: 0, fallidas: 0, errores: [] };
    }

    syncLockRef.current = true;
    setSincronizando(true);

    try {
      const res = await sincronizarVentasPendientes(negocioId);
      setUltimoResultado(res);
      await refrescarPendientes();
      return res;
    } catch (error) {
      console.error('Error durante la sincronización offline:', error);
      const resFallback: SyncResult = {
        exitosas: 0,
        fallidas: 1,
        errores: [{ id: 'general', error: error instanceof Error ? error.message : 'Error de sincronización' }],
      };
      setUltimoResultado(resFallback);
      return resFallback;
    } finally {
      syncLockRef.current = false;
      setSincronizando(false);
    }
  }, [negocioId, refrescarPendientes]);

  // Descartar una venta pendiente de la cola
  const descartarVentaPendiente = useCallback(
    async (id: string) => {
      if (!negocioId) return;
      try {
        await eliminarVentaPendiente(id, negocioId);
        await refrescarPendientes();
      } catch (error) {
        console.error('Error descartando venta pendiente:', error);
        throw error;
      }
    },
    [negocioId, refrescarPendientes]
  );

  // Guarda venta intentando nube primero (si está online) y fallback a IndexedDB si falla la red o si está offline
  const guardarVentaConFallback = useCallback(
    async (params: GuardarVentaParams): Promise<GuardarVentaResultado> => {
      const tipoEntrega = params.tipoEntrega || 'mostrador';

      // 1. Si está conectado, intentar registrar en la nube
      if (navigator.onLine) {
        try {
          const ventaId = await registrarVenta(
            negocioId,
            params.items,
            params.total,
            params.metodoPago,
            params.direccion,
            params.clienteTelefono,
            params.fotoTransferenciaPath,
            tipoEntrega,
            params.clienteNombre,
            params.barrio,
            undefined,
            {
              subtotal: params.subtotal,
              propina: params.propina,
            }
          );
          return { guardadoEn: 'nube', ventaId };
        } catch (error) {
          // Si falló por falta de conectividad o timeout de red, caemos a almacenamiento offline
          console.warn('Fallo de red en registro directo. Guardando en cola offline:', error);
        }
      }

      // 2. Almacenar offline en IndexedDB
      const ventaOffline = await guardarVentaOffline(negocioId, {
        items: params.items,
        total: params.total,
        subtotal: params.subtotal,
        propina: params.propina,
        metodoPago: params.metodoPago,
        tipoEntrega,
        direccion: params.direccion,
        barrio: params.barrio,
        clienteTelefono: params.clienteTelefono,
        clienteNombre: params.clienteNombre,
      });

      await refrescarPendientes();
      return { guardadoEn: 'offline', ventaOffline };
    },
    [negocioId, refrescarPendientes]
  );

  // Listener de eventos online/offline del navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Al volver la conexión, intentar sincronizar si hay pendientes
      contarVentasPendientes(negocioId)
        .then((total) => {
          if (total > 0) {
            void sincronizarAhora();
          }
        })
        .catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Carga inicial de pendientes
    void refrescarPendientes();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [negocioId, refrescarPendientes, sincronizarAhora]);

  return {
    isOnline,
    ventasPendientes,
    cantidadPendientes: ventasPendientes.length,
    sincronizando,
    ultimoResultado,
    sincronizarAhora,
    guardarVentaConFallback,
    descartarVentaPendiente,
    refrescarPendientes,
  };
}
