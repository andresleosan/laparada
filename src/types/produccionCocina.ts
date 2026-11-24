import type { Timestamp } from 'firebase/firestore';
import type { InsumoReceta } from './receta';

/**
 * Categorías operativas de preparaciones base / sub-recetas de cocina
 */
export type CategoriaSubReceta =
  | 'salsas_casa'
  | 'carnes_marinadas'
  | 'masas_panaderia'
  | 'rellenos_quesos'
  | 'aderezos_toppings'
  | 'otro';

/**
 * Metadatos visuales de cada categoría de sub-receta
 */
export interface InfoCategoriaSubReceta {
  id: CategoriaSubReceta;
  label: string;
  descripcion: string;
  emoji: string;
}

/**
 * Ingrediente sugerido en una plantilla rápida de preparación base
 */
export interface PlantillaSubRecetaIngredienteSugerido {
  nombreSugerido: string;
  cantidad: number;
  unidad: string;
}

/**
 * Plantilla sugerida para acelerar la configuración de preparaciones base
 */
export interface PlantillaSubRecetaSugerida {
  id: string;
  nombre: string;
  categoriaSubReceta: CategoriaSubReceta;
  unidad: string;
  rendimientoLote: number;
  stockMinimo: number;
  tiempoPreparacionMin: number;
  vidaUtilHoras: number;
  instruccionesPreparacion: string;
  ingredientesSugeridos: PlantillaSubRecetaIngredienteSugerido[];
}

/**
 * Datos de configuración para crear o actualizar una sub-receta en `inventario`
 */
export interface GuardarSubRecetaInput {
  id?: string;
  nombre: string;
  categoriaSubReceta: CategoriaSubReceta;
  unidad: string;
  rendimientoLote: number;
  stockActual?: number;
  stockMinimo: number;
  recetaInsumos: InsumoReceta[];
  instruccionesPreparacion?: string;
  tiempoPreparacionMin?: number;
  vidaUtilHoras?: number;
  costoUnitario?: number;
}

/**
 * Resultado de validación de configuración de sub-receta
 */
export interface ValidacionSubReceta {
  valida: boolean;
  errores: string[];
}

/**
 * Desglose calculado por cada insumo primario al simular o producir un lote
 */
export interface DesgloseConsumoProduccionItem {
  insumoId: string;
  nombre: string;
  unidad: string;
  cantidadBasePorLote: number;
  cantidadRequerida: number;
  stockActual: number;
  stockPosterior: number;
  alcanzaStock: boolean;
  faltante: number;
  costoUnitarioCOP: number;
  subtotalCostoCOP: number;
  sinCostoRegistrado: boolean;
}

/**
 * Simulación previa de producción de un lote de preparación base
 */
export interface SimulacionLoteProduccion {
  subRecetaId: string;
  subRecetaNombre: string;
  unidadSalida: string;
  multiplicadorLotes: number;
  rendimientoEsperado: number;
  cantidadProducidaReal: number;
  mermaCoccionCantidad: number;
  mermaCoccionPct: number;
  desgloseInsumos: DesgloseConsumoProduccionItem[];
  insumosFaltantes: DesgloseConsumoProduccionItem[];
  todosInsumosDisponibles: boolean;
  lotesMaximosPosibles: number;
  costoTotalLoteCOP: number;
  costoUnitarioResultanteCOP: number;
  insumosSinCostoCount: number;
}

/**
 * Parámetros para ejecutar transaccionalmente la producción de un lote
 */
export interface RegistrarProduccionLoteInput {
  subRecetaId: string;
  multiplicadorLotes: number;
  cantidadProducidaReal?: number;
  responsable?: string;
  notas?: string;
  permitirStockParcial?: boolean;
  costosUnitariosPorInsumo?: Record<string, number>;
  fechaVencimiento?: string | null;
  codigoLote?: string;
}

/**
 * Respuesta tras completar la conversión atómica en bodega y Kardex
 */
export interface ResultadoProduccionLote {
  loteProduccionId: string;
  subRecetaId: string;
  subRecetaNombre: string;
  cantidadProducida: number;
  unidadSalida: string;
  costoTotalLoteCOP: number;
  costoUnitarioResultanteCOP: number;
  stockPrevioSubReceta: number;
  stockResultanteSubReceta: number;
  insumosConsumidosCount: number;
}

/**
 * Resumen reconstruido desde Kardex de un lote producido en cocina
 */
export interface ResumenLoteHistoricoKardex {
  loteProduccionId: string;
  subRecetaId: string;
  subRecetaNombre: string;
  cantidadProducida: number;
  unidadSalida: string;
  costoTotalLoteCOP: number;
  costoUnitarioCOP: number;
  multiplicadorLotes: number;
  insumosConsumidos: Array<{
    insumoId: string;
    insumoNombre: string;
    cantidad: number;
    unidadMedida: string;
  }>;
  responsable: string;
  notas: string;
  fecha: Timestamp;
}

/**
 * Indicadores ejecutivos del centro de producción y sub-recetas
 */
export interface MetricasProduccionCocina {
  totalSubRecetas: number;
  subRecetasConStockBajo: number;
  subRecetasListasParaProducir: number;
  subRecetasBloqueadasPorFaltaInsumo: number;
  lotesProducidosHoy: number;
  lotesProducidosPeriodo: number;
  costoTotalProducidoPeriodoCOP: number;
  valorInventarioPreparadosCOP: number;
}
