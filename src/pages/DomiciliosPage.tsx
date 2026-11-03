import { useState, useEffect, useRef } from 'react';
import { useDomicilios } from '../hooks/useDomicilios';
import { DomicilioCard } from '../components/domicilios/DomicilioCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { createToast } from '../components/ui/Toast';
import { onNuevoDomicilio } from '../services/domiciliosService';
import { useNegocio } from '@/context/NegocioContext';
import { AlertCircle, CheckCircle, CircleDot, Package } from 'lucide-react';

function playNewOrderChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    const notes = [880, 1174.66]; // A5 -> D6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + idx * 0.14;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.24);
    });

    setTimeout(() => {
      void ctx.close().catch(() => undefined);
    }, 600);
  } catch (err) {
    console.warn('No se pudo reproducir sonido de alerta:', err);
  }
}

export const DomiciliosPage: React.FC = () => {
  const { negocioActual } = useNegocio();
  const { activos, entregados, loading, error, updateEstado, marcarEntregado, refresh } =
    useDomicilios();

  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const playedNotifications = useRef<Set<string>>(new Set());

  // Listener para nuevos domicilios (alerta sonora)
  useEffect(() => {
    const unsubscribe = onNuevoDomicilio(negocioActual.id, (domicilio) => {
      // Evitar duplicados: solo reproducir si es realmente nuevo
      if (!playedNotifications.current.has(domicilio.id)) {
        playedNotifications.current.add(domicilio.id);

        // Reproducir sonido sintetizado con Web Audio API (sin depender de archivo externo)
        playNewOrderChime();

        // Toast notificación
        createToast(
          `🔔 Nuevo Pedido: ${domicilio.clienteNombre} - ${domicilio.clienteTelefono}`,
          'success'
        );
      }
    });

    return () => unsubscribe();
  }, [negocioActual.id]);

  const handleEstadoChange = async (domicilioId: string, nuevoEstado: string) => {
    setUpdatingId(domicilioId);
    try {
      if (nuevoEstado === 'entregado') {
        await marcarEntregado(domicilioId);
        createToast('Domicilio entregado; venta registrada automáticamente', 'success');
      } else {
        await updateEstado(domicilioId, nuevoEstado as any);
        createToast(`Estado actualizado: ${nuevoEstado}`, 'success');
      }
      // Refrescar después de actualizar
      setTimeout(() => refresh(), 500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      createToast(`Error: ${errMsg}`, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-6 text-2xl sm:text-3xl font-bold text-white font-display">Domicilios</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <EmptyState
            icon={AlertCircle}
            title="Error cargando domicilios"
            description={error}
            action={{ label: 'Reintentar', onClick: refresh }}
          />
        </div>
      </div>
    );
  }

  const displayItems = tab === 'activos' ? activos : entregados;

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Gestión de Domicilios</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              {tab === 'activos'
                ? `${activos.length} pedido${activos.length !== 1 ? 's' : ''} en preparación o camino`
                : entregados.length === 1
                  ? '1 pedido creado hoy, ya entregado'
                  : `${entregados.length} pedidos creados hoy, ya entregados`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2" role="group" aria-label="Filtrar domicilios">
            <button
              type="button"
              onClick={() => setTab('activos')}
              aria-pressed={tab === 'activos'}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'activos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> En progreso ({activos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('historial')}
              aria-pressed={tab === 'historial'}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'historial'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="inline-flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" aria-hidden="true" /> Creados hoy · entregados ({entregados.length})</span>
            </button>
          </div>
        </div>

        {/* Content en Grid Responsive */}
        {displayItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'activos' ? 'Sin pedidos activos' : 'Sin pedidos creados hoy ya entregados'}
            description={
              tab === 'activos'
                ? 'Todos los pedidos a domicilio han sido despachados'
                : 'No hay pedidos creados hoy que ya estén entregados'
            }
            action={{ label: 'Refrescar', onClick: refresh }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {displayItems.map((domicilio) => (
              <DomicilioCard
                key={domicilio.id}
                domicilio={domicilio}
                onEstadoChange={(nuevoEstado) =>
                  handleEstadoChange(domicilio.id, nuevoEstado)
                }
                isUpdating={updatingId === domicilio.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
