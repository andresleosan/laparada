import type { Timestamp } from 'firebase/firestore';
import type { MotivoMerma } from './kardex';

/**
 * Estado operativo de un lote en bodega
 */
export type EstadoLoteInventario =
  | 'activo'
  | 'agotado'
  | 'vencido_baja'
  | 'cuarentena';

/**
 * Estado del semáforo sanitario calculado frente a la fecha actual (America/Bogota)
 */
export type EstadoSemaforoSanitario =
  | 'vencido'
  | 'critico_3d'
  | 'proximo_7d'
  | 'vigente'
  | 'sin_vencimiento';

/**
 * Origen del ingreso del lote a bodega
 */
export type OrigenLoteInventario =
  | 'compra_entrada'
  | 'produccion_subreceta'
  | 'registro_manual'
  | 'orden_compra';

/**
 * Ubicación física de almacenamiento en cocina o bodega
 */
export type UbicacionBodegaLote =
  | 'nevera_refrigeracion'
  | 'congelador'
  | 'despensa_secos'
  | 'barra_cocina'
  | 'bodega_empaques';

/**
 * Referencia trazable de un lote consumido mediante algoritmo PEPS / FIFO
 */
export interface LoteConsumidoPepsRef {
  loteId: string;
  codigoLote: string;
  cantidad: number;
  fechaVencimiento?: string | null;
}

/**
 * Documento multi-tenant almacenado en `lotes_inventario`
 */
export interface LoteInventario {
  id: string;
  negocioId: string;
  insumoId: string;
  insumoNombre: string;
  unidadMedida: string;
  codigoLote: string;
  cantidadInicial: number;
  cantidadDisponible: number;
  cantidadConsumida: number;
  cantidadMerma?: number;
  costoUnitario: number;
  costoTotalInicial: number;
  proveedor: string;
  fechaIngreso: Timestamp;
  fechaVencimiento?: string | null;
  estado: EstadoLoteInventario;
  origen: OrigenLoteInventario;
  ubicacionBodega?: UbicacionBodegaLote;
  temperaturaRecepcionC?: number;
  registroSanitario?: string;
  entradaInventarioId?: string;
  loteProduccionId?: string;
  motivoBaja?: string;
  bajaRegistradaEn?: Timestamp;
  bajaResponsable?: string;
  notas?: string;
  responsable?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Opciones para vincular un lote al registrar una entrada en inventario
 */
export interface OpcionesLoteEntradaInventario {
  codigoLote?: string;
  fechaVencimiento?: string | null;
  ubicacionBodega?: UbicacionBodegaLote;
  temperaturaRecepcionC?: number;
  registroSanitario?: string;
  crearLote?: boolean;
}

/**
 * Entrada para crear un lote de forma manual (sumando stock o solo etiquetando saldo existente)
 */
export interface RegistrarLoteManualInput {
  insumoId: string;
  cantidad: number;
  costoTotal?: number;
  proveedor?: string;
  codigoLote?: string;
  fechaVencimiento?: string | null;
  ubicacionBodega?: UbicacionBodegaLote;
  temperaturaRecepcionC?: number;
  registroSanitario?: string;
  notas?: string;
  responsable?: string;
  soloTrazabilidadStockExistente?: boolean;
}

/**
 * Parámetros para dar de baja rápida un lote vencido o deteriorado hacia merma operativa
 */
export interface BajaRapidaLoteMermaInput {
  loteId: string;
  cantidad?: number;
  motivo?: MotivoMerma | string;
  notas?: string;
  responsable?: string;
  responsableRol?: string;
}

/**
 * Resultado transaccional de la baja de lote a merma
 */
export interface ResultadoBajaLoteMerma {
  loteId: string;
  codigoLote: string;
  insumoId: string;
  insumoNombre: string;
  cantidadBaja: number;
  unidadMedida: string;
  costoPerdidoCOP: number;
  movimientoKardexId: string;
}

/**
 * Asignación unitaria sobre un lote dentro de un plan de consumo PEPS / FIFO
 */
export interface AsignacionConsumoPeps {
  loteId: string;
  codigoLote: string;
  cantidadConsumida: number;
  cantidadRestante: number;
  nuevoEstado: EstadoLoteInventario;
  fechaVencimiento?: string | null;
}

/**
 * Plan consolidado de consumo PEPS / FIFO para un insumo
 */
export interface PlanConsumoPeps {
  insumoId: string;
  cantidadSolicitada: number;
  cantidadCubiertaPorLotes: number;
  cantidadSinLote: number;
  lotesVencidosOmitidos: number;
  asignaciones: AsignacionConsumoPeps[];
}

/**
 * Lote enriquecido con evaluación sanitaria y prioridad PEPS
 */
export interface LoteEvaluadoSanitario extends LoteInventario {
  estadoSemaforo: EstadoSemaforoSanitario;
  diasParaVencer: number | null;
  valorDisponibleCOP: number;
  porcentajeDisponible: number;
  esPrimeroPeps?: boolean;
}

/**
 * Resumen sanitario de lotes agrupado por insumo
 */
export interface ResumenLotesPorInsumoItem {
  cantidadLotesActivos: number;
  stockEnLotes: number;
  proximoVencimiento: string | null;
  diasProximoVencimiento: number | null;
  peorSemaforo: EstadoSemaforoSanitario;
  vencidosCount: number;
  criticos3dCount: number;
  proximos7dCount: number;
}

/**
 * Consolidado global del semáforo sanitario de bodega
 */
export interface ResumenSanitarioBodega {
  totalLotesActivos: number;
  vencidosCount: number;
  criticos3dCount: number;
  proximos7dCount: number;
  vigentesCount: number;
  sinVencimientoCount: number;
  cuarentenaCount: number;
  valorEnRiesgoCOP: number;
  valorVencidoCOP: number;
  valorProximo7dCOP: number;
  valorTotalLotesActivosCOP: number;
  estadoGlobal: 'critico' | 'alerta' | 'preventivo' | 'saludable';
  loteMasUrgente: LoteEvaluadoSanitario | null;
}

/**
 * Filtros de consulta y visualización en la vista de Lotes & Vencimientos
 */
export interface FiltrosLotesInventario {
  insumoId?: string;
  estadoSemaforo?: EstadoSemaforoSanitario | 'todos' | 'en_riesgo';
  estadoLote?: EstadoLoteInventario | 'todos';
  busqueda?: string;
}
