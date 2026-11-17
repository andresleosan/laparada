import { Timestamp } from 'firebase/firestore';
import type { EstadoDomicilio, OrigenVenta } from './index';

/**
 * Semáforo SLA para control de tiempos de despacho de domicilios
 */
export type EstadoSlaDomicilio = 'en_tiempo' | 'atencion' | 'demorado';

/**
 * Zona de cobertura geográfica con tarifa de envío y tiempo estimado
 */
export interface ZonaDomicilio {
  id: string;
  nombre: string;
  barrios: string[];
  tarifaEnvio: number;
  tiempoEstimadoMin: number;
  pedidoMinimo: number;
  activa: boolean;
}

/**
 * Configuración multi-tenant de zonas de cobertura y tarifario de envíos
 */
export interface ConfiguracionZonasDomicilio {
  id: string;
  negocioId: string;
  habilitarTarifaAutomatica: boolean;
  tarifaPorDefecto: number;
  tiempoEstimadoPorDefectoMin: number;
  envioGratisDesdeMonto?: number;
  zonas: ZonaDomicilio[];
  actualizadoEn?: Timestamp | Date | string;
}

/**
 * Resultado de resolver un barrio contra el tarifario de zonas
 */
export interface ResolucionTarifaBarrio {
  zona: ZonaDomicilio | null;
  tarifaEnvio: number;
  tiempoEstimadoMin: number;
  pedidoMinimo: number;
  esEnvioGratis: boolean;
}

/**
 * Métrica de SLA calculada para un domicilio
 */
export interface InfoSlaDomicilio {
  minutosTranscurridos: number;
  estadoSla: EstadoSlaDomicilio;
  etiqueta: string;
}

/**
 * KPIs consolidados del centro de despacho de domicilios
 */
export interface KpisDespachoDomicilios {
  totalActivos: number;
  pendientesCocina: number;
  enRuta: number;
  demoradosCriticos: number;
  entregadosHoy: number;
  facturacionEntregadosHoy: number;
  efectivoEnCalle: number;
  tiempoPromedioMinutos: number;
}

/**
 * Filtros interactivos de la consola de despacho
 */
export interface FiltrosDespachoDomicilios {
  busqueda: string;
  estado: 'todos' | EstadoDomicilio;
  origen: 'todos' | OrigenVenta;
  repartidor: string;
}
