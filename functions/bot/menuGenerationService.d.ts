import { Producto } from '../types';
export interface MenuCatalogItem {
    productoId: string;
    catalogoTipo: 'producto' | 'combo';
    nombre: string;
    precio: number;
    categoria?: string;
    descripcion?: string;
}
/**
 * Genera menú con formato WhatsApp desde productos en BD
 */
export declare function generarMenuDeProductos(limite?: number): Promise<string>;
/**
 * Genera menú con combos disponibles
 */
export declare function generarMenuCombo(): Promise<string>;
/**
 * Resuelve números visibles del menú a IDs estables del catálogo.
 * Carga cada colección una sola vez para mantener acotado el costo por mensaje.
 */
export declare function obtenerItemsMenuPorNumeros(numeros: number[]): Promise<Array<MenuCatalogItem | null>>;
/**
 * Compatibilidad para resúmenes heredados que aún guardan un número de menú.
 */
export declare function obtenerProductoPorNumero(numero: number): Promise<Producto | null>;
/**
 * Busca productos por nombre
 */
export declare function buscarProductoPorNombre(busqueda: string): Promise<Producto[]>;
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
