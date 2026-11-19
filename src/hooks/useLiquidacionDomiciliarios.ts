import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  CerrarLiquidacionDomiciliarioInput,
  EntregarBaseRutaInput,
  LiquidacionDomiciliario,
  ResumenBasesRutaTurno,
} from '@/types';
import {
  cerrarLiquidacionDomiciliario,
  entregarBaseRuta,
  suscribirLiquidacionesDomiciliariosHoy,
} from '@/services/liquidacionDomiciliariosService';
import {
  calcularResumenBasesRutaTurno,
  generarCsvLiquidacionesDomiciliarios,
  obtenerIdsDomiciliosYaLiquidados,
} from '@/utils/liquidacionDomiciliariosUtils';

export interface UseLiquidacionDomiciliariosResult {
  liquidaciones: LiquidacionDomiciliario[];
  basesActivas: LiquidacionDomiciliario[];
  actasLiquidadas: LiquidacionDomiciliario[];
  resumenBasesRuta: ResumenBasesRutaTurno;
  idsYaLiquidados: Set<string>;
  loading: boolean;
  error: string | null;
  entregarBase: (
    input: Omit<EntregarBaseRutaInput, 'negocioId'>
  ) => Promise<LiquidacionDomiciliario>;
  liquidarRepartidor: (
    input: Omit<CerrarLiquidacionDomiciliarioInput, 'negocioId'>
  ) => Promise<LiquidacionDomiciliario>;
  exportarCSV: () => void;
}

export function useLiquidacionDomiciliarios(): UseLiquidacionDomiciliariosResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const [liquidaciones, setLiquidaciones] = useState<LiquidacionDomiciliario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsub = suscribirLiquidacionesDomiciliariosHoy(
      tenantId,
      (lista) => {
        setLiquidaciones(lista);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Error cargando liquidaciones de domiciliarios');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [tenantId]);

  const basesActivas = useMemo(
    () => liquidaciones.filter((l) => l.estado === 'activa'),
    [liquidaciones]
  );

  const actasLiquidadas = useMemo(
    () => liquidaciones.filter((l) => l.estado === 'liquidada'),
    [liquidaciones]
  );

  const resumenBasesRuta = useMemo(
    () => calcularResumenBasesRutaTurno(liquidaciones),
    [liquidaciones]
  );

  const idsYaLiquidados = useMemo(
    () => obtenerIdsDomiciliosYaLiquidados(liquidaciones),
    [liquidaciones]
  );

  const entregarBase = useCallback(
    async (input: Omit<EntregarBaseRutaInput, 'negocioId'>) => {
      return entregarBaseRuta({
        ...input,
        negocioId: tenantId,
      });
    },
    [tenantId]
  );

  const liquidarRepartidor = useCallback(
    async (input: Omit<CerrarLiquidacionDomiciliarioInput, 'negocioId'>) => {
      return cerrarLiquidacionDomiciliario({
        ...input,
        negocioId: tenantId,
      });
    },
    [tenantId]
  );

  const exportarCSV = useCallback(() => {
    const csv = generarCsvLiquidacionesDomiciliarios(liquidaciones);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fecha = new Date().toISOString().slice(0, 10);
    link.download = `liquidaciones_domiciliarios_${tenantId}_${fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [liquidaciones, tenantId]);

  return {
    liquidaciones,
    basesActivas,
    actasLiquidadas,
    resumenBasesRuta,
    idsYaLiquidados,
    loading,
    error,
    entregarBase,
    liquidarRepartidor,
    exportarCSV,
  };
}
