import { useEffect, useRef, useState, useCallback } from 'react';
import type { Domicilio, EstadoDomicilio } from '@/types';
import {
  onDomiciliosActivosChange,
  onNuevoDomicilio,
  updateDomicilioEstado,
  finalizarDomicilio,
} from '@/services/domiciliosService';
import { useNegocio } from '@/context/NegocioContext';
import {
  CanalFiltro,
  filtrarComandas,
  getKitchenUrgency,
  playKitchenComandaBell,
} from '@/utils/kitchenKds';
import { createToast } from '@/components/ui/Toast';

const STORAGE_SOUND_KEY = 'laparada_kds_sound';

export interface UseCocinaKdsResult {
  activos: Domicilio[];
  pendientes: Domicilio[];
  enPreparacion: Domicilio[];
  listas: Domicilio[];
  loading: boolean;
  error: string | null;
  ahora: number;
  canalFiltro: CanalFiltro;
  setCanalFiltro: (canal: CanalFiltro) => void;
  busqueda: string;
  setBusqueda: (busqueda: string) => void;
  sonidoHabilitado: boolean;
  toggleSonido: () => void;
  probarSonido: () => void;
  itemsPreparados: Record<string, boolean>;
  toggleItemPreparado: (comandaId: string, itemIdx: number) => void;
  avanzarEstadoComanda: (comanda: Domicilio) => Promise<void>;
  devolverACocina: (comandaId: string) => Promise<void>;
  marcarEntregada: (comandaId: string) => Promise<void>;
  totalPendientes: number;
  totalEnPreparacion: number;
  totalListos: number;
  tiempoMasAntiguoMin: number;
  actionLoadingId: string | null;
}

