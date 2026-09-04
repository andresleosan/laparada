import { useState, useEffect, useRef } from 'react';
import { Insumo, EntradaInventario } from '../types';
import {
  getTodosInsumos,
  onTodosInsumosChange,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  registrarEntradaInventario,
  registrarSalidaInventario,
  getHistorialInsumo,
} from '../services/inventarioService';
import { useNegocio } from '@/context/NegocioContext';
import { filterInventoryLowStock } from '@/utils/inventoryStock';
import { createScopedRequestGuard } from '@/utils/scopedRequestGuard';

export interface UseInventarioResult {
  insumos: Insumo[];
  insumosConBajoStock: Insumo[];
  loading: boolean;
  error: string | null;
  crear: (data: Omit<Insumo, 'id' | 'negocioId'>) => Promise<string>;
  actualizar: (id: string, updates: Partial<Insumo>) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  registrarEntrada: (insumoId: string, cantidad: number, costo: number, desc?: string) => Promise<string>;
  registrarSalida: (insumoId: string, cantidad: number, desc?: string) => Promise<void>;
  historial: (insumoId: string) => Promise<EntradaInventario[]>;
  refresh: () => Promise<void>;
}

export function useInventario(): UseInventarioResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumosConBajoStock, setInsumosConBajoStock] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stateScope, setStateScope] = useState(tenantId);
  const activeScopeRef = useRef(tenantId);
  const refreshGuardRef = useRef(createScopedRequestGuard());
  activeScopeRef.current = tenantId;

  useEffect(() => {
    setStateScope(tenantId);
    setLoading(true);
    setError(null);
    setInsumos([]);
    setInsumosConBajoStock([]);
    let cancelled = false;
    const isActiveScope = () => !cancelled && activeScopeRef.current === tenantId;

    // Timeout de 10 segundos para evitar carga infinita
    const timeoutId = setTimeout(() => {
      if (!isActiveScope()) return;
      setLoading(false);
      setError('Tiempo de carga agotado. Intenta nuevamente.');
    }, 10000);

    // Suscribirse a cambios en tiempo real
    const unsubscribe = onTodosInsumosChange(
      tenantId,
      (datos) => {
        if (!isActiveScope()) return;
        // El snapshot en tiempo real es la lectura más reciente y deja obsoleto
        // cualquier refresh que siga pendiente para este mismo tenant.
        refreshGuardRef.current.invalidate();
        setInsumos(datos);
        setInsumosConBajoStock(filterInventoryLowStock(datos));
        setLoading(false);
        clearTimeout(timeoutId);
      },
      (listenerError) => {
        if (!isActiveScope()) return;
        console.error('Error in inventario listener:', listenerError);
        setError(`Error: ${listenerError.message}`);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    );

    return () => {
      cancelled = true;
      refreshGuardRef.current.invalidate();
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [tenantId]);

  const crear = async (data: Omit<Insumo, 'id' | 'negocioId'>) => {
    try {
      const id = await crearInsumo({ ...data, negocioId: tenantId });
      setError(null);
      return id;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error creando insumo: ${errMsg}`);
      throw err;
    }
  };

  const actualizar = async (id: string, updates: Partial<Insumo>) => {
    try {
      await actualizarInsumo(id, updates, tenantId);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error actualizando insumo: ${errMsg}`);
      throw err;
    }
  };

  const eliminar = async (id: string) => {
    try {
      await eliminarInsumo(id, tenantId);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error eliminando insumo: ${errMsg}`);
      throw err;
    }
  };

  const registrarEntrada = async (
    insumoId: string,
    cantidad: number,
    costo: number,
    desc?: string
  ) => {
    try {
      const id = await registrarEntradaInventario(tenantId, insumoId, cantidad, costo, desc);
      setError(null);
      return id;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error registrando entrada: ${errMsg}`);
      throw err;
    }
  };

  const registrarSalida = async (
    insumoId: string,
    cantidad: number,
    desc?: string
  ) => {
    try {
      await registrarSalidaInventario(tenantId, insumoId, cantidad, desc);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error registrando salida: ${errMsg}`);
      throw err;
    }
  };

  const historial = async (insumoId: string): Promise<EntradaInventario[]> => {
    try {
      return await getHistorialInsumo(tenantId, insumoId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error obteniendo historial: ${errMsg}`);
      throw err;
    }
  };

  const refresh = async () => {
    const request = refreshGuardRef.current.begin(tenantId);
    setLoading(true);
    try {
      const datos = await getTodosInsumos(tenantId);
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      setInsumos(datos);
      setInsumosConBajoStock(filterInventoryLowStock(datos));
      setError(null);
    } catch (err) {
      if (!refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) return;
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error refrescando: ${errMsg}`);
    } finally {
      if (refreshGuardRef.current.isCurrent(request, activeScopeRef.current)) {
        setLoading(false);
      }
    }
  };

  const stateIsCurrent = stateScope === tenantId;

  return {
    insumos: stateIsCurrent ? insumos : [],
    insumosConBajoStock: stateIsCurrent ? insumosConBajoStock : [],
    loading: stateIsCurrent ? loading : true,
    error: stateIsCurrent ? error : null,
    crear,
    actualizar,
    eliminar,
    registrarEntrada,
    registrarSalida,
    historial,
    refresh,
  };
}
