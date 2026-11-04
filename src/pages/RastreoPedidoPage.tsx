// src/pages/RastreoPedidoPage.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Clock,
  ChefHat,
  Bike,
  CheckCircle2,
  Store,
  MessageCircle,
  ShoppingBag,
  ArrowLeft,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCOP } from '@/utils/formatCOP';
import {
  ETAPAS_ORDEN,
  calcularEstimacionTiempo,
  getIndiceEtapa,
  buildWhatsAppHelpUrl,
} from '@/services/orderTrackingService';
import { useRastreoPedido } from '@/hooks/useRastreoPedido';
import type { TrackingStage } from '@/types/tracking';

export function RastreoPedidoPage() {
  const { token, id } = useParams<{ token?: string; id?: string }>();
  const activeToken = (token || id || '').trim();

  const { pedido, cargando, error } = useRastreoPedido(activeToken);
  const [ahora, setAhora] = useState(() => Date.now());

  // Actualiza el reloj cada 30 segundos para recalcular minutos restantes
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const indiceActual = pedido ? getIndiceEtapa(pedido.estado) : 0;
  const estimacion = pedido
    ? calcularEstimacionTiempo(pedido.creadoEn, pedido.tiempoEstimadoMin, ahora)
    : null;

  const urlTienda = pedido?.negocio?.slug ? `/tienda/${pedido.negocio.slug}` : '/';
  const nombreNegocio = pedido?.negocio?.nombre || 'La Parada';
  const whatsappUrl = pedido
    ? buildWhatsAppHelpUrl(pedido.negocio.telefono, nombreNegocio, pedido.codigo)
    : '#';

  const getStageIcon = (stage: TrackingStage, isCompleted: boolean, isCurrent: boolean) => {
    const iconClass = isCompleted || isCurrent ? 'text-neutral-950' : 'text-neutral-500';
    switch (stage) {
      case 'pendiente':
        return <Clock className={`h-6 w-6 ${iconClass}`} aria-hidden="true" />;
      case 'en_preparacion':
        return <ChefHat className={`h-6 w-6 ${iconClass}`} aria-hidden="true" />;
      case 'en_camino':
        return <Bike className={`h-6 w-6 ${iconClass}`} aria-hidden="true" />;
      case 'entregado':
        return <CheckCircle2 className={`h-6 w-6 ${iconClass}`} aria-hidden="true" />;
    }
  };

  return (
    <div className="min-h-screen bg-restaurant-theme text-neutral-100 flex flex-col justify-between selection:bg-amber-500 selection:text-neutral-950">
      {/* Top Bar Nav */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 sm:px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            to={urlTienda}
            className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>Volver al Menú</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono tracking-wider uppercase text-neutral-400">
              Rastreo en vivo
            </span>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {cargando ? (
          <div className="space-y-6 animate-pulse" role="status" aria-label="Cargando estado del pedido">
            <div className="h-28 bg-neutral-900 border border-neutral-800 rounded-3xl" />
            <div className="h-44 bg-neutral-900 border border-neutral-800 rounded-3xl" />
            <div className="h-56 bg-neutral-900 border border-neutral-800 rounded-3xl" />
            <span className="sr-only">Cargando datos del pedido...</span>
          </div>
        ) : error || !pedido ? (
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-8 shadow-2xl text-center space-y-4 my-8">
            <EmptyState
              icon={AlertCircle}
              title="Pedido no encontrado"
              description="No encontramos un pedido activo asociado a este enlace. Verifica el link enviado por WhatsApp o regresa a la tienda."
              action={{
                label: 'Ir al Menú Principal',
                onClick: () => {
                  window.location.href = '/';
                },
              }}
            />
            <p className="text-[11px] text-neutral-500">
              Si acabas de realizar tu pedido por WhatsApp, espera unos segundos mientras cocina confirma la comanda.
            </p>
          </div>
        ) : (
          <>
            {/* Header del Negocio y Código de Pedido */}
            <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-amber-400" />
                    <h2 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                      {nombreNegocio}
                    </h2>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-tight">
                    Pedido #{pedido.codigo}
                  </h1>
                  <p className="text-xs text-neutral-400">
                    Hola <strong className="text-neutral-200">{pedido.clienteNombre}</strong>
                    {pedido.barrio ? ` • Destino: ${pedido.barrio}` : ''}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-[10px] uppercase font-mono text-neutral-500 block">Total</span>
                  <span className="text-lg sm:text-xl font-black font-display text-amber-400">
                    {formatCOP(pedido.total)}
                  </span>
                </div>
              </div>

              {/* Banner de Tiempo Estimado o Entrega */}
              <div className="mt-5 pt-4 border-t border-neutral-800 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${pedido.estado === 'entregado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {pedido.estado === 'entregado' ? <Sparkles size={18} /> : <Clock size={18} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {pedido.estado === 'entregado'
                        ? '¡Pedido entregado con éxito!'
                        : pedido.estado === 'en_camino'
                        ? pedido.domiciliarioNombre
                          ? `Tu repartidor ${pedido.domiciliarioNombre} va en camino`
                          : 'Tu repartidor va en camino a tu dirección'
                        : pedido.estado === 'en_preparacion'
                        ? 'Cocina está preparando tus platos'
                        : 'Pedido recibido, aguardando turno en cocina'}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {pedido.estado === 'entregado'
                        ? 'Gracias por elegirnos. ¡Buen provecho!'
                        : estimacion?.retrasado
                        ? 'Alta demanda en cocina; tu pedido está en preparación prioritaria'
                        : `Tiempo estimado total: ~${pedido.tiempoEstimadoMin} minutos`}
                    </p>
                  </div>
                </div>

                {pedido.estado !== 'entregado' && estimacion && (
                  <div className="bg-neutral-950/70 border border-neutral-800/80 px-3 py-1.5 rounded-xl text-right">
                    <span className="text-[10px] text-neutral-500 block uppercase font-mono">Faltan aprox.</span>
                    <span className="text-sm font-black font-display text-amber-400">
                      {estimacion.minutosRestantes > 0 ? `${estimacion.minutosRestantes} min` : 'Unos momentos'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Progreso Gastronómica */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Progreso del Despacho
                </h3>
                <span className="text-xs text-neutral-400 font-medium">
                  Paso {indiceActual + 1} de 4
                </span>
              </div>

              {/* Pasos Visuales */}
              <div className="relative">
                {/* Línea de Fondo */}
                <div className="absolute top-6 left-6 right-6 h-1 bg-neutral-800 -translate-y-1/2 z-0" />
                {/* Línea Activa */}
                <div
                  className="absolute top-6 left-6 h-1 bg-gradient-to-r from-amber-500 to-amber-400 -translate-y-1/2 z-0 transition-all duration-700 ease-out"
                  style={{ width: `calc(${indiceActual * 33.33}% * 0.9 + 2%)` }}
                />

                <div className="relative z-10 grid grid-cols-4 gap-2">
                  {ETAPAS_ORDEN.map((etapa, idx) => {
                    const isCompleted = idx < indiceActual;
                    const isCurrent = idx === indiceActual;

                    let stepBg = 'bg-neutral-800 border-neutral-700 text-neutral-400';
                    if (isCompleted) {
                      stepBg = 'bg-amber-500 border-amber-400 shadow-lg shadow-amber-500/20';
                    } else if (isCurrent) {
                      stepBg = 'bg-amber-400 border-white ring-4 ring-amber-500/30 scale-105 shadow-xl';
                    }

                    return (
                      <div key={etapa.stage} className="flex flex-col items-center text-center group">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${stepBg}`}
                        >
                          {getStageIcon(etapa.stage, isCompleted, isCurrent)}
                        </div>

                        <div className="mt-3 space-y-0.5">
                          <p
                            className={`text-xs font-bold leading-tight ${
                              isCurrent ? 'text-amber-400' : isCompleted ? 'text-white' : 'text-neutral-500'
                            }`}
                          >
                            {etapa.label}
                          </p>
                          <p className="text-[10px] text-neutral-400 hidden sm:block">
                            {etapa.sublabel}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mensaje de Repartidor si está en camino */}
              {pedido.estado === 'en_camino' && (
                <div className="p-4 bg-sky-950/40 border border-sky-800/50 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <Bike size={22} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">
                      {pedido.domiciliarioNombre
                        ? `Tu repartidor es ${pedido.domiciliarioNombre}`
                        : 'Repartidor asignado y en tránsito'}
                    </p>
                    <p className="text-[11px] text-neutral-300">
                      Por favor mantén tu teléfono a mano para recibir la llamada o timbre al llegar.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Detalle de Productos y Resumen de Pago */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
                <ShoppingBag size={18} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                  Detalle del Pedido ({pedido.totalItems} ítems)
                </h3>
              </div>

              <div className="divide-y divide-neutral-800/60">
                {pedido.items.map((item, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-neutral-200">
                      <span className="font-mono font-bold text-amber-400 bg-neutral-950 px-2 py-0.5 rounded-md border border-neutral-800">
                        {item.cantidad}×
                      </span>
                      <span className="font-medium">{item.nombre}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Método de Pago:</span>
                  <span className="font-bold text-neutral-200 uppercase">
                    {pedido.metodoPago === 'efectivo' ? 'Efectivo contra entrega' : 'Transferencia manual acordada'}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Canal de Solicitud:</span>
                  <span className="font-bold text-neutral-200 uppercase">
                    {pedido.origen.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-neutral-800 font-display">
                  <span>Total a Pagar:</span>
                  <span className="text-amber-400">{formatCOP(pedido.total)}</span>
                </div>
              </div>
            </div>

            {/* Acciones y Contacto WhatsApp */}
            <div className="space-y-3 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] px-5 py-3 rounded-2xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 text-center"
              >
                <MessageCircle size={18} />
                <span>¿Necesitas ayuda? Escríbenos a WhatsApp</span>
              </a>

              <Link
                to={urlTienda}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl font-bold text-xs bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2 text-center"
              >
                <span>Hacer otro pedido en {nombreNegocio}</span>
              </Link>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-600 px-4">
        <p>
          La Parada • Plataforma Gastronómica Multi-Tenant
        </p>
      </footer>
    </div>
  );
}

export default RastreoPedidoPage;

