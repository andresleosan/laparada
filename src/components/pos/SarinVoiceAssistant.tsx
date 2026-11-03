import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  History,
  HelpCircle,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Combo, ItemVenta, MetodoPago, Producto } from '@/types';
import {
  formatSarinOperationalResponse,
  parseSarinVoiceCommand,
  playSarinWakeBeep,
  type SarinOperationalSnapshot,
  type SarinVoiceCommandResult,
  type SarinVoiceMatchedItem,
} from '@/utils/sarinVoicePos';
import { formatCOP } from '@/utils/formatCOP';
import { formatHora } from '@/utils/dateUtils';
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

export interface SarinCommandHistoryEntry {
  id: string;
  rawTranscript: string;
  executedAt: Date;
  result: SarinVoiceCommandResult;
  saleId?: string;
  undoable: boolean;
  undone: boolean;
}

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
  ) => Promise<string | void>;
  onAddItemsToCart: (items: SarinVoiceMatchedItem[]) => void;
  onRemoveItemsFromCart?: (items: SarinVoiceMatchedItem[]) => void;
  onUndoDirectSale?: (ventaId: string, items: SarinVoiceMatchedItem[]) => Promise<void>;
  onCheckoutCurrentCart: (metodoPago: MetodoPago, montoRecibido?: number) => Promise<void>;
  onClearCart: () => void;
  onQueryOperationalStatus?: () => Promise<SarinOperationalSnapshot>;
}

