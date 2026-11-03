import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bike,
  CheckCircle2,
  Clock,
  Filter,
  Package,
  RefreshCw,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { createToast } from '@/components/ui/Toast';
import {
  getDomiciliosEntregados,
  onDomiciliosActivosChange,
  onNuevoDomicilio,
  tomarDomicilioParaEntrega,
  finalizarDomicilio,
} from '@/services/domiciliosService';
import { uploadFotoTransferencia } from '@/services/ventasService';
import { LiquidacionResumenCard } from '@/components/repartidor/LiquidacionResumenCard';
import { RepartidorOrderCard } from '@/components/repartidor/RepartidorOrderCard';
import { ModalEntregaDomicilio } from '@/components/repartidor/ModalEntregaDomicilio';
import { calcularLiquidacionRepartidor } from '@/utils/deliverySettlement';
import type { Domicilio, MetodoPago } from '@/types';

function playDeliveryAlertBeep(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const notes = [659.25, 880, 1046.5]; // E5 -> A5 -> C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.12;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });

    setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 700);
  } catch (err) {
    console.warn('No se pudo reproducir sonido de alerta de reparto:', err);
  }
}

export function RepartidorPage() {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const [activos, setActivos] = useState<Domicilio[]>([]);
  const [entregados, setEntregados] = useState<Domicilio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [filtroAsignacion, setFiltroAsignacion] = useState<'mis_entregas' | 'todas'>('mis_entregas');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal de entrega
  const [domicilioParaEntregar, setDomicilioParaEntregar] = useState<Domicilio | null>(null);
  const [modalEntregaOpen, setModalEntregaOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  const playedIdsRef = useRef<Set<string>>(new Set());

  // Cargar pedidos entregados hoy
  const cargarHistorial = async () => {
    try {
      const entregadosHoy = await getDomiciliosEntregados(negocioActual.id);
      setEntregados(entregadosHoy);
    } catch (err) {
      console.error('Error cargando historial de entregas:', err);
    }
  };

  // Listener en tiempo real de activos
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onDomiciliosActivosChange(
      negocioActual.id,
      (lista) => {
        setActivos(lista);
        setLoading(false);
      },
      (error) => {
        console.error('Error en listener de domicilios activos:', error);
        setLoading(false);
      }
    );

    void cargarHistorial();

    return () => unsubscribe();
  }, [negocioActual.id]);

  // Alerta sonora ante nuevos domicilios
  useEffect(() => {
    const unsub = onNuevoDomicilio(negocioActual.id, (domicilio) => {
      if (!playedIdsRef.current.has(domicilio.id)) {
        playedIdsRef.current.add(domicilio.id);
        playDeliveryAlertBeep();
        createToast(
          `🛵 Nueva orden disponible: ${domicilio.clienteNombre} (${domicilio.barrio || 'Cúcuta'})`,
          'info',
          4000
        );
      }
    });

    return () => unsub();
  }, [negocioActual.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await cargarHistorial();
      createToast('Lista de pedidos actualizada', 'success', 2000);
    } finally {
      setRefreshing(false);
    }
  };

  // Acción: Tomar pedido y salir a ruta
  const handleTomarRuta = async (domicilio: Domicilio) => {
    setActionLoadingId(domicilio.id);
    try {
      const repartidorId = usuarioNegocio?.uid || 'domiciliario-local';
      const repartidorNombre = usuarioNegocio?.nombre || 'Repartidor';
      await tomarDomicilioParaEntrega(
        domicilio.id,
        negocioActual.id,
        repartidorId,
        repartidorNombre
      );
      createToast(`¡Ruta iniciada para ${domicilio.clienteNombre}! Buen viaje 🛵💨`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error iniciando ruta';
      createToast(msg, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Acción: Abrir modal de finalización
  const handleIniciarEntrega = (domicilio: Domicilio) => {
    setDomicilioParaEntregar(domicilio);
    setModalEntregaOpen(true);
  };

  // Confirmar entrega desde el modal
  const handleConfirmarEntrega = async (datos: {
    metodoPago: MetodoPago;
    notasEntrega?: string;
    fotoTransferencia?: File | null;
  }) => {
    if (!domicilioParaEntregar) return;
    setFinalizando(true);

    try {
      let fotoPath: string | undefined;
      if (datos.fotoTransferencia) {
        fotoPath = await uploadFotoTransferencia(datos.fotoTransferencia, negocioActual.id);
      }

      const repartidorId = usuarioNegocio?.uid || 'domiciliario-local';
      const repartidorNombre = usuarioNegocio?.nombre || 'Repartidor';

      await finalizarDomicilio(domicilioParaEntregar.id, negocioActual.id, {
        metodoPago: datos.metodoPago,
        notasEntrega: datos.notasEntrega,
        domiciliarioId: repartidorId,
        domiciliarioNombre: repartidorNombre,
        fotoTransferenciaPath: fotoPath,
      });

      createToast('¡Entrega completada y venta registrada exitosamente! 🎉', 'success');
      setModalEntregaOpen(false);
      setDomicilioParaEntregar(null);
      await cargarHistorial();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error completando entrega';
      createToast(msg, 'error');
    } finally {
      setFinalizando(false);
    }
  };

  // Liquidación del turno
  const currentUid = usuarioNegocio?.uid;
  const liquidacion = useMemo(() => {
    return calcularLiquidacionRepartidor(
      entregados,
      usuarioNegocio?.rol === 'domiciliario' ? currentUid : undefined
    );
  }, [entregados, usuarioNegocio?.rol, currentUid]);

  // Filtrado de activos
  const pedidosVisibles = useMemo(() => {
    if (tab === 'historial') {
      if (usuarioNegocio?.rol === 'domiciliario' && currentUid) {
        return entregados.filter((d) => !d.domiciliarioId || d.domiciliarioId === currentUid);
      }
      return entregados;
    }

    if (filtroAsignacion === 'mis_entregas' && currentUid) {
      const asignados = activos.filter((d) => d.domiciliarioId === currentUid);
      // Si no tiene ninguno asignado, mostrar también los no asignados para que pueda tomarlos
      if (asignados.length === 0) return activos;
      return asignados;
    }

    return activos;
  }, [tab, filtroAsignacion, activos, entregados, currentUid, usuarioNegocio?.rol]);

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-4 px-3 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Bike className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black text-white">
                Portal de Repartidor
              </h1>
              <p className="text-xs text-neutral-400">
                {usuarioNegocio?.nombre
                  ? `Conectado como ${usuarioNegocio.nombre}`
                  : negocioActual.nombre}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Actualizar entregas"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* Tarjeta de Liquidación de la Jornada */}
        <LiquidacionResumenCard
          liquidacion={liquidacion}
          repartidorNombre={usuarioNegocio?.nombre}
        />

        {/* Selector de Pestañas: En Curso vs Historial */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex rounded-xl bg-neutral-900 p-1 border border-neutral-800 flex-1">
            <button
              type="button"
              onClick={() => setTab('activos')}
              aria-pressed={tab === 'activos'}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'activos'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>En Curso</span>
              {activos.length > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  tab === 'activos' ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {activos.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('historial')}
              aria-pressed={tab === 'historial'}
              className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'historial'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Entregadas Hoy</span>
              {entregados.length > 0 && (
                <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  tab === 'historial' ? 'bg-neutral-950 text-amber-400' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {entregados.length}
                </span>
              )}
            </button>
          </div>

          {/* Subfiltro de asignación en pestañas activas */}
          {tab === 'activos' && (
            <button
              type="button"
              onClick={() => setFiltroAsignacion((prev) => (prev === 'mis_entregas' ? 'todas' : 'mis_entregas'))}
              aria-label={`Filtrar pedidos: ${filtroAsignacion === 'mis_entregas' ? 'Mis entregas' : 'Todas'}`}
              className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${
                filtroAsignacion === 'mis_entregas'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {filtroAsignacion === 'mis_entregas' ? 'Mis pedidos' : 'Todos'}
              </span>
            </button>
          )}
        </div>

        {/* Lista de Pedidos o Estados de Carga/Vacío */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : pedidosVisibles.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'activos' ? 'Sin pedidos pendientes de entrega' : 'Aún no hay entregas finalizadas hoy'}
            description={
              tab === 'activos'
                ? 'Todos los domicilios están al día o en camino. Cuando cocina emita un nuevo pedido, sonará una alerta.'
                : 'Las carreras que vayas entregando y cobrando aparecerán aquí con su comprobante de pago.'
            }
            action={{
              label: 'Actualizar lista',
              onClick: handleRefresh,
            }}
          />
        ) : (
          <div className="space-y-3.5">
            {pedidosVisibles.map((dom) => (
              <RepartidorOrderCard
                key={dom.id}
                domicilio={dom}
                negocioNombre={negocioActual.nombre}
                onTomarRuta={handleTomarRuta}
                onIniciarEntrega={handleIniciarEntrega}
                isActionLoading={actionLoadingId === dom.id}
              />
            ))}
          </div>
        )}

        {/* Modal de confirmación de entrega y cobro */}
        <ModalEntregaDomicilio
          isOpen={modalEntregaOpen}
          domicilio={domicilioParaEntregar}
          onClose={() => {
            if (!finalizando) {
              setModalEntregaOpen(false);
              setDomicilioParaEntregar(null);
            }
          }}
          onConfirmar={handleConfirmarEntrega}
          loading={finalizando}
        />
      </div>
    </div>
  );
}

