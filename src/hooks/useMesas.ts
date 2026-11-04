import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CuentaMesa,
  EstadoMesa,
  Mesa,
  RondaComanda,
} from '@/types/mesa';
import type { ItemVenta, MetodoPago, TicketVentaData } from '@/types';
import {
  abrirCuentaMesa,
  actualizarMesa,
  agregarRondaACuenta,
  cancelarCuentaMesa,
  cobrarYFinalizarMesa,
  crearMesa,
  eliminarMesa,
  inicializarMesasDefault,
  onCuentaMesaChange,
  onMesasChange,
  registrarPagoParcialMesa,
  solicitarPrecierreMesa,
} from '@/services/mesasService';
import { filtrarMesas } from '@/utils/mesasUtils';
import { createToast } from '@/components/ui/Toast';

export interface UseMesasResult {
  mesas: Mesa[];
  mesasFiltradas: Mesa[];
  loading: boolean;
  error: string | null;
  zonasDisponibles: string[];
  filtroEstado: EstadoMesa | 'todas';
  setFiltroEstado: (estado: EstadoMesa | 'todas') => void;
  filtroZona: string;
  setFiltroZona: (zona: string) => void;
  busqueda: string;
  setBusqueda: (busqueda: string) => void;
  // KPIs
  totalMesas: number;
  totalLibres: number;
  totalOcupadas: number;
  totalPorCobrar: number;
  totalVentasAbiertas: number;
  // Mesa y Cuenta activa en inspección
  mesaSeleccionada: Mesa | null;
  seleccionarMesa: (mesa: Mesa | null) => void;
  cuentaActiva: CuentaMesa | null;
  cargandoCuenta: boolean;
  // Acciones operativas
  abrirMesaAction: (
    mesaId: string,
    params: {
      comensales: number;
      mesero?: string;
      clienteNombre?: string;
      clienteTelefono?: string;
      notas?: string;
    }
  ) => Promise<string>;
  agregarRondaAction: (
    cuentaId: string,
    params: {
      items: ItemVenta[];
      notas?: string;
      enviarAKDS?: boolean;
    }
  ) => Promise<RondaComanda>;
  precerrarMesaAction: (mesaId: string, cuentaId: string) => Promise<void>;
  cobrarMesaAction: (params: {
    mesaId: string;
    cuentaId: string;
    metodoPago: MetodoPago;
    propina?: number;
    montoRecibido?: number;
    fotoTransferenciaPath?: string;
    clienteNombre?: string;
    clienteTelefono?: string;
    negocioNombre?: string;
    negocioSlug?: string;
    negocioDireccion?: string;
    negocioTelefono?: string;
  }) => Promise<TicketVentaData>;
  registrarPagoParcialAction: (params: {
    mesaId: string;
    cuentaId: string;
    monto: number;
    metodoPago: MetodoPago;
    propina?: number;
    clienteNombre?: string;
    notas?: string;
    cajeroNombre?: string;
    montoRecibido?: number;
    negocioNombre?: string;
    negocioSlug?: string;
    negocioDireccion?: string;
    negocioTelefono?: string;
  }) => Promise<{ ticket: TicketVentaData; estaSaldada: boolean; saldoRestante: number }>;
  cancelarCuentaAction: (
    mesaId: string,
    cuentaId: string,
    motivo?: string
  ) => Promise<void>;
  crearMesaAction: (data: {
    numero: number;
    nombre: string;
    capacidad: number;
    zona: string;
  }) => Promise<string>;
  actualizarMesaAction: (
    mesaId: string,
    updates: Partial<Pick<Mesa, 'nombre' | 'capacidad' | 'zona' | 'numero'>>
  ) => Promise<void>;
  eliminarMesaAction: (mesaId: string) => Promise<void>;
  autoInicializarMesas: () => Promise<void>;
}

