/**
 * Escandallo / Receta de ingredientes para un producto o combo.
 * Define la cantidad de insumo requerida por cada unidad vendida.
 */
export interface InsumoReceta {
  /** ID del insumo en la colección 'inventario' */
  insumoId: string;
  /** Nombre del insumo al momento de agregarlo (snapshot para visualización) */
  nombreSnapshot: string;
  /** Cantidad consumida por cada 1 unidad de producto o combo (puede ser decimal, ej: 0.05 kg) */
  cantidad: number;
  /** Unidad de medida del insumo (kg, litros, unidades, gramos, etc.) */
  unidadSnapshot?: string;
}

/**
 * Estado preventivo de inventario para un producto o combo en el POS.
 */
export type EstadoStockItem = 'disponible' | 'bajo_stock' | 'agotado';

export interface AlertaStockItem {
  estado: EstadoStockItem;
  insumoCritico?: string;
  stockActual?: number;
  stockMinimo?: number;
  unidad?: string;
  porcionesDisponibles?: number;
}
