import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Mesa } from '@/types/mesa';
import type { ReservaNegocio } from '@/types/reserva';
import { filtrarMesasCompatibles } from '@/utils/esperaUtils';
import { formatCOP } from '@/utils/formatCOP';
import { formatearOcasionReserva } from '@/utils/reservasUtils';

export interface MeseroOpcionCheckIn {
  id: string;
  nombre: string;
}

export interface CheckInReservaMesaModalProps {
  isOpen: boolean;
  reserva: ReservaNegocio | null;
  mesas: Mesa[];
  mesaPreseleccionada?: Mesa | null;
  meseros?: MeseroOpcionCheckIn[];
  onClose: () => void;
  onConfirmarCheckIn: (params: {
    reserva: ReservaNegocio;
    mesa: Mesa;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
    verificarAnticipoAlSentar?: boolean;
  }) => Promise<void>;
}

export function CheckInReservaMesaModal({
  isOpen,
  reserva,
  mesas,
  mesaPreseleccionada = null,
  meseros = [],
  onClose,
  onConfirmarCheckIn,
}: CheckInReservaMesaModalProps) {
  const generatedId = useId();
  const titleId = `checkin-reserva-${generatedId.replace(/:/g, '')}-title`;

  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string>('');
  const [meseroId, setMeseroId] = useState<string>('');
  const [verificarAnticipoAlSentar, setVerificarAnticipoAlSentar] = useState<boolean>(false);
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const mesasCompatibles = useMemo(() => {
    if (!reserva) return [];
    return filtrarMesasCompatibles(mesas, reserva.personas, reserva.zonaPreferida);
  }, [mesas, reserva]);

  const otrasMesasLibres = useMemo(() => {
    const idsCompatibles = new Set(mesasCompatibles.map((m) => m.id));
    return mesas.filter((m) => m.estado === 'libre' && !idsCompatibles.has(m.id));
  }, [mesas, mesasCompatibles]);

  const todasLibres = useMemo(
    () => [...mesasCompatibles, ...otrasMesasLibres],
    [mesasCompatibles, otrasMesasLibres]
  );

  useEffect(() => {
    if (!isOpen || !reserva) return;
    setErrorLocal(null);
    setMeseroId('');
    setVerificarAnticipoAlSentar(
      Boolean((reserva.anticipoMonto || 0) > 0 && reserva.anticipoEstado === 'pendiente')
    );

    const preferidaId = mesaPreseleccionada?.id || reserva.mesaId;
    const preferidaLibre = preferidaId
      ? todasLibres.find((m) => m.id === preferidaId)
      : undefined;

    if (preferidaLibre) {
      setMesaSeleccionadaId(preferidaLibre.id);
    } else if (mesasCompatibles.length > 0) {
      setMesaSeleccionadaId(mesasCompatibles[0].id);
    } else if (todasLibres.length > 0) {
      setMesaSeleccionadaId(todasLibres[0].id);
    } else {
      setMesaSeleccionadaId('');
    }
  }, [isOpen, reserva, mesaPreseleccionada, todasLibres, mesasCompatibles]);

  if (!isOpen || !reserva) return null;

  const mesaElegida = todasLibres.find((m) => m.id === mesaSeleccionadaId) || null;
  const ocasion = formatearOcasionReserva(reserva.ocasionEspecial);
  const tieneAnticipo = (reserva.anticipoMonto || 0) > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!mesaElegida) {
      setErrorLocal('Selecciona una mesa libre para abrir la cuenta.');
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      const meseroObj = meseros.find((m) => m.id === meseroId);
      await onConfirmarCheckIn({
        reserva,
        mesa: mesaElegida,
        mesero: meseroObj?.nombre,
        meseroId: meseroObj?.id,
        meseroNombre: meseroObj?.nombre,
        verificarAnticipoAlSentar,
      });
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'No se pudo completar el Check-In en la mesa.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Check-In en Salón
              </h2>
              <p className="text-xs text-neutral-400">
                {reserva.clienteNombre} · {reserva.personas}{' '}
                {reserva.personas === 1 ? 'persona' : 'personas'}
                {ocasion ? ` · ${ocasion.emoji} ${ocasion.label}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de check-in"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {errorLocal && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/50 p-3 text-xs text-red-200">
              {errorLocal}
            </div>
          )}

          {/* Resumen de Anticipo Offline */}
          {tieneAnticipo && (
            <div
              className={`rounded-xl border p-3 text-xs space-y-2 ${
                reserva.anticipoEstado === 'verificado'
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                  : 'border-amber-500/30 bg-amber-950/20 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4" />
                  Anticipo ({reserva.anticipoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia'}):
                </span>
                <span className="font-display text-sm font-black">
                  {formatCOP(reserva.anticipoMonto || 0)}
                </span>
              </div>
              {reserva.anticipoReferencia && (
                <p className="text-[11px] opacity-85">Ref: {reserva.anticipoReferencia}</p>
              )}
              {reserva.anticipoEstado === 'pendiente' && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-[11px] font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={verificarAnticipoAlSentar}
                    onChange={(e) => setVerificarAnticipoAlSentar(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500 rounded"
                  />
                  Marcar anticipo como verificado al abrir la mesa
                </label>
              )}
            </div>
          )}

          {/* Selección de Mesa Libre */}
          {todasLibres.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-6 text-center text-xs text-neutral-400">
              No hay mesas libres disponibles en este instante. Libera o cobra una mesa en Salón primero.
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Selecciona mesa libre para abrir cuenta:
              </span>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                {todasLibres.map((mesa, idx) => {
                  const seleccionada = mesaSeleccionadaId === mesa.id;
                  const esAsignada = reserva.mesaId === mesa.id;
                  const esRecomendada = !esAsignada && idx === 0 && mesasCompatibles.length > 0;
                  const capacidadSuficiente = (mesa.capacidad || 0) >= reserva.personas;

                  return (
                    <button
                      key={mesa.id}
                      type="button"
                      aria-pressed={seleccionada}
                      onClick={() => setMesaSeleccionadaId(mesa.id)}
                      className={`flex min-h-[44px] flex-col items-start rounded-xl border p-3 text-left transition-all ${
                        seleccionada
                          ? 'border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400/50'
                          : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="font-display text-sm font-bold text-white">
                          {mesa.nombre}
                        </span>
                        {seleccionada && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <Users className="h-3 w-3" /> {mesa.capacidad} sillas · {mesa.zona}
                      </span>
                      {esAsignada && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold text-gold-400">
                          Mesa reservada
                        </span>
                      )}
                      {esRecomendada && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <Sparkles className="h-3 w-3" /> Recomendada
                        </span>
                      )}
                      {!capacidadSuficiente && (
                        <span className="mt-1 text-[10px] font-medium text-amber-400">
                          Menor capacidad ({mesa.capacidad} &lt; {reserva.personas})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mesero opcional */}
          {meseros.length > 0 && (
            <div>
              <label
                htmlFor="checkin-mesero-select"
                className="mb-1.5 block text-xs font-semibold text-neutral-300"
              >
                Mesero asignado (opcional)
              </label>
              <select
                id="checkin-mesero-select"
                value={meseroId}
                onChange={(e) => setMeseroId(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white focus:border-emerald-400 focus:outline-none"
              >
                <option value="">Sin mesero asignado</option>
                {meseros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-neutral-800 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !mesaElegida}
              className="min-h-[44px] rounded-xl bg-emerald-500 px-5 text-xs font-black text-neutral-950 hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {guardando ? 'Abriendo mesa...' : 'Confirmar Check-In y Abrir Mesa'}
            </button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
