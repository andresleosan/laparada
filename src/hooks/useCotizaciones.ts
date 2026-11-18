import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import {
  actualizarCotizacion,
  actualizarEstadoCotizacion,
  convertirCotizacionAVentaYComanda,
  crearCotizacion,
  eliminarCotizacion,
  marcarCotizacionEnviadaWhatsApp,
  registrarAnticipoCotizacion,
  suscribirCotizaciones,
} from '@/services/cotizacionesService';
import type {
  Combo,
  ConvertirCotizacionInput,
  CotizacionComercial,
  CrearCotizacionInput,
  EstadoCotizacion,
  MetricasCotizaciones,
  Producto,
  RegistrarAnticipoCotizacionInput,
  ResultadoConversionCotizacion,
} from '@/types';
import { calcularMetricasCotizaciones } from '@/utils/cotizacionesUtils';

export interface UseCotizacionesResult {
  cotizaciones: CotizacionComercial[];
  loading: boolean;
  error: string | null;
  metricas: MetricasCotizaciones;
  crear: (input: CrearCotizacionInput) => Promise<string>;
  actualizar: (cotizacionId: string, input: CrearCotizacionInput) => Promise<void>;
  cambiarEstado: (
    cotizacionId: string,
    nuevoEstado: Exclude<EstadoCotizacion, 'convertida'>
  ) => Promise<void>;
  registrarAnticipo: (
    cotizacionId: string,
    input: RegistrarAnticipoCotizacionInput
  ) => Promise<{ anticipoMonto: number; saldoPendiente: number }>;
  marcarEnviadaWhatsApp: (cotizacionId: string) => Promise<string>;
  convertirAVenta: (
    cotizacionId: string,
    input: ConvertirCotizacionInput,
    catalogo?: { productos?: Producto[]; combos?: Combo[] }
  ) => Promise<ResultadoConversionCotizacion>;
  eliminar: (cotizacionId: string) => Promise<void>;
  recargar: () => void;
}

export function useCotizaciones(): UseCotizacionesResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual?.id || '';

  const [cotizaciones, setCotizaciones] = useState<CotizacionComercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const activeTenantRef = useRef(tenantId);
  activeTenantRef.current = tenantId;

  const recargar = useCallback(() => {
    setNonce((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setCotizaciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    let isMounted = true;

    const unsubscribe = suscribirCotizaciones(
      tenantId,
      (lista) => {
        if (!isMounted || activeTenantRef.current !== tenantId) return;
        setCotizaciones(lista);
        setLoading(false);
      },
      (err) => {
        if (!isMounted || activeTenantRef.current !== tenantId) return;
        setError(err.message || 'Error al cargar las cotizaciones.');
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tenantId, nonce]);

  const metricas = useMemo<MetricasCotizaciones>(
    () => calcularMetricasCotizaciones(cotizaciones),
    [cotizaciones]
  );

  const crear = useCallback(
    async (input: CrearCotizacionInput): Promise<string> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      return await crearCotizacion(tenantId, input);
    },
    [tenantId]
  );

  const actualizar = useCallback(
    async (cotizacionId: string, input: CrearCotizacionInput): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await actualizarCotizacion(tenantId, cotizacionId, input);
    },
    [tenantId]
  );

  const cambiarEstado = useCallback(
    async (
      cotizacionId: string,
      nuevoEstado: Exclude<EstadoCotizacion, 'convertida'>
    ): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await actualizarEstadoCotizacion(tenantId, cotizacionId, nuevoEstado);
    },
    [tenantId]
  );

  const registrarAnticipo = useCallback(
    async (
      cotizacionId: string,
      input: RegistrarAnticipoCotizacionInput
    ): Promise<{ anticipoMonto: number; saldoPendiente: number }> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      return await registrarAnticipoCotizacion(tenantId, cotizacionId, input);
    },
    [tenantId]
  );

  const marcarEnviadaWhatsApp = useCallback(
    async (cotizacionId: string): Promise<string> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      return await marcarCotizacionEnviadaWhatsApp(tenantId, cotizacionId);
    },
    [tenantId]
  );

  const convertirAVenta = useCallback(
    async (
      cotizacionId: string,
      input: ConvertirCotizacionInput,
      catalogo?: { productos?: Producto[]; combos?: Combo[] }
    ): Promise<ResultadoConversionCotizacion> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      return await convertirCotizacionAVentaYComanda(tenantId, cotizacionId, input, catalogo);
    },
    [tenantId]
  );

  const eliminar = useCallback(
    async (cotizacionId: string): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await eliminarCotizacion(tenantId, cotizacionId);
    },
    [tenantId]
  );

  return {
    cotizaciones,
    loading,
    error,
    metricas,
    crear,
    actualizar,
    cambiarEstado,
    registrarAnticipo,
    marcarEnviadaWhatsApp,
    convertirAVenta,
    eliminar,
    recargar,
  };
}
