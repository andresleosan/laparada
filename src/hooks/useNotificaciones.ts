import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  NotificacionOperativa,
  FiltrosNotificaciones,
  MetricasNotificaciones,
  CrearNotificacionInput,
  UrgenciaNotificacion,
} from '@/types/notificacion';
import {
  onNotificacionesChange,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  eliminarNotificacion,
  crearNotificacion,
} from '@/services/notificacionesService';
import {
  calcularMetricasNotificaciones,
  filtrarNotificaciones,
  getNotificacionesSonidoHabilitado,
  setNotificacionesSonidoHabilitado,
  reproducirAlertaPorUrgencia,
} from '@/utils/notificacionesUtils';

export function useNotificaciones() {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const negocioId = negocioActual?.id || '';

  const [notificaciones, setNotificaciones] = useState<NotificacionOperativa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosNotificaciones>({
    modulo: 'todos',
    urgencia: 'todas',
    estado: 'todas',
    busqueda: '',
  });

  const [sonidoHabilitado, setSonidoHabilitadoState] = useState<boolean>(() =>
    getNotificacionesSonidoHabilitado()
  );

  const toggleSonido = useCallback(() => {
    setSonidoHabilitadoState((prev) => {
      const nuevo = !prev;
      setNotificacionesSonidoHabilitado(nuevo);
      return nuevo;
    });
  }, []);

  const probarSonido = useCallback((urgencia: UrgenciaNotificacion = 'alta') => {
    reproducirAlertaPorUrgencia(urgencia, undefined, true);
  }, []);

  // Seguimiento de notificaciones conocidas para reproducir sonido solo ante eventos NUEVOS
  const idsInicializadosRef = useRef(false);
  const idsConocidosRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!negocioId) {
      setNotificaciones([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);
    idsInicializadosRef.current = false;
    idsConocidosRef.current.clear();

    const unsub = onNotificacionesChange(
      negocioId,
      (lista) => {
        setNotificaciones(lista);
        setCargando(false);

        // Si es la primera carga, solo indexamos los IDs existentes
        if (!idsInicializadosRef.current) {
          idsInicializadosRef.current = true;
          idsConocidosRef.current = new Set(lista.map((n) => n.id));
          return;
        }

        // Buscar si llegó alguna notificación NUEVA no leída
        let mayorUrgencia: UrgenciaNotificacion | null = null;
        for (const notif of lista) {
          if (!idsConocidosRef.current.has(notif.id)) {
            idsConocidosRef.current.add(notif.id);
            if (!notif.leida) {
              if (notif.urgencia === 'critica') {
                mayorUrgencia = 'critica';
              } else if (notif.urgencia === 'alta' && mayorUrgencia !== 'critica') {
                mayorUrgencia = 'alta';
              } else if (!mayorUrgencia) {
                mayorUrgencia = notif.urgencia;
              }
            }
          }
        }

        if (mayorUrgencia) {
          reproducirAlertaPorUrgencia(mayorUrgencia);
        }
      },
      (err) => {
        console.warn('Error en suscripción de notificaciones:', err);
        setError('No se pudieron cargar las alertas en tiempo real');
        setCargando(false);
      }
    );

    return () => {
      unsub();
    };
  }, [negocioId]);

  const metricas: MetricasNotificaciones = useMemo(() => {
    return calcularMetricasNotificaciones(notificaciones);
  }, [notificaciones]);

  const notificacionesFiltradas: NotificacionOperativa[] = useMemo(() => {
    return filtrarNotificaciones(notificaciones, filtros);
  }, [notificaciones, filtros]);

  const marcarLeidaAction = useCallback(
    async (notificacionId: string) => {
      if (!negocioId || !notificacionId) return;
      try {
        await marcarNotificacionLeida(
          negocioId,
          notificacionId,
          usuarioNegocio?.uid || 'usuario'
        );
        setNotificaciones((prev) =>
          prev.map((n) =>
            n.id === notificacionId
              ? { ...n, leida: true, leidaEn: new Date().toISOString() }
              : n
          )
        );
      } catch (err) {
        console.warn('Error al marcar notificación leída:', err);
      }
    },
    [negocioId, usuarioNegocio]
  );

  const marcarTodasLeidasAction = useCallback(async () => {
    if (!negocioId) return;
    const noLeidasIds = notificaciones.filter((n) => !n.leida).map((n) => n.id);
    if (noLeidasIds.length === 0) return;

    try {
      await marcarTodasNotificacionesLeidas(
        negocioId,
        noLeidasIds,
        usuarioNegocio?.uid || 'usuario'
      );
      setNotificaciones((prev) =>
        prev.map((n) => ({
          ...n,
          leida: true,
          leidaEn: new Date().toISOString(),
        }))
      );
    } catch (err) {
      console.warn('Error al marcar todas las notificaciones como leídas:', err);
    }
  }, [negocioId, notificaciones, usuarioNegocio]);

  const eliminarAction = useCallback(
    async (notificacionId: string) => {
      if (!negocioId || !notificacionId) return;
      try {
        await eliminarNotificacion(negocioId, notificacionId);
        setNotificaciones((prev) => prev.filter((n) => n.id !== notificacionId));
      } catch (err) {
        console.warn('Error al eliminar notificación:', err);
      }
    },
    [negocioId]
  );

  const crearAlertaAction = useCallback(
    async (input: CrearNotificacionInput) => {
      if (!negocioId) throw new Error('No hay negocio activo');
      return await crearNotificacion(negocioId, {
        ...input,
        creadaPor: input.creadaPor || usuarioNegocio?.nombre || 'Administrador',
      });
    },
    [negocioId, usuarioNegocio]
  );

  return {
    notificaciones,
    notificacionesFiltradas,
    metricas,
    noLeidasCount: metricas.noLeidas,
    criticasCount: metricas.criticas,
    cargando,
    error,
    filtros,
    setFiltros,
    sonidoHabilitado,
    toggleSonido,
    probarSonido,
    marcarLeida: marcarLeidaAction,
    marcarTodasLeidas: marcarTodasLeidasAction,
    eliminar: eliminarAction,
    crearAlerta: crearAlertaAction,
  };
}
