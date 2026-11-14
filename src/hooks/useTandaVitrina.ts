import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  ItemInicialTandaInput,
} from '@/services/tandaVitrinaService';
import {
  crearTandaVitrina,
  onTandaActivaChange,
  onHistorialTandasChange,
  agregarAdicionItem,
  registrarMermaItem,
  agregarNuevoProductoATanda,
  registrarTransferenciaTanda,
  cerrarTandaVitrina,
} from '@/services/tandaVitrinaService';
import type {
  AnaliticaTandasConsolidada,
  MetodoTransferenciaTanda,
  ResumenTanda,
  TandaVitrina,
} from '@/types/tanda';
import { calcularAnaliticaTandas, descargarHistorialTandasCsv } from '@/utils/tandaUtils';

export interface UseTandaVitrinaResult {
  tandaActiva: TandaVitrina | null;
  historialTandas: TandaVitrina[];
  analiticaTandas: AnaliticaTandasConsolidada;
  loading: boolean;
  error: string | null;
  iniciarTanda: (
    items: ItemInicialTandaInput[],
    cajaId?: string,
    responsable?: string
  ) => Promise<string>;
  agregarAdicion: (productoId: string, cantidad: number, nota?: string) => Promise<void>;
  registrarMerma: (productoId: string, cantidad: number, motivo?: string) => Promise<void>;
  agregarProducto: (item: ItemInicialTandaInput) => Promise<void>;
  registrarTransferencia: (
    monto: number,
    metodo: MetodoTransferenciaTanda,
    referencia?: string,
    fotoUrl?: string,
    nota?: string
  ) => Promise<void>;
  cerrarTanda: (
    sobrantesMap: Record<string, number>,
    notasCierre?: string
  ) => Promise<ResumenTanda>;
  exportarHistorialCsv: (nombreNegocio?: string) => void;
}

export function useTandaVitrina(negocioId: string): UseTandaVitrinaResult {
  const [tandaActiva, setTandaActiva] = useState<TandaVitrina | null>(null);
  const [historialTandas, setHistorialTandas] = useState<TandaVitrina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setTandaActiva(null);
      setHistorialTandas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubActiva = onTandaActivaChange(negocioId, (tanda) => {
      setTandaActiva(tanda);
      setLoading(false);
      setError(null);
    });

    const unsubHistorial = onHistorialTandasChange(negocioId, (tandas) => {
      setHistorialTandas(tandas);
    });

    return () => {
      unsubActiva();
      unsubHistorial();
    };
  }, [negocioId]);

  const analiticaTandas = useMemo(
    () => calcularAnaliticaTandas(historialTandas),
    [historialTandas]
  );

  const exportarHistorialCsv = useCallback(
    (nombreNegocio?: string) => {
      descargarHistorialTandasCsv(historialTandas, nombreNegocio);
    },
    [historialTandas]
  );

  const iniciarTanda = useCallback(
    async (
      items: ItemInicialTandaInput[],
      cajaId?: string,
      responsable?: string
    ): Promise<string> => {
      try {
        setError(null);
        return await crearTandaVitrina(negocioId, items, cajaId, responsable);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al iniciar tanda';
        setError(msg);
        throw err;
      }
    },
    [negocioId]
  );

  const agregarAdicion = useCallback(
    async (productoId: string, cantidad: number, nota?: string): Promise<void> => {
      if (!tandaActiva) throw new Error('No hay tanda activa');
      try {
        setError(null);
        await agregarAdicionItem(negocioId, tandaActiva.id, productoId, cantidad, nota);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al agregar unidades';
        setError(msg);
        throw err;
      }
    },
    [negocioId, tandaActiva]
  );

  const registrarMerma = useCallback(
    async (productoId: string, cantidad: number, motivo?: string): Promise<void> => {
      if (!tandaActiva) throw new Error('No hay tanda activa');
      try {
        setError(null);
        await registrarMermaItem(negocioId, tandaActiva.id, productoId, cantidad, motivo);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al registrar merma';
        setError(msg);
        throw err;
      }
    },
    [negocioId, tandaActiva]
  );

  const agregarProducto = useCallback(
    async (item: ItemInicialTandaInput): Promise<void> => {
      if (!tandaActiva) throw new Error('No hay tanda activa');
      try {
        setError(null);
        await agregarNuevoProductoATanda(negocioId, tandaActiva.id, item);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al agregar producto';
        setError(msg);
        throw err;
      }
    },
    [negocioId, tandaActiva]
  );

  const registrarTransferencia = useCallback(
    async (
      monto: number,
      metodo: MetodoTransferenciaTanda,
      referencia?: string,
      fotoUrl?: string,
      nota?: string
    ): Promise<void> => {
      if (!tandaActiva) throw new Error('No hay tanda activa');
      try {
        setError(null);
        await registrarTransferenciaTanda(negocioId, tandaActiva.id, {
          monto,
          metodo,
          referencia,
          fotoUrl,
          nota,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al registrar transferencia';
        setError(msg);
        throw err;
      }
    },
    [negocioId, tandaActiva]
  );

  const cerrarTanda = useCallback(
    async (
      sobrantesMap: Record<string, number>,
      notasCierre?: string
    ): Promise<ResumenTanda> => {
      if (!tandaActiva) throw new Error('No hay tanda activa para cerrar');
      try {
        setError(null);
        return await cerrarTandaVitrina(negocioId, tandaActiva.id, sobrantesMap, notasCierre);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cerrar tanda';
        setError(msg);
        throw err;
      }
    },
    [negocioId, tandaActiva]
  );

  return {
    tandaActiva,
    historialTandas,
    analiticaTandas,
    loading,
    error,
    iniciarTanda,
    agregarAdicion,
    registrarMerma,
    agregarProducto,
    registrarTransferencia,
    cerrarTanda,
    exportarHistorialCsv,
  };
}
