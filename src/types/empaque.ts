import type { ConsumoInsumoCalculado } from '@/utils/recetasEscandallo';

/**
 * Canal de consumo del pedido para determinar el uso de empaques, bolsas y desechables.
 */
export type CanalEmpaque = 'salon' | 'para_llevar' | 'domicilio';

/**
 * Categoría operativa para clasificar empaques y desechables en bodega.
 */
export type CategoriaEmpaque =
  | 'caja_contenedor'
  | 'bolsa'
  | 'vaso_tapa'
  | 'cubiertos_servilletas'
  | 'papel_aluminio'
  | 'otro';

/**
 * Resumen calculado del consumo y costo automático de empaques para un pedido o venta.
 */
export interface ResumenEmpaqueCalculado {
  canal: CanalEmpaque;
  aplicaEmpaque: boolean;
  consumos: ConsumoInsumoCalculado[];
  costoTotalCOP: number;
  cantidadUnidadesEmpaque: number;
}
