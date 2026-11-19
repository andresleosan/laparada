import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  CorteXParcial,
  MovimientoCaja,
  RegistrarCorteXInput,
  RegistrarMovimientoCajaInput,
  ResumenMovimientosCajaTurno,
} from '@/types';
import {
  registrarCorteX,
  registrarMovimientoCaja,
  suscribirCortesXHoy,
  suscribirMovimientosCajaHoy,
} from '@/services/movimientosCajaService';
import {
  calcularResumenMovimientosCaja,
  descargarCsvMovimientosCaja,
} from '@/utils/movimientosCajaUtils';

export interface UseMovimientosCajaResult {
  movimientos: MovimientoCaja[];
  cortesX: CorteXParcial[];
  resumen: ResumenMovimientosCajaTurno;
  loading: boolean;
  error: string | null;
  registrarMovimiento: (
    input: Omit<RegistrarMovimientoCajaInput, 'negocioId' | 'responsableNombre' | 'responsableRol'> & {
      responsableNombre?: string;
    }
  ) => Promise<MovimientoCaja>;
  ejecutarCorteX: (
    input: Omit<RegistrarCorteXInput, 'negocioId' | 'cajeroSaliente'> & {
      cajeroSaliente?: string;
    }
  ) => Promise<CorteXParcial>;
  exportarCSV: () => void;
}

export function useMovimientosCaja(
  efectivoEsperadoActual = 0,
  umbralAlertaSangria?: number
): UseMovimientosCajaResult {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const tenantId = negocioActual.id;

  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [cortesX, setCortesX] = useState<CorteXParcial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    let movLoaded = false;
    let cortesLoaded = false;

    const markReady = () => {
      if (movLoaded && cortesLoaded) setLoading(false);
    };

    const unsubMovs = suscribirMovimientosCajaHoy(
      tenantId,
      (lista) => {
        setMovimientos(lista);
        movLoaded = true;
        markReady();
      },
      (err) => {
        setError(err.message || 'No se pudieron cargar los movimientos de caja');
        movLoaded = true;
        markReady();
      }
    );

    const unsubCortes = suscribirCortesXHoy(
      tenantId,
      (lista) => {
        setCortesX(lista);
        cortesLoaded = true;
        markReady();
      },
      (err) => {
        setError(err.message || 'No se pudieron cargar los Cortes X');
        cortesLoaded = true;
        markReady();
      }
    );

    return () => {
      unsubMovs();
      unsubCortes();
    };
  }, [tenantId]);

  const resumen = useMemo(
    () =>
      calcularResumenMovimientosCaja(
        movimientos,
        efectivoEsperadoActual,
        umbralAlertaSangria
      ),
    [movimientos, efectivoEsperadoActual, umbralAlertaSangria]
  );

  const registrarMovimiento = useCallback(
    async (
      input: Omit<RegistrarMovimientoCajaInput, 'negocioId' | 'responsableNombre' | 'responsableRol'> & {
        responsableNombre?: string;
      }
    ): Promise<MovimientoCaja> => {
      const responsableNombre =
        input.responsableNombre?.trim() ||
        usuarioNegocio?.nombre ||
        usuarioNegocio?.email ||
        'Cajero de Turno';

      return registrarMovimientoCaja(
        {
          ...input,
          negocioId: tenantId,
          responsableNombre,
          responsableRol: usuarioNegocio?.rol || 'cajero',
        },
        movimientos
      );
    },
    [tenantId, usuarioNegocio, movimientos]
  );

  const ejecutarCorteX = useCallback(
    async (
      input: Omit<RegistrarCorteXInput, 'negocioId' | 'cajeroSaliente'> & {
        cajeroSaliente?: string;
      }
    ): Promise<CorteXParcial> => {
      const cajeroSaliente =
        input.cajeroSaliente?.trim() ||
        usuarioNegocio?.nombre ||
        usuarioNegocio?.email ||
        'Cajero Saliente';

      return registrarCorteX(
        {
          ...input,
          negocioId: tenantId,
          cajeroSaliente,
        },
        cortesX
      );
    },
    [tenantId, usuarioNegocio, cortesX]
  );

  const exportarCSV = useCallback(() => {
    descargarCsvMovimientosCaja(movimientos, tenantId);
  }, [movimientos, tenantId]);

  return {
    movimientos,
    cortesX,
    resumen,
    loading,
    error,
    registrarMovimiento,
    ejecutarCorteX,
    exportarCSV,
  };
}
