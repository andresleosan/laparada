import { useId, useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { AlergenoId, ConflictoAlergiaItem } from '@/types';
import {
  ALERGENOS_META,
  ALERGENOS_ORDEN,
  alternarEnLista,
  formatearAlergenos,
} from '@/utils/alergenosUtils';

export interface AlergiasComensalValor {
  alergenos: AlergenoId[];
  nota: string;
}

export const ALERGIAS_COMENSAL_VACIAS: AlergiasComensalValor = { alergenos: [], nota: '' };

export interface AlergiasComensalPanelProps {
  valor: AlergiasComensalValor;
  onChange: (valor: AlergiasComensalValor) => void;
  /** Platos de la comanda que contienen alérgenos declarados por el comensal */
  conflictos?: ConflictoAlergiaItem[];
  disabled?: boolean;
}

/**
 * Panel táctil para registrar alergias del comensal en POS y Mesas.
 * Viaja a la comanda de cocina (KDS) como alerta destacada.
 */
export function AlergiasComensalPanel({
  valor,
  onChange,
  conflictos = [],
  disabled = false,
}: AlergiasComensalPanelProps) {
  const baseId = useId().replace(/:/g, '');
  const panelId = `alergias-comensal-${baseId}`;
  const notaId = `alergias-nota-${baseId}`;
  const tieneDatos = valor.alergenos.length > 0 || valor.nota.trim().length > 0;
  const [abierto, setAbierto] = useState(tieneDatos);
  const expandido = abierto || tieneDatos;

  return (
    <div
      data-testid="alergias-comensal-panel"
      className={`rounded-2xl border p-3 space-y-2.5 ${
        tieneDatos ? 'border-red-500/50 bg-red-950/25' : 'border-neutral-800 bg-neutral-900/70'
      }`}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={expandido}
        aria-controls={panelId}
        disabled={disabled || tieneDatos}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 text-left disabled:cursor-default"
      >
        <span className="flex items-center gap-2">
          <ShieldAlert
            className={`h-4 w-4 ${tieneDatos ? 'text-red-400' : 'text-amber-400'}`}
            aria-hidden="true"
          />
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Alergias del comensal
          </span>
        </span>
        <span className={`text-[11px] font-bold ${tieneDatos ? 'text-red-300' : 'text-neutral-400'}`}>
          {valor.alergenos.length > 0
            ? formatearAlergenos(valor.alergenos)
            : tieneDatos
              ? 'Con nota'
              : expandido
                ? 'Ocultar'
                : '+ Registrar'}
        </span>
      </button>

      {expandido && (
        <div id={panelId} className="space-y-2.5">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="group" aria-label="Alérgenos del comensal">
            {ALERGENOS_ORDEN.map((a) => {
              const meta = ALERGENOS_META[a];
              const activo = valor.alergenos.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={activo}
                  disabled={disabled}
                  onClick={() => onChange({ ...valor, alergenos: alternarEnLista(valor.alergenos, a) })}
                  className={`flex min-h-[44px] items-center gap-1.5 rounded-lg border px-2 text-xs font-bold transition-colors disabled:opacity-50 ${
                    activo
                      ? 'border-red-400 bg-red-500/25 text-red-100'
                      : 'border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:text-white'
                  }`}
                >
                  <span aria-hidden="true">{meta.emoji}</span>
                  <span className="truncate">{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-1">
            <label htmlFor={notaId} className="block text-[11px] font-semibold text-neutral-400">
              Nota de alergia / restricción (opcional)
            </label>
            <input
              id={notaId}
              type="text"
              maxLength={200}
              value={valor.nota}
              disabled={disabled}
              onChange={(e) => onChange({ ...valor, nota: e.target.value })}
              placeholder="Ej: Alergia severa, usar utensilios y aceite aparte"
              className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white placeholder-neutral-500 focus:border-red-400 focus:outline-none"
            />
          </div>

          {tieneDatos && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(ALERGIAS_COMENSAL_VACIAS);
                setAbierto(false);
              }}
              className="text-[11px] font-semibold text-neutral-400 underline hover:text-white"
            >
              Quitar alergias registradas
            </button>
          )}
        </div>
      )}

      {conflictos.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-red-500 p-2.5 text-xs font-bold text-white shadow-md"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="space-y-0.5">
            <p className="uppercase tracking-wide text-[11px] font-black">
              Atención: {conflictos.length} {conflictos.length === 1 ? 'plato contiene' : 'platos contienen'} alérgenos declarados
            </p>
            <ul className="font-semibold">
              {conflictos.map((c) => (
                <li key={`${c.itemIndex}-${c.nombre}`}>
                  {c.nombre}: {formatearAlergenos(c.alergenos)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
