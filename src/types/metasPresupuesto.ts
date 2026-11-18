import type { Timestamp } from 'firebase/firestore';
import type { CategoriaGasto } from './index';

export type TipoCostoOperativo = 'fijo' | 'variable';

export type EstadoEjecucionPresupuesto =
  | 'controlado'
  | 'alerta'
  | 'excedido'
  | 'sin_presupuesto';

export type SeveridadAlertaPresupuesto = 'critica' | 'alta' | 'media';

export interface CategoriaPresupuestoMeta {
  categoria: CategoriaGasto;
  nombre: string;
  descripcion: string;
  tipoCostoDefault: TipoCostoOperativo;
}

export interface PresupuestoCategoriaConfig {
  presupuestoCOP: number;
  tipoCosto: TipoCostoOperativo;
}

export type MapaPresupuestoCategorias = Record<CategoriaGasto, PresupuestoCategoriaConfig>;

/**
 * Configuración de metas comerciales y presupuesto operativo mensual por tenant y mes calendario.
 */
export interface ConfiguracionMetasPresupuesto {
  id: string;
  negocioId: string;
  mesKey: string; // Formato YYYY-MM en hora local (ej: "2026-11")
  metaVentasMensualCOP: number;
  metaUtilidadNetaMensualCOP: number;
  costosFijosBaseCOP: number; // Arriendo, suscripciones u obligaciones fijas fuera de caja menor
  foodCostObjetivoPct: number; // % objetivo de CMV sobre ventas netas (ej: 35)
  umbralAlertaGastoPct: number; // % de ejecución para alerta preventiva (ej: 80)
  presupuestosPorCategoria: MapaPresupuestoCategorias;
  notas?: string;
  configuradoManualmente?: boolean;
  actualizadoPor?: string;
  creadoEn?: Timestamp | Date;
  actualizadoEn?: Timestamp | Date;
}

export interface GuardarMetasPresupuestoInput {
  metaVentasMensualCOP: number;
  metaUtilidadNetaMensualCOP: number;
  costosFijosBaseCOP: number;
  foodCostObjetivoPct: number;
  umbralAlertaGastoPct: number;
  presupuestosPorCategoria: MapaPresupuestoCategorias;
  notas?: string;
}

export interface ProgresoTemporalMes {
  mesKey: string;
  etiquetaMes: string;
  inicio: Date;
  fin: Date;
  diasEnMes: number;
  diasTranscurridos: number;
  diasRestantes: number;
  diasRestantesIncluyendoHoy: number;
  porcentajeMesTranscurrido: number;
  esMesActual: boolean;
  esMesFuturo: boolean;
  esMesPasado: boolean;
}

export interface LineaEjecucionPresupuesto {
  categoria: CategoriaGasto;
  nombre: string;
  descripcion: string;
  tipoCosto: TipoCostoOperativo;
  presupuestadoCOP: number;
  ejecutadoCOP: number;
  disponibleCOP: number;
  excedidoCOP: number;
  porcentajeEjecucion: number;
  porcentajeEsperadoRitmo: number;
  desviacionRitmoCOP: number;
  estado: EstadoEjecucionPresupuesto;
  cantidadRegistros: number;
}

export interface ResultadoPuntoEquilibrio {
  costosFijosPresupuestadosCOP: number;
  costosFijosRealesCOP: number;
  costosFijosConsideradosCOP: number;
  costosVariablesRealesCOP: number;
  margenContribucionRealPct: number;
  margenContribucionEstimadoPct: number;
  margenContribucionAplicadoPct: number;
  fuenteMargen: 'real' | 'objetivo_estimado';
  puntoEquilibrioMensualCOP: number;
  puntoEquilibrioDiarioCOP: number;
  pedidosEquilibrioMes: number;
  porcentajeEquilibrioAlcanzado: number;
  faltanteParaEquilibrioCOP: number;
  superavitSobreEquilibrioVentasCOP: number;
  utilidadEstimadaPostEquilibrioCOP: number;
  equilibrioAlcanzado: boolean;
  diaEstimadoEquilibrio: number | null;
}

export interface ProgresoMetaComercial {
  metaVentasMensualCOP: number;
  ventasNetasMesCOP: number;
  ventasHoyCOP: number;
  metaDiariaBaseCOP: number;
  metaDiariaRequeridaRestanteCOP: number;
  porcentajeCumplimiento: number;
  ventaEsperadaAlDiaCOP: number;
  desviacionRitmoCOP: number;
  porcentajeDesviacionRitmo: number;
  enRitmoMeta: boolean;
  ventaDiariaPromedioActualCOP: number;
  proyeccionCierreMesCOP: number;
  faltanteMetaMesCOP: number;
  metaUtilidadNetaMensualCOP: number;
  utilidadNetaActualCOP: number;
  porcentajeCumplimientoUtilidad: number;
}

export interface AlertaDesviacionPresupuesto {
  id: string;
  severidad: SeveridadAlertaPresupuesto;
  tipo:
    | 'presupuesto_excedido'
    | 'presupuesto_preventivo'
    | 'gasto_sin_presupuesto'
    | 'food_cost_excedido'
    | 'merma_umbral_excedido'
    | 'ritmo_ventas_bajo'
    | 'deficit_equilibrio';
  categoria?: CategoriaGasto;
  titulo: string;
  mensaje: string;
  impactoCOP: number;
  porcentajeActual?: number;
  rutaAccion: string;
  etiquetaAccion: string;
}

export interface ResumenMetasYPresupuesto {
  mesKey: string;
  temporalidad: ProgresoTemporalMes;
  configuracion: ConfiguracionMetasPresupuesto;
  tieneConfiguracionGuardada: boolean;
  totalPresupuestoOpexCOP: number;
  totalEjecutadoOpexCOP: number;
  disponibleTotalOpexCOP: number;
  porcentajeEjecucionOpex: number;
  cmvRealCOP: number;
  porcentajeCmvReal: number;
  mermasMesCOP: number;
  utilidadNetaMesCOP: number;
  cantidadVentasMes: number;
  ticketPromedioMesCOP: number;
  lineasPresupuesto: LineaEjecucionPresupuesto[];
  puntoEquilibrio: ResultadoPuntoEquilibrio;
  metaComercial: ProgresoMetaComercial;
  alertas: AlertaDesviacionPresupuesto[];
  saludPresupuestal: 'optima' | 'atencion' | 'critica';
}
