/**
 * Tipos estrictos para el Módulo de Control "86" en Vivo,
 * Contador Regresivo de Porciones y Programación de Especiales del Día.
 */

export type DiaSemanaEspecial = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Motivo86 =
  | 'sin_insumos'
  | 'produccion_agotada'
  | 'equipo_mantenimiento'
  | 'alta_demanda'
  | 'otro';

export type EstadoDisponibilidad86 =
  | 'disponible'
  | 'disponible_limitado'
  | 'ultimas_porciones'
  | 'agotado_86'
  | 'no_disponible'
  | 'fuera_horario_especial';

export interface Control86Item {
  agotado86: boolean;
  motivo86?: Motivo86;
  nota86?: string;
  contadorActivo: boolean;
  porcionesDisponibles?: number | null;
  umbralAlertaPorciones?: number;
  auto86AlLlegarACero?: boolean;
  actualizadoPor?: string;
  actualizadoEnIso?: string;
}

export interface EspecialDelDiaConfig {
  activo: boolean;
  etiqueta?: string;
  diasSemana: DiaSemanaEspecial[];
  fechaEspecifica?: string; // YYYY-MM-DD (America/Bogota)
  horaInicio?: string; // HH:mm
  horaFin?: string; // HH:mm
  mensajeSugerido?: string;
  soloEnHorarioProgramado?: boolean;
  prioridad?: number;
}

export interface EvaluacionEspecialDelDia {
  configurado: boolean;
  esEspecialVigente: boolean;
  programadoFueraDeHorario: boolean;
  etiqueta: string;
  mensajeSugerido?: string;
  resumenHorario: string;
}

export interface EvaluacionControl86 {
  estado: EstadoDisponibilidad86;
  disponibleBase: boolean;
  agotado86: boolean;
  contadorActivo: boolean;
  porcionesDisponibles: number | null;
  umbralAlertaPorciones: number;
  auto86AlLlegarACero: boolean;
  puedePedirsePublico: boolean;
  puedePedirsePos: boolean;
  maxPedible: number | null;
  badgeTexto?: string;
  motivo86Label?: string;
  nota86?: string;
  especial: EvaluacionEspecialDelDia;
}

export type TipoItemCatalogo86 = 'producto' | 'combo';

export interface ItemCatalogo86 {
  id: string;
  tipo: TipoItemCatalogo86;
  nombre: string;
  categoria: string;
  precio: number;
  imagenUrl?: string;
  disponible: boolean;
  estacionCocina?: string;
  control86?: Control86Item;
  especialDelDia?: EspecialDelDiaConfig;
  evaluacion: EvaluacionControl86;
}

export interface ResumenTablero86 {
  totalCatalogo: number;
  totalEn86: number;
  totalUltimasPorciones: number;
  totalConContador: number;
  totalEspecialesVigentes: number;
  totalEspecialesProgramados: number;
  totalFueraHorarioEspecial: number;
  porcionesTotalesEnContador: number;
}

export type FiltroEstadoTablero86 =
  | 'todos'
  | 'agotados_86'
  | 'ultimas_porciones'
  | 'con_contador'
  | 'especiales_hoy'
  | 'disponibles';

export interface FiltrosTablero86 {
  busqueda: string;
  estado: FiltroEstadoTablero86;
  tipo: 'todos' | TipoItemCatalogo86;
  estacion: string;
}
