// functions/src/webhook/menuBuilder.ts
/**
 * Generador dinámico del menú a partir de Firestore
 * Lee productos y combos con disponible: true y jornada activa
 * Genera string formateado para respuesta WhatsApp
 */

export function buildMenu(): string {
  // TODO: Leer de Firestore los combos y productos
  // TODO: Filtrar por jornada activa
  // TODO: Generar string con formato WhatsApp

  return `
🌙 *Menú La Parada — NOCHE*

🌙 *COMBOS ESPECIALES*
1. Combo Pareja — $38.000
   2 Perros + 1 Salchipapa + 2 Bebidas

🌙 *PRODUCTOS*
2. Hamburguesa Clásica — $18.000
3. Perro Corriente — $12.000

Responde con el número del producto o combo que deseas pedir.
  `;
}
