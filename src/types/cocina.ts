/**
 * Estaciones operativas de cocina para enrutamiento de comandas en KDS.
 */
export type EstacionCocina =
  | 'fritura'
  | 'plancha'
  | 'bebidas_barra'
  | 'armado'
  | 'general';

/**
 * Filtro de estación seleccionado en la pantalla KDS de cocina.
 */
export type EstacionFiltro = 'todas' | EstacionCocina;

/**
 * Metadatos visuales y tiempos por defecto de cada estación de cocina.
 */
export interface InfoEstacionCocina {
  id: EstacionCocina;
  label: string;
  shortLabel: string;
  emoji: string;
  descripcion: string;
  tiempoDefaultMin: number;
  badgeClass: string;
  pillActiveClass: string;
}

/**
 * Entrada de catálogo indexada por referenciaId para resolver estación y tiempo en KDS.
 */
export interface CatalogoCocinaRef {
  estacionCocina?: EstacionCocina;
  tiempoPreparacionMin?: number;
  categoria?: string;
  nombre?: string;
}

/**
 * Resultado del semáforo dinámico de una comanda respecto a su tiempo objetivo.
 */
export interface SemaforoObjetivoComanda {
  nivel: 'optimo' | 'atencion' | 'critico';
  minutosTranscurridos: number;
  tiempoObjetivoMin: number;
  restanteMin: number;
  progresoPct: number;
  etiquetaObjetivo: string;
  borderClass: string;
  bgCardClass: string;
  badgeClass: string;
}
