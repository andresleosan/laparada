import type {
  ChecklistTurnoBpm,
  ColorAceiteBpm,
  ConfiguracionBpm,
  EquipoBpmConfig,
  EstadoAceiteBpm,
  EstadoChecklistBpm,
  EstadoConformidadTempBpm,
  EstadoEquipoFrioEvaluado,
  EstadoFreidoraEvaluada,
  EstadoGlobalBpm,
  FiltrosBitacoraBpm,
  FranjaRegistroBpm,
  FreidoraBpmConfig,
  ItemChecklistEjecutadoBpm,
  ItemPlantillaChecklistBpm,
  CategoriaItemChecklistBpm,
  RegistroAceiteBpm,
  RegistroTemperaturaBpm,
  ResumenCumplimientoBpm,
  TipoEquipoBpm,
  TipoEventoAceiteBpm,
} from '@/types/bpm';
import type { CrearNotificacionInput } from '@/types/notificacion';
import { toValidAdminDate } from './adminAnalytics';
import {
  esFechaIsoValida,
  escapeCsvSeguro,
  obtenerFechaIsoColombia,
  sumarDiasAFechaIso,
  ZONA_HORARIA_BOGOTA,
} from './lotesInventarioUtils';

const MS_POR_DIA = 86_400_000;
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface RangoNormativoBpmInfo {
  tipo: TipoEquipoBpm;
  minOptimoC: number;
  maxOptimoC: number;
  toleranciaAlertaC: number;
  label: string;
  shortLabel: string;
  rangoTexto: string;
  norma: string;
  presetsC: number[];
}

export const RANGOS_NORMATIVOS_BPM: Record<TipoEquipoBpm, RangoNormativoBpmInfo> = {
  refrigeracion: {
    tipo: 'refrigeracion',
    minOptimoC: 0,
    maxOptimoC: 4,
    toleranciaAlertaC: 2,
    label: 'Refrigeración (0 °C a 4 °C)',
    shortLabel: 'Refrigeración',
    rangoTexto: '0 °C a 4 °C',
    norma: 'Res. 2674 de 2013 Art. 28 INVIMA',
    presetsC: [1.5, 2.5, 3.5, 5.2, 7.5],
  },
  congelacion: {
    tipo: 'congelacion',
    minOptimoC: -25,
    maxOptimoC: -18,
    toleranciaAlertaC: 3,
    label: 'Congelación (-25 °C a -18 °C)',
    shortLabel: 'Congelación',
    rangoTexto: '-25 °C a -18 °C',
    norma: 'Res. 2674 de 2013 Art. 28 INVIMA',
    presetsC: [-22, -20, -18.5, -16, -11],
  },
  caliente: {
    tipo: 'caliente',
    minOptimoC: 60,
    maxOptimoC: 95,
    toleranciaAlertaC: 5,
    label: 'Mantenimiento Caliente (60 °C a 95 °C)',
    shortLabel: 'Caliente',
    rangoTexto: '60 °C a 95 °C',
    norma: 'Res. 2674 INVIMA · Zona segura > 60 °C',
    presetsC: [65, 72, 80, 57, 48],
  },
};

export const FRANJAS_BPM_ORDEN: FranjaRegistroBpm[] = [
  'apertura',
  'mediodia',
  'tarde',
  'cierre',
];

export const FRANJAS_BPM_META: Record<
  FranjaRegistroBpm,
  { id: FranjaRegistroBpm; label: string; shortLabel: string; horarioSugerido: string }
> = {
  apertura: {
    id: 'apertura',
    label: 'Apertura de Turno',
    shortLabel: 'Apertura',
    horarioSugerido: '06:00 – 10:00',
  },
  mediodia: {
    id: 'mediodia',
    label: 'Control Mediodía',
    shortLabel: 'Mediodía',
    horarioSugerido: '11:30 – 14:30',
  },
  tarde: {
    id: 'tarde',
    label: 'Turno Tarde',
    shortLabel: 'Tarde',
    horarioSugerido: '15:00 – 18:30',
  },
  cierre: {
    id: 'cierre',
    label: 'Cierre Nocturno',
    shortLabel: 'Cierre',
    horarioSugerido: '19:00 – 23:59',
  },
};

export const ESTADO_CONFORMIDAD_TEMP_META: Record<
  EstadoConformidadTempBpm,
  {
    id: EstadoConformidadTempBpm;
    label: string;
    shortLabel: string;
    badgeClass: string;
    borderClass: string;
    textClass: string;
  }
> = {
  conforme: {
    id: 'conforme',
    label: 'Conforme (En Rango)',
    shortLabel: 'Conforme',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
  },
  alerta: {
    id: 'alerta',
    label: 'Alerta Preventiva',
    shortLabel: 'Alerta',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-300',
  },
  critico: {
    id: 'critico',
    label: 'Crítico · Fuera de Rango',
    shortLabel: 'Crítico',
    badgeClass: 'border-red-500/60 bg-red-500/15 text-red-300',
    borderClass: 'border-red-500/50',
    textClass: 'text-red-400',
  },
};

export const COLOR_ACEITE_ORDEN: ColorAceiteBpm[] = [
  'claro_optimo',
  'dorado_aceptable',
  'oscuro_vigilar',
  'quemado_rechazar',
];

export const COLOR_ACEITE_META: Record<
  ColorAceiteBpm,
  {
    id: ColorAceiteBpm;
    label: string;
    shortLabel: string;
    descripcion: string;
    swatchClass: string;
    badgeClass: string;
  }
