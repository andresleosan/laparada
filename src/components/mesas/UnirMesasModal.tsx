import { useEffect, useId, useMemo, useState } from 'react';
import { Merge, Users, X, AlertCircle } from 'lucide-react';
import type { CuentaMesa, Mesa } from '@/types/mesa';
import { formatCOP } from '@/utils/formatCOP';

export interface UnirMesasModalProps {
  isOpen: boolean;
  mesaPrincipal: Mesa | null;
  cuentaPrincipal: CuentaMesa | null;
  mesas: Mesa[];
  onClose: () => void;
  onUnirMesas: (params: {
    mesaPrincipalId: string;
    mesaSecundariaId: string;
    cuentaPrincipalId: string;
    cuentaSecundariaId: string;
    motivo?: string;
  }) => Promise<void>;
}

export function UnirMesasModal({
  isOpen,
  mesaPrincipal,
  cuentaPrincipal,
  mesas,
  onClose,
  onUnirMesas,
}: UnirMesasModalProps) {
  const generatedId = useId();
  const titleId = `unir-mesas-title-${generatedId.replace(/:/g, '')}`;
  const [mesaSecundariaId, setMesaSecundariaId] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setMesaSecundariaId('');
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

  // Filtrar otras mesas ocupadas con cuenta activa
  const mesasOcupadas = useMemo(() => {
    if (!mesaPrincipal) return [];
    return mesas.filter(
      (m) =>
        m.id !== mesaPrincipal.id &&
        (m.estado === 'ocupada' || m.estado === 'por_cobrar') &&
        Boolean(m.cuentaActivaId)
    );
  }, [mesas, mesaPrincipal]);

  if (!isOpen || !mesaPrincipal || !cuentaPrincipal) return null;

  const mesaSecundariaSeleccionada = mesas.find((m) => m.id === mesaSecundariaId);

  // Cálculos de vista previa
  const totalPrincipal = cuentaPrincipal.total || mesaPrincipal.totalActual || 0;
  const totalSecundaria = mesaSecundariaSeleccionada?.totalActual || 0;
  const totalCombinado = totalPrincipal + totalSecundaria;
  const comensalesP = mesaPrincipal.comensales || 1;
  const comensalesS = mesaSecundariaSeleccionada?.comensales || 1;
  const comensalesCombinados = comensalesP + (mesaSecundariaSeleccionada ? comensalesS : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesaSecundariaSeleccionada || !mesaSecundariaSeleccionada.cuentaActivaId || enviando) {
      return;
    }

    setErrorMsg(null);
    setEnviando(true);
    try {
      await onUnirMesas({
        mesaPrincipalId: mesaPrincipal.id,
        mesaSecundariaId: mesaSecundariaSeleccionada.id,
        cuentaPrincipalId: cuentaPrincipal.id,
        cuentaSecundariaId: mesaSecundariaSeleccionada.cuentaActivaId,
        motivo: motivo.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al unir las mesas';
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
              <Merge className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Unir Mesas en Salón
              </h2>
              <p className="text-xs text-neutral-400">
                Fusiona los consumos de otra mesa en {mesaPrincipal.nombre}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de unión de mesas"
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

          {/* Información de mesa receptora */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3.5 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-amber-300/80 uppercase font-black tracking-wider block">
                Mesa Principal Receptora:
              </span>
              <span className="font-display font-bold text-white text-base">
                {mesaPrincipal.nombre}
              </span>
              <span className="text-neutral-400 block">{mesaPrincipal.zona}</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-amber-400 text-sm block">
                {formatCOP(totalPrincipal)}
              </span>
              <span className="text-[11px] text-neutral-400">
                {comensalesP} comensales
              </span>
            </div>
          </div>

          {/* Selector de Mesa a Unir */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Selecciona la Mesa a Fusionar (Secundaria)
            </label>

            {mesasOcupadas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                No hay otras mesas ocupadas en este momento para unir.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                {mesasOcupadas.map((m) => {
                  const seleccionada = mesaSecundariaId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMesaSecundariaId(m.id)}
                      aria-pressed={seleccionada}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left min-h-[50px] transition-all ${
                        seleccionada
                          ? 'border-amber-400 bg-amber-400/10 text-white shadow-md ring-1 ring-amber-400'
                          : 'border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-sm text-white block">
                          {m.nombre}
                        </span>
                        <span className="text-[11px] text-neutral-400">
                          {m.zona} · {m.comensales || 1} personas
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-amber-400 text-xs block">
                          {formatCOP(m.totalActual || 0)}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          Cuenta abierta
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparativa / Previsualización de Unión */}
          {mesaSecundariaSeleccionada && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-2 text-xs">
              <span className="text-[10px] uppercase font-black tracking-wider text-neutral-400 block">
                Resultado de la Fusión:
              </span>
              <div className="grid grid-cols-2 gap-2 text-neutral-300 border-b border-neutral-800 pb-2">
                <div>
                  <span className="text-neutral-400 block text-[11px]">Total Consolidado:</span>
                  <span className="font-display font-black text-amber-400 text-lg">
                    {formatCOP(totalCombinado)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px]">Comensales Combinados:</span>
                  <span className="font-display font-bold text-white text-lg flex items-center gap-1">
                    <Users className="h-4 w-4 text-amber-400" />
                    {comensalesCombinados} personas
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-amber-300/80 pt-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  La mesa {mesaSecundariaSeleccionada.nombre} quedará libre automáticamente y sus comandas se unificarán en {mesaPrincipal.nombre}.
                </span>
              </div>
            </div>
          )}

          {/* Motivo opcional */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Observaciones / Motivo (Opcional)
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej. Grupos se reunieron en una sola mesa..."
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
              disabled={!mesaSecundariaId || enviando}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 py-2.5 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              <Merge className="h-4 w-4" />
              {enviando
                ? 'Fusionando...'
                : mesaSecundariaSeleccionada
                ? `Confirmar Unión con ${mesaSecundariaSeleccionada.nombre}`
                : 'Selecciona una mesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

