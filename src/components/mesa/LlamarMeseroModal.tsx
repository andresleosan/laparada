import React, { useState, useEffect, useId } from 'react';
import {
  BellRing,
  UtensilsCrossed,
  Wine,
  Sparkles,
  Receipt,
  MessageSquare,
  X,
  CheckCircle2,
  Clock,
  Send,
} from 'lucide-react';
import type { MotivoLlamadoMesero } from '@/types/menuMesa';
import { MOTIVOS_LLAMADO_MESERO } from '@/utils/menuMesaUtils';

export interface LlamarMeseroModalProps {
  isOpen: boolean;
  mesaNumero: number;
  mesaNombre: string;
  onClose: () => void;
  onSubmit: (params: {
    motivo: MotivoLlamadoMesero;
    notas?: string;
    clienteNombre?: string;
  }) => Promise<void>;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BellRing,
  UtensilsCrossed,
  Wine,
  Sparkles,
  Receipt,
  MessageSquare,
};

export const LlamarMeseroModal: React.FC<LlamarMeseroModalProps> = ({
  isOpen,
  mesaNumero,
  mesaNombre,
  onClose,
  onSubmit,
}) => {
  const idPrefix = useId();
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<MotivoLlamadoMesero>('asistencia');
  const [notas, setNotas] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  // Escuchar tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !enviando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, enviando, onClose]);

  // Manejador del temporizador de enfriamiento (cooldown 60s)
  useEffect(() => {
    if (segundosRestantes <= 0) return;
    const interval = setInterval(() => {
      setSegundosRestantes((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [segundosRestantes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (segundosRestantes > 0 || enviando) return;

    setEnviando(true);
    try {
      await onSubmit({
        motivo: motivoSeleccionado,
        notas: notas.trim() || undefined,
        clienteNombre: clienteNombre.trim() || undefined,
      });
      setEnviadoExitoso(true);
      setSegundosRestantes(60);
      setNotas('');
      setTimeout(() => {
        setEnviadoExitoso(false);
        onClose();
      }, 2000);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-title`}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-sm transition-all"
    >
      <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h2 id={`${idPrefix}-title`} className="font-display text-lg font-bold text-white">
                Llamar al Mesero
              </h2>
              <p className="text-xs text-neutral-400">
                {mesaNombre || `Mesa ${mesaNumero}`} · Asistencia inmediata en salón
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensaje de Confirmación / Éxito */}
        {enviadoExitoso ? (
          <div className="my-8 py-6 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h3 className="text-xl font-black text-white font-display">
              ¡Llamado Enviado!
            </h3>
            <p className="text-xs text-neutral-300 max-w-xs mx-auto">
              Tu mesero ya recibió la alerta en la pantalla de servicio y se acerca a tu mesa.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Aviso de Cooldown Activo si ya envió recientemente */}
            {segundosRestantes > 0 && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300">
                <Clock className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  Llamado en curso. Podrás solicitar otra asistencia en{' '}
                  <strong className="font-mono text-white">{segundosRestantes}s</strong>.
                </span>
              </div>
            )}

            {/* Selector de Motivo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                ¿En qué podemos ayudarte?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MOTIVOS_LLAMADO_MESERO.map((m) => {
                  const IconComp = ICON_MAP[m.icono] || BellRing;
                  const seleccionado = motivoSeleccionado === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMotivoSeleccionado(m.id)}
                      className={`flex min-h-[52px] flex-col justify-center rounded-2xl border p-3 text-left transition-all active:scale-95 ${
                        seleccionado
                          ? 'border-amber-400 bg-amber-500/15 text-white shadow-md'
                          : 'border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <IconComp
                          className={`h-4 w-4 shrink-0 ${
                            seleccionado ? 'text-amber-400' : 'text-neutral-400'
                          }`}
                        />
                        <span className="text-xs font-black leading-tight line-clamp-1">
                          {m.label}
                        </span>
                      </div>
                      <span className="mt-1 text-[10px] text-neutral-400 line-clamp-1">
                        {m.descripcion}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Campo Opcional de Observación o Detalle */}
            <div>
              <label
                htmlFor={`${idPrefix}-notas`}
                className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Detalle específico (Opcional)
              </label>
              <input
                id={`${idPrefix}-notas`}
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Salsa de ajo extra, servilletas y 2 vasos con hielo..."
                maxLength={120}
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Campo Opcional: Nombre del Comensal */}
            <div>
              <label
                htmlFor={`${idPrefix}-nombre`}
                className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1.5"
              >
                Tu Nombre o Apodo (Opcional)
              </label>
              <input
                id={`${idPrefix}-nombre`}
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej: Andrés, Familia Gómez..."
                maxLength={40}
                className="w-full min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Botón de Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={enviando || segundosRestantes > 0}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-3 text-sm font-black text-neutral-950 shadow-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span>
                  {enviando
                    ? 'Notificando mesero...'
                    : segundosRestantes > 0
                    ? `Espera ${segundosRestantes}s`
                    : 'Enviar Llamado al Mesero'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