> = {
  claro_optimo: {
    id: 'claro_optimo',
    label: 'Claro / Nuevo',
    shortLabel: 'Claro',
    descripcion: 'Aceite limpio y translúcido, sin partículas en suspensión.',
    swatchClass: 'bg-amber-200 border-amber-300',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  dorado_aceptable: {
    id: 'dorado_aceptable',
    label: 'Dorado Aceptable',
    shortLabel: 'Dorado',
    descripcion: 'Tono ámbar limpio apto para fritura continua.',
    swatchClass: 'bg-amber-400 border-amber-500',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  oscuro_vigilar: {
    id: 'oscuro_vigilar',
    label: 'Oscuro / Vigilar',
    shortLabel: 'Oscuro',
    descripcion: 'Oscurecimiento moderado; requiere filtrado o cambio pronto.',
    swatchClass: 'bg-amber-700 border-amber-600',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  },
  quemado_rechazar: {
    id: 'quemado_rechazar',
    label: 'Quemado / Rechazar',
    shortLabel: 'Quemado',
    descripcion: 'Degradado u opaco; prohibido freír. Cambio inmediato.',
    swatchClass: 'bg-stone-900 border-red-500',
    badgeClass: 'border-red-500/60 bg-red-500/15 text-red-300',
  },
};

export const TIPO_EVENTO_ACEITE_ORDEN: TipoEventoAceiteBpm[] = [
  'cambio_completo',
  'filtrado',
  'inspeccion_calidad',
  'reposicion',
];

export const TIPO_EVENTO_ACEITE_META: Record<
  TipoEventoAceiteBpm,
  { id: TipoEventoAceiteBpm; label: string; shortLabel: string; descripcion: string }
> = {
  cambio_completo: {
    id: 'cambio_completo',
    label: 'Cambio Completo',
    shortLabel: 'Cambio Total',
    descripcion: 'Vaciado total, lavado de cuba y llenado con aceite nuevo.',
  },
  filtrado: {
    id: 'filtrado',
    label: 'Filtrado de Impurezas',
    shortLabel: 'Filtrado',
    descripcion: 'Retiro de sedimentos y borras para extender vida útil.',
  },
  inspeccion_calidad: {
    id: 'inspeccion_calidad',
    label: 'Inspección Sensorial',
    shortLabel: 'Inspección',
    descripcion: 'Revisión diaria de color, olor, espuma y punto de humo.',
  },
  reposicion: {
    id: 'reposicion',
    label: 'Reposición / Relleno',
    shortLabel: 'Reposición',
    descripcion: 'Nivelación con aceite fresco sobre cuba limpia.',
  },
};

export const ESTADO_ACEITE_META: Record<
  EstadoAceiteBpm,
  {
    id: EstadoAceiteBpm;
    label: string;
    shortLabel: string;
    badgeClass: string;
  }
> = {
  optimo: {
    id: 'optimo',
    label: 'Óptimo · Apto',
    shortLabel: 'Óptimo',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  filtrar_pronto: {
    id: 'filtrar_pronto',
    label: 'Filtrar / Vigilar',
    shortLabel: 'Filtrar Pronto',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  },
  cambiar_inmediato: {
    id: 'cambiar_inmediato',
    label: 'Cambio Inmediato',
    shortLabel: 'Cambiar Ya',
    badgeClass: 'border-red-500/60 bg-red-500/15 text-red-300',
  },
};

export const CATEGORIAS_CHECKLIST_BPM_META: Record<
  CategoriaItemChecklistBpm,
  { id: CategoriaItemChecklistBpm; label: string; badgeClass: string }
> = {
  higiene_personal: {
    id: 'higiene_personal',
    label: 'Higiene del Personal',
    badgeClass: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  },
  cadena_frio: {
    id: 'cadena_frio',
    label: 'Cadena de Frío',
    badgeClass: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  },
  limpieza_desinfeccion: {
    id: 'limpieza_desinfeccion',
    label: 'Limpieza y Desinfección',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  aceite_coccion: {
    id: 'aceite_coccion',
    label: 'Aceite y Cocción',
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  residuos_plagas: {
    id: 'residuos_plagas',
    label: 'Residuos y Plagas',
    badgeClass: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  },
  seguridad_equipos: {
    id: 'seguridad_equipos',
    label: 'Seguridad y Equipos',
    badgeClass: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  },
};

export const EQUIPOS_BPM_DEFAULT: EquipoBpmConfig[] = [
  {
    id: 'eq-nevera-carnes',
    nombre: 'Nevera Principal Carnes & Quesos',
    tipo: 'refrigeracion',
    ubicacion: 'Cocina Fría / Bodega',
    tempMinOptimaC: 0,
    tempMaxOptimaC: 4,
    activo: true,
  },
  {
    id: 'eq-nevera-bebidas',
    nombre: 'Nevera Bebidas y Salsas',
    tipo: 'refrigeracion',
    ubicacion: 'Barra / Mostrador',
    tempMinOptimaC: 0,
    tempMaxOptimaC: 4,
    activo: true,
  },
  {
    id: 'eq-congelador-fritos',
    nombre: 'Congelador Masas y Fritos',
    tipo: 'congelacion',
    ubicacion: 'Bodega Congelados',
    tempMinOptimaC: -25,
    tempMaxOptimaC: -18,
    activo: true,
  },
  {
    id: 'eq-vitrina-caliente',
    nombre: 'Vitrina Caliente Fritos',
    tipo: 'caliente',
    ubicacion: 'Mostrador / Vitrina',
    tempMinOptimaC: 60,
    tempMaxOptimaC: 95,
    activo: true,
  },
];

export const FREIDORAS_BPM_DEFAULT: FreidoraBpmConfig[] = [
  {
    id: 'fre-1',
    nombre: 'Freidora #1 — Fritos y Tequeños',
    capacidadLitros: 15,
    cicloMaxDiasCambio: 3,
    activo: true,
  },
  {
    id: 'fre-2',
    nombre: 'Freidora #2 — Papas y Acompañamientos',
    capacidadLitros: 15,
    cicloMaxDiasCambio: 3,
    activo: true,
  },
];

export const PLANTILLA_CHECKLIST_APERTURA_DEFAULT: ItemPlantillaChecklistBpm[] = [
  {
    id: 'ap-1',
    categoria: 'higiene_personal',
    titulo: 'Uniforme limpio, cofia, tapabocas y uñas cortas',
    descripcion: 'Todo manipulador ingresa sin joyas, reloj ni esmalte; lavado de manos verificado.',
    critico: true,
  },
  {
    id: 'ap-2',
    categoria: 'higiene_personal',
    titulo: 'Estación de lavado con jabón antibacterial y toallas',
    descripcion: 'Dispensadores recargados y gel desinfectante disponible en cocina y barra.',
    critico: true,
  },
  {
    id: 'ap-3',
    categoria: 'cadena_frio',
    titulo: 'Neveras y congeladores en rango INVIMA',
    descripcion: 'Refrigeración 0 °C a 4 °C y congelación ≤ -18 °C antes de procesar alimentos.',
    critico: true,
  },
  {
    id: 'ap-4',
    categoria: 'cadena_frio',
    titulo: 'Rotación PEPS y rotulado con fecha de apertura',
    descripcion: 'Insumos y sub-recetas cerrados, etiquetados y sin productos vencidos en línea.',
    critico: true,
  },
  {
    id: 'ap-5',
    categoria: 'limpieza_desinfeccion',
    titulo: 'Mesones, tablas por color y utensilios desinfectados',
    descripcion: 'Separación estricta crudo/cocido y solución sanitizante preparada a dosis correcta.',
    critico: true,
  },
  {
    id: 'ap-6',
    categoria: 'aceite_coccion',
    titulo: 'Inspección inicial de aceite en freidoras',
    descripcion: 'Aceite limpio, sin olor rancio ni sedimentos quemados antes de encender servicio.',
    critico: false,
  },
  {
    id: 'ap-7',
    categoria: 'residuos_plagas',
    titulo: 'Ausencia de rastros de plagas y mallas íntegras',
    descripcion: 'Revisión visual de pisos, zócalos y bodega seca sin evidencia de roedores o insectos.',
    critico: true,
  },
  {
    id: 'ap-8',
    categoria: 'residuos_plagas',
    titulo: 'Canecas con bolsa, tapa y pedal funcionales',
    descripcion: 'Recipientes limpios y separados (orgánicos, reciclables y ordinarios).',
    critico: false,
  },
  {
    id: 'ap-9',
    categoria: 'seguridad_equipos',
    titulo: 'Suministro de agua potable y presión en pocetas',
    descripcion: 'Verificación de agua limpia y ausencia de fugas en sifones o trampas de grasa.',
    critico: true,
  },
  {
    id: 'ap-10',
    categoria: 'seguridad_equipos',
    titulo: 'Válvulas de gas, campana extractora y extintor listos',
    descripcion: 'Sin olor a gas, extracción encendida y pasillo despejado en línea caliente.',
    critico: false,
  },
];

export const PLANTILLA_CHECKLIST_CIERRE_DEFAULT: ItemPlantillaChecklistBpm[] = [
  {
    id: 'ci-1',
    categoria: 'limpieza_desinfeccion',
    titulo: 'Lavado y desinfección profunda de mesones y plancha',
    descripcion: 'Superficies libres de grasa y restos orgánicos con aplicación de sanitizante.',
    critico: true,
  },
  {
    id: 'ci-2',
    categoria: 'limpieza_desinfeccion',
    titulo: 'Pisos lavados, escobas colgadas y drenajes limpios',
    descripcion: 'Rejillas sin residuos sólidos; elementos de aseo separados de cocina.',
    critico: false,
  },
  {
    id: 'ci-3',
    categoria: 'cadena_frio',
    titulo: 'Alimentos guardados, cubiertos y rotulados en frío',
    descripcion: 'Cero alimentos a temperatura ambiente; recipientes herméticos con fecha y lote.',
    critico: true,
  },
  {
    id: 'ci-4',
    categoria: 'cadena_frio',
    titulo: 'Toma de temperatura de cierre en neveras y congeladores',
    descripcion: 'Puertas bien selladas, empaques limpios y lectura final registrada en bitácora.',
    critico: true,
  },
  {
    id: 'ci-5',
    categoria: 'aceite_coccion',
    titulo: 'Freidoras filtradas/tapadas y aceite usado en bidón',
    descripcion: 'Sin aceite expuesto al polvo ni vertimiento de grasas al alcantarillado.',
    critico: true,
  },
  {
    id: 'ci-6',
    categoria: 'limpieza_desinfeccion',
    titulo: 'Filtros de campana y trampa de grasa revisados',
    descripcion: 'Limpieza preventiva realizada según frecuencia diaria de operación.',
    critico: false,
  },
  {
    id: 'ci-7',
    categoria: 'residuos_plagas',
    titulo: 'Evacuación total de basuras hacia cuarto de residuos',
    descripcion: 'Ninguna bolsa de residuos permanece dentro de cocina durante la noche.',
    critico: true,
  },
  {
    id: 'ci-8',
    categoria: 'residuos_plagas',
    titulo: 'Insumos secos sellados sobre estibas (15 cm del piso)',
    descripcion: 'Harinas, empaques y salsas cerradas protegiendo contra humedad y plagas.',
    critico: false,
  },
  {
    id: 'ci-9',
    categoria: 'seguridad_equipos',
    titulo: 'Cierre de llaves de gas y apagado de equipos de cocción',
    descripcion: 'Plancha, freidoras, hornos y vitrina caliente desconectados de forma segura.',
    critico: true,
  },
  {
    id: 'ci-10',
    categoria: 'higiene_personal',
    titulo: 'Registro de hallazgos y entrega formal de turno',
    descripcion: 'Novedades documentadas para el turno de apertura siguiente.',
    critico: false,
  },
];

/**
 * Crea una configuración BPM base lista para operar desde el primer día.
 */
export function crearConfiguracionBpmDefault(negocioId: string): ConfiguracionBpm {
  return {
    negocioId,
    equiposFrio: EQUIPOS_BPM_DEFAULT.map((e) => ({ ...e })),
    freidoras: FREIDORAS_BPM_DEFAULT.map((f) => ({ ...f })),
    plantillaApertura: PLANTILLA_CHECKLIST_APERTURA_DEFAULT.map((i) => ({ ...i })),
    plantillaCierre: PLANTILLA_CHECKLIST_CIERRE_DEFAULT.map((i) => ({ ...i })),
  };
}

function parseFechaIsoUtc(fechaIso: string): Date | null {
  const match = ISO_DATE_REGEX.exec((fechaIso || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Obtiene la hora actual en formato HH:mm para zona horaria Colombia (America/Bogota).
 */
export function obtenerHoraColombia(ahora: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONA_HORARIA_BOGOTA,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ahora);
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh === '24' ? '00' : hh}:${mm}`;
}

/**
 * Obtiene la hora numérica entera (0-23) en Colombia.
 */
export function obtenerHoraEnteraColombia(ahora: Date = new Date()): number {
  const horaStr = obtenerHoraColombia(ahora).slice(0, 2);
  const n = Number(horaStr);
  return Number.isFinite(n) ? n : 12;
}

/**
 * Sugiere la franja horaria de turno más acorde a la hora actual en Colombia.
 */
export function sugerirFranjaBpm(ahora: Date = new Date()): FranjaRegistroBpm {
  const hora = obtenerHoraEnteraColombia(ahora);
  if (hora < 11) return 'apertura';
  if (hora < 15) return 'mediodia';
  if (hora < 19) return 'tarde';
  return 'cierre';
}

/**
 * Valida y redondea a 1 decimal una temperatura física en grados Celsius dentro de [-60, 250].
 */
export function validarTemperaturaFisica(tempC: number): number {
  if (!Number.isFinite(tempC)) {
    throw new Error('La temperatura debe ser un número válido');
  }
  if (tempC < -60 || tempC > 250) {
    throw new Error('La temperatura debe estar entre -60 °C y 250 °C');
  }
  return Math.round(tempC * 10) / 10;
}

/**
 * Evalúa si una lectura de temperatura está conforme, en alerta preventiva o crítica según normativa BPM.
 */
export function evaluarConformidadTemperatura(
  temperaturaC: number,
  tipoEquipo: TipoEquipoBpm,
  rangoCustom?: { min: number; max: number }
): EstadoConformidadTempBpm {
  const temp = validarTemperaturaFisica(temperaturaC);
  const norm = RANGOS_NORMATIVOS_BPM[tipoEquipo] ?? RANGOS_NORMATIVOS_BPM.refrigeracion;

  const rawMin = rangoCustom ? rangoCustom.min : norm.minOptimoC;
  const rawMax = rangoCustom ? rangoCustom.max : norm.maxOptimoC;
  const minOpt = Math.min(rawMin, rawMax);
  const maxOpt = Math.max(rawMin, rawMax);

  if (temp >= minOpt && temp <= maxOpt) {
    return 'conforme';
  }

  const tolerancia = norm.toleranciaAlertaC;
  if (temp >= minOpt - tolerancia && temp <= maxOpt + tolerancia) {
    return 'alerta';
  }

  return 'critico';
}

/**
 * Calcula el veredicto sanitario de una freidora a partir de los parámetros de inspección o cambio.
 */
export function evaluarEstadoAceite(params: {
  tipoEvento: TipoEventoAceiteBpm;
  colorAceite: ColorAceiteBpm;
  espumaExcesiva?: boolean;
  olorRancio?: boolean;
  humoBajoPunto?: boolean;
}): EstadoAceiteBpm {
  if (params.tipoEvento === 'cambio_completo') {
    return 'optimo';
  }

  if (
    params.colorAceite === 'quemado_rechazar' ||
    Boolean(params.olorRancio) ||
    Boolean(params.humoBajoPunto)
  ) {
    return 'cambiar_inmediato';
  }

  if (params.colorAceite === 'oscuro_vigilar' || Boolean(params.espumaExcesiva)) {
    return 'filtrar_pronto';
  }

  return 'optimo';
}

/**
 * Inicializa la lista de ítems ejecutables en estado `pendiente` a partir de una plantilla.
 */
export function crearItemsDesdePlantilla(
  plantilla: ItemPlantillaChecklistBpm[]
): ItemChecklistEjecutadoBpm[] {
  return plantilla.map((item) => ({
    ...item,
    estado: 'pendiente',
  }));
}

export interface MetricasChecklistCalculadas {
  totalItems: number;
  itemsCumplidos: number;
  itemsNoConformes: number;
  itemsNa: number;
  itemsPendientes: number;
  hallazgosCriticosCount: number;
  porcentajeCumplimiento: number;
  estado: EstadoChecklistBpm;
}

/**
 * Calcula métricas agregadas y estado global de un checklist de apertura o cierre.
 */
export function calcularMetricasChecklist(
  items: ItemChecklistEjecutadoBpm[],
  finalizar = false
): MetricasChecklistCalculadas {
  const totalItems = items.length;
  let itemsCumplidos = 0;
  let itemsNoConformes = 0;
  let itemsNa = 0;
  let itemsPendientes = 0;
  let hallazgosCriticosCount = 0;

  for (const item of items) {
    if (item.estado === 'cumple') {
      itemsCumplidos++;
    } else if (item.estado === 'no_cumple') {
      itemsNoConformes++;
      if (item.critico) hallazgosCriticosCount++;
    } else if (item.estado === 'na') {
      itemsNa++;
    } else {
      itemsPendientes++;
    }
  }

  const denominador = totalItems - itemsNa;
  const porcentajeCumplimiento =
    denominador <= 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((itemsCumplidos / denominador) * 100)));

  let estado: EstadoChecklistBpm = 'en_progreso';
  if (itemsNoConformes > 0 && (finalizar || itemsPendientes === 0)) {
    estado = 'con_hallazgos';
  } else if (itemsPendientes === 0) {
    estado = 'completado';
  } else if (!finalizar) {
    estado = 'en_progreso';
  }

  return {
    totalItems,
    itemsCumplidos,
    itemsNoConformes,
    itemsNa,
    itemsPendientes,
    hallazgosCriticosCount,
    porcentajeCumplimiento,
    estado,
  };
}

/**
 * Calcula la diferencia en días calendario entre dos fechas ISO YYYY-MM-DD.
 */
export function calcularDiasEntreFechasIso(desdeIso: string, hastaIso: string): number {
  const desdeUtc = parseFechaIsoUtc(desdeIso);
  const hastaUtc = parseFechaIsoUtc(hastaIso);
  if (!desdeUtc || !hastaUtc) return 0;
  return Math.round((hastaUtc.getTime() - desdeUtc.getTime()) / MS_POR_DIA);
}

function getTimestampMs(valor: unknown): number {
  const d = toValidAdminDate(valor);
  return d ? d.getTime() : 0;
}

/**
 * Evalúa el estado de monitoreo térmico de cada equipo activo durante la fecha indicada.
 */
export function evaluarEquiposFrioHoy(
  equipos: EquipoBpmConfig[],
  registros: RegistroTemperaturaBpm[],
  fechaHoyIso: string = obtenerFechaIsoColombia()
): EstadoEquipoFrioEvaluado[] {
  const fechaRef = esFechaIsoValida(fechaHoyIso) ? fechaHoyIso : obtenerFechaIsoColombia();

  return equipos
    .filter((e) => e.activo)
    .map((equipo) => {
      const regsHoy = registros
        .filter((r) => r.equipoId === equipo.id && r.fechaIso === fechaRef)
        .sort(
          (a, b) =>
            getTimestampMs(b.fecha ?? b.creadoEn) - getTimestampMs(a.fecha ?? a.creadoEn)
        );

      const ultimoRegistroHoy = regsHoy[0] ?? null;
      const tieneDesviacionSinResolver = regsHoy.some(
        (r) =>
          (r.estadoConformidad === 'critico' || r.estadoConformidad === 'alerta') &&
          !r.resuelto
      );

      return {
        equipo,
        ultimoRegistroHoy,
        registrosHoyCount: regsHoy.length,
        estadoHoy: ultimoRegistroHoy ? ultimoRegistroHoy.estadoConformidad : 'pendiente',
        tieneDesviacionSinResolver,
      };
    });
}

/**
 * Evalúa el estado del ciclo de vida del aceite para cada freidora activa configurada.
 */
export function evaluarFreidorasEstado(
  freidoras: FreidoraBpmConfig[],
  registros: RegistroAceiteBpm[],
  fechaHoyIso: string = obtenerFechaIsoColombia()
): EstadoFreidoraEvaluada[] {
  const fechaRef = esFechaIsoValida(fechaHoyIso) ? fechaHoyIso : obtenerFechaIsoColombia();

  return freidoras
    .filter((f) => f.activo)
    .map((freidora) => {
      const regs = registros
        .filter((r) => r.freidoraId === freidora.id)
        .sort((a, b) => {
          if (a.fechaIso !== b.fechaIso) {
            return b.fechaIso.localeCompare(a.fechaIso);
          }
          return (
            getTimestampMs(b.fecha ?? b.creadoEn) - getTimestampMs(a.fecha ?? a.creadoEn)
          );
        });

      const ultimoEvento = regs[0] ?? null;
      const ultimoCambioCompleto =
        regs.find((r) => r.tipoEvento === 'cambio_completo') ?? null;
      const diasDesdeUltimoCambio = ultimoCambioCompleto
        ? Math.max(0, calcularDiasEntreFechasIso(ultimoCambioCompleto.fechaIso, fechaRef))
        : null;

      let estadoCiclo: EstadoFreidoraEvaluada['estadoCiclo'] = 'optimo';
      if (ultimoEvento?.estadoAceite === 'cambiar_inmediato') {
        estadoCiclo = 'cambiar_urgente';
      } else if (
        diasDesdeUltimoCambio !== null &&
        diasDesdeUltimoCambio > freidora.cicloMaxDiasCambio
      ) {
        estadoCiclo = 'cambiar_urgente';
      } else if (
        ultimoEvento?.estadoAceite === 'filtrar_pronto' ||
        (diasDesdeUltimoCambio !== null &&
          diasDesdeUltimoCambio === freidora.cicloMaxDiasCambio)
      ) {
        estadoCiclo = 'por_vencer';
      } else if (!ultimoEvento && !ultimoCambioCompleto) {
        estadoCiclo = 'sin_registro';
      }

      return {
        freidora,
        ultimoEvento,
        ultimoCambioCompleto,
        diasDesdeUltimoCambio,
        estadoCiclo,
      };
    });
}

/**
 * Calcula el resumen consolidado de cumplimiento sanitario BPM para el día actual en Colombia.
 */
export function calcularResumenCumplimientoBpm(params: {
  config: ConfiguracionBpm;
  temperaturas: RegistroTemperaturaBpm[];
  aceite: RegistroAceiteBpm[];
  checklists: ChecklistTurnoBpm[];
  ahora?: Date;
}): ResumenCumplimientoBpm {
  const ahora = params.ahora ?? new Date();
  const fechaHoyIso = obtenerFechaIsoColombia(ahora);
  const horaBogota = obtenerHoraEnteraColombia(ahora);

  const equiposEvaluados = evaluarEquiposFrioHoy(
    params.config.equiposFrio,
    params.temperaturas,
    fechaHoyIso
  );
  const freidorasEvaluadas = evaluarFreidorasEstado(
    params.config.freidoras,
    params.aceite,
    fechaHoyIso
  );

  const checklistsHoy = params.checklists
    .filter((c) => c.fechaIso === fechaHoyIso)
    .sort(
      (a, b) =>
        getTimestampMs(b.actualizadoEn ?? b.creadoEn) -
        getTimestampMs(a.actualizadoEn ?? a.creadoEn)
    );

  const checklistAperturaHoy =
    checklistsHoy.find((c) => c.tipo === 'apertura') ?? null;
  const checklistCierreHoy = checklistsHoy.find((c) => c.tipo === 'cierre') ?? null;

  const equiposActivosCount = equiposEvaluados.length;
  const equiposConLecturaHoy = equiposEvaluados.filter(
    (e) => e.registrosHoyCount > 0
  ).length;
  const equiposConformesHoy = equiposEvaluados.filter(
    (e) => e.estadoHoy === 'conforme'
  ).length;

  const registrosTempHoy = params.temperaturas.filter(
    (r) => r.fechaIso === fechaHoyIso
  );
  const desviacionesTempHoy = registrosTempHoy.filter(
    (r) => r.estadoConformidad === 'alerta' || r.estadoConformidad === 'critico'
  ).length;
  const desviacionesSinResolverCount = registrosTempHoy.filter(
    (r) =>
      (r.estadoConformidad === 'alerta' || r.estadoConformidad === 'critico') &&
      !r.resuelto
  ).length;

  const freidorasActivasCount = freidorasEvaluadas.length;
  const freidorasOptimasCount = freidorasEvaluadas.filter(
    (f) => f.estadoCiclo === 'optimo'
  ).length;
  const freidorasRequierenCambioCount = freidorasEvaluadas.filter(
    (f) => f.estadoCiclo === 'cambiar_urgente'
  ).length;

  const aperturaCompletada = checklistAperturaHoy?.estado === 'completado';
  const cierreCompletado = checklistCierreHoy?.estado === 'completado';
  const hallazgosAbiertosHoy =
    (checklistAperturaHoy?.itemsNoConformes ?? 0) +
    (checklistCierreHoy?.itemsNoConformes ?? 0);

  // Ponderación determinística (100 pts)
  let scoreCold = 40;
  if (equiposActivosCount > 0) {
    const sumCold = equiposEvaluados.reduce((acc, item) => {
      if (item.estadoHoy === 'conforme') return acc + 1;
      if (item.estadoHoy === 'alerta') return acc + 0.5;
      if (item.estadoHoy === 'critico') {
        return acc + (item.tieneDesviacionSinResolver ? 0 : 0.4);
      }
      return acc;
    }, 0);
    scoreCold = (sumCold / equiposActivosCount) * 40;
  }

  let scoreOil = 25;
  if (freidorasActivasCount > 0) {
    const sumOil = freidorasEvaluadas.reduce((acc, item) => {
      if (item.estadoCiclo === 'optimo') return acc + 1;
      if (item.estadoCiclo === 'por_vencer') return acc + 0.6;
      if (item.estadoCiclo === 'sin_registro') return acc + 0.3;
      return acc;
    }, 0);
    scoreOil = (sumOil / freidorasActivasCount) * 25;
  }

  let scoreOpen = 0;
  if (checklistAperturaHoy) {
    scoreOpen =
      checklistAperturaHoy.estado === 'completado'
        ? 25
        : (checklistAperturaHoy.porcentajeCumplimiento / 100) * 25;
  }

  let scoreClose = 0;
  if (checklistCierreHoy) {
    scoreClose =
      checklistCierreHoy.estado === 'completado'
        ? 10
        : (checklistCierreHoy.porcentajeCumplimiento / 100) * 10;
  } else if (horaBogota < 19) {
    // No penalizar checklist de cierre antes de las 7:00 PM hora Colombia
    scoreClose = 10;
  }

  const scoreCumplimientoPct = Math.max(
    0,
    Math.min(100, Math.round(scoreCold + scoreOil + scoreOpen + scoreClose))
  );

  const hayCriticoTempSinResolver = equiposEvaluados.some(
    (e) => e.estadoHoy === 'critico' && e.tieneDesviacionSinResolver
  );
  const hayHallazgoCriticoHoy =
    (checklistAperturaHoy?.hallazgosCriticosCount ?? 0) > 0 ||
    (checklistCierreHoy?.hallazgosCriticosCount ?? 0) > 0;

  let estadoGlobal: EstadoGlobalBpm = 'cumple';
  if (
    hayCriticoTempSinResolver ||
    freidorasRequierenCambioCount > 0 ||
    hayHallazgoCriticoHoy ||
    scoreCumplimientoPct < 60
  ) {
    estadoGlobal = 'critico';
  } else if (
    desviacionesSinResolverCount > 0 ||
    freidorasEvaluadas.some(
      (f) => f.estadoCiclo === 'por_vencer' || f.estadoCiclo === 'sin_registro'
    ) ||
    equiposConLecturaHoy < equiposActivosCount ||
    !aperturaCompletada ||
    hallazgosAbiertosHoy > 0 ||
    scoreCumplimientoPct < 85
  ) {
    estadoGlobal = 'atencion';
  }

  return {
    fechaHoyIso,
    scoreCumplimientoPct,
    estadoGlobal,
    equiposActivosCount,
    equiposConLecturaHoy,
    equiposConformesHoy,
    desviacionesTempHoy,
    desviacionesSinResolverCount,
    freidorasActivasCount,
    freidorasOptimasCount,
    freidorasRequierenCambioCount,
    checklistAperturaHoy,
    checklistCierreHoy,
    aperturaCompletada,
    cierreCompletado,
    hallazgosAbiertosHoy,
  };
}

/**
 * Filtra registros de temperatura, aceite o checklists según rango de fechas, búsqueda textual y alertas.
 */
export function filtrarRegistrosBpm<T extends { fechaIso: string }>(
  items: T[],
  filtros: FiltrosBitacoraBpm,
  getTexto: (item: T) => string,
  esAlerta: (item: T) => boolean,
  ahora: Date = new Date()
): T[] {
  const hoyIso = obtenerFechaIsoColombia(ahora);
  const limite7Iso = sumarDiasAFechaIso(hoyIso, -6);
  const limite30Iso = sumarDiasAFechaIso(hoyIso, -29);
  const busqueda = (filtros.busqueda || '').trim().toLowerCase();

  return items.filter((item) => {
    if (filtros.rango === 'hoy' && item.fechaIso !== hoyIso) {
      return false;
    }
    if (filtros.rango === '7dias' && item.fechaIso < limite7Iso) {
      return false;
    }
    if (filtros.rango === '30dias' && item.fechaIso < limite30Iso) {
      return false;
    }
    if (filtros.soloAlertas && !esAlerta(item)) {
      return false;
    }
    if (busqueda && !getTexto(item).toLowerCase().includes(busqueda)) {
      return false;
    }
    return true;
  });
}

/**
 * Sintetiza alertas operativas BPM listas para mostrar o despachar al Centro de Notificaciones.
 */
export function construirAlertasBpm(params: {
  config: ConfiguracionBpm;
  temperaturas: RegistroTemperaturaBpm[];
  aceite: RegistroAceiteBpm[];
  checklists: ChecklistTurnoBpm[];
  ahora?: Date;
}): CrearNotificacionInput[] {
  const ahora = params.ahora ?? new Date();
  const fechaHoyIso = obtenerFechaIsoColombia(ahora);
  const equiposEvaluados = evaluarEquiposFrioHoy(
    params.config.equiposFrio,
    params.temperaturas,
    fechaHoyIso
  );
  const freidorasEvaluadas = evaluarFreidorasEstado(
    params.config.freidoras,
    params.aceite,
    fechaHoyIso
  );

  const alertas: CrearNotificacionInput[] = [];

  for (const eq of equiposEvaluados) {
    if (eq.estadoHoy === 'critico' && eq.tieneDesviacionSinResolver && eq.ultimoRegistroHoy) {
      alertas.push({
        modulo: 'cocina',
        tipo: 'bpm_temperatura_critica',
        titulo: `Alerta Cadena de Frío: ${eq.equipo.nombre} (${eq.ultimoRegistroHoy.temperaturaC} °C)`,
        mensaje: `Lectura crítica fuera de rango (${eq.equipo.tempMinOptimaC} °C a ${eq.equipo.tempMaxOptimaC} °C). Verificar compresor/puerta y registrar resolución.`,
        urgencia: 'critica',
        enlace: '/bpm',
        origen: 'automatico',
        metadata: {
          equipoId: eq.equipo.id,
          fechaIso: fechaHoyIso,
          temperaturaC: eq.ultimoRegistroHoy.temperaturaC,
        },
      });
    } else if (
      eq.estadoHoy === 'alerta' &&
      eq.tieneDesviacionSinResolver &&
      eq.ultimoRegistroHoy
    ) {
      alertas.push({
        modulo: 'cocina',
        tipo: 'bpm_temperatura_alerta',
        titulo: `Temperatura Preventiva: ${eq.equipo.nombre} (${eq.ultimoRegistroHoy.temperaturaC} °C)`,
        mensaje: `Equipo cercano al límite INVIMA (${eq.equipo.tempMinOptimaC} °C a ${eq.equipo.tempMaxOptimaC} °C).`,
        urgencia: 'alta',
        enlace: '/bpm',
        origen: 'automatico',
        metadata: {
          equipoId: eq.equipo.id,
          fechaIso: fechaHoyIso,
          temperaturaC: eq.ultimoRegistroHoy.temperaturaC,
        },
      });
    }
  }

  for (const fr of freidorasEvaluadas) {
    if (fr.estadoCiclo === 'cambiar_urgente') {
      alertas.push({
        modulo: 'cocina',
        tipo: 'bpm_cambio_aceite_urgente',
        titulo: `Cambio de Aceite Urgente: ${fr.freidora.nombre}`,
        mensaje:
          fr.diasDesdeUltimoCambio !== null
            ? `Lleva ${fr.diasDesdeUltimoCambio} día(s) desde el último cambio (máximo ${fr.freidora.cicloMaxDiasCambio}d) o presentó alerta de calidad.`
            : `Inspección reportó aceite degradado/quemado. Reemplazar antes de continuar fritura.`,
        urgencia: 'critica',
        enlace: '/bpm',
        origen: 'automatico',
        metadata: {
          freidoraId: fr.freidora.id,
          fechaIso: fechaHoyIso,
        },
      });
    } else if (fr.estadoCiclo === 'por_vencer') {
      alertas.push({
        modulo: 'cocina',
        tipo: 'bpm_aceite_filtrar',
        titulo: `Filtrar o Programar Cambio: ${fr.freidora.nombre}`,
        mensaje: `El aceite alcanzó su límite sugerido de uso o presentó oscurecimiento moderado.`,
        urgencia: 'alta',
        enlace: '/bpm',
        origen: 'automatico',
        metadata: {
          freidoraId: fr.freidora.id,
          fechaIso: fechaHoyIso,
        },
      });
    }
  }

  const aperturaHoy = params.checklists.find(
    (c) => c.fechaIso === fechaHoyIso && c.tipo === 'apertura'
  );
  if (!aperturaHoy && obtenerHoraEnteraColombia(ahora) >= 10) {
    alertas.push({
      modulo: 'cocina',
      tipo: 'bpm_checklist_apertura_pendiente',
      titulo: 'Checklist BPM de Apertura Pendiente',
      mensaje: `No se ha registrado el checklist sanitario de apertura para hoy (${fechaHoyIso}).`,
      urgencia: 'alta',
      enlace: '/bpm',
      origen: 'automatico',
      metadata: { fechaIso: fechaHoyIso },
    });
  } else if (aperturaHoy && aperturaHoy.hallazgosCriticosCount > 0) {
    alertas.push({
      modulo: 'cocina',
      tipo: 'bpm_checklist_hallazgo_critico',
      titulo: `Hallazgo Crítico en Checklist de Apertura (${aperturaHoy.hallazgosCriticosCount})`,
      mensaje: `Se detectaron incumplimientos críticos en la apertura del turno. Revisar plan de acción en /bpm.`,
      urgencia: 'alta',
      enlace: '/bpm',
      origen: 'automatico',
      metadata: { fechaIso: fechaHoyIso, checklistId: aperturaHoy.id },
    });
  }

  return alertas;
}

/**
 * Genera el archivo CSV consolidado (RFC 4180 + UTF-8 BOM) para inspecciones de Secretaría de Salud / INVIMA.
 */
export function generarCsvCarpetaSanitariaBpm(params: {
  nombreNegocio: string;
  temperaturas: RegistroTemperaturaBpm[];
  aceite: RegistroAceiteBpm[];
  checklists: ChecklistTurnoBpm[];
  ahora?: Date;
}): string {
  const negocio = params.nombreNegocio || 'La Parada';
  const headers = [
    'Negocio',
    'Tipo Registro',
    'Fecha ISO',
    'Hora / Franja',
    'Equipo / Freidora / Turno',
    'Medicion / Evento',
    'Rango / Detalle',
    'Estado / Veredicto',
    'Accion Correctiva / Hallazgos',
    'Resuelto',
    'Responsable',
    'Observaciones',
  ];

  const filas: string[] = [];

  for (const reg of params.temperaturas) {
    const franjaLabel = FRANJAS_BPM_META[reg.franja]?.shortLabel || reg.franja;
    const estadoLabel =
      ESTADO_CONFORMIDAD_TEMP_META[reg.estadoConformidad]?.label ||
      reg.estadoConformidad;
    filas.push(
      [
        escapeCsvSeguro(negocio),
        escapeCsvSeguro('Temperatura Frio/Calor'),
        escapeCsvSeguro(reg.fechaIso),
        escapeCsvSeguro(`${reg.horaTexto} (${franjaLabel})`),
        escapeCsvSeguro(reg.equipoNombre),
        escapeCsvSeguro(reg.temperaturaC),
        escapeCsvSeguro(`${reg.tempMinOptimaC} a ${reg.tempMaxOptimaC} C`),
        escapeCsvSeguro(estadoLabel),
        escapeCsvSeguro(reg.accionCorrectiva || ''),
        escapeCsvSeguro(
          reg.estadoConformidad === 'conforme'
            ? 'N/A'
            : reg.resuelto
            ? 'Si'
            : 'Pendiente'
        ),
        escapeCsvSeguro(reg.responsableNombre),
        escapeCsvSeguro(reg.observaciones || ''),
      ].join(',')
    );
  }

  for (const reg of params.aceite) {
    const eventoLabel =
      TIPO_EVENTO_ACEITE_META[reg.tipoEvento]?.label || reg.tipoEvento;
    const colorLabel = COLOR_ACEITE_META[reg.colorAceite]?.label || reg.colorAceite;
    const estadoLabel = ESTADO_ACEITE_META[reg.estadoAceite]?.label || reg.estadoAceite;
    const banderas = [
      reg.espumaExcesiva ? 'Espuma excesiva' : '',
      reg.olorRancio ? 'Olor rancio' : '',
      reg.humoBajoPunto ? 'Humo excesivo' : '',
    ]
      .filter(Boolean)
      .join('; ');
    const detalle = [
      `Color: ${colorLabel}`,
      typeof reg.litrosCambiados === 'number' ? `${reg.litrosCambiados} L` : '',
      reg.loteAceiteNuevo ? `Lote: ${reg.loteAceiteNuevo}` : '',
      reg.disposicionUsado && reg.disposicionUsado !== 'no_aplica'
        ? `ACU: ${reg.disposicionUsado}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');

    filas.push(
      [
        escapeCsvSeguro(negocio),
        escapeCsvSeguro('Aceite Freidora'),
        escapeCsvSeguro(reg.fechaIso),
        escapeCsvSeguro(reg.horaTexto),
        escapeCsvSeguro(reg.freidoraNombre),
        escapeCsvSeguro(eventoLabel),
        escapeCsvSeguro(detalle),
        escapeCsvSeguro(estadoLabel),
        escapeCsvSeguro(banderas || 'Sin anomalias sensoriales'),
        escapeCsvSeguro(reg.tipoEvento === 'cambio_completo' ? 'Si' : 'N/A'),
        escapeCsvSeguro(reg.responsableNombre),
        escapeCsvSeguro(reg.observaciones || ''),
      ].join(',')
    );
  }

  for (const chk of params.checklists) {
    const tipoLabel = chk.tipo === 'apertura' ? 'Checklist Apertura' : 'Checklist Cierre';
    const estadoLabel =
      chk.estado === 'completado'
        ? 'Completado (100%)'
        : chk.estado === 'con_hallazgos'
        ? `Con Hallazgos (${chk.itemsNoConformes})`
        : 'En Progreso';
    const hallazgosTxt = chk.items
      .filter((i) => i.estado === 'no_cumple')
      .map((i) => `${i.titulo}${i.observacion ? `: ${i.observacion}` : ''}`)
      .join(' | ');

    filas.push(
      [
        escapeCsvSeguro(negocio),
        escapeCsvSeguro('Checklist Turno'),
        escapeCsvSeguro(chk.fechaIso),
        escapeCsvSeguro(chk.tipo === 'apertura' ? 'Apertura' : 'Cierre'),
        escapeCsvSeguro(tipoLabel),
        escapeCsvSeguro(`${chk.porcentajeCumplimiento}% cumplimiento`),
        escapeCsvSeguro(
          `${chk.itemsCumplidos}/${chk.totalItems - chk.itemsNa} cumplidos (${chk.itemsNa} N/A)`
        ),
        escapeCsvSeguro(estadoLabel),
        escapeCsvSeguro(hallazgosTxt || 'Sin hallazgos'),
        escapeCsvSeguro(chk.itemsNoConformes === 0 ? 'Si' : 'Revisar'),
        escapeCsvSeguro(chk.cerradoPor || chk.responsableNombre),
        escapeCsvSeguro(chk.observacionesGenerales || ''),
      ].join(',')
    );
  }

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

/**
 * Descarga en el navegador la carpeta sanitaria BPM en formato CSV UTF-8 BOM.
 */
export function descargarCsvCarpetaSanitariaBpm(params: {
  nombreNegocio: string;
  temperaturas: RegistroTemperaturaBpm[];
  aceite: RegistroAceiteBpm[];
  checklists: ChecklistTurnoBpm[];
  ahora?: Date;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  const ahora = params.ahora ?? new Date();
  const contenido = generarCsvCarpetaSanitariaBpm({ ...params, ahora });
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = obtenerFechaIsoColombia(ahora);
  const safeNegocio = (params.nombreNegocio || 'negocio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `bitacora_sanitaria_bpm_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera el resumen ejecutivo BPM URL-encoded para compartir por WhatsApp.
 */
export function generarResumenBpmWhatsApp(params: {
  nombreNegocio?: string;
  resumen: ResumenCumplimientoBpm;
  equiposEvaluados: EstadoEquipoFrioEvaluado[];
  freidorasEvaluadas: EstadoFreidoraEvaluada[];
}): string {
  const negocio = params.nombreNegocio || 'La Parada';
  const r = params.resumen;
  const iconoGlobal =
    r.estadoGlobal === 'cumple' ? '🟢' : r.estadoGlobal === 'atencion' ? '🟡' : '🔴';

  let texto = `*🩺 BITÁCORA SANITARIA BPM — ${negocio.toUpperCase()}*\n`;
  texto += `📅 Fecha Colombia: ${r.fechaHoyIso}\n`;
  texto += `${iconoGlobal} Cumplimiento BPM Hoy: *${r.scoreCumplimientoPct}%*\n\n`;

  texto += `*❄️ Cadena de Frío / Calor:* ${r.equiposConformesHoy}/${r.equiposActivosCount} equipos conformes (${r.equiposConLecturaHoy} medidos hoy)\n`;
  params.equiposEvaluados.forEach((eq) => {
    const ic =
      eq.estadoHoy === 'conforme'
        ? '✅'
        : eq.estadoHoy === 'alerta'
        ? '⚠️'
        : eq.estadoHoy === 'critico'
        ? '🚨'
        : '⏳';
    const tempTxt = eq.ultimoRegistroHoy
      ? `${eq.ultimoRegistroHoy.temperaturaC} °C`
      : 'Sin lectura hoy';
    texto += `• ${ic} ${eq.equipo.nombre}: *${tempTxt}*\n`;
  });

  texto += `\n*🍟 Aceite de Freidoras:* ${r.freidorasOptimasCount}/${r.freidorasActivasCount} óptimas\n`;
  params.freidorasEvaluadas.forEach((fr) => {
    const ic =
      fr.estadoCiclo === 'optimo'
        ? '✅'
        : fr.estadoCiclo === 'por_vencer'
        ? '⚠️'
        : fr.estadoCiclo === 'cambiar_urgente'
        ? '🔴'
        : '⏳';
    const diasTxt =
      fr.diasDesdeUltimoCambio !== null
        ? `Últ. cambio hace ${fr.diasDesdeUltimoCambio}d`
        : 'Sin cambio registrado';
    texto += `• ${ic} ${fr.freidora.nombre}: ${diasTxt}\n`;
  });

  texto += `\n*📋 Checklists de Turno:*\n`;
  texto += `• Apertura: ${
    r.checklistAperturaHoy
      ? `${r.checklistAperturaHoy.porcentajeCumplimiento}% (${r.checklistAperturaHoy.estado})`
      : 'Pendiente'
  }\n`;
  texto += `• Cierre: ${
    r.checklistCierreHoy
      ? `${r.checklistCierreHoy.porcentajeCumplimiento}% (${r.checklistCierreHoy.estado})`
      : 'Pendiente'
  }\n`;

  if (r.desviacionesSinResolverCount > 0 || r.hallazgosAbiertosHoy > 0) {
    texto += `\n🚨 *Novedades abiertas:* ${r.desviacionesSinResolverCount} desvío(s) térmico(s), ${r.hallazgosAbiertosHoy} hallazgo(s) de checklist.`;
  } else {
    texto += `\n✅ *Establecimiento al día para inspección sanitaria INVIMA.*`;
  }

  return encodeURIComponent(texto);
}
