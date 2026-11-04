// src/utils/propinasYModificadores.ts
import type { ItemVenta } from '@/types';
import type { PagoParcialMesa } from '@/types/mesa';

/**
 * Modificadores y términos de cocina rápidos más utilizados en gastronomía y comidas rápidas
 */
export const MODIFICADORES_PREDEFINIDOS = [
  'Término 3/4',
  'Término Medio',
  'Bien Asado',
  'Sin cebolla',
  'Sin salsas',
  'Salsas aparte',
  'Queso extra',
  'Tocineta extra',
  'Para llevar',
  'Para mesa',
  'Poco picante',
  'Sin sal',
] as const;

export type ModificadorPredefinido = (typeof MODIFICADORES_PREDEFINIDOS)[number];

export type OpcionPropina = 0 | 10 | 15 | 'libre';

/**
 * Calcula el monto de propina voluntaria en pesos colombianos (COP).
 * Garantiza enteros positivos sin decimales ni valores negativos o NaN.
 */
export function calcularPropina(
  subtotal: number,
  opcion: OpcionPropina,
  valorLibre?: number
): number {
  const sub = Math.max(0, Math.round(Number(subtotal) || 0));

  if (opcion === 10) {
    return Math.round(sub * 0.1);
  }
  if (opcion === 15) {
    return Math.round(sub * 0.15);
  }
  if (opcion === 'libre') {
    const libre = Number(valorLibre);
    if (!Number.isFinite(libre) || libre <= 0) return 0;
    return Math.round(libre);
  }
  return 0;
}

/**
 * Calcula el total a pagar sumando subtotal y propina voluntaria.
 */
export function calcularTotalConPropina(subtotal: number, propina: number): number {
  const subSeguro = Math.max(0, Math.round(Number(subtotal) || 0));
  const propSegura = Math.max(0, Math.round(Number(propina) || 0));
  return subSeguro + propSegura;
}

/**
 * Calcula el saldo pendiente por cancelar de una cuenta de mesa teniendo en cuenta
 * el total de consumos, la propina voluntaria y los abonos parciales registrados.
 */
export function calcularSaldoPendienteCuenta(
  totalGeneral: number,
  pagosParciales: PagoParcialMesa[] = [],
  propinaGeneral = 0
): {
  totalEsperado: number;
  totalAbonado: number;
  saldoRestante: number;
  estaSaldada: boolean;
} {
  const totalConPropina = calcularTotalConPropina(totalGeneral, propinaGeneral);
  const totalAbonado = (pagosParciales || []).reduce((acc, p) => {
    const neto = Number.isFinite(p.monto) ? Math.max(0, p.monto) : 0;
    return acc + neto;
  }, 0);

  const saldoRestante = Math.max(0, totalConPropina - totalAbonado);
  const estaSaldada = totalConPropina > 0 && saldoRestante === 0;

  return {
    totalEsperado: totalConPropina,
    totalAbonado,
    saldoRestante,
    estaSaldada,
  };
}

/**
 * Formatea modificadores y notas de un ítem en una cadena compacta y legible.
 */
export function formatearModificadoresYNotas(item: Pick<ItemVenta, 'modificadores' | 'notas'>): string {
  const partes: string[] = [];

  if (Array.isArray(item.modificadores) && item.modificadores.length > 0) {
    partes.push(item.modificadores.join(', '));
  }

  if (item.notas && item.notas.trim()) {
    partes.push(`Nota: ${item.notas.trim()}`);
  }

  if (partes.length === 0) return '';
  return `(${partes.join(' · ')})`;
}

