// src/components/storefront/LiveChatWidget.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ChatSesion, MensajeChat } from '@/types/chat';
import type { Producto, Combo } from '@/types';
import { DEFAULT_NEGOCIO_ID } from '@/types/negocio';
import {
  abrirSesionChat,
  asegurarVisitanteChat,
  enviarMensajeCliente,
  marcarChatLeidoPorCliente,
  momentoUltimoMensaje,
  onMensajesChatChange,
  onSesionChatChange,
} from '@/services/chatService';
import { getProductos, getCombos } from '@/services/productosService';
import {
  generarBienvenidaSarin,
  responderMensajeSarinWeb,
  type RespuestaSarinWeb,
} from '@/services/sarinWebAssistant';
import {
  CHAT_MENSAJE_MAX,
  CHAT_NOMBRE_MAX,
  CHAT_TELEFONO_MAX,
  esperaRestanteChat,
  validarMensajeChat,
  validarNombreChat,
  validarTelefonoChat,
} from '@/utils/chatValidation';
import { formatHora } from '@/utils/dateUtils';
import { toValidAdminDate } from '@/utils/adminAnalytics';

const PERFIL_GUARDADO = 'laparada_chat_perfil';

interface PerfilGuardado {
  nombre: string;
  telefono: string;
}

function leerPerfilGuardado(): PerfilGuardado {
  try {
    const crudo = localStorage.getItem(PERFIL_GUARDADO);
    if (!crudo) return { nombre: '', telefono: '' };
    const datos = JSON.parse(crudo) as Partial<PerfilGuardado>;
    return {
      nombre: typeof datos.nombre === 'string' ? datos.nombre : '',
      telefono: typeof datos.telefono === 'string' ? datos.telefono : '',
    };
  } catch {
    return { nombre: '', telefono: '' };
  }
}

