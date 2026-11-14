import type { RangoFechaReporte } from './analiticaFinanciera';

/**
 * Clasificación clásica de Ingeniería de Menú (Matriz BCG Gastronómica de Kasavana & Smith).
 * - estrella: Alta Popularidad + Alto Margen de Contribución
 * - caballo_batalla: Alta Popularidad + Bajo Margen de Contribución
 * - rompecabezas: Baja Popularidad + Alto Margen de Contribución
 * - perro: Baja Popularidad + Bajo Margen de Contribución
 * - sin_costeo: Ítem sin escandallo ni costo de referencia > 0
 */
export type CuadranteBCG =
  | 'estrella'
  | 'caballo_batalla'
  | 'rompecabezas'
  | 'perro'
  | 'sin_costeo';

export type TipoItemMenuIngenieria = 'producto' | 'combo';

export type OrigenCosteoItem =
  | 'receta'
  | 'receta_combo'
  | 'referencia_manual'
  | 'sin_costeo';

export type RedondeoPrecioCOP = 'exacto' | '100' | '500' | '1000';

export interface DesgloseCostoIngrediente {
  insumoId: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  costoUnitarioInsumo: number;
  fuenteCosto: 'kardex' | 'insumo' | 'sin_costo';
  subtotalCostoCOP: number;
  participacionCostoPct: number;
  tieneCosto: boolean;
}

export interface ItemIngenieriaMenu {
  id: string;
  tipo: TipoItemMenuIngenieria;
  nombre: string;
  categoria: string;
  disponible: boolean;
  destacado: boolean;
  precioVenta: number;
  costoUnitarioCOP: number;
  origenCosteo: OrigenCosteoItem;
  tieneCosteo: boolean;
  costeoIncompleto: boolean;
  insumosSinCosto: string[];
  desgloseIngredientes: DesgloseCostoIngrediente[];
  costoReferenciaActual?: number;
  margenContribucionUnitario: number;
  foodCostPct: number;
  margenBrutoPct: number;
  unidadesVendidas: number;
  menuMixPct: number;
  ingresosRealesCOP: number;
  costoTotalPeriodoCOP: number;
  contribucionTotalCOP: number;
  cuadrante: CuadranteBCG;
  popularidadAlta: boolean;
  rentabilidadAlta: boolean;
  precioSugeridoObjetivoCOP: number;
  diferenciaPrecioSugeridoCOP: number;
  recomendacionAccion: string;
}

export interface ResumenIngenieriaMenu {
  periodo: RangoFechaReporte;
  foodCostObjetivoPct: number;
  redondeo: RedondeoPrecioCOP;
  tasaImpuestoIncluidoPct: number;
  totalItemsCatalogo: number;
  itemsCosteados: number;
  itemsSinCosteo: number;
  itemsCosteoIncompleto: number;
  totalUnidadesVendidas: number;
  ingresosTotalesCOP: number;
  costoTotalPeriodoCOP: number;
  contribucionTotalPeriodoCOP: number;
  foodCostPromedioPonderadoPct: number;
  margenContribucionPromedioPonderadoCOP: number;
  umbralPopularidadUnidades: number;
  umbralMenuMixPct: number;
  umbralMargenContribucionCOP: number;
  conteoCuadrantes: Record<CuadranteBCG, number>;
  items: ItemIngenieriaMenu[];
}

export interface ResultadoSimulacionPrecio {
  precioActualCOP: number;
  precioSimuladoCOP: number;
  costoActualCOP: number;
  costoSimuladoCOP: number;
  precioBaseNetaActualCOP: number;
  precioBaseNetaSimuladoCOP: number;
  foodCostActualPct: number;
  foodCostSimuladoPct: number;
  margenUnitarioActualCOP: number;
  margenUnitarioSimuladoCOP: number;
  margenBrutoSimuladoPct: number;
  precioSugeridoObjetivoCOP: number;
  deltaPrecioCOP: number;
  deltaPrecioPct: number;
  deltaUtilidadPeriodoCOP: number;
  nuevoCuadranteProyectado: CuadranteBCG;
  cumpleObjetivoFoodCost: boolean;
}

export interface MetaCuadranteBCG {
  id: CuadranteBCG;
  titulo: string;
  tituloCorto: string;
  emoji: string;
  subtitulo: string;
  estrategia: string;
  badgeClasses: string;
  borderClasses: string;
  bgClasses: string;
  textClasses: string;
  hexColor: string;
}
