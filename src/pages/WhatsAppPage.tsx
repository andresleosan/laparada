import React, { useState } from 'react';
import {
  obtenerMensajesSinLeer,
  obtenerHistorialMensajes,
  enviarMensajeWhatsApp,
  marcarMensajeLeido,
  onNuevosMensajes,
} from '@/services/whatsappService';
import { MensajeWhatsApp } from '@/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { MessageCircle, Send, Inbox, Clock } from 'lucide-react';

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
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">WhatsApp</h1>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">WhatsApp Business</h1>
          <p className="mt-2 text-neutral-400">Gestión de mensajes y órdenes</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-neutral-700">
          <Button
            variant={tab === 'inbox' ? 'primary' : 'secondary'}
            onClick={() => setTab('inbox')}
            className="border-b-2"
          >
            <Inbox size={16} className="mr-2" />
            Mensajes Sin Leer ({mensajes.length})
          </Button>
          <Button
            variant={tab === 'historial' ? 'primary' : 'secondary'}
            onClick={() => setTab('historial')}
            className="border-b-2"
          >
            <Clock size={16} className="mr-2" />
            Historial
          </Button>
        </div>

        {tab === 'inbox' ? (
          <>
            {mensajes.length === 0 ? (
              <EmptyState icon={MessageCircle} title="Inbox vacío" description="No hay mensajes sin leer" />
            ) : (
              <div className="space-y-3">
                {mensajes.map((msg) => (
                  <Card
                    key={msg.id}
                    className="p-4 transition-all hover:bg-neutral-800/50 cursor-pointer"
                    onClick={() => handleSeleccionarConversacion(msg.telefono)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">📱 {msg.telefono}</span>
                          <Badge variant="outline" className="bg-green-500/20 text-green-300">
                            Nuevo
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-neutral-300 line-clamp-2">{msg.contenido}</p>
                        <p className="mt-2 text-xs text-neutral-500">
                          {msg.creadoEn?.toDate?.()
                            ? msg.creadoEn.toDate().toLocaleString()
                            : 'N/A'}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarcarLeido(msg.id);
                        }}
                      >
                        ✓
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
                                {msg.creadoEn?.toDate?.()?.toLocaleTimeString()}
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
