import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useNegocio } from '@/context/NegocioContext';
import { requireTenantId } from '@/security/tenantScope';
import {
  onBitacoraAuditoriaChange,
  registrarEventoAuditoria,
} from '@/services/auditoriaService';
import {
  getTodosMovimientosInventario,
  getTodosInsumos,
} from '@/services/inventarioService';
import { getUltimosCierres } from '@/services/cierreCajaService';
import {
  getTurnosPersonal,
  getValesPersonal,
} from '@/services/personalService';
import {
  sintetizarEventosAuditoria,
  filtrarEventosAuditoria,
  calcularMetricasAuditoria,
  extraerResponsablesUnicos,
  descargarCsvAuditoriaForense,
  generarResumenWhatsAppAuditoria,
} from '@/utils/auditoriaUtils';
import type {
  EventoAuditoria,
  FiltrosAuditoria,
  MetricasAuditoria,
  RegistrarEventoAuditoriaInput,
  Venta,
  EntradaInventario,
  Insumo,
  CierreCaja,
  TurnoPersonal,
  ValePersonal,
} from '@/types';

const FILTROS_INICIALES: FiltrosAuditoria = {
  busqueda: '',
  categoria: 'todas',
  severidad: 'todas',
  responsable: 'todos',
  rangoFecha: '30dias',
  soloImpactoFinanciero: false,
};

export interface UseAuditoriaResult {
  todosEventos: EventoAuditoria[];
  eventosFiltrados: EventoAuditoria[];
  metricas: MetricasAuditoria;
  responsablesUnicos: string[];
  filtros: FiltrosAuditoria;
  loading: boolean;
  error: string | null;
  actualizarFiltro: <K extends keyof FiltrosAuditoria>(
    campo: K,
    valor: FiltrosAuditoria[K]
  ) => void;
  limpiarFiltros: () => void;
  registrarIncidenteManual: (
    input: Omit<RegistrarEventoAuditoriaInput, 'negocioId'>
  ) => Promise<string>;
  exportarCSV: () => void;
  compartirWhatsApp: () => void;
  refresh: () => Promise<void>;
}

export function useAuditoria(): UseAuditoriaResult {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const tenantId = negocioActual.id;

  const [bitacoraInmutable, setBitacoraInmutable] = useState<EventoAuditoria[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [movimientosInventario, setMovimientosInventario] = useState<EntradaInventario[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cierresCaja, setCierresCaja] = useState<CierreCaja[]>([]);
  const [turnosPersonal, setTurnosPersonal] = useState<TurnoPersonal[]>([]);
  const [valesPersonal, setValesPersonal] = useState<ValePersonal[]>([]);

  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_INICIALES);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const cargarFuentesHistoricas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const validTenant = requireTenantId(tenantId);

      const ventasQ = query(
        collection(db, 'ventas'),
        where('negocioId', '==', validTenant),
        orderBy('fecha', 'desc'),
        limit(250)
      );

      const [
        ventasSnap,
        movimientosRes,
        insumosRes,
        cierresRes,
        turnosRes,
        valesRes,
      ] = await Promise.all([
        getDocs(ventasQ),
        getTodosMovimientosInventario(validTenant, 200).catch(() => []),
        getTodosInsumos(validTenant).catch(() => []),
        getUltimosCierres(validTenant, 45).catch(() => []),
        getTurnosPersonal(validTenant, 100).catch(() => []),
        getValesPersonal(validTenant, 100).catch(() => []),
      ]);

      const ventasData = ventasSnap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as Venta
      );

      setVentas(ventasData);
      setMovimientosInventario(movimientosRes);
      setInsumos(insumosRes);
      setCierresCaja(cierresRes);
      setTurnosPersonal(turnosRes);
      setValesPersonal(valesRes);
    } catch (err) {
      console.error('Error cargando fuentes forenses de auditoría:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos cargar la bitácora forense del negocio.'
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    let active = true;
    void cargarFuentesHistoricas();

    const unsubscribe = onBitacoraAuditoriaChange(
      tenantId,
      (eventos) => {
        if (!active) return;
        setBitacoraInmutable(eventos);
      },
      (err) => {
        console.warn('Listener de bitacora_auditoria reportó aviso:', err);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [tenantId, cargarFuentesHistoricas]);

  const todosEventos = useMemo(
    () =>
      sintetizarEventosAuditoria({
        negocioId: tenantId,
        bitacoraInmutable,
        ventas,
        movimientosInventario,
        insumos,
        cierresCaja,
        turnosPersonal,
        valesPersonal,
      }),
    [
      tenantId,
      bitacoraInmutable,
      ventas,
      movimientosInventario,
      insumos,
      cierresCaja,
      turnosPersonal,
      valesPersonal,
    ]
  );

  const eventosFiltrados = useMemo(
    () => filtrarEventosAuditoria(todosEventos, filtros),
    [todosEventos, filtros]
  );

  const metricas = useMemo(
    () => calcularMetricasAuditoria(eventosFiltrados),
    [eventosFiltrados]
  );

  const responsablesUnicos = useMemo(
    () => extraerResponsablesUnicos(todosEventos),
    [todosEventos]
  );

  const actualizarFiltro = useCallback(
    <K extends keyof FiltrosAuditoria>(campo: K, valor: FiltrosAuditoria[K]) => {
      setFiltros((prev) => ({
        ...prev,
        [campo]: valor,
      }));
    },
    []
  );

  const limpiarFiltros = useCallback(() => {
    setFiltros(FILTROS_INICIALES);
  }, []);

  const registrarIncidenteManual = useCallback(
    async (input: Omit<RegistrarEventoAuditoriaInput, 'negocioId'>): Promise<string> => {
      const responsableDefault =
        input.responsableNombre ||
        usuarioNegocio?.nombre ||
        usuarioNegocio?.email ||
        'Administrador';

      const id = await registrarEventoAuditoria({
        ...input,
        negocioId: tenantId,
        responsableNombre: responsableDefault,
        responsableRol: input.responsableRol || usuarioNegocio?.rol || 'admin',
      });
      return id;
    },
    [tenantId, usuarioNegocio]
  );

  const exportarCSV = useCallback(() => {
    descargarCsvAuditoriaForense(eventosFiltrados, tenantId);
  }, [eventosFiltrados, tenantId]);

  const compartirWhatsApp = useCallback(() => {
    const rangoMap: Record<FiltrosAuditoria['rangoFecha'], string> = {
      hoy: 'Turno de Hoy',
      '7dias': 'Últimos 7 días',
      '30dias': 'Últimos 30 días',
      todo: 'Historial Completo',
    };
    const texto = generarResumenWhatsAppAuditoria(
      metricas,
      negocioActual.nombre || 'La Parada',
      rangoMap[filtros.rangoFecha]
    );
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [metricas, negocioActual.nombre, filtros.rangoFecha]);

  return {
    todosEventos,
    eventosFiltrados,
    metricas,
    responsablesUnicos,
    filtros,
    loading,
    error,
    actualizarFiltro,
    limpiarFiltros,
    registrarIncidenteManual,
    exportarCSV,
    compartirWhatsApp,
    refresh: cargarFuentesHistoricas,
  };
}
