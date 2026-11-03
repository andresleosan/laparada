import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import {
  actualizarEstadoReserva,
  crearReserva,
  eliminarReserva,
  suscribirReservas,
} from '@/services/reservasService';
import type {
  EstadoReserva,
  NuevaReservaInput,
  ReservaNegocio,
} from '@/types/reserva';

export interface MetricasReservas {
  total: number;
  hoy: number;
  pendientes: number;
  confirmadas: number;
  completadas: number;
  canceladas: number;
  personasHoy: number;
}

export interface UseReservasResult {
  reservas: ReservaNegocio[];
  loading: boolean;
  error: string | null;
  metricas: MetricasReservas;
  crear: (input: NuevaReservaInput) => Promise<string>;
  cambiarEstado: (id: string, nuevoEstado: EstadoReserva) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  recargar: () => void;
}

export function useReservas(): UseReservasResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const [reservas, setReservas] = useState<ReservaNegocio[]>([]);
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
      setReservas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let isMounted = true;

    const unsubscribe = suscribirReservas(
      tenantId,
      (nuevasReservas) => {
        if (!isMounted || activeTenantRef.current !== tenantId) return;
        setReservas(nuevasReservas);
        setLoading(false);
      },
      (err) => {
        if (!isMounted || activeTenantRef.current !== tenantId) return;
        setError(err.message || 'Error al cargar las reservas.');
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [tenantId, nonce]);

  const metricas = useMemo<MetricasReservas>(() => {
    const hoyStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let hoyCount = 0;
    let pendientesCount = 0;
    let confirmadasCount = 0;
    let completadasCount = 0;
    let canceladasCount = 0;
    let personasHoyCount = 0;

    for (const r of reservas) {
      const fechaCorta = r.fechaHoraReserva ? r.fechaHoraReserva.slice(0, 10) : '';
      const esHoy = fechaCorta === hoyStr;

      if (esHoy) {
        hoyCount++;
        if (r.estado !== 'cancelada') {
          personasHoyCount += Number(r.personas) || 0;
        }
      }

      if (r.estado === 'pendiente') pendientesCount++;
      else if (r.estado === 'confirmada') confirmadasCount++;
      else if (r.estado === 'completada') completadasCount++;
      else if (r.estado === 'cancelada') canceladasCount++;
    }

    return {
      total: reservas.length,
      hoy: hoyCount,
      pendientes: pendientesCount,
      confirmadas: confirmadasCount,
      completadas: completadasCount,
      canceladas: canceladasCount,
      personasHoy: personasHoyCount,
    };
  }, [reservas]);

  const crear = useCallback(
    async (input: NuevaReservaInput): Promise<string> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      return await crearReserva(tenantId, input);
    },
    [tenantId]
  );

  const cambiarEstado = useCallback(
    async (id: string, nuevoEstado: EstadoReserva): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await actualizarEstadoReserva(tenantId, id, nuevoEstado);
    },
    [tenantId]
  );

  const eliminar = useCallback(
    async (id: string): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await eliminarReserva(tenantId, id);
    },
    [tenantId]
  );

  return {
    reservas,
    loading,
    error,
    metricas,
    crear,
    cambiarEstado,
    eliminar,
    recargar,
  };
}
