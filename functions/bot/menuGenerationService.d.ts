import { Producto } from '../types';
/**
 * Genera menú con formato WhatsApp desde productos en BD
 */
export declare function generarMenuDeProductos(limite?: number): Promise<string>;
/**
 * Genera menú con combos disponibles
 */
export declare function generarMenuCombo(): Promise<string>;
/**
 * Obtiene producto por número de menú
 */
export declare function obtenerProductoPorNumero(numero: number): Promise<Producto | null>;
/**
 * Genera resumen del menú para búsqueda rápida
 */
export declare function generarIndiceMenu(): Promise<Map<number, string>>;
/**
 * Busca productos por nombre
 */
export declare function buscarProductoPorNombre(busqueda: string): Promise<Producto[]>;
/**
 * Genera mensaje con disponibilidad del producto
 */
export declare function verificarDisponibilidad(productoId: string): Promise<string>;
/**
 * Cache de menú en Firestore para acceso rápido
 */
export declare function actualizarCacheMenu(): Promise<void>;
/**
 * Obtiene menú del cache si está vigente
 */
export declare function obtenerMenuDelCache(): Promise<{
    menuProductos: string;
    menuCombos: string;
} | null>;
