import { useId, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import type { FiltroDietetico } from '@/types';
import {
  ALERGENOS_META,
  ALERGENOS_ORDEN,
  ETIQUETAS_DIETETICAS_META,
  ETIQUETAS_DIETETICAS_ORDEN,
  FILTRO_DIETETICO_VACIO,
  alternarEnLista,
  contarFiltrosDieteticosActivos,
} from '@/utils/alergenosUtils';

export interface FiltroDieteticoBarProps {
  filtro: FiltroDietetico;
  onChange: (filtro: FiltroDietetico) => void;
  /** Total de platos visibles con el filtro aplicado (para anunciar resultados) */
  totalVisibles?: number;
  /** Variante táctil grande para kiosco */
  grande?: boolean;
  className?: string;
}

/**
 * Barra de filtros dietéticos y de alérgenos para Storefront, Kiosco y Menú QR.
 */
export function FiltroDieteticoBar({
  filtro,
  onChange,
  totalVisibles,
  grande = false,
  className = '',
}: FiltroDieteticoBarProps) {
  const panelId = `filtro-alergenos-${useId().replace(/:/g, '')}`;
  const [panelAbierto, setPanelAbierto] = useState(filtro.excluirAlergenos.length > 0);
  const activos = contarFiltrosDieteticosActivos(filtro);
  const alturaPill = grande ? 'min-h-[52px] px-4 text-sm' : 'min-h-[44px] px-3 text-xs';

  return (
    <section
      aria-label="Filtros de dieta y alergias"
      data-testid="filtro-dietetico-bar"
      className={`space-y-2 ${className}`}
    >
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-0.5" role="group" aria-label="Filtrar por dieta">
        {ETIQUETAS_DIETETICAS_ORDEN.map((et) => {
          const meta = ETIQUETAS_DIETETICAS_META[et];
          const activo = filtro.etiquetas.includes(et);
          return (
            <button
              key={et}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange({ ...filtro, etiquetas: alternarEnLista(filtro.etiquetas, et) })}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border font-bold transition-colors ${alturaPill} ${
                activo
                  ? meta.pillActiveClass
                  : 'border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <span aria-hidden="true">{meta.emoji}</span>
              <span>{meta.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          aria-expanded={panelAbierto}
          aria-controls={panelId}
          onClick={() => setPanelAbierto((v) => !v)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border font-bold transition-colors ${alturaPill} ${
            filtro.excluirAlergenos.length > 0
              ? 'border-orange-400 bg-orange-500/20 text-orange-200'
              : 'border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-700 hover:text-white'
          }`}
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          <span>Tengo alergias</span>
          {filtro.excluirAlergenos.length > 0 && (
            <span className="rounded-full bg-orange-400 px-1.5 text-[10px] font-black text-neutral-950">
              {filtro.excluirAlergenos.length}
            </span>
          )}
        </button>

        {activos > 0 && (
          <button
            type="button"
            onClick={() => onChange(FILTRO_DIETETICO_VACIO)}
            aria-label="Quitar todos los filtros de dieta y alergias"
            className={`inline-flex shrink-0 items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-950 font-semibold text-neutral-400 hover:text-white ${alturaPill}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {panelAbierto && (
        <div
          id={panelId}
          className="rounded-2xl border border-orange-500/25 bg-neutral-950/80 p-3 space-y-2"
        >
          <p className="text-[11px] font-semibold text-orange-200">
            Ocultar platos que contengan:
          </p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Excluir alérgenos">
            {ALERGENOS_ORDEN.map((a) => {
              const meta = ALERGENOS_META[a];
              const activo = filtro.excluirAlergenos.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  aria-pressed={activo}
                  aria-label={`Sin ${meta.shortLabel}`}
                  onClick={() =>
                    onChange({ ...filtro, excluirAlergenos: alternarEnLista(filtro.excluirAlergenos, a) })
                  }
                  className={`inline-flex items-center gap-1 rounded-lg border font-bold transition-colors ${
                    grande ? 'min-h-[48px] px-3 text-sm' : 'min-h-[44px] px-2.5 text-xs'
                  } ${
                    activo
                      ? 'border-orange-400 bg-orange-500/25 text-orange-100 line-through decoration-2'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
                  }`}
                >
                  <span aria-hidden="true">{meta.emoji}</span>
                  <span>{meta.shortLabel}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-neutral-400">
            Solo mostramos platos con alérgenos verificados por la cocina. Si tu alergia es severa,
            avísale también a quien te atiende.
          </p>
        </div>
      )}

      {activos > 0 && typeof totalVisibles === 'number' && (
        <p className="text-[11px] font-medium text-neutral-400" role="status" aria-live="polite">
          {totalVisibles === 0
            ? 'Ningún plato cumple estos filtros.'
            : `${totalVisibles} ${totalVisibles === 1 ? 'plato cumple' : 'platos cumplen'} tus filtros.`}
        </p>
      )}
    </section>
  );
}