function guardarPerfil(perfil: PerfilGuardado): void {
  try {
    localStorage.setItem(PERFIL_GUARDADO, JSON.stringify(perfil));
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
}

function horaMensaje(mensaje: MensajeChat): string {
  const fecha = toValidAdminDate(mensaje.creadoEn);
  return fecha ? formatHora(fecha) : 'Enviando…';
}

export interface LiveChatWidgetProps {
  negocioId?: string;
  negocioNombre?: string;
  productos?: Producto[];
  combos?: Combo[];
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  suscripcionValida?: boolean;
  cuotaRestante?: number;
}

export function LiveChatWidget({
  negocioId = DEFAULT_NEGOCIO_ID,
  negocioNombre = 'La Parada',
  productos: initialProductos,
  combos: initialCombos,
  telefono,
  direccion,
  ciudad,
  suscripcionValida = true,
  cuotaRestante = 1000,
}: LiveChatWidgetProps = {}) {
  const [abierto, setAbierto] = useState(false);
  const [visitante, setVisitante] = useState<User | null>(null);
  const [sesion, setSesion] = useState<ChatSesion | null>(null);
  const [mensajesRemotos, setMensajesRemotos] = useState<MensajeChat[]>([]);
  const [mensajesLocales, setMensajesLocales] = useState<MensajeChat[]>([]);
  const [perfil, setPerfil] = useState<PerfilGuardado>(() => ({ nombre: '', telefono: '' }));
  const [consulta, setConsulta] = useState('');
  const [redaccion, setRedaccion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [sarinEscribiendo, setSarinEscribiendo] = useState(false);
  const [sugerenciasActivas, setSugerenciasActivas] = useState<string[]>([]);
  const [ultimoWhatsappLink, setUltimoWhatsappLink] = useState<string | null>(null);

  // Catálogo local si no fue provisto
  const [productosLocal, setProductosLocal] = useState<Producto[]>([]);
  const [combosLocal, setCombosLocal] = useState<Combo[]>([]);

  const finDeLista = useRef<HTMLDivElement>(null);
  const sesionIniciada = Boolean(sesion);

  const productos = useMemo(
    () => initialProductos || productosLocal,
    [initialProductos, productosLocal]
  );
  const combos = useMemo(() => initialCombos || combosLocal, [initialCombos, combosLocal]);

  useEffect(() => {
    setPerfil(leerPerfilGuardado());
  }, []);

  // Carga fallback de productos si no vienen por props
  useEffect(() => {
    if (initialProductos && initialCombos) return;
    let cancelado = false;
    Promise.all([getProductos(negocioId), getCombos(negocioId)])
      .then(([prods, cmbs]) => {
        if (!cancelado) {
          setProductosLocal(prods);
          setCombosLocal(cmbs);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelado = true;
    };
  }, [negocioId, initialProductos, initialCombos]);

  // Mensaje de bienvenida inicial de Sarin Bot
  const mensajeBienvenida = useMemo(() => {
    return generarBienvenidaSarin(negocioNombre, productos, combos);
  }, [negocioNombre, productos, combos]);

  const chipsIniciales = useMemo(() => [
    '🍔 ¿Qué me recomiendas?',
    '📋 Ver menú y precios',
    '🛵 ¿Hacen domicilios?',
    '💳 ¿Cómo pagar?',
  ], []);

  // Unificación de mensajes remotos de Firestore y respuestas locales de Sarin Bot
  const todosLosMensajes = useMemo(() => {
    const combinados = [...mensajesRemotos];
    for (const local of mensajesLocales) {
      if (!combinados.some((m) => m.id === local.id)) {
        combinados.push(local);
      }
    }
    return combinados;
  }, [mensajesRemotos, mensajesLocales]);

  // Identidad anónima al abrir
  useEffect(() => {
    if (!abierto || visitante) return;
    let cancelado = false;
    asegurarVisitanteChat()
      .then((user) => {
        if (!cancelado) setVisitante(user);
      })
      .catch((err: Error) => {
        if (!cancelado) setError(err.message);
      });
    return () => {
      cancelado = true;
    };
  }, [abierto, visitante]);

  useEffect(() => {
    if (!visitante) return;
    return onSesionChatChange(visitante.uid, setSesion);
  }, [visitante]);

  useEffect(() => {
    if (!visitante || !sesionIniciada) return;
    return onMensajesChatChange(
      visitante.uid,
      setMensajesRemotos,
      () => setError('No pudimos cargar la conversación')
    );
  }, [visitante, sesionIniciada]);

  useEffect(() => {
    if (abierto) finDeLista.current?.scrollIntoView({ block: 'end' });
  }, [abierto, todosLosMensajes.length, sarinEscribiendo]);

  useEffect(() => {
    if (!abierto || !visitante || !sesion || sesion.noLeidosCliente === 0) return;
    void marcarChatLeidoPorCliente(visitante.uid).catch(() => undefined);
  }, [abierto, visitante, sesion]);

  const sinLeer = !abierto && (sesion?.noLeidosCliente ?? 0) > 0;

  // Lógica para que Sarin responda en vivo
  const procesarRespuestaSarin = (mensajeTexto: string) => {
    // Si un asesor humano ya tomó la sesión en el panel, Sarin respeta el relevo
    if (sesion?.estado === 'en_atencion') {
      return;
    }

    setSarinEscribiendo(true);

    window.setTimeout(() => {
      const respuesta: RespuestaSarinWeb = responderMensajeSarinWeb({
        mensajeCliente: mensajeTexto,
        negocioId,
        negocioNombre,
        productos,
        combos,
        telefonoNegocio: telefono,
        direccionNegocio: direccion,
        ciudadNegocio: ciudad,
        suscripcionValida,
        cuotaRestante,
      });

      const mensajeSarin: MensajeChat = {
        id: `sarin_${Date.now()}`,
        autor: 'asesor',
        autorNombre: 'Sarin IA',
        texto: respuesta.texto,
        creadoEn: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as MensajeChat['creadoEn'],
      };

      setMensajesLocales((prev) => [...prev, mensajeSarin]);
      setSugerenciasActivas(respuesta.sugerencias || []);
      setUltimoWhatsappLink(respuesta.whatsappLink || null);
      setSarinEscribiendo(false);
    }, 650);
  };

  const handleIniciar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    if (!visitante) return;

    const errorNombre = validarNombreChat(perfil.nombre);
    const errorTelefono = validarTelefonoChat(perfil.telefono);
    const errorConsulta = validarMensajeChat(consulta);
    const primerError = errorNombre || errorTelefono || errorConsulta;
    if (primerError) {
      setError(primerError);
      return;
    }

    setEnviando(true);
    setError('');
    const consultaEnviada = consulta;
    try {
      await abrirSesionChat(negocioId, visitante.uid, perfil.nombre, perfil.telefono);
      await enviarMensajeCliente(visitante.uid, perfil.nombre, consultaEnviada);
      guardarPerfil(perfil);
      setConsulta('');
      procesarRespuestaSarin(consultaEnviada);
    } catch {
      setError('No pudimos abrir la conversación. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarMensaje = async (texto: string) => {
    if (!visitante || !sesion) return;

    const errorMensaje = validarMensajeChat(texto);
    if (errorMensaje) {
      setError(errorMensaje);
      return;
    }

    const espera = esperaRestanteChat(momentoUltimoMensaje(sesion), Date.now());
    if (espera > 0) {
      setError('Espera un momento antes de enviar otro mensaje');
      return;
    }

    setEnviando(true);
    setError('');
    setRedaccion('');
    try {
      await enviarMensajeCliente(visitante.uid, sesion.clienteNombre, texto, sesion.estado);
      procesarRespuestaSarin(texto);
    } catch {
      setRedaccion(texto);
      setError('No se pudo enviar el mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const handleFormularioEnviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    await handleEnviarMensaje(redaccion);
  };

  const handleChipClick = async (sugerencia: string) => {
    if (!sesionIniciada) {
      setConsulta(sugerencia);
      return;
    }
    await handleEnviarMensaje(sugerencia);
  };

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={
          sinLeer
            ? 'Abrir chat: tienes respuestas sin leer'
            : `Hablar con Sarin Bot en ${negocioNombre}`
        }
        className="fixed bottom-24 right-4 z-40 flex min-h-12 items-center gap-2.5 rounded-full bg-[#07131B]/95 px-4 py-2 font-bold text-white shadow-2xl shadow-cyan-950/50 transition-all hover:scale-105 active:scale-95 md:bottom-6 md:right-6 border border-cyan-500/40 hover:border-cyan-400/70 backdrop-blur-sm group"
      >
        <div className="relative flex items-center justify-center shrink-0">
          <img
            src="/images/sarin/sarin-camisa-la-parada.png"
            alt="Sarin Bot"
            className="h-9 w-9 rounded-full object-cover transition-transform group-hover:scale-110"
            onError={(e) => {
              // fallback a sarin-robot si fuera necesario
              e.currentTarget.src = '/images/sarin/sarin-robot.png';
            }}
          />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950 animate-pulse" />
        </div>
        <div className="flex flex-col text-left pr-1">
          <span className="text-xs font-black tracking-wide text-white group-hover:text-cyan-300 transition-colors">
            Hablar con Sarin
          </span>
          <span className="text-[10px] font-semibold text-emerald-400/90 leading-none">
            En línea 24/7
          </span>
        </div>
        {sinLeer && (
          <span className="ml-1 grid h-5 min-w-5 place-items-center rounded-full bg-cyan-500 px-1 text-[11px] text-neutral-950 font-black shadow">
            {sesion?.noLeidosCliente}
          </span>
        )}
      </button>
    );
  }

  return (
    <section
      aria-label={`Chat con Sarin Bot en ${negocioNombre}`}
      className="fixed bottom-24 right-4 z-40 flex h-[min(580px,calc(100vh-8rem))] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl md:bottom-6 md:right-6 animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Cabecera */}
      <header className="flex items-center justify-between gap-3 bg-neutral-950 px-4 py-3 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#07131B] border border-cyan-500/40 overflow-hidden shadow-md">
            <img
              src="/images/sarin/sarin-camisa-la-parada.png"
              alt="Sarin Bot"
              className="h-10 w-10 object-cover"
              onError={(e) => {
                e.currentTarget.src = '/images/sarin/sarin-robot.png';
              }}
            />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-neutral-950" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-display text-sm font-black text-white truncate flex items-center gap-1">
                <span>Sarin</span>
                <span className="text-cyan-400">Bot</span>
              </h2>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-black uppercase tracking-wider border border-cyan-500/30">
                IA 24/7
              </span>
            </div>
            <p className="truncate text-[11px] text-neutral-400">
              Asistente oficial de {negocioNombre}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          aria-label="Cerrar chat"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>

      {/* Contenedor de mensajes / formulario */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Burbuja inicial de bienvenida de Sarin */}
        <div className="flex flex-col items-start">
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs bg-neutral-800/90 border border-neutral-700/60 text-neutral-100 shadow-sm leading-relaxed">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1 text-[11px]">
              <Sparkles size={12} />
              <span>Sarin Bot</span>
            </div>
            <p className="whitespace-pre-wrap">{mensajeBienvenida}</p>
          </div>
          <span className="mt-1 px-1 text-[10px] text-neutral-500">Asistente IA</span>
        </div>

        {/* Chips de sugerencias iniciales */}
        {!sesionIniciada && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-semibold text-neutral-400 block px-1">
              Preguntas sugeridas:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {chipsIniciales.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="rounded-full bg-neutral-800 hover:bg-amber-500/10 hover:border-amber-500/40 border border-neutral-700/80 px-2.5 py-1 text-[11px] font-medium text-neutral-200 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Si no ha iniciado sesión, pide datos para comenzar */}
        {!sesionIniciada ? (
          <form
            onSubmit={handleIniciar}
            className="mt-3 space-y-2.5 rounded-2xl bg-neutral-950/60 p-3.5 border border-neutral-800"
            aria-label="Iniciar conversación"
          >
            <p className="text-[11px] text-neutral-300 font-medium leading-relaxed">
              Ingresa tus datos para empezar a chatear con Sarin y consultar tu pedido:
            </p>
            <label className="block text-[11px] font-semibold text-neutral-300">
              Nombre
              <input
                value={perfil.nombre}
                onChange={(e) => setPerfil((actual) => ({ ...actual, nombre: e.target.value }))}
                maxLength={CHAT_NOMBRE_MAX}
                placeholder="Tu nombre"
                required
                className="mt-1 min-h-10 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
              />
            </label>
            <label className="block text-[11px] font-semibold text-neutral-300">
              WhatsApp / Teléfono <span className="font-normal text-neutral-500">(opcional)</span>
              <input
                value={perfil.telefono}
                onChange={(e) => setPerfil((actual) => ({ ...actual, telefono: e.target.value }))}
                maxLength={CHAT_TELEFONO_MAX}
                inputMode="tel"
                placeholder="Ej: 300 123 4567"
                className="mt-1 min-h-10 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
              />
            </label>
            <label className="block text-[11px] font-semibold text-neutral-300">
              Tu mensaje o consulta
              <textarea
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                maxLength={CHAT_MENSAJE_MAX}
                rows={2}
                placeholder="Pregunta por la carta, promociones o cotiza..."
                required
                className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={enviando || !visitante}
              className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-xs font-black text-neutral-950 shadow-md hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 transition-all"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              <span>Conversar con Sarin Bot</span>
            </button>
          </form>
        ) : (
          <ul className="space-y-2.5">
            {todosLosMensajes.map((mensaje) => {
              const esCliente = mensaje.autor === 'cliente';
              const esSarin = mensaje.autorNombre === 'Sarin IA';

              return (
                <li
                  key={mensaje.id}
                  className={`flex flex-col ${esCliente ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      esCliente
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 font-medium rounded-tr-sm shadow-md'
                        : esSarin
                        ? 'bg-neutral-800 border border-amber-500/20 text-neutral-100 rounded-tl-sm'
                        : 'bg-neutral-800 text-neutral-100 rounded-tl-sm border border-neutral-700'
                    }`}
                  >
                    {!esCliente && (
                      <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] text-amber-400">
                        {esSarin ? <Sparkles size={11} /> : null}
                        <span>{mensaje.autorNombre}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{mensaje.texto}</p>
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-neutral-500">
                    {esCliente ? 'Tú' : mensaje.autorNombre} · {horaMensaje(mensaje)}
                  </span>
                </li>
              );
            })}

            {/* Indicador de escritura animado */}
            {sarinEscribiendo && (
              <li className="flex flex-col items-start animate-pulse">
                <div className="rounded-2xl rounded-tl-sm bg-neutral-800/80 border border-neutral-700 px-3.5 py-2 text-xs text-amber-400 flex items-center gap-2">
                  <Bot size={13} />
                  <span>Sarin está respondiendo...</span>
                </div>
              </li>
            )}

            {/* Botón WhatsApp si la respuesta lo amerita */}
            {ultimoWhatsappLink && (
              <li className="flex justify-start pt-1">
                <a
                  href={ultimoWhatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-colors"
                >
                  <ExternalLink size={13} />
                  <span>Continuar pedido por WhatsApp</span>
                </a>
              </li>
            )}

            {/* Chips de sugerencias contextuales tras respuesta */}
            {sugerenciasActivas.length > 0 && !sarinEscribiendo && (
              <li className="space-y-1.5 pt-2">
                <span className="text-[10px] font-semibold text-neutral-400 block px-1">
                  Continuar conversación:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sugerenciasActivas.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleChipClick(sug)}
                      className="rounded-full bg-neutral-800 hover:bg-amber-500/10 hover:border-amber-500/40 border border-neutral-700/80 px-2.5 py-1 text-[11px] font-medium text-neutral-200 transition-colors"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </li>
            )}

            <div ref={finDeLista} />
          </ul>
        )}
      </div>

      {error && (
        <p role="alert" className="border-t border-neutral-800 px-4 py-1.5 text-xs text-red-400 bg-red-950/20">
          {error}
        </p>
      )}

      {/* Input inferior una vez iniciada la sesión */}
      {sesionIniciada && (
        <form
          onSubmit={handleFormularioEnviar}
          className="flex items-center gap-2 border-t border-neutral-800 px-3 py-2.5 bg-neutral-950 shrink-0"
        >
          <label className="sr-only" htmlFor="chat-redaccion">
            Pregúntale a Sarin Bot
          </label>
          <input
            id="chat-redaccion"
            value={redaccion}
            onChange={(e) => setRedaccion(e.target.value)}
            maxLength={CHAT_MENSAJE_MAX}
            placeholder="Pregunta por la carta, precios o pide..."
            className="min-h-10 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={enviando || !redaccion.trim()}
            aria-label="Enviar mensaje a Sarin"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-neutral-950 disabled:opacity-40 transition-all active:scale-95 shadow-md"
          >
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </form>
      )}
    </section>
  );
}
