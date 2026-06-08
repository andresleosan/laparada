/**
 * Generador dinámico del menú a partir de Firestore (MOCK - Fase 3)
 * Lee productos y combos con disponible: true y jornada activa
 *
 * TODO (Fase 4+): Implementar lectura real de Firestore
 * TODO (Fase 4+): Cachear menú cada hora para mejor performance
 * TODO (Fase 4+): Incluir fotos de productos
 */
export interface MenuItem {
    id: string;
    numero: number;
    nombre: string;
    precio: number;
    descripcion?: string;
    disponible: boolean;
}
/**
 * Construir menú dinámico formateado para WhatsApp
 * MOCK: retorna menú hardcoded (reemplazar con Firestore en Fase 4+)
 */
export declare function buildMenu(jornada?: 'mañana' | 'noche'): string;
/**
 * Obtener descripción de producto por número
 * Usado para confirmación de pedido
 */
export declare function getProductByNumber(numero: number): MenuItem | null;
