// src/utils/jornadaUtils.ts
import type { Jornada } from '@/types';

/**
 * Detecta la jornada activa según la hora actual
 * Mañana: 5:00 - 11:00
 * Noche: 18:00 - 23:59
 */
export function detectJornadaActual(): Jornada {
  const ahora = new Date();
  const hora = ahora.getHours();

  if (hora >= 5 && hora < 11) {
    return 'mañana';
  } else if (hora >= 18) {
    return 'noche';
  }

  // Fuera de horarios, retorna mañana por defecto
  return 'mañana';
}

/**
 * Verifica si una jornada coincide con la hora actual
 */
export function esJornadaActiva(jornada: Jornada): boolean {
  if (jornada === 'ambas') return true;
  return jornada === detectJornadaActual();
}

/**
 * Obtiene el rango de horas de una jornada
 */
export function getRangoJornada(jornada: Jornada): { inicio: number; fin: number } {
  switch (jornada) {
    case 'mañana':
      return { inicio: 5, fin: 11 };
    case 'noche':
      return { inicio: 18, fin: 24 };
    default:
      return { inicio: 0, fin: 24 };
  }
}

/**
 * Nombre legible de la jornada
 */
export function getNombreJornada(jornada: Jornada): string {
  const nombres: Record<Jornada, string> = {
    mañana: '🌅 Mañana',
    noche: '🌙 Noche',
    ambas: '🔄 Ambas',
  };
  return nombres[jornada];
}
