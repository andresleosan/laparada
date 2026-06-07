// src/utils/formatCOP.ts
/**
 * Formatea un número como moneda colombiana (COP)
 * Ejemplo: 15000 → "$15.000"
 */
export function formatCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Parsea una cadena formateada en COP al número
 * Ejemplo: "$15.000" → 15000
 */
export function parseCOP(cadena: string): number {
  // Eliminar símbolos de moneda y espacios, reemplazar separadores
  const cleaned = cadena
    .replace(/[$\s]/g, '')
    .replace(/\./g, '');
  return parseInt(cleaned, 10) || 0;
}
