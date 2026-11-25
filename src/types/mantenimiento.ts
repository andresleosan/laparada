import type { Timestamp } from 'firebase/firestore';
import type { EstacionCocina } from './cocina';
import type { MetodoPagoGasto, OrigenFondoGasto } from './gasto';

export type CategoriaEquipoMantenimiento =
  | 'coccion'
  | 'refrigeracion'
  | 'extraccion'
  | 'extintor'
  | 'red_gas'
  | 'electrico'
  | 'mobiliario'
  | 'otro';

export type EstadoOperativoEquipo =
  | 'operativo'
  | 'en_mantenimiento'
  | 'con_falla'
  | 'fuera_servicio';

export type TipoAgenteExtintor =
  | 'tipo_k'
  | 'multiproposito_abc'
  | 'co2'
  | 'solkaflam'
  | 'agua_presion';

export type TipoOrdenMantenimiento =
  | 'preventivo'
  | 'correctivo'
  | 'recarga_extintor'
  | 'inspeccion_gas'
  | 'calibracion';

export type SeveridadFallaEquipo = 'critica' | 'alta' | 'media' | 'baja';

export type EstadoReporteFalla =
  | 'abierta'
  | 'en_atencion'
  | 'resuelta'
  | 'descartada';

export type OrigenReporteFalla =
  | 'cocina_kds'
  | 'panel_mantenimiento'
  | 'dashboard';

export type EstadoSemaforoMantenimiento =
  | 'vencido'
  | 'proximo_7d'
  | 'proximo_30d'
  | 'al_dia'
  | 'sin_programar';

export type EstadoGlobalMantenimiento = 'critico' | 'atencion' | 'al_dia';

