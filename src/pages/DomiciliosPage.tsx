import { useState, useEffect, useRef } from 'react';
import { useJornada } from '../context/JornadaContext';
import { useDomicilios } from '../hooks/useDomicilios';
import { DomicilioCard } from '../components/domicilios/DomicilioCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { createToast } from '../components/ui/Toast';
import { onNuevoDomicilio } from '../services/domiciliosService';
import { Package, AlertCircle } from 'lucide-react';

export const DomiciliosPage: React.FC = () => {
  const { jornadaActual } = useJornada();
  const { activos, entregados, loading, error, updateEstado, marcarEntregado, refresh } =
    useDomicilios(jornadaActual);

  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playedNotifications = useRef<Set<string>>(new Set());

  // Listener para nuevos domicilios (alerta sonora)
  useEffect(() => {
    const unsubscribe = onNuevoDomicilio(jornadaActual, (domicilio) => {
      // Evitar duplicados: solo reproducir si es realmente nuevo
      if (!playedNotifications.current.has(domicilio.id)) {
        playedNotifications.current.add(domicilio.id);

        // Reproducir sonido
        if (audioRef.current) {
          audioRef.current.play().catch((err) => {
            console.warn('No se pudo reproducir sonido de alerta:', err);
          });
        }

        // Toast notificación
        createToast(
          `🔔 Nuevo Pedido: ${domicilio.clienteNombre} - ${domicilio.clienteTelefono}`,
          'success'
        );
      }
    });

    return () => unsubscribe();
  }, [jornadaActual]);

  const handleEstadoChange = async (domicilioId: string, nuevoEstado: string) => {
    setUpdatingId(domicilioId);
    try {
      if (nuevoEstado === 'entregado') {
        await marcarEntregado(domicilioId);
        createToast('✅ Domicilio Entregado - Venta registrada automáticamente', 'success');
      } else {
        await updateEstado(domicilioId, nuevoEstado as any);
        createToast(`✅ Estado Actualizado - Domicilio ahora en: ${nuevoEstado}`, 'success');
      }
      // Refrescar después de actualizar
      setTimeout(() => refresh(), 500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      createToast(`❌ Error - ${errMsg}`, 'error');
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
      {/* Audio element para alerta */}
      <audio ref={audioRef} src="/sounds/new-order.mp3" preload="auto" />

      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Gestión de Domicilios</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              {tab === 'activos'
                ? `${activos.length} pedido${activos.length !== 1 ? 's' : ''} en preparación o camino`
                : `${entregados.length} pedido${entregados.length !== 1 ? 's' : ''} entregado${entregados.length !== 1 ? 's' : ''} hoy`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('activos')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'activos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🔴 En Progreso ({activos.length})
            </button>
            <button
              onClick={() => setTab('historial')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                tab === 'historial'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              ✅ Entregados ({entregados.length})
            </button>
          </div>
        </div>

        {/* Content en Grid Responsive */}
        {displayItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'activos' ? 'Sin pedidos activos' : 'Sin historial de hoy'}
            description={
              tab === 'activos'
                ? 'Todos los pedidos a domicilio han sido despachados'
                : 'No hay pedidos entregados en esta jornada'
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
