import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  BonoPrepago,
  CambiarEstadoBonoInput,
  Combo,
  EmitirBonoInput,
  MovimientoBono,
  Producto,
  RecargarBonoInput,
  RedimirBonoInput,
} from '@/types';
import {
  cambiarEstadoBono,
  emitirBonoPrepago,
  recargarSaldoBono,
  redimirSaldoBono,
  registrarVentaConBonoAtomica,
  suscribirBonosPrepago,
  suscribirMovimientosBonos,
  type RegistrarVentaConBonoParams,
} from '@/services/bonosService';
import {
  calcularMetricasBonos,
  construirFilasAuditoriaBonos,
  normalizarCodigoBono,
} from '@/utils/bonosUtils';

export function useBonos(negocioId: string | undefined) {
  const [bonos, setBonos] = useState<BonoPrepago[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoBono[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(negocioId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setBonos([]);
      setMovimientos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let bonosCargados = false;
    let movsCargados = false;
    const finalizarCarga = () => {
      if (bonosCargados && movsCargados) {
        setLoading(false);
      }
    };

    const unsubBonos = suscribirBonosPrepago(
      negocioId,
      (lista) => {
        setBonos(lista);
        bonosCargados = true;
        finalizarCarga();
      },
      (err) => {
        setError(err.message || 'No se pudieron cargar los bonos y tarjetas prepago');
        bonosCargados = true;
        finalizarCarga();
      }
    );

    const unsubMovs = suscribirMovimientosBonos(
      negocioId,
      (lista) => {
        setMovimientos(lista);
        movsCargados = true;
        finalizarCarga();
      },
      (err) => {
        setError(err.message || 'No se pudo cargar el historial de movimientos de bonos');
        movsCargados = true;
        finalizarCarga();
      }
    );

    return () => {
      unsubBonos();
      unsubMovs();
    };
  }, [negocioId]);

  const metricas = useMemo(
    () => calcularMetricasBonos(bonos, movimientos),
    [bonos, movimientos]
  );

  const filasAuditoria = useMemo(
    () => construirFilasAuditoriaBonos(bonos),
    [bonos]
  );

  const bonoPorCodigo = useMemo(() => {
    const map = new Map<string, BonoPrepago>();
    for (const b of bonos) {
      map.set(normalizarCodigoBono(b.codigo), b);
    }
    return map;
  }, [bonos]);

  const emitirBono = useCallback(
    async (input: EmitirBonoInput) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return emitirBonoPrepago(negocioId, input);
    },
    [negocioId]
  );

  const recargarBono = useCallback(
    async (input: RecargarBonoInput) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return recargarSaldoBono(negocioId, input);
    },
    [negocioId]
  );

  const redimirBono = useCallback(
    async (input: RedimirBonoInput) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return redimirSaldoBono(negocioId, input);
    },
    [negocioId]
  );

  const registrarVentaConBono = useCallback(
    async (
      params: RegistrarVentaConBonoParams,
      catalogo?: { productos?: Producto[]; combos?: Combo[] }
    ) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return registrarVentaConBonoAtomica(negocioId, params, catalogo);
    },
    [negocioId]
  );

  const cambiarEstado = useCallback(
    async (input: CambiarEstadoBonoInput) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return cambiarEstadoBono(negocioId, input);
    },
    [negocioId]
  );

  return {
    bonos,
    movimientos,
    filasAuditoria,
    metricas,
    bonoPorCodigo,
    loading,
    error,
    emitirBono,
    recargarBono,
    redimirBono,
    registrarVentaConBono,
    cambiarEstado,
  };
}
