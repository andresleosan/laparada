// src/hooks/useFacturacion.ts
import { useEffect, useMemo, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ComprobanteZ,
  ConfiguracionFiscal,
  EvaluacionResolucionDian,
  Venta,
} from '@/types';
import {
  asignarSiguienteConsecutivoPos,
  guardarComprobanteZ,
  guardarConfiguracionFiscal,
  onComprobantesZChange,
  onConfiguracionFiscalChange,
} from '@/services/facturacionService';
import {
  calcularAlertaResolucion,
  getConfiguracionFiscalDefault,
  generarComprobanteZ as generarCorteZUtil,
} from '@/utils/facturacionUtils';

export function useFacturacion() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual.id;

  const [configuracion, setConfiguracion] = useState<ConfiguracionFiscal>(() =>
    getConfiguracionFiscalDefault(negocioId, negocioActual.nombre)
  );
  const [comprobantesZ, setComprobantesZ] = useState<ComprobanteZ[]>([]);
  const [loading, setLoading] = useState(true);

  // Escuchar en tiempo real cambios de configuración fiscal
  useEffect(() => {
    if (!negocioId) return;
    setLoading(true);

    const unsubConfig = onConfiguracionFiscalChange(negocioId, (nuevaConfig) => {
      setConfiguracion(nuevaConfig);
      setLoading(false);
    });

    const unsubCortes = onComprobantesZChange(negocioId, (nuevosCortes) => {
      setComprobantesZ(nuevosCortes);
    });

    return () => {
      unsubConfig();
      unsubCortes();
    };
  }, [negocioId]);

  // Evaluación memoizada del semáforo fiscal
  const evaluacionResolucion: EvaluacionResolucionDian = useMemo(() => {
    return calcularAlertaResolucion(configuracion.resolucion, configuracion.alertas);
  }, [configuracion.resolucion, configuracion.alertas]);

  // Guardar configuración modificada
  const guardarConfiguracion = async (cambios: Partial<ConfiguracionFiscal>) => {
    await guardarConfiguracionFiscal(negocioId, cambios);
  };

  // Generar y opcionalmente guardar el corte Z
  const generarCorteZ = (
    ventas: Venta[],
    fechaCorte: string,
    responsable: string = 'Cajero Principal'
  ): ComprobanteZ => {
    return generarCorteZUtil(ventas, configuracion, fechaCorte, responsable);
  };

  const guardarCorteZ = async (comprobante: ComprobanteZ): Promise<string> => {
    return await guardarComprobanteZ(negocioId, comprobante);
  };

  const asignarConsecutivo = async () => {
    return await asignarSiguienteConsecutivoPos(negocioId);
  };

  return {
    configuracion,
    comprobantesZ,
    loading,
    evaluacionResolucion,
    guardarConfiguracion,
    generarCorteZ,
    guardarCorteZ,
    asignarConsecutivo,
  };
}