export function useCocinaKDS(): UseCocinaKdsResult {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const [activos, setActivos] = useState<Domicilio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState<number>(Date.now());
  const [canalFiltro, setCanalFiltro] = useState<CanalFiltro>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Sonido de comanda (persistido en localStorage)
  const [sonidoHabilitado, setSonidoHabilitado] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SOUND_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Ítems marcados como preparados por comanda (formato: `${comandaId}_${itemIdx}`)
  const [itemsPreparados, setItemsPreparados] = useState<Record<string, boolean>>({});

  const playedIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Timer reactivo para actualizar tiempos transcurridos en tiempo real (cada 1s)
  useEffect(() => {
    const timer = setInterval(() => {
      setAhora(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Alternar sonido de comandas
  const toggleSonido = useCallback(() => {
    setSonidoHabilitado((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_SOUND_KEY, String(next));
      } catch {
        // Ignorar si el almacenamiento local está restringido
      }
      createToast(
        next ? '🔔 Sonido de comandas activado' : '🔕 Sonido de comandas silenciado',
        'info',
        2500
      );
      if (next) {
        playKitchenComandaBell();
      }
      return next;
    });
  }, []);

  // Probar timbre
  const probarSonido = useCallback(() => {
    const sonado = playKitchenComandaBell();
    if (sonado) {
      createToast('🔔 Campana de cocina probada con éxito', 'success', 2000);
    } else {
      createToast('Toca la pantalla para autorizar audio del navegador', 'info', 3000);
    }
  }, []);

  // Tachar / destachar ítem preparado
  const toggleItemPreparado = useCallback((comandaId: string, itemIdx: number) => {
    const key = `${comandaId}_${itemIdx}`;
    setItemsPreparados((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  // Suscripción en tiempo real a domicilios activos del negocio
  useEffect(() => {
    setLoading(true);
    setError(null);
    initialLoadRef.current = true;

    const unsubscribe = onDomiciliosActivosChange(
      tenantId,
      (comandas) => {
        setActivos(comandas);
        setLoading(false);

        // La primera carga registra los IDs ya existentes para no disparar campana por pedidos antiguos
        if (initialLoadRef.current) {
          comandas.forEach((c) => playedIdsRef.current.add(c.id));
          initialLoadRef.current = false;
        }
      },
      (err) => {
        console.error('Error al escuchar comandas de cocina:', err);
        setError('Error al conectar con la comanda de cocina.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  // Listener específico para alertar con campana cuando entra una NUEVA comanda
  useEffect(() => {
    const unsubscribe = onNuevoDomicilio(tenantId, (nuevo) => {
      if (!playedIdsRef.current.has(nuevo.id)) {
        playedIdsRef.current.add(nuevo.id);
        if (sonidoHabilitado) {
          playKitchenComandaBell();
        }
        createToast(
          `🔥 Nueva comanda: ${nuevo.clienteNombre} (${nuevo.items.length} ${nuevo.items.length === 1 ? 'ítem' : 'ítems'})`,
          'info',
          5000
        );
      }
    });

    return () => unsubscribe();
  }, [tenantId, sonidoHabilitado]);

  // Transición a un toque: pendiente ➔ en_preparacion ➔ en_camino (listo para entrega)
  const avanzarEstadoComanda = useCallback(
    async (comanda: Domicilio) => {
      const comandaId = comanda.id;
      let nuevoEstado: EstadoDomicilio;

      if (comanda.estado === 'pendiente') {
        nuevoEstado = 'en_preparacion';
      } else if (comanda.estado === 'en_preparacion') {
        nuevoEstado = 'en_camino';
      } else {
        return;
      }

      setActionLoadingId(comandaId);
      try {
        await updateDomicilioEstado(comandaId, nuevoEstado, tenantId);
        createToast(
          nuevoEstado === 'en_preparacion'
            ? '🔥 Comanda en preparación'
            : '✅ ¡Comanda lista para entrega!',
          'success',
          2500
        );
      } catch (err) {
        console.error('Error avanzando estado de comanda:', err);
        createToast('No se pudo actualizar el estado de la comanda', 'error');
      } finally {
        setActionLoadingId(null);
      }
    },
    [tenantId]
  );

  // Devolver de listo/en camino a preparación si hubo alguna corrección
  const devolverACocina = useCallback(
    async (comandaId: string) => {
      setActionLoadingId(comandaId);
      try {
        await updateDomicilioEstado(comandaId, 'en_preparacion', tenantId);
        createToast('Comanda devuelta a preparación', 'info', 2500);
      } catch (err) {
        console.error('Error devolviendo comanda a cocina:', err);
        createToast('No se pudo devolver la comanda', 'error');
      } finally {
        setActionLoadingId(null);
      }
    },
    [tenantId]
  );

  // Marcar entregada directamente desde KDS (para mostrador o entrega inmediata)
  const marcarEntregada = useCallback(
    async (comandaId: string) => {
      setActionLoadingId(comandaId);
      try {
        await finalizarDomicilio(comandaId, tenantId);
        createToast('🎉 Comanda entregada y venta registrada', 'success', 3000);
      } catch (err) {
        console.error('Error entregando comanda desde cocina:', err);
        createToast('No se pudo registrar la entrega', 'error');
      } finally {
        setActionLoadingId(null);
      }
    },
    [tenantId]
  );

  // Filtrado y agrupación
  const comandasFiltradas = filtrarComandas(activos, canalFiltro, busqueda);

  const pendientes = comandasFiltradas.filter((c) => c.estado === 'pendiente');
  const enPreparacion = comandasFiltradas.filter((c) => c.estado === 'en_preparacion');
  const listas = comandasFiltradas.filter((c) => c.estado === 'en_camino');

  // Cálculos de KPIs del turno
  const totalPendientes = activos.filter((c) => c.estado === 'pendiente').length;
  const totalEnPreparacion = activos.filter((c) => c.estado === 'en_preparacion').length;
  const totalListos = activos.filter((c) => c.estado === 'en_camino').length;

  const pedidosPendientesReales = activos.filter((c) => c.estado === 'pendiente');
  const tiempoMasAntiguoMin = pedidosPendientesReales.reduce((max, c) => {
    const urg = getKitchenUrgency(c.creadoEn, ahora);
    return Math.max(max, urg.minutos);
  }, 0);

  return {
    activos,
    pendientes,
    enPreparacion,
    listas,
    loading,
    error,
    ahora,
    canalFiltro,
    setCanalFiltro,
    busqueda,
    setBusqueda,
    sonidoHabilitado,
    toggleSonido,
    probarSonido,
    itemsPreparados,
    toggleItemPreparado,
    avanzarEstadoComanda,
    devolverACocina,
    marcarEntregada,
    totalPendientes,
    totalEnPreparacion,
    totalListos,
    tiempoMasAntiguoMin,
    actionLoadingId,
  };
}
