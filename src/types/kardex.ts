import type { Timestamp } from 'firebase/firestore';
import type { LoteConsumidoPepsRef } from './loteInventario';

/**
 * Tipos de movimiento contable en el Kardex de inventario
 */
export type TipoMovimientoKardex =
  | 'entrada'            // Compra o abastecimiento de proveedor
  | 'entrada_produccion' // Ingreso a bodega de lote preparado en cocina (sub-receta)
  | 'salida_venta'       // Descuento automático por escandallo de receta (POS/Web/Mesas)
  | 'salida_produccion'  // Consumo de insumo primario para producir lote en cocina
  | 'salida_manual'      // Salida operativa directa
  | 'merma'              // Desperdicio, vencimiento, insumo dañado o error en cocina
  | 'ajuste'             // Ajuste por conteo físico / auditoría en bodega
  | 'reversion';         // Reintegro por anulación de venta

/**
 * Motivos predefinidos para registro de mermas gastronómicas
 */
export type MotivoMerma =
  | 'vencimiento'
  | 'dañado_almacenamiento'
  | 'desperdicio_cocina'
  | 'error_preparacion'
  | 'devolucion_cliente'
  | 'accidente_caida'
  | 'comanda_cancelada'
  | 'degustacion_personal'
  | 'otro';

/**
 * Motivos predefinidos para ajustes de inventario
 */
export type MotivoAjusteInventario =
  | 'conteo_fisico'
  | 'correccion_error'
  | 'diferencia_recepcion'
  | 'otro';

/**
 * Registro de movimiento en el Kardex de Inventario (almacenado en `entradas_inventario`)
 */
export interface MovimientoKardex {
  id: string;
  negocioId: string;
  insumoId: string;
  insumoNombre: string;
  cantidad: number;          // Positiva para entradas/reversiones (+), negativa para salidas/mermas (-)
  costo: number;             // En COP, costo total del movimiento
  costoUnitario?: number;    // En COP, costo por unidad de medida
  proveedor: string;         // Proveedor comercial o referencia operativa
  fecha: Timestamp;
  tipoMovimiento?: TipoMovimientoKardex;
  stockPrevio?: number;      // Existencias antes del movimiento
  stockResultante?: number;  // Existencias tras aplicar el movimiento
  motivo?: string;           // Motivo de merma o ajuste
  notas?: string;            // Observaciones adicionales
  responsable?: string;      // Usuario o cajero que registró el movimiento
  unidadMedida?: string;     // Unidad de medida del insumo (ej: kg, litros, unidades)
  loteProduccionId?: string; // ID del lote de cocina que originó el movimiento
  subRecetaId?: string;      // ID de la sub-receta / preparación base asociada
  subRecetaNombre?: string;  // Nombre de la preparación base asociada
  multiplicadorLotes?: number; // Cantidad de tandas/lotes producidos (ej: 0.5, 1, 2)
  origenMerma?: 'bodega' | 'cocina_kds' | 'devolucion_cliente' | 'salon_mostrador';
  estacionCocina?:
    | 'parrilla_plancha'
    | 'freidora'
    | 'armado_emplatado'
    | 'bodega_frio'
    | 'entrega_domicilio'
    | 'general';
  mermaLoteId?: string;
  productoMermaId?: string;
  productoMermaNombre?: string;
  comandaMermaId?: string;
  loteInventarioId?: string;
  codigoLote?: string;
  fechaVencimientoLote?: string;
  lotesConsumidosPeps?: LoteConsumidoPepsRef[];
}

/**
 * Métricas consolidadas del Kardex para un periodo o selección
 */
export interface MetricasKardex {
  totalEntradasCantidad: number;
  totalEntradasCostoCOP: number;
  totalSalidasVentaCantidad: number;
  totalMermasCantidad: number;
  totalMermasValorCOP: number;
  totalAjustesNetosCantidad: number;
  cantidadMovimientos: number;
  valorTotalBodegaCOP: number;
}

/**
 * Filtros de consulta del Kardex
 */
export type RangoFechaKardex = 'hoy' | '7dias' | 'mes' | 'todos';

export interface FiltrosKardex {
  insumoId?: string; // ID específico o undefined / 'todos'
  tipoMovimiento?: TipoMovimientoKardex | 'todos';
  rangoFecha?: RangoFechaKardex;
  busqueda?: string;
}

/**
 * Datos requeridos para registrar una merma de insumo
 */
export interface RegistrarMermaInput {
  insumoId: string;
  cantidad: number;
  motivo: MotivoMerma | string;
  notas?: string;
  responsable?: string;
}

/**
 * Datos requeridos para registrar un ajuste de conteo físico
 */
export interface RegistrarAjusteInput {
  insumoId: string;
  nuevoStockFisico: number;
  motivo: MotivoAjusteInventario | string;
  notas?: string;
  responsable?: string;
}

/**
 * Clasificación de la diferencia entre el stock físico contado y el del sistema
 */
export type EstadoDiferenciaConteo = 'exacto' | 'faltante' | 'sobrante';

/**
 * Línea evaluada durante un Conteo Físico Rápido de Bodega
 */
export interface ItemConteoFisicoBodega {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  stockSistema: number;
  stockFisicoContado: number;
  diferencia: number;         // stockFisicoContado - stockSistema
  costoUnitario: number;      // En COP
  impactoValorCOP: number;    // En COP, Math.round(diferencia * costoUnitario)
  estadoDiferencia: EstadoDiferenciaConteo;
}

/**
 * Resumen ejecutivo del Conteo Físico Rápido de Bodega
 */
export interface ResumenConteoFisicoBodega {
  totalInsumosEvaluados: number;
  insumosConDiferencia: number;
  exactosCount: number;
  faltantesCount: number;
  sobrantesCount: number;
  valorFaltantesCOP: number;  // Positivo representando el monto perdido
  valorSobrantesCOP: number;  // Positivo representando el monto excedente
  balanceNetoCOP: number;     // valorSobrantesCOP - valorFaltantesCOP
}

/**
 * Entrada individual para el lote de conteo físico masivo
 */
export interface ItemAjusteConteoMasivoInput {
  insumoId: string;
  nuevoStockFisico: number;
}

/**
 * Parámetros para aplicar un Conteo Físico Rápido de Bodega en lote al Kardex
 */
export interface RegistrarConteoFisicoMasivoInput {
  items: ItemAjusteConteoMasivoInput[];
  motivo?: MotivoAjusteInventario | string;
  notas?: string;
  responsable?: string;
}


