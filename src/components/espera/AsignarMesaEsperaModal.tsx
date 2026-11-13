import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Sparkles, Users, Utensils, X } from 'lucide-react';
import type { Mesa } from '@/types/mesa';
import type { TurnoEspera } from '@/types/espera';
import { filtrarMesasCompatibles } from '@/utils/esperaUtils';
import { Button } from '@/components/ui/Button';

interface MeseroOpcion {
  id: string;
  nombre: string;
}

interface AsignarMesaEsperaModalProps {
  isOpen: boolean;
  turno: TurnoEspera | null;
  mesas: Mesa[];
  meseros?: MeseroOpcion[];
  onClose: () => void;
  onConfirmar: (params: {
    turnoId: string;
    mesaId: string;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
  }) => Promise<void>;
}

export function AsignarMesaEsperaModal({
  isOpen,
  turno,
  mesas,
  meseros = [],
  onClose,
  onConfirmar,
}: AsignarMesaEsperaModalProps) {
  const [mesaSeleccionadaId, setMesaSeleccionadaId] = useState<string>('');
  const [meseroId, setMeseroId] = useState<string>('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const mesasCompatibles = useMemo(() => {
    if (!turno) return [];
    return filtrarMesasCompatibles(mesas, turno.personas, turno.zonaPreferida);
  }, [mesas, turno]);

  const otrasMesasLibres = useMemo(() => {
    const idsCompatibles = new Set(mesasCompatibles.map((m) => m.id));
    return mesas.filter((m) => m.estado === 'libre' && !idsCompatibles.has(m.id));
  }, [mesas, mesasCompatibles]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    if (mesasCompatibles.length > 0) {
      setMesaSeleccionadaId(mesasCompatibles[0].id);
    } else if (otrasMesasLibres.length > 0) {
      setMesaSeleccionadaId(otrasMesasLibres[0].id);
    } else {
      setMesaSeleccionadaId('');
    }
  }, [isOpen, mesasCompatibles, otrasMesasLibres]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardando, onClose]);

  if (!isOpen || !turno) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mesaSeleccionadaId) {
      setErrorLocal('Selecciona una mesa libre para sentar al grupo.');
      return;
    }

    try {
      setGuardando(true);
      setErrorLocal(null);
      const meseroObj = meseros.find((m) => m.id === meseroId);
      await onConfirmar({
        turnoId: turno.id,
        mesaId: mesaSeleccionadaId,
        mesero: meseroObj?.nombre,
        meseroId: meseroObj?.id,
        meseroNombre: meseroObj?.nombre,
      });
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'No se pudo asignar la mesa');
    } finally {
      setGuardando(false);
    }
  };

  const todasLibres = [...mesasCompatibles, ...otrasMesasLibres];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-asignar-mesa-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Utensils className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-asignar-mesa-title" className="font-display text-lg font-bold text-white">
                Sentar Turno {turno.codigoTurno}
              </h2>
              <p className="text-xs text-neutral-400">
                {turno.clienteNombre} • {turno.personas} personas
                {turno.zonaPreferida ? ` • Pref: ${turno.zonaPreferida}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de asignación de mesa"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {errorLocal && (
            <div className="rounded-xl border border-red-800/80 bg-red-950/60 p-2.5 text-xs text-red-200">
              {errorLocal}
            </div>
          )}

          {todasLibres.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-neutral-400">
              No hay mesas libres en este momento. Desocupa o cobra una mesa en Salón primero.
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-neutral-300">
                Mesas libres disponibles:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {todasLibres.map((mesa, idx) => {
                  const esRecomendada = idx === 0 && mesasCompatibles.length > 0;
                  const seleccionada = mesaSeleccionadaId === mesa.id;
                  const capacidadSuficiente = (mesa.capacidad || 0) >= turno.personas;

                  return (
                    <button
                      key={mesa.id}
                      type="button"
                      aria-pressed={seleccionada}
                      onClick={() => setMesaSeleccionadaId(mesa.id)}
                      className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                        seleccionada
                          ? 'border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400/50'
                          : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-bold text-sm text-white">{mesa.nombre}</span>
                        {seleccionada && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-neutral-400">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" /> {mesa.capacidad} sillas
                        </span>
                        <span>• {mesa.zona}</span>
                      </div>
                      {esRecomendada && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          <Sparkles className="h-3 w-3" /> Recomendada
                        </span>
                      )}
                      {!capacidadSuficiente && (
                        <span className="mt-1 text-[10px] font-medium text-amber-400">
                          Menor capacidad ({mesa.capacidad} &lt; {turno.personas})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {meseros.length > 0 && (
            <div>
              <label htmlFor="asignar-mesero" className="mb-1 block text-xs font-semibold text-neutral-300">
                Mesero asignado (opcional)
              </label>
              <select
                id="asignar-mesero"
                value={meseroId}
                onChange={(e) => setMeseroId(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs text-white focus:border-amber-500 focus:outline-none"
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
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px] text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={guardando || !mesaSeleccionadaId}
              className="min-h-[44px] bg-emerald-500 text-xs font-black text-neutral-950 hover:bg-emerald-400"
            >
              {guardando ? 'Asignando...' : 'Abrir Mesa y Sentar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
