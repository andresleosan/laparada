import type { Timestamp } from 'firebase/firestore';
import type { CategoriaGasto } from './index';

/**
 * Origen de los fondos con los que se paga un gasto operativo (100% offline)
 */
export type OrigenFondoGasto =
  | 'caja_turno'
  | 'caja_menor'
  | 'banco_transferencia'
  | 'efectivo_externo';

/**
 * Método de pago offline utilizado para cubrir el gasto
 */
export type MetodoPagoGasto = 'efectivo' | 'transferencia';

/**
 * Rango temporal para filtrar gastos operativos en /gastos
 */
export type RangoFechaGastos = 'hoy' | '7dias' | '30dias' | 'mes_actual' | 'todos';

/**
 * Payload tipado para registrar un gasto operativo detallado
 */
export interface RegistrarGastoInput {
  negocioId: string;
  concepto: string;
  monto: number;
  categoria: CategoriaGasto;
  origenFondo: OrigenFondoGasto;
  metodoPago: MetodoPagoGasto;
  proveedorNombre?: string;
  numeroComprobante?: string;
  responsableNombre?: string;
  responsableRol?: string;
  cajaId?: string;
  movimientoCajaId?: string;
  deducible?: boolean;
  notas?: string;
  fecha?: Timestamp | Date;
}

/**
 * Línea de resumen por categoría de gasto
 */
export interface DesgloseCategoriaGasto {
  categoria: CategoriaGasto;
  etiqueta: string;
  monto: number;
  cantidad: number;
  porcentaje: number;
  tipoCosto: 'fijo' | 'variable';
}

/**
 * Resumen consolidado de gastos operativos para KPIs y reportes
 */
export interface ResumenGastosOperativos {
  totalGastos: number;
  cantidadGastos: number;
  gastoPromedio: number;
  totalCajaTurno: number;
  totalCajaMenor: number;
  totalBancoTransferencia: number;
  totalEfectivoExterno: number;
  totalDeducible: number;
  desgloseCategorias: DesgloseCategoriaGasto[];
}

/**
 * Estado consolidado del fondo de Caja Menor
 */
export interface ResumenCajaMenor {
  fondoAsignadoCOP: number;
  totalEjecutadoGastos: number;
  totalEgresosMovimientosCaja: number;
  totalConsumidoCOP: number;
  saldoDisponibleCOP: number;
  porcentajeUso: number;
  alertaReposicion: boolean;
  cantidadRegistros: number;
}
