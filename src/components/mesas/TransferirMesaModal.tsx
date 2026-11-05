import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Users, X } from 'lucide-react';
import type { Mesa } from '@/types/mesa';

export interface TransferirMesaModalProps {
  isOpen: boolean;
  mesaActual: Mesa | null;
  mesas: Mesa[];
  onClose: () => void;
  onTransferir: (params: {
    mesaOrigenId: string;
    mesaDestinoId: string;
    motivo?: string;
  }) => Promise<void>;
}

export function TransferirMesaModal({
  isOpen,
  mesaActual,
  mesas,
  onClose,
  onTransferir,
}: TransferirMesaModalProps) {
  const generatedId = useId();
  const titleId = `transferir-mesa-title-${generatedId.replace(/:/g, '')}`;
  const [mesaDestinoId, setMesaDestinoId] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMesaDestinoId('');
      setMotivo('');
      setEnviando(false);
      setErrorMsg(null);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtrar mesas libres diferentes a la actual
  const mesasLibres = useMemo(() => {
    if (!mesaActual) return [];
    return mesas.filter(
      (m) => m.id !== mesaActual.id && m.estado === 'libre' && !m.cuentaActivaId
    );
  }, [mesas, mesaActual]);

  if (!isOpen || !mesaActual) return null;

  const mesaDestinoSeleccionada = mesas.find((m) => m.id === mesaDestinoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesaDestinoId || enviando) return;

    setErrorMsg(null);
    setEnviando(true);
    try {
      await onTransferir({
        mesaOrigenId: mesaActual.id,
        mesaDestinoId,
        motivo: motivo.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al transferir la mesa';
      setErrorMsg(msg);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Trasladar {mesaActual.nombre}
              </h2>
              <p className="text-xs text-neutral-400">
                Mueve los comensales y consumos activos a otra mesa libre
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de traslado"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {errorMsg && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-3 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          {/* Resumen de origen */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-neutral-400 uppercase font-black tracking-wider block text-[10px]">
                Mesa Origen:
              </span>
              <span className="font-bold text-white text-sm">{mesaActual.nombre}</span>
              <span className="text-neutral-400 block">{mesaActual.zona}</span>
            </div>
            {Boolean(mesaActual.comensales) && (
              <span className="flex items-center gap-1 rounded-lg bg-neutral-800 px-2 py-1 font-semibold text-amber-400">
                <Users className="h-3.5 w-3.5" />
                {mesaActual.comensales} personas
              </span>
            )}
          </div>

          {/* Selector de Mesas Libres */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Selecciona la Mesa Destino (Libre)
            </label>

            {mesasLibres.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                No hay otras mesas libres disponibles en este momento en el salón.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                {mesasLibres.map((m) => {
                  const seleccionada = mesaDestinoId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMesaDestinoId(m.id)}
                      aria-pressed={seleccionada}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left min-h-[56px] transition-all ${
                        seleccionada
                          ? 'border-amber-400 bg-amber-400/10 text-white shadow-lg ring-1 ring-amber-400'
                          : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-display font-bold text-sm text-white">
                          {m.nombre}
                        </span>
                        {seleccionada && (
                          <Check className="h-4 w-4 text-amber-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 truncate w-full mt-0.5">
                        {m.zona} · Cap: {m.capacidad}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Motivo opcional */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Motivo del Traslado (Opcional)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Clientes pidieron mesa exterior / más espacio..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="min-h-[44px] rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!mesaDestinoId || enviando}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <ArrowRightLeft className="h-4 w-4" />
              {enviando
                ? 'Trasladando...'
                : mesaDestinoSeleccionada
                ? `Confirmar Traslado a ${mesaDestinoSeleccionada.nombre}`
                : 'Selecciona una mesa libre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

