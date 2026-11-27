import { Timestamp } from 'firebase/firestore';

/**
 * Origen técnico de un registro de precio de compra/cotización de insumo
 */
export type OrigenRegistroPrecioInsumo =
  | 'orden_compra'
  | 'factura_compra'
  | 'entrada_kardex'
  | 'cotizacion_manual';

/**
 * Severidad de la variación de precio respecto al registro anterior
 */
export type SeveridadAlzaPrecio =
  | 'estable'
  | 'baja'
  | 'alza_moderada'
  | 'alza_critica';

/**
 * Rango temporal para evaluar inflación y comparar proveedores
 */
export type RangoPeriodoPrecios = '30d' | '90d' | '180d' | 'todo';

/**
 * Criterio de ordenamiento del comparador de precios
 */
export type OrdenComparadorPrecios =
  | 'alza_desc'
  | 'ahorro_desc'
  | 'impacto_foodcost_desc'
  | 'nombre_asc';

/**
 * Registro inmutable de precio histórico por insumo y proveedor (`historial_precios_insumos`)
 */
export interface RegistroPrecioInsumo {
  id: string;
  negocioId: string;
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  proveedorId?: string;
  proveedorNombre: string;
  costoUnitarioCOP: number;
  costoAnteriorCOP?: number;
  variacionPct?: number;
  esAlzaCritica?: boolean;
  cantidadComprada?: number;
  origen: OrigenRegistroPrecioInsumo;
  referenciaId?: string;
  referenciaCodigo?: string;
  fechaIso: string; // YYYY-MM-DD (America/Bogota)
  fecha: Timestamp;
  registradoPor: string;
  notas?: string;
  creadoEn: Timestamp;
}

/**
 * Payload de entrada para registrar un nuevo precio de insumo o cotización
 */
export interface RegistrarPrecioInsumoInput {
  negocioId: string;
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  proveedorId?: string;
  proveedorNombre: string;
  costoUnitarioCOP: number;
  costoAnteriorCOP?: number;
  cantidadComprada?: number;
  origen: OrigenRegistroPrecioInsumo;
  referenciaId?: string;
  referenciaCodigo?: string;
  fechaIso?: string;
  registradoPor?: string;
  notas?: string;
}

/**
 * Oferta consolidada de un proveedor específico para un insumo
 */
export interface OfertaProveedorInsumo {
  proveedorKey: string;
  proveedorId?: string;
  proveedorNombre: string;
  ultimoCostoCOP: number;
  costoPromedioCOP: number;
  costoMinimoCOP: number;
  costoMaximoCOP: number;
  cantidadRegistros: number;
  ultimaFechaIso: string;
  ultimoOrigen: OrigenRegistroPrecioInsumo;
  esMejorPrecio: boolean;
  esMasCaro: boolean;
  diferenciaVsMejorCOP: number;
  diferenciaVsMejorPct: number;
}

/**
 * Impacto proyectado de una variación de costo de insumo sobre el Food Cost de una receta o combo
 */
export interface ImpactoRecetaAlza {
  itemId: string;
  itemTipo: 'producto' | 'combo';
  itemNombre: string;
  categoria: string;
  precioVentaCOP: number;
  cantidadInsumoEnReceta: number;
  unidad: string;
  costoRecetaAnteriorCOP: number;
  costoRecetaNuevoCOP: number;
  impactoCostoUnitarioCOP: number;
  foodCostAnteriorPct: number;
  foodCostNuevoPct: number;
  deltaFoodCostPts: number;
  margenAnteriorCOP: number;
  margenNuevoCOP: number;
}

/**
 * Punto cronológico para la gráfica de evolución de precios de un insumo
 */
export interface PuntoSeriePrecioInsumo {
  registroId: string;
  fechaIso: string;
  fechaLabel: string;
  proveedorNombre: string;
  costoUnitarioCOP: number;
  variacionPct: number;
  origen: OrigenRegistroPrecioInsumo;
}

/**
 * Comparativa integral de precios entre proveedores para un insumo individual
 */
export interface ComparativaInsumoProveedores {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  stockActual: number;
  costoCatalogoActualCOP: number;
  ultimoCostoCOP: number;
  costoAnteriorCOP: number;
  primerCostoPeriodoCOP: number;
  costoPromedioPeriodoCOP: number;
  variacionUltimoSaltoPct: number;
  inflacionAcumuladaPct: number;
  severidad: SeveridadAlzaPrecio;
  tieneAlertaAlzaCritica: boolean;
  ultimaFechaIso: string;
  ultimoProveedorNombre: string;
  totalRegistros: number;
  ofertasProveedores: OfertaProveedorInsumo[];
  cantidadProveedores: number;
  esComparableMultiProveedor: boolean;
  mejorProveedor: OfertaProveedorInsumo | null;
  proveedorMasCaro: OfertaProveedorInsumo | null;
  ahorroPotencialUnitarioCOP: number;
  ahorroPotencialPct: number;
  serieHistorica: PuntoSeriePrecioInsumo[];
  recetasAfectadas: ImpactoRecetaAlza[];
  maxDeltaFoodCostPts: number;
  registros: RegistroPrecioInsumo[];
}

/**
 * Punto mensual del Índice de Inflación de Bodega (Base 100)
 */
export interface PuntoEvolucionInflacionMensual {
  mesKey: string; // YYYY-MM
  mesLabel: string;
  indiceBase100: number;
  variacionVsBasePct: number;
  registrosCount: number;
  insumosMedidosCount: number;
}

/**
 * Resumen ejecutivo de Inflación de Bodega y Oportunidades de Ahorro
 */
export interface ResumenInflacionBodega {
  periodo: RangoPeriodoPrecios;
  totalInsumosMonitoreados: number;
  totalRegistrosPrecios: number;
  insumosComparablesMultiProveedor: number;
  indiceInflacionPromedioPct: number;
  indiceInflacionUltimoSaltoPct: number;
  alertasAlzaCriticaCount: number;
  insumosConBajaCount: number;
  recetasImpactadasCount: number;
  ahorroPotencialUnitarioTotalCOP: number;
  estadoGlobal: 'estable' | 'vigilancia' | 'alerta_inflacion';
  topAlzas: ComparativaInsumoProveedores[];
  topOportunidadesAhorro: ComparativaInsumoProveedores[];
  evolucionMensualIndice: PuntoEvolucionInflacionMensual[];
}

/**
 * Filtros interactivos del Comparador de Precios entre Proveedores
 */
export interface FiltrosComparadorPrecios {
  busqueda: string;
  periodo: RangoPeriodoPrecios;
  soloAlzasCriticas: boolean;
  soloMultiProveedor: boolean;
  orden: OrdenComparadorPrecios;
}
