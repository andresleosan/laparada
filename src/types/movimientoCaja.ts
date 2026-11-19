import { Timestamp } from 'firebase/firestore';
import type { ArqueoEfectivo } from './cierreCaja';

/**
 * Tipos de movimiento de efectivo en caja durante el turno
 */
export type TipoMovimientoCaja =
  | 'ingreso_sencillo'
  | 'sangria_caja_fuerte'
  | 'egreso_caja_menor';

/**
 * Documento inmutable de un movimiento de caja en turno (`movimientos_caja`)
 */
export interface MovimientoCaja {
  id: string;
  negocioId: string;
  cajaId?: string;
  tipo: TipoMovimientoCaja;
  monto: number; // En COP, entero positivo > 0
  motivo: string;
  referencia?: string; // Número de sobre, vale o recibo físico
  responsableNombre: string;
  responsableRol?: string;
  autorizadoPor?: string;
  codigoComprobante: string; // Ej: "SNG-0001", "SEN-0002", "CMN-0003"
  notas?: string;
  fecha: Timestamp | Date;
}

/**
 * Payload de creación de un movimiento de caja en turno
 */
export interface RegistrarMovimientoCajaInput {
  negocioId: string;
  cajaId?: string;
  tipo: TipoMovimientoCaja;
  monto: number;
  motivo: string;
  referencia?: string;
  responsableNombre: string;
  responsableRol?: string;
  autorizadoPor?: string;
  notas?: string;
}

/**
 * Acta inmutable de Corte X (arqueo parcial o relevo de turno) (`cortes_x`)
 */
export interface CorteXParcial {
  id: string;
  negocioId: string;
  cajaId?: string;
  codigoCorte: string; // Ej: "CX-0001"
  cajeroSaliente: string;
  cajeroEntrante?: string;
  efectivoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ingresosSencillo: number;
  sangriasCajaFuerte: number;
  egresosCajaMenor: number;
  gastosOperativos: number;
  efectivoEsperado: number;
  arqueo: ArqueoEfectivo;
  notas?: string;
  fecha: Timestamp | Date;
}

/**
 * Payload de creación de un Corte X parcial de relevo
 */
export interface RegistrarCorteXInput {
  negocioId: string;
  cajaId?: string;
  cajeroSaliente: string;
  cajeroEntrante?: string;
  efectivoInicial: number;
  ventasEfectivo: number;
  ventasTransferencia: number;
  ingresosSencillo: number;
  sangriasCajaFuerte: number;
  egresosCajaMenor: number;
  gastosOperativos: number;
  efectivoEsperado: number;
  arqueo: ArqueoEfectivo;
  notas?: string;
}

/**
 * Resumen consolidado de movimientos de caja del turno
 */
export interface ResumenMovimientosCajaTurno {
  totalIngresosSencillo: number;
  cantidadIngresosSencillo: number;
  totalSangrias: number;
  cantidadSangrias: number;
  totalCajaMenor: number;
  cantidadCajaMenor: number;
  impactoNetoMovimientos: number;
  alertaExcesoEfectivo: boolean;
  umbralAlertaSangria: number;
}
