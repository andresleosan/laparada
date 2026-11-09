import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  EncuestaSatisfaccion,
  ConfiguracionSatisfaccion,
  KpisSatisfaccion,
  FiltrosSatisfaccion,
  EstadoEncuestaSatisfaccion,
} from '@/types/satisfaccion';
import {
  onEncuestasSatisfaccionChange,
  onConfiguracionSatisfaccionChange,
  actualizarEstadoEncuesta,
  eliminarEncuesta,
  guardarConfiguracionSatisfaccion,
} from '@/services/satisfaccionService';
import {
  calcularKpisSatisfaccion,
  filtrarEncuestas,
  descargarEncuestasCsv,
  getConfiguracionSatisfaccionDefault,
} from '@/utils/satisfaccionUtils';

export function useSatisfaccion(negocioIdProp?: string) {
  const { negocioActual } = useNegocio();
  const negocioId = negocioIdProp || negocioActual.id;

  const [encuestas, setEncuestas] = useState<EncuestaSatisfaccion[]>([]);
  const [configuracion, setConfiguracion] = useState<ConfiguracionSatisfaccion>(() =>
    getConfiguracionSatisfaccionDefault(negocioId)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosSatisfaccion>({
    canal: 'todos',
    calificacion: 'todas',
    soloQuejas: false,
    estado: 'todos',
    busqueda: '',
  });

  // Suscripción en tiempo real a encuestas y configuración
  useEffect(() => {
    if (!negocioId) return;
    setLoading(true);
    setError(null);

    const unsubEncuestas = onEncuestasSatisfaccionChange(
      negocioId,
      (data) => {
        setEncuestas(data);
        setLoading(false);
      }
    );

    const unsubConfig = onConfiguracionSatisfaccionChange(
      negocioId,
      (data) => {
        setConfiguracion(data);
      }
    );

    return () => {
      unsubEncuestas();
      unsubConfig();
    };
  }, [negocioId]);

  // KPIs memoizados
  const kpis = useMemo<KpisSatisfaccion>(() => {
    return calcularKpisSatisfaccion(encuestas);
  }, [encuestas]);

  // Filtrado de encuestas
  const encuestasFiltradas = useMemo<EncuestaSatisfaccion[]>(() => {
    return filtrarEncuestas(encuestas, filtros);
  }, [encuestas, filtros]);

  // Manejo de filtros
  const actualizarFiltro = useCallback((clave: keyof FiltrosSatisfaccion, valor: unknown) => {
    setFiltros((prev) => ({
      ...prev,
      [clave]: valor,
    }));
  }, []);

  const limpiarFiltros = useCallback(() => {
    setFiltros({
      canal: 'todos',
      calificacion: 'todas',
      soloQuejas: false,
      estado: 'todos',
      busqueda: '',
    });
  }, []);

  // Acciones operativas
  const cambiarEstado = useCallback(
    async (
      encuestaId: string,
      estado: EstadoEncuestaSatisfaccion,
      notasInternas?: string,
      contactadoPorWhatsApp?: boolean,
      atendidaPor?: string
    ) => {
      await actualizarEstadoEncuesta(negocioId, encuestaId, {
        estado,
        notasInternas,
        contactadoPorWhatsApp,
        atendidaPor,
      });
    },
    [negocioId]
  );

  const eliminarEncuestaAction = useCallback(
    async (encuestaId: string) => {
      await eliminarEncuesta(negocioId, encuestaId);
    },
    [negocioId]
  );

  const guardarConfiguracionAction = useCallback(
    async (datos: Partial<ConfiguracionSatisfaccion>) => {
      await guardarConfiguracionSatisfaccion(negocioId, datos);
    },
    [negocioId]
  );

  const exportarCsv = useCallback(() => {
    const sufijo = new Date().toISOString().slice(0, 10);
    descargarEncuestasCsv(encuestasFiltradas, `satisfaccion_${negocioId}_${sufijo}.csv`);
  }, [encuestasFiltradas, negocioId]);

  return {
    encuestas,
    encuestasFiltradas,
    configuracion,
    kpis,
    loading,
    error,
    filtros,
    setFiltros,
    actualizarFiltro,
    limpiarFiltros,
    cambiarEstado,
    eliminarEncuestaAction,
    guardarConfiguracionAction,
    exportarCsv,
  };
}
