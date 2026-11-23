import { useId } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { PerfilDieteticoFormState } from '@/types';
import {
  ALERGENOS_META,
  ALERGENOS_ORDEN,
  ETIQUETAS_DIETETICAS_META,
  ETIQUETAS_DIETETICAS_ORDEN,
  alternarEnLista,
  detectarIncoherenciasDieteticas,
} from '@/utils/alergenosUtils';

export interface AlergenosDietaSelectorProps {
  valor: PerfilDieteticoFormState;
  onChange: (valor: PerfilDieteticoFormState) => void;
  error?: string;
  esCombo?: boolean;
}

export function AlergenosDietaSelector({
  valor,
  onChange,
  error,
  esCombo = false,
}: AlergenosDietaSelectorProps) {
  const baseId = useId().replace(/:/g, '');
  const caloriasId = `calorias-porcion-${baseId}`;
  const porcionId = `porcion-gramos-${baseId}`;

  const sinAlergenosActivo = valor.declarado && valor.alergenos.length === 0;
  const incoherencias = detectarIncoherenciasDieteticas(
    valor.declarado ? valor.alergenos : [],
    valor.etiquetas
  );

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span className="text-sm font-bold text-neutral-100">
            Alérgenos, Dieta e Información Nutricional
          </span>
        </div>
        {valor.declarado && (
          <button
            type="button"
            onClick={() => onChange({ ...valor, declarado: false, alergenos: [] })}
            className="text-[11px] font-semibold text-neutral-400 hover:text-white underline"
          >
            Marcar como no declarado
          </button>
        )}
      </div>

      <p
        className={`text-xs font-medium ${
          valor.declarado ? 'text-emerald-400' : 'text-neutral-400'
        }`}
      >
        {valor.declarado
          ? '✓ Declaración de alérgenos verificada'
          : "Sin declarar: no aparecerá al filtrar 'Sin alérgenos'"}
      </p>

      {esCombo && (
        <p className="text-[11px] text-amber-300/90">
          Los alérgenos de los productos del combo se suman automáticamente.
        </p>
      )}

      {/* Alérgenos principales */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-neutral-300">
            Alérgenos presentes en este plato
          </span>
          <button
            type="button"
            aria-pressed={sinAlergenosActivo}
            onClick={() => onChange({ ...valor, declarado: true, alergenos: [] })}
            className={`min-h-[36px] rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${
              sinAlergenosActivo
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            Sin alérgenos principales
          </button>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-2"
          role="group"
          aria-label="Alérgenos del plato"
        >
          {ALERGENOS_ORDEN.map((alergenoId) => {
            const meta = ALERGENOS_META[alergenoId];
            const activo = valor.declarado && valor.alergenos.includes(alergenoId);
            return (
              <button
                key={alergenoId}
                type="button"
                aria-pressed={activo}
                title={meta.descripcion}
                onClick={() =>
                  onChange({
                    ...valor,
                    declarado: true,
                    alergenos: alternarEnLista(valor.alergenos, alergenoId),
                  })
                }
                className={`min-h-[44px] flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                  activo
                    ? 'border-orange-400 bg-orange-500/20 text-orange-200'
                    : 'border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                <span aria-hidden="true" className="text-base leading-none">
                  {meta.emoji}
                </span>
                <span className="truncate">{meta.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Etiquetas dietéticas */}
      <div className="space-y-2 pt-1">
        <span className="block text-xs font-semibold text-neutral-300">
          Etiquetas dietéticas para el menú
        </span>
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Etiquetas dietéticas"
        >
          {ETIQUETAS_DIETETICAS_ORDEN.map((etId) => {
            const meta = ETIQUETAS_DIETETICAS_META[etId];
            const activo = valor.etiquetas.includes(etId);
            return (
              <button
                key={etId}
                type="button"
                aria-pressed={activo}
                onClick={() =>
                  onChange({
                    ...valor,
                    etiquetas: alternarEnLista(valor.etiquetas, etId),
                  })
                }
                className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                  activo
                    ? meta.pillActiveClass
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
              >
                <span aria-hidden="true">{meta.emoji}</span>
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advertencias en vivo por incoherencia dieta vs alérgeno */}
      {incoherencias.length > 0 && (
        <div
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs font-medium text-amber-300 space-y-0.5"
        >
          {incoherencias.map((msg) => (
            <p key={msg}>⚠ {msg}</p>
          ))}
        </div>
      )}

      {/* Información nutricional opcional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <label
            htmlFor={caloriasId}
            className="block text-xs font-semibold text-neutral-300"
          >
            Calorías por porción (kcal)
          </label>
          <input
            id={caloriasId}
            type="number"
            min={0}
            max={5000}
            step={1}
            value={valor.caloriasStr}
            onChange={(e) => onChange({ ...valor, caloriasStr: e.target.value })}
            placeholder="Ej: 480"
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-bold text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={porcionId}
            className="block text-xs font-semibold text-neutral-300"
          >
            Porción (g)
          </label>
          <input
            id={porcionId}
            type="number"
            min={1}
            max={5000}
            step={1}
            value={valor.porcionGramosStr}
            onChange={(e) => onChange({ ...valor, porcionGramosStr: e.target.value })}
            placeholder="Ej: 280"
            className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-bold text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs font-medium text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
