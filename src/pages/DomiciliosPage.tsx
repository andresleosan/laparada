import React, { useState, useEffect, useRef } from 'react';
import { useJornada } from '../context/JornadaContext';
import { useDomicilios } from '../hooks/useDomicilios';
import { DomicilioCard } from '../components/domicilios/DomicilioCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { createToast } from '../components/ui/Toast';
import { onNuevoDomicilio } from '../services/domiciliosService';
import { Package, AlertCircle } from 'lucide-react';

export const DomiciliosPage: React.FC = () => {
  const { jornada } = useJornada();
  const { activos, entregados, loading, error, updateEstado, marcarEntregado, refresh } =
    useDomicilios(jornada);

  const [tab, setTab] = useState<'activos' | 'historial'>('activos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playedNotifications = useRef<Set<string>>(new Set());

  // Listener para nuevos domicilios (alerta sonora)
  useEffect(() => {
    const unsubscribe = onNuevoDomicilio(jornada, (domicilio) => {
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
        createToast({
          title: '🔔 Nuevo Pedido',
          description: `${domicilio.cliente} - ${domicilio.telefono}`,
          type: 'success',
        });
      }
    });

    return () => unsubscribe();
  }, [jornada]);

  const handleEstadoChange = async (domicilioId: string, nuevoEstado: string) => {
    setUpdatingId(domicilioId);
    try {
      if (nuevoEstado === 'entregado') {
        await marcarEntregado(domicilioId);
        createToast({
          title: '✅ Domicilio Entregado',
          description: 'Venta registrada automáticamente',
          type: 'success',
        });
      } else {
        await updateEstado(domicilioId, nuevoEstado as any);
        createToast({
          title: '✅ Estado Actualizado',
          description: `Domicilio ahora en: ${nuevoEstado}`,
          type: 'success',
        });
      }
      // Refrescar después de actualizar
      setTimeout(() => refresh(), 500);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Error desconocido';
      createToast({
        title: '❌ Error',
        description: errMsg,
        type: 'error',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">Domicilios</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-4xl px-4">
          <EmptyState
            icon={AlertCircle}
            title="Error cargando domicilios"
            description={error}
            action={<Button onClick={refresh}>Reintentar</Button>}
          />
        </div>
      </div>
    );
  }

  const displayItems = tab === 'activos' ? activos : entregados;

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      {/* Audio element para alerta */}
      <audio ref={audioRef} src="/sounds/new-order.mp3" preload="auto" />

      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Domicilios</h1>
          <p className="mt-1 text-neutral-400">
            {tab === 'activos'
              ? `${activos.length} pedido${activos.length !== 1 ? 's' : ''} en progreso`
              : `${entregados.length} pedido${entregados.length !== 1 ? 's' : ''} entregado${entregados.length !== 1 ? 's' : ''} hoy`}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-neutral-700">
          <button
            onClick={() => setTab('activos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'activos'
                ? 'border-b-2 border-gold text-gold'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            🔴 Activos
          </button>
          <button
            onClick={() => setTab('historial')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'historial'
                ? 'border-b-2 border-gold text-gold'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            ✅ Historial
          </button>
        </div>

        {/* Content */}
        {displayItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title={tab === 'activos' ? 'Sin pedidos activos' : 'Sin historial'}
            description={
              tab === 'activos'
                ? 'Todos los domicilios han sido entregados'
                : 'No hay pedidos entregados hoy'
            }
            action={<Button onClick={refresh}>Refrescar</Button>}
          />
        ) : (
          <div className="space-y-2">
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
