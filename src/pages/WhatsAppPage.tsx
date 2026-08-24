// src/pages/WhatsAppPage.tsx
import React, { useState, useEffect } from 'react';
import {
  obtenerMensajesSinLeer,
  obtenerHistorialMensajes,
  enviarMensajeWhatsApp,
  marcarMensajeLeido,
  onNuevosMensajes,
} from '@/services/whatsappService';
import { getDomiciliosActivos, updateDomicilioEstado } from '@/services/domiciliosService';
import { MensajeWhatsApp, Domicilio, EstadoDomicilio } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { MessageCircle, Send, Inbox, Clock, ShoppingBag, Globe, RefreshCw, CheckCircle, Truck, Utensils } from 'lucide-react';

function formatFechaMensaje(fecha?: Timestamp | Date | null): string {
  if (!fecha) return 'N/A';
  if (fecha instanceof Date) return fecha.toLocaleString();
  if (typeof (fecha as any).toDate === 'function') {
    return (fecha as any).toDate().toLocaleString();
  }
  return 'N/A';
}

function formatHoraMensaje(fecha?: Timestamp | Date | null): string {
  if (!fecha) return 'N/A';
  if (fecha instanceof Date) return fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (typeof (fecha as any).toDate === 'function') {
    return (fecha as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return 'N/A';
}

export function WhatsAppPage() {
  const [tab, setTab] = useState<'pedidos' | 'inbox' | 'historial'>('pedidos');
  
  // Estado de Pedidos Activos
  const [pedidos, setPedidos] = useState<Domicilio[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(true);
  const [filtroCanal, setFiltroCanal] = useState<'todos' | 'web' | 'whatsapp'>('todos');

  // Estado de Mensajes WhatsApp
  const [mensajes, setMensajes] = useState<MensajeWhatsApp[]>([]);
  const [loadingMensajes, setLoadingMensajes] = useState(true);
  const [telefonoSeleccionado, setTelefonoSeleccionado] = useState('');
  const [conversacion, setConversacion] = useState<MensajeWhatsApp[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Form para enviar mensaje
  const [telefonoEnvio, setTelefonoEnvio] = useState('');
  const [contenidoEnvio, setContenidoEnvio] = useState('');

  const cargarPedidos = async () => {
    setLoadingPedidos(true);
    try {
      const data = await getDomiciliosActivos('ambas');
      setPedidos(data);
    } catch (err) {
      console.error('Error cargando pedidos:', err);
    } finally {
      setLoadingPedidos(false);
    }
  };

  const cargarMensajes = async () => {
    setLoadingMensajes(true);
    try {
      const datos = await obtenerMensajesSinLeer();
      setMensajes(datos);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
    } finally {
      setLoadingMensajes(false);
    }
  };

  useEffect(() => {
    cargarPedidos();
    cargarMensajes();

    // Listener para nuevos mensajes
    const unsubscribe = onNuevosMensajes((nuevoMensaje) => {
      setMensajes((prev) => [nuevoMensaje, ...prev]);
    });

    return () => unsubscribe();
  }, []);

  const handleCambiarEstadoPedido = async (pedidoId: string, nuevoEstado: EstadoDomicilio) => {
    try {
      await updateDomicilioEstado(pedidoId, nuevoEstado);
      createToast(`✅ Pedido actualizado a ${nuevoEstado}`, 'success');
      await cargarPedidos();
    } catch (err) {
      console.error('Error al actualizar pedido:', err);
      createToast('❌ Error al actualizar estado', 'error');
    }
  };

  const handleSeleccionarConversacion = async (telefono: string) => {
    setTelefonoSeleccionado(telefono);
    const historial = await obtenerHistorialMensajes(telefono);
    setConversacion(historial.reverse());
  };

  const handleMarcarLeido = async (mensajeId: string) => {
    try {
      await marcarMensajeLeido(mensajeId);
      setMensajes((prev) => prev.filter((m) => m.id !== mensajeId));
      createToast('✅ Marcado como leído', 'success');
    } catch (err) {
      createToast('❌ Error al marcar leído', 'error');
    }
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefonoEnvio.trim() || !contenidoEnvio.trim()) {
      createToast('⚠️ Completa todos los campos', 'error');
      return;
    }

    try {
      setEnviando(true);
      await enviarMensajeWhatsApp({
        telefono: telefonoEnvio,
        contenido: contenidoEnvio,
      });
      createToast('✅ Mensaje enviado', 'success');
      setTelefonoEnvio('');
      setContenidoEnvio('');
    } catch (err) {
      createToast('❌ Error al enviar mensaje', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const telefonosUnicos = Array.from(new Set(mensajes.map((m) => m.telefono)));

  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroCanal === 'todos') return true;
    return p.origen === filtroCanal;
  });

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Gestión de Pedidos & Mensajería
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Control unificado de órdenes desde la Tienda Virtual y WhatsApp Bot
            </p>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab('pedidos')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                tab === 'pedidos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <ShoppingBag size={14} />
              Pedidos Entrantes ({pedidos.length})
            </button>
            <button
              onClick={() => setTab('inbox')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                tab === 'inbox'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Inbox size={14} />
              Sin Leer ({mensajes.length})
            </button>
            <button
              onClick={() => setTab('historial')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                tab === 'historial'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Clock size={14} />
              Chat WhatsApp
            </button>
          </div>
        </div>

        {/* CONTENIDO 1: PEDIDOS ENTRANTES */}
        {tab === 'pedidos' && (
          <div className="space-y-4">
            {/* Filtros de origen */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filtroCanal === 'todos' ? 'primary' : 'secondary'}
                  onClick={() => setFiltroCanal('todos')}
                  className="text-xs"
                >
                  Todos ({pedidos.length})
                </Button>
                <Button
                  size="sm"
                  variant={filtroCanal === 'web' ? 'primary' : 'secondary'}
                  onClick={() => setFiltroCanal('web')}
                  className="text-xs flex items-center gap-1"
                >
                  <Globe size={13} />
                  Tienda Web ({pedidos.filter((p) => p.origen === 'web').length})
                </Button>
                <Button
                  size="sm"
                  variant={filtroCanal === 'whatsapp' ? 'primary' : 'secondary'}
                  onClick={() => setFiltroCanal('whatsapp')}
                  className="text-xs flex items-center gap-1"
                >
                  <MessageCircle size={13} />
                  WhatsApp ({pedidos.filter((p) => p.origen === 'whatsapp').length})
                </Button>
              </div>

              <Button size="sm" variant="secondary" onClick={cargarPedidos} className="text-xs flex items-center gap-1">
                <RefreshCw size={13} />
                Actualizar
              </Button>
            </div>

            {loadingPedidos ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-36 w-full rounded-xl" />
                ))}
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No hay pedidos activos"
                description="Los nuevos pedidos desde la Tienda Virtual o WhatsApp aparecerán aquí automáticamente."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {pedidosFiltrados.map((pedido) => (
                  <Card
                    key={pedido.id}
                    className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between hover:border-neutral-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs sm:text-sm">{pedido.clienteNombre}</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              pedido.origen === 'web'
                                ? 'text-sky-400 border-sky-500/30 bg-sky-950/20'
                                : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20'
                            }`}
                          >
                            {pedido.origen === 'web' ? '🌐 Web' : '📱 WhatsApp'}
                          </Badge>
                        </div>
                        <Badge
                          variant="default"
                          className={`text-[10px] uppercase font-bold ${
                            pedido.estado === 'pendiente'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : pedido.estado === 'en_preparacion'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {pedido.estado.replace('_', ' ')}
                        </Badge>
                      </div>

                      <div className="mt-2 text-xs text-neutral-300 space-y-1">
                        <p>📍 {pedido.direccion || 'Recoger en local'} {pedido.barrio ? `(${pedido.barrio})` : ''}</p>
                        <p>📞 {pedido.clienteTelefono}</p>
                        <p className="text-[11px] text-neutral-400">💳 Método: <span className="capitalize font-semibold text-neutral-200">{pedido.metodoPago}</span></p>
                      </div>

                      {/* Lista de Items */}
                      <div className="mt-3 p-2 bg-neutral-950/60 rounded-xl border border-neutral-800/80 space-y-1">
                        {pedido.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-neutral-300">
                            <span>{item.cantidad}x {item.nombre}</span>
                            <span className="text-neutral-400">{formatCOP(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
                      <p className="text-lg font-bold text-gold-400 font-display">{formatCOP(pedido.total)}</p>

                      <div className="flex gap-1.5">
                        {pedido.estado === 'pendiente' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCambiarEstadoPedido(pedido.id, 'en_preparacion')}
                            className="text-[11px] px-2 py-1 flex items-center gap-1"
                          >
                            <Utensils size={12} />
                            A Cocina
                          </Button>
                        )}
                        {pedido.estado === 'en_preparacion' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCambiarEstadoPedido(pedido.id, 'en_camino')}
                            className="text-[11px] px-2 py-1 flex items-center gap-1 text-sky-400"
                          >
                            <Truck size={12} />
                            A Domicilio
                          </Button>
                        )}
                        {pedido.estado === 'en_camino' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCambiarEstadoPedido(pedido.id, 'entregado')}
                            className="text-[11px] px-2 py-1 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            <CheckCircle size={12} />
                            Entregado
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO 2: INBOX SIN LEER */}
        {tab === 'inbox' && (
          <>
            {loadingMensajes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : mensajes.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Inbox al día" description="No hay mensajes nuevos pendientes por leer" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {mensajes.map((msg) => (
                  <Card
                    key={msg.id}
                    className="p-4 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => {
                      handleSeleccionarConversacion(msg.telefono);
                      setTab('historial');
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                        <span className="font-semibold text-white text-xs sm:text-sm">📱 {msg.telefono}</span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                          Nuevo
                        </Badge>
                      </div>
                      <p className="mt-3 text-xs sm:text-sm text-neutral-300 line-clamp-3 bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800/60">
                        {msg.contenido}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500">
                        {formatFechaMensaje(msg.creadoEn)}
                      </span>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (msg.id) handleMarcarLeido(msg.id);
                        }}
                        className="text-xs px-2.5 py-1"
                      >
                        ✓ Leído
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* CONTENIDO 3: HISTORIAL & CHAT */}
        {tab === 'historial' && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Listado de conversaciones */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Conversaciones</h3>
              {telefonosUnicos.length === 0 ? (
                <Card className="p-4 text-center text-neutral-500 text-xs bg-neutral-900/90 border-neutral-800">
                  Sin conversaciones registradas
                </Card>
              ) : (
                <div className="space-y-2">
                  {telefonosUnicos.map((telefono) => (
                    <Card
                      key={telefono}
                      className={`p-3 cursor-pointer transition-all border-neutral-800 ${
                        telefonoSeleccionado === telefono
                          ? 'bg-gold-400/20 border-l-2 border-gold-400 text-white'
                          : 'bg-neutral-900/90 hover:bg-neutral-800/50 text-neutral-300'
                      }`}
                      onClick={() => handleSeleccionarConversacion(telefono)}
                    >
                      <p className="font-semibold text-xs">{telefono}</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {mensajes.filter((m) => m.telefono === telefono).length} mensajes
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Conversación */}
            <div className="md:col-span-2">
              {telefonoSeleccionado ? (
                <Card className="flex h-96 flex-col bg-neutral-900/90 border-neutral-800">
                  <div className="border-b border-neutral-800 p-3">
                    <p className="font-semibold text-white text-xs">Chat con {telefonoSeleccionado}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 p-4">
                    {conversacion.length === 0 ? (
                      <p className="text-center text-neutral-500 text-xs py-8">Sin mensajes en este chat</p>
                    ) : (
                      conversacion.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.tipo === 'salida' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-xs rounded-xl p-2.5 text-xs ${
                              msg.tipo === 'salida'
                                ? 'bg-gold-400/20 text-gold-200 border border-gold-400/30'
                                : 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                            }`}
                          >
                            <p>{msg.contenido}</p>
                            <p className="mt-1 text-[10px] text-neutral-400 text-right">
                              {formatHoraMensaje(msg.creadoEn)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleEnviarMensaje} className="border-t border-neutral-800 p-3">
                    <div className="flex gap-2">
                      <Input
                        value={contenidoEnvio}
                        onChange={(e) => {
                          setContenidoEnvio(e.target.value);
                          setTelefonoEnvio(telefonoSeleccionado);
                        }}
                        placeholder="Escribir respuesta al cliente..."
                        className="flex-1 text-xs"
                      />
                      <Button type="submit" variant="primary" size="sm" disabled={enviando}>
                        <Send size={15} />
                      </Button>
                    </div>
                  </form>
                </Card>
              ) : (
                <Card className="p-8 text-center text-neutral-400 text-xs bg-neutral-900/90 border-neutral-800 flex items-center justify-center h-96">
                  Selecciona una conversación a la izquierda para ver el historial y responder
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
