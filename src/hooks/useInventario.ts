import { useState, useEffect } from 'react';
import { Insumo, EntradaInventario } from '../types';
import {
  getTodosInsumos,
  onTodosInsumosChange,
  getInsumosConBajoStock,
  crearInsumo,
  actualizarInsumo,
  eliminarInsumo,
  registrarEntradaInventario,
  registrarSalidaInventario,
  getHistorialInsumo,
} from '../services/inventarioService';

export interface UseInventarioResult {
  insumos: Insumo[];
  insumosConBajoStock: Insumo[];
  loading: boolean;
  error: string | null;
  crear: (data: Omit<Insumo, 'id'>) => Promise<string>;
  actualizar: (id: string, updates: Partial<Insumo>) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  registrarEntrada: (insumoId: string, cantidad: number, costo: number, desc?: string) => Promise<string>;
  registrarSalida: (insumoId: string, cantidad: number, desc?: string) => Promise<void>;
  historial: (insumoId: string) => Promise<EntradaInventario[]>;
  refresh: () => Promise<void>;
}

export function useInventario(): UseInventarioResult {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumosConBajoStock, setInsumosConBajoStock] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Suscribirse a cambios en tiempo real
    const unsubscribe = onTodosInsumosChange((datos) => {
      setInsumos(datos);
      // Filtrar insumos con bajo stock
      const bajos = datos.filter((insumo) => (insumo.stockActual || 0) < (insumo.stockMinimo || 10));
      setInsumosConBajoStock(bajos);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const crear = async (data: Omit<Insumo, 'id'>) => {
    try {
      const id = await crearInsumo(data);
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
      await actualizarInsumo(id, updates);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error actualizando insumo: ${errMsg}`);
      throw err;
    }
  };

  const eliminar = async (id: string) => {
    try {
      await eliminarInsumo(id);
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
      const id = await registrarEntradaInventario(insumoId, cantidad, costo, desc);
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
      await registrarSalidaInventario(insumoId, cantidad, desc);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error registrando salida: ${errMsg}`);
      throw err;
    }
  };

  const historial = async (insumoId: string): Promise<EntradaInventario[]> => {
    try {
      return await getHistorialInsumo(insumoId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error obteniendo historial: ${errMsg}`);
      return [];
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const datos = await getTodosInsumos();
      setInsumos(datos);
      const bajos = await getInsumosConBajoStock();
      setInsumosConBajoStock(bajos);
      setError(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      setError(`Error refrescando: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    insumos,
    insumosConBajoStock,
    loading,
    error,
    crear,
    actualizar,
    eliminar,
    registrarEntrada,
    registrarSalida,
    historial,
    refresh,
  };
}
