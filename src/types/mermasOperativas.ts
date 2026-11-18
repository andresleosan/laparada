import type { MotivoMerma } from './kardex';

/**
 * Origen operativo donde ocurrió la merma, desperdicio o devolución
 */
export type OrigenMermaOperativa =
  | 'bodega'
  | 'cocina_kds'
  | 'devolucion_cliente'
  | 'salon_mostrador';

/**
 * Modalidad de registro de merma (insumo directo o producto terminado por escandallo)
 */
export type ModoRegistroMerma = 'insumo' | 'producto_terminado';

/**
 * Estación de cocina o área operativa asociada al desperdicio
 */
export type EstacionCocinaMerma =
  | 'parrilla_plancha'
  | 'freidora'
  | 'armado_emplatado'
  | 'bodega_frio'
  | 'entrega_domicilio'
  | 'general';

/**
 * Estado semafórico del porcentaje de merma frente al umbral objetivo
 */
export type EstadoUmbralMerma = 'optimo' | 'preventivo' | 'alerta' | 'critico';

/**
 * Metadatos visuales de cada origen de merma
 */
export interface InfoOrigenMerma {
  id: OrigenMermaOperativa;
  label: string;
  shortLabel: string;
  descripcion: string;
  badgeClass: string;
}

/**
 * Metadatos visuales de cada estación de cocina
 */
export interface InfoEstacionCocinaMerma {
  id: EstacionCocinaMerma;
  label: string;
  descripcion: string;
}

/**
 * Metadatos y clasificación operativa de cada motivo de merma
 */
export interface InfoMotivoMermaCatalogo {
  id: MotivoMerma | string;
  label: string;
  descripcion: string;
  esDevolucion: boolean;
  esCocina: boolean;
  esBodega: boolean;
}

/**
 * Línea de insumo afectado al simular o registrar la merma de un plato/combo terminado
 */
export interface ItemDesgloseMermaProducto {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  cantidadPorUnidadProducto: number;
  cantidadTotalMerma: number;
  stockActual: number;
  stockPosterior: number;
  costoUnitarioCOP: number;
  costoTotalMermaCOP: number;
  esSubReceta?: boolean;
}

/**
 * Simulación previa de impacto en bodega y P&L para merma/devolución de producto terminado
 */
export interface SimulacionMermaProducto {
  referenciaId: string;
  referenciaNombre: string;
  tipoReferencia: 'producto' | 'combo';
  cantidadUnidades: number;
  precioVentaPerdidoCOP: number;
  costoTotalInsumosCOP: number;
  desgloseInsumos: ItemDesgloseMermaProducto[];
  tieneEscandallo: boolean;
}

/**
 * Input para registrar una merma operativa avanzada (insumo o producto terminado)
 */
export interface RegistrarMermaOperativaInput {
  modo: ModoRegistroMerma;
  motivo: MotivoMerma | string;
  origen: OrigenMermaOperativa;
  estacion?: EstacionCocinaMerma;
  insumoId?: string;
  cantidad: number;
  referenciaId?: string;
  tipoReferencia?: 'producto' | 'combo';
  comandaId?: string;
  comandaCodigo?: string;
  notas?: string;
  responsable?: string;
  responsableRol?: string;
  costosUnitariosPorInsumo?: Record<string, number>;
}

/**
 * Resultado transaccional del registro de una merma operativa
 */
export interface ResultadoMermaOperativa {
  mermaLoteId: string;
  modo: ModoRegistroMerma;
  referenciaNombre: string;
  cantidadRegistrada: number;
  unidad: string;
  motivo: string;
  origen: OrigenMermaOperativa;
  estacion: EstacionCocinaMerma;
  costoTotalImpactoCOP: number;
  insumosAfectadosCount: number;
  movimientoIds: string[];
}

/**
 * Ranking de insumos con mayor pérdida económica acumulada por merma
 */
export interface ResumenInsumoMermaRanking {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  cantidadTotal: number;
  costoTotalCOP: number;
  registrosCount: number;
  porcentajeDelTotalMerma: number;
  motivoPrincipal: string;
}

/**
 * Resumen agrupado por motivo de merma
 */
export interface ResumenMotivoMerma {
  motivo: string;
  label: string;
  cantidadRegistros: number;
  costoTotalCOP: number;
  porcentajeCosto: number;
}

/**
 * Analítica consolidada de mermas operativas, desperdicios, devoluciones y evaluación de umbral
 */
export interface AnaliticaMermasOperativas {
  totalMermasCOP: number;
  cantidadRegistrosMerma: number;
  mermasHoyCOP: number;
  registrosHoyCount: number;
  mermasCocinaCOP: number;
  mermasDevolucionesCOP: number;
  mermasBodegaCOP: number;
  porcentajeSobreVentasNetas: number;
  porcentajeSobreCMV: number;
  umbralMaximoPct: number;
  presupuestoMaximoMermaCOP: number;
  excesoSobreUmbralCOP: number;
  estadoUmbral: EstadoUmbralMerma;
  mensajeAlertaUmbral: string;
  topInsumosMerma: ResumenInsumoMermaRanking[];
  desglosePorMotivo: ResumenMotivoMerma[];
}
