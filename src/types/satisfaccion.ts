import type { Timestamp } from 'firebase/firestore';

/**
 * Canales desde los que el cliente o comensal evalúa su experiencia
 */
export type CanalSatisfaccion = 'mesa' | 'domicilio' | 'mostrador_pos' | 'kiosco' | 'tienda_web';

/**
 * Clasificación estándar de Net Promoter Score (NPS) gastronómico
 * - Promotor: 4 o 5 estrellas
 * - Pasivo: 3 estrellas
 * - Detractor: 1 o 2 estrellas
 */
export type TipoExperienciaNps = 'promotor' | 'pasivo' | 'detractor';

/**
 * Estados de seguimiento interno para las encuestas y quejas
 */
export type EstadoEncuestaSatisfaccion = 'nueva' | 'en_seguimiento' | 'resuelta' | 'archivada';

/**
 * Identificadores de etiquetas rápidas táctiles para retroalimentación a un toque
 */
export type TagSatisfaccionId =
  | 'sabor_increible'
  | 'porciones_generosas'
  | 'atencion_rapida'
  | 'comida_caliente'
  | 'excelente_servicio'
  | 'buen_empaque'
  | 'comida_fria'
  | 'demora_excesiva'
  | 'pedido_incompleto'
  | 'falto_salsas'
  | 'mala_atencion'
  | 'empaque_danado';

/**
 * Metadatos descriptivos de las etiquetas de retroalimentación
 */
export interface TagSatisfaccionMeta {
  id: TagSatisfaccionId;
  label: string;
  tipo: 'positivo' | 'constructivo';
  icono: string;
}

/**
 * Evaluación de dimensiones específicas de calidad del servicio (1 a 5)
 */
export interface DimensionesEvaluacion {
  comida?: number;
  servicio?: number;
  tiempo?: number;
  empaque?: number;
}

/**
 * Registro de una encuesta de satisfacción respondida por un comensal
 */
export interface EncuestaSatisfaccion {
  id: string;
  negocioId: string;
  calificacion: number; // 1 a 5 estrellas
  tipoNps: TipoExperienciaNps;
  canal: CanalSatisfaccion;
  ventaId?: string;
  pedidoId?: string;
  mesaNombre?: string;
  meseroNombre?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  dimensiones?: DimensionesEvaluacion;
  tags: TagSatisfaccionId[];
  comentario?: string;
  esQueja: boolean;
  redirigidoGoogleReviews: boolean;
  contactadoPorWhatsApp: boolean;
  estado: EstadoEncuestaSatisfaccion;
  notasInternas?: string;
  atendidaPor?: string;
  creadoEn: Timestamp | string;
  actualizadoEn?: Timestamp | string;
}

/**
 * Datos requeridos para registrar una encuesta desde la vista móvil del comensal
 */
export interface CrearEncuestaSatisfaccionInput {
  calificacion: number;
  canal?: CanalSatisfaccion;
  ventaId?: string;
  pedidoId?: string;
  mesaNombre?: string;
  meseroNombre?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
  dimensiones?: DimensionesEvaluacion;
  tags?: TagSatisfaccionId[];
  comentario?: string;
  redirigidoGoogleReviews?: boolean;
}

/**
 * Configuración del Centro de Satisfacción por Negocio
 */
export interface ConfiguracionSatisfaccion {
  negocioId: string;
  googleBusinessUrl?: string; // Enlace directo a Google Reviews / Google Maps
  telefonoAtencionQuejas?: string; // Número de WhatsApp del administrador
  habilitarRedireccionGoogle: boolean; // Si redirige automáticamente o muestra botón para 5 estrellas
  mensajeAgradecimiento5Estrellas?: string;
  mensajeDisculpaQueja?: string;
  actualizadoEn?: Timestamp | string;
}

/**
 * KPIs consolidados de Satisfacción y NPS
 */
export interface KpisSatisfaccion {
  calificacionPromedio: number;
  totalEncuestas: number;
  promotoresCount: number;
  pasivosCount: number;
  detractoresCount: number;
  indiceNps: number; // De -100 a +100 (% Promotores - % Detractores)
  quejasPendientes: number;
  quejasResueltas: number;
  tasaCincoEstrellas: number; // Porcentaje de 5 estrellas
  promedioComida: number;
  promedioServicio: number;
  promedioTiempo: number;
  promedioEmpaque: number;
  topTagsPositivos: Array<{ tag: TagSatisfaccionId; label: string; count: number }>;
  topTagsConstructivos: Array<{ tag: TagSatisfaccionId; label: string; count: number }>;
}

/**
 * Filtros para el panel administrativo de satisfacción
 */
export interface FiltrosSatisfaccion {
  canal?: CanalSatisfaccion | 'todos';
  calificacion?: 'todas' | '5' | '4' | '3' | '1-2';
  soloQuejas?: boolean;
  estado?: EstadoEncuestaSatisfaccion | 'todos';
  busqueda?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