export function useMesas(negocioId: string): UseMesasResult {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<EstadoMesa | 'todas'>('todas');
  const [filtroZona, setFiltroZona] = useState<string>('todas');
  const [busqueda, setBusqueda] = useState<string>('');

  const [mesaSeleccionada, setMesaSeleccionada] = useState<Mesa | null>(null);
  const [cuentaActiva, setCuentaActiva] = useState<CuentaMesa | null>(null);
  const [cargandoCuenta, setCargandoCuenta] = useState(false);

  // 1. Suscripción en tiempo real a las mesas del negocio
  useEffect(() => {
    if (!negocioId) return;
    setLoading(true);
    setError(null);

    const unsubscribe = onMesasChange(
      negocioId,
      (mesasList) => {
        setMesas(mesasList);
        setLoading(false);

        // Si la mesa seleccionada cambió de estado en tiempo real, actualizarla
        setMesaSeleccionada((prev) => {
          if (!prev) return null;
          const actualizada = mesasList.find((m) => m.id === prev.id);
          return actualizada || null;
        });
      },
      (err) => {
        console.error('Error al escuchar mesas:', err);
        setError('No se pudieron cargar las mesas del salón.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [negocioId]);

  // 2. Suscripción en tiempo real a la cuenta activa de la mesa seleccionada
  useEffect(() => {
    if (!negocioId || !mesaSeleccionada?.cuentaActivaId) {
      setCuentaActiva(null);
      setCargandoCuenta(false);
      return;
    }

    setCargandoCuenta(true);
    const unsubscribe = onCuentaMesaChange(
      negocioId,
      mesaSeleccionada.cuentaActivaId,
      (cuenta) => {
        setCuentaActiva(cuenta);
        setCargandoCuenta(false);
      },
      (err) => {
        console.error('Error al escuchar cuenta activa:', err);
        setCargandoCuenta(false);
      }
    );

    return () => unsubscribe();
  }, [negocioId, mesaSeleccionada?.cuentaActivaId]);

  // 3. Zonas únicas encontradas en las mesas
  const zonasDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const m of mesas) {
      if (m.zona && m.zona.trim()) set.add(m.zona.trim());
    }
    return Array.from(set).sort();
  }, [mesas]);

  // 4. Filtrado reactivo de mesas
  const mesasFiltradas = useMemo(() => {
    return filtrarMesas(mesas, {
      estado: filtroEstado,
      zona: filtroZona,
      busqueda,
    });
  }, [mesas, filtroEstado, filtroZona, busqueda]);

  // 5. KPIs de salón
  const totalMesas = mesas.length;
  const totalLibres = useMemo(() => mesas.filter((m) => m.estado === 'libre').length, [mesas]);
  const totalOcupadas = useMemo(() => mesas.filter((m) => m.estado === 'ocupada').length, [mesas]);
  const totalPorCobrar = useMemo(() => mesas.filter((m) => m.estado === 'por_cobrar').length, [mesas]);
  const totalVentasAbiertas = useMemo(() => {
    return mesas.reduce((sum, m) => sum + (m.estado !== 'libre' && m.totalActual ? m.totalActual : 0), 0);
  }, [mesas]);

  // 6. Acciones
  const abrirMesaAction = useCallback(
    async (
      mesaId: string,
      params: {
        comensales: number;
        mesero?: string;
        clienteNombre?: string;
        clienteTelefono?: string;
        notas?: string;
      }
    ): Promise<string> => {
      try {
        const cuentaId = await abrirCuentaMesa(negocioId, {
          mesaId,
          ...params,
        });
        createToast('Mesa abierta con éxito', 'success');
        return cuentaId;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al abrir mesa';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const agregarRondaAction = useCallback(
    async (
      cuentaId: string,
      params: {
        items: ItemVenta[];
        notas?: string;
        enviarAKDS?: boolean;
      }
    ): Promise<RondaComanda> => {
      try {
        const ronda = await agregarRondaACuenta(negocioId, cuentaId, params);
        createToast(
          params.enviarAKDS
            ? `🔥 ¡Ronda ${ronda.numero} despachada a cocina!`
            : `Ronda ${ronda.numero} guardada en cuenta`,
          'success'
        );
        return ronda;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al agregar ronda';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const precerrarMesaAction = useCallback(
    async (mesaId: string, cuentaId: string): Promise<void> => {
      try {
        await solicitarPrecierreMesa(negocioId, mesaId, cuentaId);
        createToast('Mesa marcada por cobrar', 'info');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al precerrar mesa';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const cobrarMesaAction = useCallback(
    async (params: {
      mesaId: string;
      cuentaId: string;
      metodoPago: MetodoPago;
      propina?: number;
      descuento?: number;
      descuentoMotivo?: string;
      montoRecibido?: number;
      fotoTransferenciaPath?: string;
      clienteNombre?: string;
      clienteTelefono?: string;
      negocioNombre?: string;
      negocioSlug?: string;
      negocioDireccion?: string;
      negocioTelefono?: string;
    }): Promise<TicketVentaData> => {
      try {
        const ticket = await cobrarYFinalizarMesa(negocioId, params);
        createToast('¡Cuenta cobrada y mesa liberada!', 'success');
        setMesaSeleccionada(null);
        setCuentaActiva(null);
        return ticket;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cobrar mesa';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const registrarPagoParcialAction = useCallback(
    async (params: {
      mesaId: string;
      cuentaId: string;
      monto: number;
      metodoPago: MetodoPago;
      propina?: number;
      clienteNombre?: string;
      notas?: string;
      cajeroNombre?: string;
      montoRecibido?: number;
      negocioNombre?: string;
      negocioSlug?: string;
      negocioDireccion?: string;
      negocioTelefono?: string;
    }): Promise<{ ticket: TicketVentaData; estaSaldada: boolean; saldoRestante: number }> => {
      try {
        const res = await registrarPagoParcialMesa(negocioId, params);
        if (res.estaSaldada) {
          createToast('¡Cuenta 100% saldada y mesa liberada!', 'success');
          setMesaSeleccionada(null);
          setCuentaActiva(null);
        } else {
          createToast(`Abono registrado exitosamente. Saldo restante: $ ${res.saldoRestante}`, 'success');
        }
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al registrar abono parcial';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const cancelarCuentaAction = useCallback(
    async (mesaId: string, cuentaId: string, motivo?: string): Promise<void> => {
      try {
        await cancelarCuentaMesa(negocioId, mesaId, cuentaId, motivo);
        createToast('Cuenta cancelada y mesa liberada', 'info');
        setMesaSeleccionada(null);
        setCuentaActiva(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al cancelar cuenta';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const crearMesaAction = useCallback(
    async (data: {
      numero: number;
      nombre: string;
      capacidad: number;
      zona: string;
    }): Promise<string> => {
      try {
        const id = await crearMesa(negocioId, data);
        createToast('Mesa agregada al salón', 'success');
        return id;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al crear mesa';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const actualizarMesaAction = useCallback(
    async (
      mesaId: string,
      updates: Partial<Pick<Mesa, 'nombre' | 'capacidad' | 'zona' | 'numero'>>
    ): Promise<void> => {
      try {
        await actualizarMesa(negocioId, mesaId, updates);
        createToast('Mesa actualizada', 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar mesa';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const eliminarMesaAction = useCallback(
    async (mesaId: string): Promise<void> => {
      try {
        await eliminarMesa(negocioId, mesaId);
        createToast('Mesa eliminada del salón', 'info');
        if (mesaSeleccionada?.id === mesaId) {
          setMesaSeleccionada(null);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al eliminar mesa';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId, mesaSeleccionada?.id]
  );

  const autoInicializarMesas = useCallback(async (): Promise<void> => {
    try {
      await inicializarMesasDefault(negocioId);
      createToast('Mesas iniciales configuradas', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al inicializar mesas';
      createToast(msg, 'error');
      throw err;
    }
  }, [negocioId]);

  return {
    mesas,
    mesasFiltradas,
    loading,
    error,
    zonasDisponibles,
    filtroEstado,
    setFiltroEstado,
    filtroZona,
    setFiltroZona,
    busqueda,
    setBusqueda,
    totalMesas,
    totalLibres,
    totalOcupadas,
    totalPorCobrar,
    totalVentasAbiertas,
    mesaSeleccionada,
    seleccionarMesa: setMesaSeleccionada,
    cuentaActiva,
    cargandoCuenta,
    abrirMesaAction,
    agregarRondaAction,
    precerrarMesaAction,
    cobrarMesaAction,
    registrarPagoParcialAction,
    cancelarCuentaAction,
    crearMesaAction,
    actualizarMesaAction,
    eliminarMesaAction,
    autoInicializarMesas,
  };
}