export const SarinVoiceAssistant: React.FC<SarinVoiceAssistantProps> = ({
  productos,
  combos,
  currentCartItems,
  disabled = false,
  onDirectSale,
  onAddItemsToCart,
  onRemoveItemsFromCart,
  onUndoDirectSale,
  onCheckoutCurrentCart,
  onClearCart,
  onQueryOperationalStatus,
}) => {
  const [listeningEnabled, setListeningEnabled] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [manualCommand, setManualCommand] = useState('');
  const [lastResult, setLastResult] = useState<SarinVoiceCommandResult | null>(null);
  const [lastHeardText, setLastHeardText] = useState('');
  const [commandHistory, setCommandHistory] = useState<SarinCommandHistoryEntry[]>([]);
  const [micError, setMicError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const listeningEnabledRef = useRef(false);
  const lastProcessedRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  const speechSupported = Boolean(getSpeechRecognitionCtor());

  const pushCommandHistory = useCallback(
    (rawTranscript: string, result: SarinVoiceCommandResult, saleId?: string) => {
      if (result.intent === 'deshacer_ultima_accion') return;
      const undoable =
        (result.intent === 'agregar_al_carrito' && result.matchedItems.length > 0) ||
        (result.intent === 'registrar_venta_directa' && Boolean(saleId && onUndoDirectSale));

      const entry: SarinCommandHistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        rawTranscript,
        executedAt: new Date(),
        result,
        saleId,
        undoable,
        undone: false,
      };

      setCommandHistory((prev) => [entry, ...prev].slice(0, 3));
    },
    [onUndoDirectSale]
  );

  const handleUndoHistoryEntry = useCallback(
    async (entry: SarinCommandHistoryEntry) => {
      if (disabled || !entry.undoable || entry.undone) return;

      if (entry.result.intent === 'agregar_al_carrito' && entry.result.matchedItems.length > 0) {
        onRemoveItemsFromCart?.(entry.result.matchedItems);
        setCommandHistory((prev) =>
          prev.map((item) => (item.id === entry.id ? { ...item, undone: true } : item))
        );
        const msg = `Deshice el comando y retiré ${entry.result.matchedItems
          .map((i) => `${i.cantidad} ${i.nombre}`)
          .join(' y ')} del ticket.`;
        setLastHeardText(`Deshacer: "${entry.rawTranscript}"`);
        setLastResult({
          ...entry.result,
          intent: 'deshacer_ultima_accion',
          spokenResponse: msg,
          didacticTip: 'Puedes volver a ejecutarlo con el botón Repetir cuando quieras.',
        });
        speakSpanish(msg, voiceOutputEnabled);
        return;
      }

      if (
        entry.result.intent === 'registrar_venta_directa' &&
        entry.saleId &&
        onUndoDirectSale
      ) {
        await onUndoDirectSale(entry.saleId, entry.result.matchedItems);
        setCommandHistory((prev) =>
          prev.map((item) => (item.id === entry.id ? { ...item, undone: true } : item))
        );
        const msg = `Venta de ${formatCOP(entry.result.totalCalculado)} anulada correctamente.`;
        setLastHeardText(`Deshacer: "${entry.rawTranscript}"`);
        setLastResult({
          ...entry.result,
          intent: 'deshacer_ultima_accion',
          cambioCalculado: undefined,
          spokenResponse: msg,
          didacticTip: 'La venta fue reversada del registro del día.',
        });
        speakSpanish(msg, voiceOutputEnabled);
      }
    },
    [disabled, onRemoveItemsFromCart, onUndoDirectSale, voiceOutputEnabled]
  );

  const executeVoiceTranscript = useCallback(
    async (
      rawText: string,
      requireWakeWord: boolean,
      options?: { bypassCooldown?: boolean }
    ) => {
      const trimmed = rawText.trim();
      if (!trimmed || disabled) return;

      const now = Date.now();
      if (
        !options?.bypassCooldown &&
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
      setInterimTranscript('');

      // Micro-tono auditivo de confirmación cuando Sarin detecta su nombre y procesa un comando
      if (voiceOutputEnabled) {
        playSarinWakeBeep(parsed.faltanteCalculado !== undefined ? 'warn' : 'ok');
      }

      if (parsed.intent === 'deshacer_ultima_accion') {
        const candidate = commandHistory.find((item) => item.undoable && !item.undone);
        if (candidate) {
          await handleUndoHistoryEntry(candidate);
        } else {
          const fallbackResult: SarinVoiceCommandResult = {
            ...parsed,
            spokenResponse: 'No hay ningún comando reciente pendiente por deshacer.',
            didacticTip: 'Los últimos 3 comandos aparecen debajo con opción de Deshacer o Repetir.',
          };
          setLastResult(fallbackResult);
          speakSpanish(fallbackResult.spokenResponse, voiceOutputEnabled);
        }
        return;
      }

      if (
        parsed.intent === 'consultar_ventas_hoy' ||
        parsed.intent === 'consultar_caja' ||
        parsed.intent === 'consultar_domicilios'
      ) {
        setLastResult(parsed);
        if (onQueryOperationalStatus) {
          try {
            const snapshot = await onQueryOperationalStatus();
            const enriched: SarinVoiceCommandResult = {
              ...parsed,
              ...formatSarinOperationalResponse(parsed.intent, snapshot),
            };
            setLastResult(enriched);
            pushCommandHistory(trimmed, enriched);
            speakSpanish(enriched.spokenResponse, voiceOutputEnabled);
            return;
          } catch {
            const fallbackError: SarinVoiceCommandResult = {
              ...parsed,
              spokenResponse: 'No pude consultar el estado operativo en este momento. Intenta de nuevo.',
            };
            setLastResult(fallbackError);
            speakSpanish(fallbackError.spokenResponse, voiceOutputEnabled);
            return;
          }
        }
        pushCommandHistory(trimmed, parsed);
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      setLastResult(parsed);

      if (parsed.intent === 'registrar_venta_directa' && parsed.matchedItems.length > 0) {
        const saleId = await onDirectSale(
          parsed.matchedItems,
          parsed.metodoPago || 'efectivo',
          parsed.montoRecibido
        );
        pushCommandHistory(
          trimmed,
          parsed,
          typeof saleId === 'string' ? saleId : undefined
        );
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.intent === 'agregar_al_carrito' && parsed.matchedItems.length > 0) {
        onAddItemsToCart(parsed.matchedItems);
        pushCommandHistory(trimmed, parsed);
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.intent === 'cobrar_carrito') {
        await onCheckoutCurrentCart(parsed.metodoPago || 'efectivo', parsed.montoRecibido);
        pushCommandHistory(trimmed, parsed);
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      if (parsed.intent === 'limpiar_carrito') {
        onClearCart();
        pushCommandHistory(trimmed, parsed);
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
        return;
      }

      pushCommandHistory(trimmed, parsed);
      if (parsed.spokenResponse) {
        speakSpanish(parsed.spokenResponse, voiceOutputEnabled);
      }
    },
    [
      combos,
      commandHistory,
      currentCartItems,
      disabled,
      handleUndoHistoryEntry,
      onAddItemsToCart,
      onCheckoutCurrentCart,
      onClearCart,
      onDirectSale,
      onQueryOperationalStatus,
      productos,
      pushCommandHistory,
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
    await executeVoiceTranscript(text, false, { bypassCooldown: true });
  };

  const handleRunTrainingExample = async (exampleCommand: string) => {
    await executeVoiceTranscript(exampleCommand, false, { bypassCooldown: true });
  };

  const sampleProductName = productos[0]?.nombre || 'Panceroti Ranchero';
  const samplePrice = productos[0]?.precio
    ? Math.ceil((productos[0].precio + 500) / 1000) * 1000
    : 5000;

  const directSaleExample = `Sarin registra un ${sampleProductName.toLowerCase()} pagado en efectivo con ${samplePrice} pesos`;
  const addCartExample = `Sarin agrega dos ${sampleProductName.toLowerCase()}`;
  const querySalesExample = 'Sarin cuánto llevamos vendido hoy';
  const queryCashExample = 'Sarin cuánto hay en caja';
  const queryDeliveriesExample = 'Sarin cuántos domicilios hay pendientes';

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
                &ldquo;{directSaleExample}&rdquo;
              </span>{' '}
              o pregunta <span className="font-semibold text-emerald-300">&ldquo;Sarin cuánto llevamos vendido hoy&rdquo;</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {speechSupported && (
            <Button
              type="button"
              variant={listeningEnabled ? 'danger' : 'primary'}
              size="sm"
              aria-pressed={listeningEnabled}
              onClick={() => setListeningEnabled((prev) => !prev)}
              className="flex min-h-11 items-center gap-1.5 text-xs font-bold"
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
            aria-pressed={voiceOutputEnabled}
            aria-label={voiceOutputEnabled ? 'Silenciar voz de Sarin' : 'Activar voz de Sarin'}
            onClick={() => setVoiceOutputEnabled((prev) => !prev)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 hover:border-neutral-700 hover:text-white"
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
            aria-pressed={showGuide}
            onClick={() => setShowGuide((prev) => !prev)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs font-semibold text-amber-400 hover:border-amber-500/40"
          >
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{showGuide ? 'Ocultar entrenamiento' : '¿Cómo hablarle? / Entrenar'}</span>
          </button>
        </div>
      </div>

      {/* Transcripción en vivo o error de micrófono */}
      {interimTranscript && (
        <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">
          🎙️ Escuchando en vivo:{' '}
          <span className="font-semibold italic">&ldquo;{interimTranscript}&rdquo;</span>
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
          placeholder={`Escribe o dicta un comando a Sarin (ej: "${directSaleExample}")`}
          aria-label="Comando para Sarin"
          className="min-h-11 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={disabled || !manualCommand.trim()}
          className="flex min-h-11 items-center gap-1 text-xs font-bold"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Ejecutar</span>
        </Button>
      </form>

      {/* Consultas operativas rápidas por voz o un toque */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-neutral-400 mr-1">
          Consultas rápidas a Sarin:
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleRunTrainingExample(querySalesExample)}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-50"
        >
          <span>¿Cuánto llevamos vendido hoy?</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleRunTrainingExample(queryCashExample)}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:border-emerald-500/40 hover:text-emerald-300 disabled:opacity-50"
        >
          <span>¿Cuánto hay en caja?</span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleRunTrainingExample(queryDeliveriesExample)}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-neutral-300 transition-colors hover:border-sky-500/40 hover:text-sky-300 disabled:opacity-50"
        >
          <span>¿Cuántos domicilios hay pendientes?</span>
        </button>
      </div>

      {/* Resultado didáctico del último comando de voz */}
      {lastResult && lastResult.spokenResponse && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/90 p-3"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-[11px] text-neutral-400">
                Dijiste:{' '}
                <span className="font-semibold text-neutral-200">&ldquo;{lastHeardText}&rdquo;</span>
              </p>
              <p
                className={`text-xs font-bold ${
                  lastResult.faltanteCalculado !== undefined ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {lastResult.spokenResponse}
              </p>
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

            {lastResult.operationalHighlight && (
              <div
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-right ${
                  lastResult.operationalHighlight.tone === 'emerald'
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : lastResult.operationalHighlight.tone === 'sky'
                      ? 'border-sky-500/40 bg-sky-500/10'
                      : 'border-amber-500/40 bg-amber-500/10'
                }`}
              >
                <p
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    lastResult.operationalHighlight.tone === 'emerald'
                      ? 'text-emerald-300'
                      : lastResult.operationalHighlight.tone === 'sky'
                        ? 'text-sky-300'
                        : 'text-amber-300'
                  }`}
                >
                  {lastResult.operationalHighlight.label}
                </p>
                <p className="font-display text-lg font-black text-white">
                  {lastResult.operationalHighlight.valueText}
                </p>
                {lastResult.operationalHighlight.subtext && (
                  <p className="text-[10px] text-neutral-300">
                    {lastResult.operationalHighlight.subtext}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historial de los últimos 3 comandos ejecutados con opción de Deshacer o Repetir */}
      {commandHistory.length > 0 && (
        <div
          aria-label="Historial de comandos recientes de Sarin"
          className="mt-3 rounded-xl border border-neutral-800/90 bg-neutral-950/70 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              <History className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span>Últimos comandos ejecutados ({commandHistory.length}/3)</span>
            </p>
            <span className="text-[10px] text-neutral-500">
              También puedes decir &ldquo;Sarin deshacer&rdquo;
            </span>
          </div>

          <ul className="space-y-2">
            {commandHistory.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-col justify-between gap-2 rounded-lg border border-neutral-800/80 bg-neutral-900/60 px-3 py-2 sm:flex-row sm:items-center"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-semibold ${
                      entry.undone ? 'line-through text-neutral-500' : 'text-neutral-200'
                    }`}
                  >
                    &ldquo;{entry.rawTranscript}&rdquo;
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    {formatHora(entry.executedAt)} ·{' '}
                    {entry.undone ? (
                      <span className="font-semibold text-amber-400">Deshecho</span>
                    ) : (
                      <span className="text-emerald-400">{entry.result.spokenResponse}</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {entry.undoable && !entry.undone && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void handleUndoHistoryEntry(entry)}
                      aria-label={`Deshacer comando ${entry.rawTranscript}`}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Deshacer</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      void executeVoiceTranscript(entry.rawTranscript, false, {
                        bypassCooldown: true,
                      })
                    }
                    aria-label={`Repetir comando ${entry.rawTranscript}`}
                    className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 text-xs font-semibold text-neutral-200 transition-colors hover:border-neutral-600 hover:text-white disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Repetir</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modo Entrenamiento Didáctico Interactivo */}
      {showGuide && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950 p-3 sm:grid-cols-3">
          <div className="flex flex-col justify-between rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-3">
            <div>
              <p className="text-xs font-bold text-amber-400">1. Venta directa con vueltas</p>
              <p className="mt-1 text-[11px] text-neutral-300">
                &ldquo;{directSaleExample}&rdquo;
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleRunTrainingExample(directSaleExample)}
              aria-label={`Probar ejemplo: ${directSaleExample}`}
              className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Probar comando</span>
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-3">
            <div>
              <p className="text-xs font-bold text-emerald-400">2. Armar ticket por pasos</p>
              <p className="mt-1 text-[11px] text-neutral-300">
                &ldquo;{addCartExample}&rdquo; y luego &ldquo;Sarin cobra por transferencia&rdquo;
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleRunTrainingExample(addCartExample)}
              aria-label={`Probar ejemplo: ${addCartExample}`}
              className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Probar en el ticket</span>
            </button>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-neutral-800/80 bg-neutral-900/60 p-3">
            <div>
              <p className="text-xs font-bold text-sky-400">3. Consultas de Caja y Domicilios</p>
              <p className="mt-1 text-[11px] text-neutral-300">
                &ldquo;Sarin cuánto llevamos vendido hoy&rdquo;, &ldquo;Sarin cuánto hay en
                caja&rdquo; o &ldquo;Sarin cuántos domicilios hay pendientes&rdquo;
              </p>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleRunTrainingExample(querySalesExample)}
              aria-label={`Probar ejemplo: ${querySalesExample}`}
              className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 text-xs font-bold text-sky-300 transition-colors hover:bg-sky-500/20 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Consultar ventas hoy</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
