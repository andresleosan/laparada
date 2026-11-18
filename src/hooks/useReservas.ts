import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import { onMesasChange } from '@/services/mesasService';
import {
  actualizarEstadoReserva,
  asignarMesaAReserva,
  crearReserva,
  eliminarReserva,
  marcarRecordatorioReservaEnviado,
  registrarAnticipoReserva,
  sentarReservaEnMesa,
  suscribirReservas,
} from '@/services/reservasService';
import type { MetodoPago } from '@/types';
import type { Mesa } from '@/types/mesa';
import type {
  EstadoAnticipoReserva,
  EstadoReserva,
  MetricasLibroReservas,
  NuevaReservaInput,
  ReservaNegocio,
} from '@/types/reserva';
import { calcularMetricasLibroReservas } from '@/utils/reservasUtils';

export type MetricasReservas = MetricasLibroReservas;

export interface UseReservasResult {
  reservas: ReservaNegocio[];
  mesas: Mesa[];
  negocioNombre: string;
  loading: boolean;
  error: string | null;
  metricas: MetricasLibroReservas;
  crear: (input: NuevaReservaInput) => Promise<string>;
  cambiarEstado: (id: string, nuevoEstado: EstadoReserva) => Promise<void>;
  asignarMesa: (
    reservaId: string,
    mesa: {
      mesaId: string;
      mesaNumero: number;
      mesaNombre: string;
      zonaPreferida?: string;
    } | null
  ) => Promise<void>;
  actualizarAnticipo: (
    reservaId: string,
    anticipo: {
      anticipoMonto: number;
      anticipoMetodo: MetodoPago;
      anticipoEstado: EstadoAnticipoReserva;
      anticipoReferencia?: string;
    }
  ) => Promise<void>;
  registrarRecordatorio: (
    reservaId: string,
    confirmarSiPendiente?: boolean
  ) => Promise<string>;
  hacerCheckInEnMesa: (params: {
    reserva: ReservaNegocio;
    mesa: Mesa;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
    verificarAnticipoAlSentar?: boolean;
  }) => Promise<string>;
  eliminar: (id: string) => Promise<void>;
  recargar: () => void;
}

export function useReservas(): UseReservasResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual?.id || '';
  const negocioNombre = negocioActual?.nombre || 'La Parada';

  const [reservas, setReservas] = useState<ReservaNegocio[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
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
      setMesas([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let isMounted = true;

    const unsubscribeReservas = suscribirReservas(
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

    let unsubscribeMesas: (() => void) | undefined;
    try {
      unsubscribeMesas = onMesasChange(
        tenantId,
        (mesasSalon) => {
          if (!isMounted || activeTenantRef.current !== tenantId) return;
          setMesas(mesasSalon);
        },
        (err) => {
          console.warn('Error no crítico al escuchar mesas desde reservas:', err);
        }
      );
    } catch (err) {
      console.warn('No se pudo inicializar el mapa de mesas en reservas:', err);
    }

    return () => {
      isMounted = false;
      unsubscribeReservas();
      unsubscribeMesas?.();
    };
  }, [tenantId, nonce]);

  const metricas = useMemo<MetricasLibroReservas>(() => {
    return calcularMetricasLibroReservas(reservas);
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

  const asignarMesa = useCallback(
    async (
      reservaId: string,
      mesa: {
        mesaId: string;
        mesaNumero: number;
        mesaNombre: string;
        zonaPreferida?: string;
      } | null
    ): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await asignarMesaAReserva(tenantId, reservaId, mesa);
    },
    [tenantId]
  );

  const actualizarAnticipo = useCallback(
    async (
      reservaId: string,
      anticipo: {
        anticipoMonto: number;
        anticipoMetodo: MetodoPago;
        anticipoEstado: EstadoAnticipoReserva;
        anticipoReferencia?: string;
      }
    ): Promise<void> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      await registrarAnticipoReserva(tenantId, reservaId, anticipo);
    },
    [tenantId]
  );

  const registrarRecordatorio = useCallback(
    async (reservaId: string, confirmarSiPendiente = false): Promise<string> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');
      return await marcarRecordatorioReservaEnviado(
        tenantId,
        reservaId,
        confirmarSiPendiente
      );
    },
    [tenantId]
  );

  const hacerCheckInEnMesa = useCallback(
    async (params: {
      reserva: ReservaNegocio;
      mesa: Mesa;
      mesero?: string;
      meseroId?: string;
      meseroNombre?: string;
      verificarAnticipoAlSentar?: boolean;
    }): Promise<string> => {
      if (!tenantId) throw new Error('No hay un negocio activo seleccionado.');

      let reservaParaSentar = params.reserva;
      if (
        params.verificarAnticipoAlSentar &&
        (params.reserva.anticipoMonto || 0) > 0 &&
        params.reserva.anticipoEstado !== 'verificado'
      ) {
        await registrarAnticipoReserva(tenantId, params.reserva.id, {
          anticipoMonto: Math.round(Number(params.reserva.anticipoMonto) || 0),
          anticipoMetodo: params.reserva.anticipoMetodo || 'transferencia',
          anticipoEstado: 'verificado',
          anticipoReferencia: params.reserva.anticipoReferencia,
        });
        reservaParaSentar = {
          ...params.reserva,
          anticipoEstado: 'verificado',
        };
      }

      return await sentarReservaEnMesa(tenantId, {
        reserva: reservaParaSentar,
        mesaId: params.mesa.id,
        mesaNumero: params.mesa.numero,
        mesaNombre: params.mesa.nombre,
        mesero: params.mesero,
        meseroId: params.meseroId,
        meseroNombre: params.meseroNombre,
      });
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
    mesas,
    negocioNombre,
    loading,
    error,
    metricas,
    crear,
    cambiarEstado,
    asignarMesa,
    actualizarAnticipo,
    registrarRecordatorio,
    hacerCheckInEnMesa,
    eliminar,
    recargar,
  };
}