export interface EquipoActivoMantenimiento {
  id: string;
  negocioId: string;
  codigoActivo: string;
  nombre: string;
  categoria: CategoriaEquipoMantenimiento;
  ubicacion: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  fechaCompraIso?: string;
  garantiaHastaIso?: string;
  estadoOperativo: EstadoOperativoEquipo;
  frecuenciaPreventivoDias: number;
  ultimoMantenimientoIso?: string;
  proximoMantenimientoIso?: string;
  tipoAgenteExtintor?: TipoAgenteExtintor;
  capacidadExtintor?: string;
  fechaRecargaVenceIso?: string;
  fechaPruebaHidrostaticaIso?: string;
  certificadoGasVenceIso?: string;
  empresaCertificadora?: string;
  proveedorTecnico?: string;
  telefonoTecnico?: string;
  costoAcumuladoCOP: number;
  totalIntervenciones: number;
  notas?: string;
  activo: boolean;
  creadoPor?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

export interface OrdenMantenimiento {
  id: string;
  negocioId: string;
  equipoId: string;
  equipoNombre: string;
  equipoCodigo?: string;
  categoriaEquipo: CategoriaEquipoMantenimiento;
  tipo: TipoOrdenMantenimiento;
  descripcionTrabajo: string;
  fechaIso: string;
  fecha: Timestamp;
  tecnicoNombre: string;
  proveedorTecnico?: string;
  telefonoTecnico?: string;
  numeroFactura?: string;
  costoCOP: number;
  conciliadoConGasto: boolean;
  gastoId?: string;
  origenFondoGasto?: OrigenFondoGasto;
  metodoPagoGasto?: MetodoPagoGasto;
  proximaFechaSugeridaIso?: string;
  fallaRelacionadaId?: string;
  estadoEquipoResultante: EstadoOperativoEquipo;
  responsableNombre: string;
  notas?: string;
  creadoEn: Timestamp;
}

export interface ReporteFallaEquipo {
  id: string;
  negocioId: string;
  equipoId?: string;
  equipoNombre: string;
  categoriaEquipo: CategoriaEquipoMantenimiento;
  estacionCocina?: EstacionCocina;
  severidad: SeveridadFallaEquipo;
  detieneOperacion: boolean;
  descripcion: string;
  estado: EstadoReporteFalla;
  origenReporte: OrigenReporteFalla;
  reportadoPor: string;
  reportadoRol?: string;
  fechaIso: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  resueltoEn?: Timestamp;
  resueltoPor?: string;
  resolucionNotas?: string;
  ordenMantenimientoId?: string;
}

export interface EquipoMantenimientoEvaluado {
  equipo: EquipoActivoMantenimiento;
  semaforo: EstadoSemaforoMantenimiento;
  fechaVencimientoCriticaIso: string | null;
  motivoVencimiento: string;
  diasParaVencer: number | null;
  fallasAbiertasCount: number;
  esEquipoSeguridad: boolean;
}

export interface ResumenMantenimiento {
  totalActivos: number;
  activosOperativos: number;
  activosConFallaOFueraServicio: number;
  vencidosCount: number;
  proximos7dCount: number;
  proximos30dCount: number;
  alDiaCount: number;
  sinProgramarCount: number;
  extintoresYGasAlertaCount: number;
  fallasAbiertasCount: number;
  fallasCriticasCount: number;
  gastoMantenimientoMesCOP: number;
  gastoMantenimientoTotalCOP: number;
  ordenesConciliadasCount: number;
  scoreSaludPct: number;
  estadoGlobal: EstadoGlobalMantenimiento;
}

export interface FiltrosMantenimiento {
  busqueda: string;
  categoria: CategoriaEquipoMantenimiento | 'todas';
  semaforo: EstadoSemaforoMantenimiento | 'todos';
  estadoOperativo: EstadoOperativoEquipo | 'todos';
  soloSeguridad: boolean;
}

export interface CrearEquipoMantenimientoInput {
  negocioId: string;
  codigoActivo?: string;
  nombre: string;
  categoria: CategoriaEquipoMantenimiento;
  ubicacion: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  fechaCompraIso?: string;
  garantiaHastaIso?: string;
  estadoOperativo?: EstadoOperativoEquipo;
  frecuenciaPreventivoDias?: number;
  ultimoMantenimientoIso?: string;
  proximoMantenimientoIso?: string;
  tipoAgenteExtintor?: TipoAgenteExtintor;
  capacidadExtintor?: string;
  fechaRecargaVenceIso?: string;
  fechaPruebaHidrostaticaIso?: string;
  certificadoGasVenceIso?: string;
  empresaCertificadora?: string;
  proveedorTecnico?: string;
  telefonoTecnico?: string;
  notas?: string;
  creadoPor?: string;
}

export interface ActualizarEquipoMantenimientoInput {
  codigoActivo?: string;
  nombre?: string;
  categoria?: CategoriaEquipoMantenimiento;
  ubicacion?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  fechaCompraIso?: string;
  garantiaHastaIso?: string;
  estadoOperativo?: EstadoOperativoEquipo;
  frecuenciaPreventivoDias?: number;
  ultimoMantenimientoIso?: string;
  proximoMantenimientoIso?: string;
  tipoAgenteExtintor?: TipoAgenteExtintor;
  capacidadExtintor?: string;
  fechaRecargaVenceIso?: string;
  fechaPruebaHidrostaticaIso?: string;
  certificadoGasVenceIso?: string;
  empresaCertificadora?: string;
  proveedorTecnico?: string;
  telefonoTecnico?: string;
  notas?: string;
  activo?: boolean;
}

export interface RegistrarOrdenMantenimientoInput {
  negocioId: string;
  equipoId: string;
  tipo: TipoOrdenMantenimiento;
  descripcionTrabajo: string;
  fechaIso?: string;
  tecnicoNombre: string;
  proveedorTecnico?: string;
  telefonoTecnico?: string;
  numeroFactura?: string;
  costoCOP: number;
  conciliarEnGastos?: boolean;
  origenFondoGasto?: OrigenFondoGasto;
  metodoPagoGasto?: MetodoPagoGasto;
  proximaFechaSugeridaIso?: string;
  fallaRelacionadaId?: string;
  estadoEquipoResultante?: EstadoOperativoEquipo;
  responsableNombre: string;
  responsableRol?: string;
  notas?: string;
}

export interface ReportarFallaEquipoInput {
  negocioId: string;
  equipoId?: string;
  equipoNombre: string;
  categoriaEquipo: CategoriaEquipoMantenimiento;
  estacionCocina?: EstacionCocina;
  severidad: SeveridadFallaEquipo;
  detieneOperacion: boolean;
  descripcion: string;
  origenReporte: OrigenReporteFalla;
  reportadoPor: string;
  reportadoRol?: string;
  fechaIso?: string;
}

export interface ResolverFallaEquipoInput {
  estado: EstadoReporteFalla;
  resueltoPor: string;
  resolucionNotas?: string;
  ordenMantenimientoId?: string;
}
