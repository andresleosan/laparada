import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  HelpCircle,
  Mic,
  MicOff,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Combo, ItemVenta, MetodoPago, Producto } from '@/types';
import {
  parseSarinVoiceCommand,
  type SarinVoiceCommandResult,
  type SarinVoiceMatchedItem,
} from '@/utils/sarinVoicePos';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function speakSpanish(text: string, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-CO';
    utterance.rate = 1.03;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignorar si el navegador bloquea síntesis de voz
  }
}

export interface SarinVoiceAssistantProps {
  productos: Producto[];
  combos: Combo[];
  currentCartItems: ItemVenta[];
  disabled?: boolean;
  onDirectSale: (
    items: SarinVoiceMatchedItem[],
    metodoPago: MetodoPago,
    montoRecibido?: number
  ) => Promise<void>;
  onAddItemsToCart: (items: SarinVoiceMatchedItem[]) => void;
  onCheckoutCurrentCart: (metodoPago: MetodoPago, montoRecibido?: number) => Promise<void>;
  onClearCart: () => void;
}

export const SarinVoiceAssistant: React.FC<SarinVoiceAssistantProps> = ({
  productos,
  combos,
  currentCartItems,
  disabled = false,
  onDirectSale,
  onAddItemsToCart,
  onCheckoutCurrentCart,
  onClearCart,
}) => {
  const [listeningEnabled, setListeningEnabled] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [lastResult, setLastResult] = useState<SarinVoiceCommandResult | null>(null);
  const [lastHeardText, setLastHeardText] = useState('');
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningEnabledRef = useRef(false);
  const lastProcessedRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const speechSupported = Boolean(getSpeechRecognitionCtor());

  const executeVoiceTranscript = useCallback(
    async (rawText: string, requireWakeWord: boolean) => {
      const trimmed = rawText.trim();
      if (!trimmed || disabled) return;

      const now = Date.now();
      if (
        lastProcessedRef.current.text === trimmed.toLowerCase() &&
        now - lastProcessedRef.current.at < 3500
      ) {
        return;
      }

      const parsed = parseSarinVoiceCommand({
        transcript: trimmed,
        productos,
        combos,
        currentCartItems,
        requireWakeWord,
      });

      if (!parsed.wakeWordDetected) return;

      lastProcessedRef.current = { text: trimmed.toLowerCase(), at: now };
      setLastHeardText(trimmed);
      setLastResult(parsed);
      setInterimTranscript('');

      if (parsed.intent === 'registrar_venta_directa' && parsed.matchedItems.length > 0) {
        await onDirectSale(
          parsed.matchedItems,
          parsed.metodoPago || 'efectivo',
          parsed.montoRecibido
        );
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.intent === 'agregar_al_carrito' && parsed.matchedItems.length > 0) {
        onAddItemsToCart(parsed.matchedItems);
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.intent === 'cobrar_carrito') {
        await onCheckoutCurrentCart(parsed.metodoPago || 'efectivo', parsed.montoRecibido);
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.intent === 'limpiar_carrito') {
        onClearCart();
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.spokenResponse) {
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
      }
    },
    [
      combos,
      currentCartItems,
      disabled,
      onAddItemsToCart,
      onCheckoutCurrentCart,
      onClearCart,
      onDirectSale,
      productos,
      voiceOutputEnabled,
    ]
  );

  useEffect(() => {
    listeningEnabledRef.current = listeningEnabled;
    if (!listeningEnabled) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setInterimTranscript('');
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setMicError('Tu navegador no soporta reconocimiento de voz directo. Usa Chrome o Edge.');
      setListeningEnabled(false);
      return;
    }

    setMicError(null);
    const recognition = new Ctor();
    recognition.lang = 'es-CO';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0]?.transcript || '';
        if (res.isFinal) {
          void executeVoiceTranscript(transcript, true);
        } else {
          interim += transcript;
        }
      }
      setInterimTranscript(interim.trim());
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setMicError('Permiso de micrófono denegado. Habilítalo en la barra del navegador.');
        setListeningEnabled(false);
      }
    };

    recognition.onend = () => {
      // Mantener escucha continua manos libres mientras el turno esté activo
      if (listeningEnabledRef.current) {
        try {
          recognition.start();
        } catch {
          // Si ya está iniciando, ignorar
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setMicError('No se pudo iniciar el micrófono.');
      setListeningEnabled(false);
    }

    return () => {
      recognition.onend = null;
      recognition.stop();
    };
  }, [executeVoiceTranscript, listeningEnabled]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCommand.trim()) return;
    const text = manualCommand;
    setManualCommand('');
    await executeVoiceTranscript(text, false);
  };

  const sampleProductName = productos[0]?.nombre || 'Panceroti Ranchero';
  const samplePrice = productos[0]?.precio ? Math.ceil((productos[0].precio + 1000) / 1000) * 1000 : 5000;

  return (
    <section
      aria-label="Copiloto de voz Sarin"
      className={`mb-5 rounded-2xl border p-4 transition-all ${
        listeningEnabled
          ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 shadow-lg shadow-emerald-950/20'
          : 'border-neutral-800 bg-neutral-900/90'
      }`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              listeningEnabled
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
            }`}
          >
            <Bot className="h-5 w-5" aria-hidden="true" />
            {listeningEnabled && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Sarin Copiloto de Voz</span>
                <Sparkles className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              </h2>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  listeningEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}
              >
                {listeningEnabled ? 'Escuchando "Sarin..." (Manos libres)' : 'Micrófono en pausa'}
              </span>
            </div>

            <p className="mt-0.5 text-xs text-neutral-400">
              Di{' '}
              <span className="font-semibold text-amber-300">
                &ldquo;Sarin registra un {sampleProductName.toLowerCase()} pagado en efectivo con{' '}
                {samplePrice} pesos&rdquo;
              </span>{' '}
              para cobrar sin tocar la pantalla.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {speechSupported && (
            <Button
              type="button"
              variant={listeningEnabled ? 'danger' : 'primary'}
              size="sm"
              onClick={() => setListeningEnabled((prev) => !prev)}
              className="flex items-center gap-1.5 text-xs font-bold"
            >
              {listeningEnabled ? (
                <>
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                  <span>Pausar Escucha</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <span>Activar Manos Libres</span>
                </>
              )}
            </Button>
          )}

          <button
            type="button"
            onClick={() => setVoiceOutputEnabled((prev) => !prev)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:text-white"
            title={voiceOutputEnabled ? 'Silenciar voz de Sarin' : 'Activar voz de Sarin'}
          >
            {voiceOutputEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-neutral-500" aria-hidden="true" />
            )}
            <span>{voiceOutputEnabled ? 'Voz activa' : 'Silenciado'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuide((prev) => !prev)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-amber-400 hover:border-amber-500/40"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{showGuide ? 'Ocultar guía' : ' ¿Cómo hablarle?'}</span>
          </button>
        </div>
      </div>

      {/* Transcripción en vivo o error de micrófono */}
      {interimTranscript && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
          🎙️ Escuchando en vivo: <span className="font-semibold italic">&ldquo;{interimTranscript}&rdquo;</span>
        </div>
      )}

      {micError && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs text-red-300">
          {micError}
        </div>
      )}

      {/* Barra didáctica para escribir o simular un comando a Sarin */}
      <form onSubmit={handleManualSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={manualCommand}
          onChange={(e) => setManualCommand(e.target.value)}
          placeholder={`Escribe o dicta un comando a Sarin (ej: "Sarin registra un ${sampleProductName.toLowerCase()} pagado en efectivo con ${samplePrice} pesos")`}
          aria-label="Comando para Sarin"
          className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={disabled || !manualCommand.trim()}
          className="flex items-center gap-1 text-xs font-bold"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ejecutar</span>
        </Button>
      </form>

      {/* Resultado didáctico del último comando de voz */}
      {lastResult && lastResult.spokenResponse && (
        <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/90 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-neutral-400">
                Dijiste: <span className="font-semibold text-neutral-200">&ldquo;{lastHeardText}&rdquo;</span>
              </p>
              <p className="text-xs font-bold text-emerald-300">{lastResult.spokenResponse}</p>
              {lastResult.didacticTip && (
                <p className="text-[11px] text-amber-300/90">💡 {lastResult.didacticTip}</p>
              )}
            </div>

            {lastResult.cambioCalculado !== undefined && (
              <div className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2 text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Cambio a devolver
                </p>
                <p className="font-display text-lg font-black text-white">
                  {formatCOP(lastResult.cambioCalculado)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guía didáctica interactiva */}
      {showGuide && (
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-2.5">
            <p className="text-xs font-bold text-amber-400">1. Venta directa con vueltas</p>
            <p className="mt-1 text-[11px] text-neutral-300">
              &ldquo;Sarin registra un {sampleProductName.toLowerCase()} pagado en efectivo con{' '}
              {samplePrice} pesos&rdquo;
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-2.5">
            <p className="text-xs font-bold text-emerald-400">2. Armar ticket por pasos</p>
            <p className="mt-1 text-[11px] text-neutral-300">
              &ldquo;Sarin agrega dos {sampleProductName.toLowerCase()}&rdquo; y luego &ldquo;Sarin cobra
              por transferencia&rdquo;
            </p>
          </div>
          <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-2.5">
            <p className="text-xs font-bold text-sky-400">3. Consultar precio o limpiar</p>
            <p className="mt-1 text-[11px] text-neutral-300">
              &ldquo;Sarin cuánto cuesta el {sampleProductName.toLowerCase()}&rdquo; o &ldquo;Sarin limpia
              el carrito&rdquo;
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

