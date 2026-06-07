// src/utils/dateUtils.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Formatea una fecha de Firestore en formato corto (ej: "7 Jun, 14:30")
 */
export function formatFechaCorta(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('es-CO', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formatea una fecha en formato largo (ej: "7 de junio de 2026")
 */
export function formatFechaLarga(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Obtiene la hora en formato HH:MM
 */
export function formatHora(timestamp: Timestamp): string {
  const date = timestamp.toDate();
  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Verifica si una fecha es "hoy"
 */
export function esHoy(timestamp: Timestamp): boolean {
  const date = timestamp.toDate();
  const hoy = new Date();
  return (
    date.getDate() === hoy.getDate() &&
    date.getMonth() === hoy.getMonth() &&
    date.getFullYear() === hoy.getFullYear()
  );
}

/**
 * Calcula diferencia en segundos desde ahora
 */
export function segundosDesdeAhora(timestamp: Timestamp): number {
  const ahora = new Date().getTime();
  const entonces = timestamp.toDate().getTime();
  return Math.floor((ahora - entonces) / 1000);
}
