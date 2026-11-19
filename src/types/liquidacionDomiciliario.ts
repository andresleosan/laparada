import { Timestamp } from 'firebase/firestore';
import type { Domicilio } from './index';

/**
 * Estado del ciclo de vida de una base en ruta y liquidación de domiciliario
 */
export type EstadoLiquidacionDomiciliario = 'activa' | 'liquidada' | 'anulada';

/**
 * Estado del cuadre físico frente al efectivo esperado
 */
export type EstadoCuadreDomiciliario = 'cuadrado' | 'sobrante' | 'faltante';

/**
 * Documento multi-tenant de Base de Sencillo en Ruta y Acta Formal de Liquidación (`liquidaciones_domiciliarios`)
 */
export interface LiquidacionDomiciliario {
  id: string;
  negocioId: string;
  codigoActa: string; // Ej: "LQ-0001"
  domiciliarioId: string;
  domiciliarioNombre: string;
  estado: EstadoLiquidacionDomiciliario;
  montoBaseInicial: number; // COP >= 0
  entregadoPor: string;
  observacionesBase?: string;
  fechaEntregaBase: Timestamp | Date;
  // Campos de cierre al liquidar
  totalEntregas: number;
  domicilioIds: string[];
  totalEfectivoCobrado: number;
  totalTransferencias: number;
  efectivoEsperadoRendir: number; // montoBaseInicial + totalEfectivoCobrado
  efectivoEntregadoFisico: number;
  diferencia: number; // efectivoEntregadoFisico - efectivoEsperadoRendir
  conciliadoConCaja: boolean;
  cajeroReceptor?: string;
  notasLiquidacion?: string;
  fechaLiquidacion?: Timestamp | Date;
}

/**
 * Payload para entregar una base de sencillo inicial a un repartidor al salir a ruta
 */
export interface EntregarBaseRutaInput {
  negocioId: string;
  domiciliarioId: string;
  domiciliarioNombre: string;
  montoBaseInicial: number;
  entregadoPor: string;
  observacionesBase?: string;
}

/**
 * Payload para liquidar formalmente la ruta de un repartidor y conciliar con caja
 */
export interface CerrarLiquidacionDomiciliarioInput {
  liquidacionId?: string;
  negocioId: string;
  domiciliarioId: string;
  domiciliarioNombre: string;
  domiciliosEntregados: Domicilio[];
  efectivoEntregadoFisico: number;
  cajeroReceptor: string;
  notasLiquidacion?: string;
}

/**
 * Resumen consolidado de bases en ruta y liquidaciones del turno
 */
export interface ResumenBasesRutaTurno {
  cantidadBasesActivas: number;
  totalBaseEnRutaActiva: number;
  cantidadLiquidadasHoy: number;
  totalEfectivoRendidoHoy: number;
  totalTransferenciasValidadasHoy: number;
  totalDiferenciasHoy: number;
}
