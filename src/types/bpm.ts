import type { Timestamp } from 'firebase/firestore';

/**
 * Tipo de equipo térmico monitoreado bajo BPM (Resolución 2674 INVIMA).
 */
export type TipoEquipoBpm = 'refrigeracion' | 'congelacion' | 'caliente';

/**
 * Franja horaria de toma de temperatura en turno operativo.
 */
export type FranjaRegistroBpm = 'apertura' | 'mediodia' | 'tarde' | 'cierre';

/**
 * Nivel de conformidad sanitaria de una lectura térmica.
 */
export type EstadoConformidadTempBpm = 'conforme' | 'alerta' | 'critico';

/**
 * Configuración de un equipo de frío o mantenimiento caliente del negocio.
 */
export interface EquipoBpmConfig {
  id: string;
  nombre: string;
  tipo: TipoEquipoBpm;
  ubicacion: string;
  tempMinOptimaC: number;
  tempMaxOptimaC: number;
  activo: boolean;
}

/**
 * Registro diario de temperatura de cadena de frío o calor almacenado en `registros_temperatura_bpm`.
 */
export interface RegistroTemperaturaBpm {
  id: string;
  negocioId: string;
  equipoId: string;
  equipoNombre: string;
  tipoEquipo: TipoEquipoBpm;
  ubicacion?: string;
  franja: FranjaRegistroBpm;
  fechaIso: string; // YYYY-MM-DD (America/Bogota)
  horaTexto: string; // HH:mm
  temperaturaC: number;
  tempMinOptimaC: number;
  tempMaxOptimaC: number;
  estadoConformidad: EstadoConformidadTempBpm;
  accionCorrectiva?: string;
  resuelto?: boolean;
  resueltoPor?: string;
  resueltoEn?: Timestamp | Date;
  observaciones?: string;
  responsableNombre: string;
  responsableRol?: string;
  fecha: Timestamp | Date;
  creadoEn: Timestamp | Date;
}

/**
 * Payload de entrada para registrar una lectura de temperatura BPM.
 */
export interface RegistrarTemperaturaBpmInput {
  equipoId: string;
  equipoNombre: string;
  tipoEquipo: TipoEquipoBpm;
  ubicacion?: string;
  franja: FranjaRegistroBpm;
  fechaIso?: string;
  horaTexto?: string;
  temperaturaC: number;
  tempMinOptimaC?: number;
  tempMaxOptimaC?: number;
  accionCorrectiva?: string;
  observaciones?: string;
  responsableNombre: string;
  responsableRol?: string;
}

/**
 * Tipo de evento de mantenimiento o control de aceite en freidora.
 */
export type TipoEventoAceiteBpm =
  | 'cambio_completo'
  | 'filtrado'
  | 'inspeccion_calidad'
  | 'reposicion';

/**
 * Evaluación visual del color del aceite de fritura.
 */
export type ColorAceiteBpm =
  | 'claro_optimo'
  | 'dorado_aceptable'
  | 'oscuro_vigilar'
  | 'quemado_rechazar';

/**
 * Veredicto sanitario resultante de la inspección o cambio de aceite.
 */
export type EstadoAceiteBpm = 'optimo' | 'filtrar_pronto' | 'cambiar_inmediato';

/**
 * Disposición final del aceite vegetal usado (ACU) para trazabilidad ambiental/sanitaria.
 */
export type DisposicionAceiteUsado =
  | 'gestor_autorizado'
  | 'bidon_almacenado'
  | 'no_aplica';

/**
 * Configuración de una freidora monitoreada en cocina.
 */
export interface FreidoraBpmConfig {
  id: string;
  nombre: string;
  capacidadLitros: number;
  cicloMaxDiasCambio: number;
  activo: boolean;
}

/**
 * Registro de evento de aceite de freidora almacenado en `registros_aceite_bpm`.
 */
export interface RegistroAceiteBpm {
  id: string;
  negocioId: string;
  freidoraId: string;
  freidoraNombre: string;
  tipoEvento: TipoEventoAceiteBpm;
  colorAceite: ColorAceiteBpm;
  espumaExcesiva: boolean;
  olorRancio: boolean;
  humoBajoPunto: boolean;
  estadoAceite: EstadoAceiteBpm;
  litrosCambiados?: number;
  loteAceiteNuevo?: string;
  disposicionUsado?: DisposicionAceiteUsado;
  gestorResiduosNombre?: string;
  observaciones?: string;
  fechaIso: string; // YYYY-MM-DD (America/Bogota)
  horaTexto: string; // HH:mm
  responsableNombre: string;
  responsableRol?: string;
  fecha: Timestamp | Date;
  creadoEn: Timestamp | Date;
}

/**
 * Payload de entrada para registrar cambio, filtrado o inspección de aceite.
 */
export interface RegistrarAceiteBpmInput {
  freidoraId: string;
  freidoraNombre: string;
  tipoEvento: TipoEventoAceiteBpm;
  colorAceite: ColorAceiteBpm;
  espumaExcesiva?: boolean;
  olorRancio?: boolean;
  humoBajoPunto?: boolean;
  litrosCambiados?: number;
  loteAceiteNuevo?: string;
  disposicionUsado?: DisposicionAceiteUsado;
  gestorResiduosNombre?: string;
  observaciones?: string;
  fechaIso?: string;
  horaTexto?: string;
  responsableNombre: string;
  responsableRol?: string;
}

