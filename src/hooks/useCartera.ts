import { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  Combo,
  ConfigurarCuentaCorrienteInput,
  CuentaCorriente,
  MovimientoCartera,
  Producto,
  RegistrarAbonoCarteraInput,
  RegistrarConsumoCreditoInput,
} from '@/types';
import {
  configurarCuentaCorriente,
  registrarAbonoCartera,
  registrarConsumoCredito,
  suscribirCuentasCorrientes,
  suscribirMovimientosCartera,
} from '@/services/carteraService';
import {
  calcularMetricasCartera,
  construirFilasCartera,
} from '@/utils/carteraUtils';

export function useCartera(negocioId: string | undefined) {
  const [cuentas, setCuentas] = useState<CuentaCorriente[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoCartera[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(negocioId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setCuentas([]);
      setMovimientos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let cuentasCargadas = false;
    let movsCargados = false;
    const finalizarCarga = () => {
      if (cuentasCargadas && movsCargados) {
        setLoading(false);
      }
    };

    const unsubCuentas = suscribirCuentasCorrientes(
      negocioId,
      (lista) => {
        setCuentas(lista);
        cuentasCargadas = true;
        finalizarCarga();
      },
      (err) => {
        setError(err.message || 'No se pudieron cargar las cuentas corrientes');
        cuentasCargadas = true;
        finalizarCarga();
      }
    );

    const unsubMovs = suscribirMovimientosCartera(
      negocioId,
      (lista) => {
        setMovimientos(lista);
        movsCargados = true;
        finalizarCarga();
      },
      (err) => {
        setError(err.message || 'No se pudo cargar el historial de cartera');
        movsCargados = true;
        finalizarCarga();
      }
    );

    return () => {
      unsubCuentas();
      unsubMovs();
    };
  }, [negocioId]);

  const metricas = useMemo(
    () => calcularMetricasCartera(cuentas, movimientos),
    [cuentas, movimientos]
  );

  const filasCartera = useMemo(
    () => construirFilasCartera(cuentas, movimientos),
    [cuentas, movimientos]
  );

  const cuentaPorClienteId = useMemo(() => {
    const map = new Map<string, CuentaCorriente>();
    for (const cuenta of cuentas) {
      map.set(cuenta.clienteId, cuenta);
    }
    return map;
  }, [cuentas]);

  const guardarConfiguracionCuenta = useCallback(
    async (input: ConfigurarCuentaCorrienteInput) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return configurarCuentaCorriente(negocioId, input);
    },
    [negocioId]
  );

  const registrarConsumo = useCallback(
    async (
      input: RegistrarConsumoCreditoInput,
      catalogo?: { productos?: Producto[]; combos?: Combo[] }
    ) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return registrarConsumoCredito(negocioId, input, catalogo);
    },
    [negocioId]
  );

  const registrarAbono = useCallback(
    async (input: RegistrarAbonoCarteraInput) => {
      if (!negocioId) throw new Error('Negocio no disponible');
      return registrarAbonoCartera(negocioId, input);
    },
    [negocioId]
  );

  return {
    cuentas,
    movimientos,
    filasCartera,
    metricas,
    cuentaPorClienteId,
    loading,
    error,
    guardarConfiguracionCuenta,
    registrarConsumo,
    registrarAbono,
  };
}
