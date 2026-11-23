import type { PerfilDietetico } from '@/types';
import {
  ALERGENOS_META,
  ETIQUETAS_DIETETICAS_META,
  formatearAlergenos,
} from '@/utils/alergenosUtils';

export interface BadgesDieteticosProps {
  perfil?: PerfilDietetico;
  /** Muestra la fila "Contiene" con los alérgenos declarados */
  mostrarAlergenos?: boolean;
  /** Muestra kcal y porción si existen */
  mostrarNutricion?: boolean;
  /** Variante compacta para tarjetas pequeñas */
  compacto?: boolean;
  className?: string;
}

/**
 * Badges de etiquetas dietéticas, alérgenos e información nutricional de un plato.
 * No renderiza nada si el plato no tiene información dietética declarada.
 */
export function BadgesDieteticos({
  perfil,
  mostrarAlergenos = true,
  mostrarNutricion = false,
  compacto = false,
  className = '',
}: BadgesDieteticosProps) {
  if (!perfil) return null;
  const { etiquetas, alergenos, infoNutricional } = perfil;
  const tieneNutricion =
    mostrarNutricion &&
    (infoNutricional?.calorias !== undefined || infoNutricional?.porcionGramos !== undefined);
  const verAlergenos = mostrarAlergenos && alergenos.length > 0;
  if (etiquetas.length === 0 && !verAlergenos && !tieneNutricion) return null;

  const textoBase = compacto ? 'text-[10px]' : 'text-[11px]';

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`} data-testid="badges-dieteticos">
      {etiquetas.map((et) => {
        const meta = ETIQUETAS_DIETETICAS_META[et];
        return (
          <span
            key={et}
            title={meta.label}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold ${textoBase} ${meta.badgeClass}`}
          >
            <span aria-hidden="true">{meta.emoji}</span>
            <span>{compacto ? meta.shortLabel : meta.label}</span>
          </span>
        );
      })}

      {verAlergenos && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 font-semibold text-orange-200 ${textoBase}`}
          aria-label={`Contiene alérgenos: ${formatearAlergenos(alergenos)}`}
          title={`Contiene: ${formatearAlergenos(alergenos)}`}
        >
          <span className="font-black uppercase tracking-wide">Contiene</span>
          {compacto ? (
            <span aria-hidden="true">{alergenos.map((a) => ALERGENOS_META[a].emoji).join(' ')}</span>
          ) : (
            <span aria-hidden="true">{formatearAlergenos(alergenos)}</span>
          )}
        </span>
      )}

      {tieneNutricion && (
        <span
          className={`inline-flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800/80 px-1.5 py-0.5 font-semibold text-neutral-300 ${textoBase}`}
        >
          {infoNutricional?.calorias !== undefined && <span>{infoNutricional.calorias} kcal</span>}
          {infoNutricional?.calorias !== undefined && infoNutricional?.porcionGramos !== undefined && (
            <span aria-hidden="true">·</span>
          )}
          {infoNutricional?.porcionGramos !== undefined && <span>{infoNutricional.porcionGramos} g</span>}
        </span>
      )}
    </div>
  );
}