/**
 * Modalidad del checklist diario de turno BPM.
 */
export type TipoChecklistBpm = 'apertura' | 'cierre';

/**
 * Categoría sanitaria de un ítem del checklist INVIMA.
 */
export type CategoriaItemChecklistBpm =
  | 'higiene_personal'
  | 'cadena_frio'
  | 'limpieza_desinfeccion'
  | 'aceite_coccion'
  | 'residuos_plagas'
  | 'seguridad_equipos';

/**
 * Estado de verificación de un punto del checklist.
 */
export type EstadoItemChecklistBpm = 'pendiente' | 'cumple' | 'no_cumple' | 'na';

/**
 * Estado global de ejecución de un checklist de turno.
 */
export type EstadoChecklistBpm = 'en_progreso' | 'completado' | 'con_hallazgos';

/**
 * Definición base de un punto en la plantilla de checklist BPM.
 */
export interface ItemPlantillaChecklistBpm {
  id: string;
  categoria: CategoriaItemChecklistBpm;
  titulo: string;
  descripcion: string;
  critico: boolean;
}

/**
 * Punto ejecutado con su estado y evidencia de hallazgo dentro de un turno.
 */
export interface ItemChecklistEjecutadoBpm extends ItemPlantillaChecklistBpm {
  estado: EstadoItemChecklistBpm;
  observacion?: string;
}

/**
 * Documento de checklist de apertura o cierre almacenado en `checklists_bpm`.
 */
export interface ChecklistTurnoBpm {
  id: string;
  negocioId: string;
  tipo: TipoChecklistBpm;
  fechaIso: string; // YYYY-MM-DD (America/Bogota)
  estado: EstadoChecklistBpm;
  items: ItemChecklistEjecutadoBpm[];
  totalItems: number;
  itemsCumplidos: number;
  itemsNoConformes: number;
  itemsNa: number;
  itemsPendientes: number;
  hallazgosCriticosCount: number;
  porcentajeCumplimiento: number;
  observacionesGenerales?: string;
  responsableNombre: string;
  responsableRol?: string;
  cerradoPor?: string;
  cerradoEn?: Timestamp | Date;
  creadoEn: Timestamp | Date;
  actualizadoEn: Timestamp | Date;
}

/**
 * Payload de entrada para guardar avance o cerrar un checklist de turno.
 */
export interface GuardarChecklistBpmInput {
  id?: string;
  tipo: TipoChecklistBpm;
  fechaIso?: string;
  items: ItemChecklistEjecutadoBpm[];
  observacionesGenerales?: string;
  responsableNombre: string;
  responsableRol?: string;
  finalizar?: boolean;
}

/**
 * Configuración BPM por negocio almacenada en `configuraciones_bpm/{negocioId}`.
 */
export interface ConfiguracionBpm {
  negocioId: string;
  equiposFrio: EquipoBpmConfig[];
  freidoras: FreidoraBpmConfig[];
  plantillaApertura: ItemPlantillaChecklistBpm[];
  plantillaCierre: ItemPlantillaChecklistBpm[];
  actualizadoPor?: string;
  actualizadoEn?: Timestamp | Date;
}

/**
 * Estado calculado del monitoreo térmico diario para un equipo configurado.
 */
export interface EstadoEquipoFrioEvaluado {
  equipo: EquipoBpmConfig;
  ultimoRegistroHoy: RegistroTemperaturaBpm | null;
  registrosHoyCount: number;
  estadoHoy: 'pendiente' | EstadoConformidadTempBpm;
  tieneDesviacionSinResolver: boolean;
}

/**
 * Estado calculado del ciclo de aceite para una freidora configurada.
 */
export interface EstadoFreidoraEvaluada {
  freidora: FreidoraBpmConfig;
  ultimoEvento: RegistroAceiteBpm | null;
  ultimoCambioCompleto: RegistroAceiteBpm | null;
  diasDesdeUltimoCambio: number | null;
  estadoCiclo: 'optimo' | 'por_vencer' | 'cambiar_urgente' | 'sin_registro';
}

/**
 * Semáforo global sanitario BPM del establecimiento.
 */
export type EstadoGlobalBpm = 'cumple' | 'atencion' | 'critico';

/**
 * Métricas consolidadas de cumplimiento BPM para Dashboard, Cocina y `/bpm`.
 */
export interface ResumenCumplimientoBpm {
  fechaHoyIso: string;
  scoreCumplimientoPct: number;
  estadoGlobal: EstadoGlobalBpm;
  equiposActivosCount: number;
  equiposConLecturaHoy: number;
  equiposConformesHoy: number;
  desviacionesTempHoy: number;
  desviacionesSinResolverCount: number;
  freidorasActivasCount: number;
  freidorasOptimasCount: number;
  freidorasRequierenCambioCount: number;
  checklistAperturaHoy: ChecklistTurnoBpm | null;
  checklistCierreHoy: ChecklistTurnoBpm | null;
  aperturaCompletada: boolean;
  cierreCompletado: boolean;
  hallazgosAbiertosHoy: number;
}

/**
 * Rango temporal de consulta para la bitácora sanitaria BPM.
 */
export type RangoFechaBpm = 'hoy' | '7dias' | '30dias' | 'todo';

/**
 * Filtros interactivos de la vista `/bpm`.
 */
export interface FiltrosBitacoraBpm {
  rango: RangoFechaBpm;
  busqueda: string;
  soloAlertas: boolean;
}
