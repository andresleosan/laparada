import React, { useState } from 'react';
import {
  obtenerMensajesSinLeer,
  obtenerHistorialMensajes,
  enviarMensajeWhatsApp,
  marcarMensajeLeido,
  onNuevosMensajes,
} from '@/services/whatsappService';
import { MensajeWhatsApp } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { MessageCircle, Send, Inbox, Clock } from 'lucide-react';

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
  if (fecha instanceof Date) return fecha.toLocaleTimeString();
  if (typeof (fecha as any).toDate === 'function') {
    return (fecha as any).toDate().toLocaleTimeString();
  }
  return 'N/A';
}

export function WhatsAppPage() {
  const [mensajes, setMensajes] = useState<MensajeWhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inbox' | 'historial'>('inbox');
  const [telefonoSeleccionado, setTelefonoSeleccionado] = useState('');
  const [conversacion, setConversacion] = useState<MensajeWhatsApp[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Form para enviar mensaje
  const [telefonoEnvio, setTelefonoEnvio] = useState('');
  const [contenidoEnvio, setContenidoEnvio] = useState('');

  // Cargar mensajes iniciales
  React.useEffect(() => {
    const cargarMensajes = async () => {
      try {
        const datos = await obtenerMensajesSinLeer();
        setMensajes(datos);
      } catch (err) {
        console.error('Error cargando mensajes:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarMensajes();

    // Listener para nuevos mensajes
    const unsubscribe = onNuevosMensajes((nuevoMensaje) => {
      setMensajes((prev) => [nuevoMensaje, ...prev]);
    });

    return () => unsubscribe();
  }, []);

  const handleSeleccionarConversacion = async (telefono: string) => {
    setTelefonoSeleccionado(telefono);
    const historial = await obtenerHistorialMensajes(telefono);
    setConversacion(historial.reverse());
  };

  const handleMarcarLeido = async (mensajeId: string) => {
    try {
      await marcarMensajeLeido(mensajeId);
      setMensajes((prev) => prev.filter((m) => m.id !== mensajeId));
      createToast({ title: '✅ Marcado como leído', type: 'success' });
    } catch (err) {
      createToast({ title: '❌ Error', type: 'error' });
    }
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telefonoEnvio.trim() || !contenidoEnvio.trim()) {
      createToast({ title: '⚠️ Completa todos los campos', type: 'error' });
      return;
    }

    try {
      setEnviando(true);
      await enviarMensajeWhatsApp({
        telefono: telefonoEnvio,
        contenido: contenidoEnvio,
      });
      createToast({ title: '✅ Mensaje enviado', type: 'success' });
      setTelefonoEnvio('');
      setContenidoEnvio('');
    } catch (err) {
      createToast({ title: '❌ Error al enviar', type: 'error' });
    } finally {
      setEnviando(false);
    }
  };

  const telefonosUnicos = Array.from(new Set(mensajes.map((m) => m.telefono)));

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">WhatsApp Business</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">WhatsApp Business</h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">Atención al cliente y pedidos en tiempo real</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setTab('inbox')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
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
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                tab === 'historial'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40 shadow-sm'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <Clock size={14} />
              Historial y Chat
            </button>
          </div>
        </div>

        {tab === 'inbox' ? (
          <>
            {mensajes.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Inbox al día" description="No hay mensajes nuevos pendientes por leer" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {mensajes.map((msg) => (
                  <Card
                    key={msg.id}
                    className="p-4 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between"
                    onClick={() => handleSeleccionarConversacion(msg.telefono)}
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
        ) : (
          <>
            {/* Selector de conversación */}
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Listado de conversaciones */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase">Conversaciones</h3>
                {telefonosUnicos.length === 0 ? (
                  <Card className="p-3 text-center text-neutral-500">Sin conversaciones</Card>
                ) : (
                  <div className="space-y-2">
                    {telefonosUnicos.map((telefono) => (
                      <Card
                        key={telefono}
                        className={`p-3 cursor-pointer transition-all ${
                          telefonoSeleccionado === telefono
                            ? 'bg-gold/20 border-l-2 border-gold'
                            : 'hover:bg-neutral-800/50'
                        }`}
                        onClick={() => handleSeleccionarConversacion(telefono)}
                      >
                        <p className="font-semibold text-white">{telefono}</p>
                        <p className="text-xs text-neutral-400">
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
                  <Card className="flex h-96 flex-col">
                    {/* Cabecera */}
                    <div className="border-b border-neutral-700 p-4">
                      <p className="font-semibold text-white">{telefonoSeleccionado}</p>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto space-y-2 p-4">
                      {conversacion.length === 0 ? (
                        <p className="text-center text-neutral-500">Sin mensajes</p>
                      ) : (
                        conversacion.map((msg) => (
                          <div key={msg.id} className={`flex ${msg.tipo === 'salida' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-xs rounded-lg p-3 ${
                                msg.tipo === 'salida'
                                  ? 'bg-gold/20 text-gold'
                                  : 'bg-neutral-800 text-neutral-200'
                              }`}
                            >
                              <p className="text-sm">{msg.contenido}</p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {formatHoraMensaje(msg.creadoEn)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Input para responder */}
                    <form onSubmit={handleEnviarMensaje} className="border-t border-neutral-700 p-4">
                      <div className="flex gap-2">
                        <Input
                          value={contenidoEnvio}
                          onChange={(e) => setContenidoEnvio(e.target.value)}
                          placeholder="Escribir mensaje..."
                          className="flex-1"
                        />
                        <Button type="submit" variant="primary" size="sm" disabled={enviando}>
                          <Send size={16} />
                        </Button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <Card className="p-6 text-center text-neutral-500">
                    Selecciona una conversación
                  </Card>
                )}
              </div>
            </div>
          </>
        )}

        {/* Formulario para enviar mensajes nuevos */}
        <Card className="mt-6 p-4">
          <h3 className="mb-3 text-sm font-semibold text-neutral-400 uppercase">Enviar Mensaje</h3>
          <form onSubmit={handleEnviarMensaje} className="space-y-3">
            <Input
              label="Teléfono WhatsApp"
              value={telefonoEnvio}
              onChange={(e) => setTelefonoEnvio(e.target.value)}
              placeholder="Ej: +573001234567"
            />

            <Textarea
              label="Mensaje"
              value={contenidoEnvio}
              onChange={(e) => setContenidoEnvio(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              rows={3}
            />

            <Button type="submit" variant="primary" className="w-full" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Mensaje'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
