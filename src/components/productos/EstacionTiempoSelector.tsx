import { Clock, Flame } from 'lucide-react';
import type { EstacionCocina } from '@/types';
import {
  ESTACIONES_COCINA_META,
  ESTACIONES_COCINA_ORDEN,
  TIEMPOS_PREPARACION_SUGERIDOS,
} from '@/utils/estacionesCocinaUtils';

export interface EstacionTiempoSelectorProps {
  estacionCocina?: EstacionCocina;
  onEstacionChange: (estacion: EstacionCocina | undefined) => void;
  tiempoPreparacionStr: string;
  onTiempoChange: (value: string) => void;
  errorTiempo?: string;
}

export function EstacionTiempoSelector({
  estacionCocina,
  onEstacionChange,
  tiempoPreparacionStr,
  onTiempoChange,
  errorTiempo,
}: EstacionTiempoSelectorProps) {
  const tiempoActualNum = tiempoPreparacionStr.trim() ? Number(tiempoPreparacionStr) : undefined;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span className="text-sm font-bold text-neutral-100">
            Estación de Cocina (KDS) y Tiempo Objetivo
          </span>
        </div>
        {estacionCocina && (
          <button
            type="button"
            onClick={() => onEstacionChange(undefined)}
            className="text-[11px] font-semibold text-neutral-400 hover:text-white underline"
          >
            Auto-detectar
          </button>
        )}
      </div>

      <p className="text-xs text-neutral-400">
        Define a qué pantalla o estación llega la comanda y cuántos minutos tiene el cocinero como objetivo.
      </p>

      {/* Selector táctil de estación */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 gap-2"
        role="group"
        aria-label="Estación de cocina"
      >
        {ESTACIONES_COCINA_ORDEN.map((estId) => {
          const meta = ESTACIONES_COCINA_META[estId];
          const activo = estacionCocina === estId;
          return (
            <button
              key={estId}
              type="button"
              onClick={() => {
                onEstacionChange(activo ? undefined : estId);
                if (!activo && !tiempoPreparacionStr.trim()) {
                  onTiempoChange(String(meta.tiempoDefaultMin));
                }
              }}
              aria-pressed={activo}
              className={`min-h-[44px] flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                activo
                  ? meta.pillActiveClass
                  : 'border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {meta.emoji}
              </span>
              <div className="min-w-0">
                <span className="block truncate">{meta.shortLabel}</span>
                <span className="block text-[10px] font-normal opacity-75">
                  ~{meta.tiempoDefaultMin} min
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tiempo objetivo en minutos */}
      <div className="space-y-2 pt-1">
        <label
          htmlFor="tiempo-preparacion-min"
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300"
        >
          <Clock className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
          <span>Tiempo objetivo de preparación (minutos)</span>
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          {TIEMPOS_PREPARACION_SUGERIDOS.map((min) => {
            const isSelected = tiempoActualNum === min;
            return (
              <button
                key={min}
                type="button"
                onClick={() => onTiempoChange(isSelected ? '' : String(min))}
                aria-pressed={isSelected}
                className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
                  isSelected
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {min}m
              </button>
            );
          })}

          <div className="relative flex items-center ml-auto">
            <input
              id="tiempo-preparacion-min"
              type="number"
              min={1}
              max={180}
              step={1}
              value={tiempoPreparacionStr}
              onChange={(e) => onTiempoChange(e.target.value)}
              placeholder="Ej: 12"
              className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs font-bold text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none min-h-[36px]"
            />
            <span className="ml-1.5 text-xs text-neutral-400">min</span>
          </div>
        </div>

        {errorTiempo && (
          <p className="text-xs font-medium text-red-400" role="alert">
            {errorTiempo}
          </p>
        )}
      </div>
    </div>
  );
}
