import type { Jornada } from '@/types';

export function resolvePosCheckoutJornada(
  selected: 'mañana' | 'noche' | null,
  current: Jornada
): 'mañana' | 'noche' | null {
  if (selected) return selected;
  return current === 'mañana' || current === 'noche' ? current : null;
}
