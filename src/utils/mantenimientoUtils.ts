import type { CrearNotificacionInput } from '@/types/notificacion';
import type {
  CategoriaEquipoMantenimiento,
  EquipoActivoMantenimiento,
  EquipoMantenimientoEvaluado,
  EstadoOperativoEquipo,
  EstadoReporteFalla,
  EstadoSemaforoMantenimiento,
  FiltrosMantenimiento,
  OrdenMantenimiento,
  ReporteFallaEquipo,
  ResumenMantenimiento,
  SeveridadFallaEquipo,
  TipoAgenteExtintor,
  TipoOrdenMantenimiento,
} from '@/types/mantenimiento';
import { formatCOP } from './formatCOP';
import {
  calcularDiasParaVencer,
  esFechaIsoValida,
  obtenerFechaIsoColombia,
  sumarDiasAFechaIso,
} from './lotesInventarioUtils';

export const CATEGORIA_EQUIPO_ORDEN: CategoriaEquipoMantenimiento[] = [
  'coccion',
  'refrigeracion',
  'extraccion',
  'extintor',
  'red_gas',
  'electrico',
  'mobiliario',
  'otro',
];

export const CATEGORIA_EQUIPO_META: Record<
  CategoriaEquipoMantenimiento,
  {
    id: CategoriaEquipoMantenimiento;
    label: string;
    shortLabel: string;
    prefijoCodigo: string;
    frecuenciaSugeridaDias: number;
    badgeClass: string;
  }
> = {
  coccion: {
    id: 'coccion',
    label: 'Cocción / Calor',
    shortLabel: 'Cocción',
    prefijoCodigo: 'COC',
    frecuenciaSugeridaDias: 90,
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  refrigeracion: {
    id: 'refrigeracion',
    label: 'Refrigeración / Frío',
    shortLabel: 'Frío',
    prefijoCodigo: 'REF',
    frecuenciaSugeridaDias: 90,
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  extraccion: {
    id: 'extraccion',
    label: 'Extracción / Campanas',
    shortLabel: 'Extracción',
    prefijoCodigo: 'EXT',
    frecuenciaSugeridaDias: 60,
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  },
  extintor: {
    id: 'extintor',
    label: 'Extintor / Contra Incendio',
    shortLabel: 'Extintor',
    prefijoCodigo: 'SEG',
    frecuenciaSugeridaDias: 365,
    badgeClass: 'border-red-500/40 bg-red-500/15 text-red-300',
  },
  red_gas: {
    id: 'red_gas',
    label: 'Red de Gas / Válvulas',
    shortLabel: 'Red de Gas',
    prefijoCodigo: 'GAS',
    frecuenciaSugeridaDias: 180,
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  electrico: {
    id: 'electrico',
    label: 'Eléctrico / Tableros',
    shortLabel: 'Eléctrico',
    prefijoCodigo: 'ELE',
    frecuenciaSugeridaDias: 180,
    badgeClass: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-300',
  },
  mobiliario: {
    id: 'mobiliario',
    label: 'Mobiliario / Acero',
    shortLabel: 'Mobiliario',
    prefijoCodigo: 'MOB',
    frecuenciaSugeridaDias: 180,
    badgeClass: 'border-neutral-600 bg-neutral-800 text-neutral-200',
  },
  otro: {
    id: 'otro',
    label: 'Otro Equipo',
    shortLabel: 'Otro',
    prefijoCodigo: 'ACT',
    frecuenciaSugeridaDias: 90,
    badgeClass: 'border-neutral-600 bg-neutral-800 text-neutral-300',
  },
};

export const ESTADO_OPERATIVO_EQUIPO_META: Record<
  EstadoOperativoEquipo,
  {
    id: EstadoOperativoEquipo;
    label: string;
    badgeClass: string;
  }
> = {
  operativo: {
    id: 'operativo',
    label: 'Operativo',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  en_mantenimiento: {
    id: 'en_mantenimiento',
    label: 'En Mantenimiento',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  con_falla: {
    id: 'con_falla',
    label: 'Con Falla',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  },
  fuera_servicio: {
    id: 'fuera_servicio',
    label: 'Fuera de Servicio',
    badgeClass: 'border-red-500/50 bg-red-500/20 text-red-300',
  },
};

export const TIPO_ORDEN_MANTENIMIENTO_META: Record<
  TipoOrdenMantenimiento,
  {
    id: TipoOrdenMantenimiento;
    label: string;
    badgeClass: string;
  }
> = {
  preventivo: {
    id: 'preventivo',
    label: 'Preventivo Programado',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  correctivo: {
    id: 'correctivo',
    label: 'Correctivo / Reparación',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  recarga_extintor: {
    id: 'recarga_extintor',
    label: 'Recarga / Certificado Extintor',
    badgeClass: 'border-red-500/40 bg-red-500/15 text-red-300',
  },
  inspeccion_gas: {
    id: 'inspeccion_gas',
    label: 'Inspección / Hermeticidad Gas',
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  calibracion: {
    id: 'calibracion',
    label: 'Calibración / Limpieza Profunda',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
};

export const SEVERIDAD_FALLA_META: Record<
  SeveridadFallaEquipo,
  {
    id: SeveridadFallaEquipo;
    label: string;
    badgeClass: string;
    prioridad: number;
  }
> = {
  critica: {
    id: 'critica',
    label: 'Crítica',
    badgeClass: 'border-red-500/60 bg-red-500/20 text-red-200',
    prioridad: 4,
  },
  alta: {
    id: 'alta',
    label: 'Alta',
    badgeClass: 'border-orange-500/50 bg-orange-500/15 text-orange-300',
    prioridad: 3,
  },
  media: {
    id: 'media',
    label: 'Media',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    prioridad: 2,
  },
  baja: {
    id: 'baja',
    label: 'Baja',
    badgeClass: 'border-neutral-600 bg-neutral-800 text-neutral-300',
    prioridad: 1,
  },
};

export const ESTADO_FALLA_META: Record<
  EstadoReporteFalla,
  {
    id: EstadoReporteFalla;
    label: string;
    badgeClass: string;
  }
> = {
  abierta: {
    id: 'abierta',
    label: 'Abierta',
    badgeClass: 'border-red-500/50 bg-red-500/15 text-red-300',
  },
  en_atencion: {
    id: 'en_atencion',
    label: 'En Atención',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  },
  resuelta: {
    id: 'resuelta',
    label: 'Resuelta',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  descartada: {
    id: 'descartada',
    label: 'Descartada',
    badgeClass: 'border-neutral-700 bg-neutral-800 text-neutral-400',
  },
};

export const SEMAFORO_MANTENIMIENTO_META: Record<
  EstadoSemaforoMantenimiento,
  {
    id: EstadoSemaforoMantenimiento;
    label: string;
    shortLabel: string;
    badgeClass: string;
    prioridad: number;
  }
> = {
  vencido: {
    id: 'vencido',
    label: 'Vencido · Urgente',
    shortLabel: 'Vencido',
    badgeClass: 'border-red-500/60 bg-red-500/20 text-red-300',
    prioridad: 4,
  },
  proximo_7d: {
    id: 'proximo_7d',
    label: 'Vence ≤ 7 días',
    shortLabel: '≤ 7 días',
    badgeClass: 'border-orange-500/50 bg-orange-500/15 text-orange-300',
    prioridad: 3,
  },
  proximo_30d: {
    id: 'proximo_30d',
    label: 'Próximo (8–30 días)',
    shortLabel: '≤ 30 días',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    prioridad: 2,
  },
  al_dia: {
    id: 'al_dia',
    label: 'Al día',
    shortLabel: 'Al día',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    prioridad: 1,
  },
  sin_programar: {
    id: 'sin_programar',
    label: 'Sin programar',
    shortLabel: 'Sin fecha',
    badgeClass: 'border-neutral-700 bg-neutral-800 text-neutral-300',
    prioridad: 0,
  },
};

export const TIPO_AGENTE_EXTINTOR_META: Record<
  TipoAgenteExtintor,
  {
    id: TipoAgenteExtintor;
    label: string;
    usoSugerido: string;
  }
> = {
  tipo_k: {
    id: 'tipo_k',
    label: 'Tipo K (Acetato de Potasio)',
    usoSugerido: 'Cocina y freidoras con aceites/grasas vegetales o animales',
  },
  multiproposito_abc: {
    id: 'multiproposito_abc',
    label: 'Multipropósito ABC',
    usoSugerido: 'Salón, bodega, sólidos, líquidos y equipos energizados',
  },
  co2: {
    id: 'co2',
    label: 'Dióxido de Carbono (CO₂)',
    usoSugerido: 'Tableros eléctricos y equipos electrónicos',
  },
  solkaflam: {
    id: 'solkaflam',
    label: 'Solkaflam / Agente Limpio',
    usoSugerido: 'Cajas POS, cómputo y tableros sensibles',
  },
  agua_presion: {
    id: 'agua_presion',
    label: 'Agua a Presión',
    usoSugerido: 'Áreas de cartón, empaques y bodega seca',
  },
};

export interface PlantillaEquipoMantenimientoDefault {
  codigoActivo: string;
  nombre: string;
  categoria: CategoriaEquipoMantenimiento;
  ubicacion: string;
  frecuenciaPreventivoDias: number;
  tipoAgenteExtintor?: TipoAgenteExtintor;
  capacidadExtintor?: string;
  notas: string;
}

export const EQUIPOS_MANTENIMIENTO_PLANTILLA_DEFAULT: PlantillaEquipoMantenimientoDefault[] = [
  {
    codigoActivo: 'COC-001',
    nombre: 'Freidora Industrial #1',
    categoria: 'coccion',
    ubicacion: 'Línea de Fritura · Cocina',
    frecuenciaPreventivoDias: 90,
    notas: 'Revisión de termostato, quemadores, válvula piloto y limpieza de tanque.',
  },
  {
    codigoActivo: 'COC-002',
    nombre: 'Plancha / Parrilla Principal',
    categoria: 'coccion',
    ubicacion: 'Línea de Plancha · Cocina',
    frecuenciaPreventivoDias: 90,
    notas: 'Calibración de flauta de quemadores, perillas y trampa de grasa.',
  },
  {
    codigoActivo: 'REF-001',
    nombre: 'Nevera Vertical de Insumos',
    categoria: 'refrigeracion',
    ubicacion: 'Zona Fría · Cocina',
    frecuenciaPreventivoDias: 90,
    notas: 'Limpieza de condensador, empaques magnéticos y verificación de termostato.',
  },
  {
    codigoActivo: 'EXT-001',
    nombre: 'Campana Extractora de Humos',
    categoria: 'extraccion',
    ubicacion: 'Techo / Ducto Cocina',
    frecuenciaPreventivoDias: 60,
    notas: 'Desengrase profundo de filtros atrapagrasas, turbina y ducto extractor.',
  },
  {
    codigoActivo: 'SEG-001',
    nombre: 'Extintor Tipo K Cocina 6L',
    categoria: 'extintor',
    ubicacion: 'Salida Cocina junto a Freidoras',
    frecuenciaPreventivoDias: 365,
    tipoAgenteExtintor: 'tipo_k',
    capacidadExtintor: '6 Litros',
    notas: 'Obligatorio por Bomberos/INVIMA para zonas de fritura y grasas.',
  },
  {
    codigoActivo: 'GAS-001',
    nombre: 'Red de Gas Natural y Válvula de Corte',
    categoria: 'red_gas',
    ubicacion: 'Cocina y Cuarto de Regulación',
    frecuenciaPreventivoDias: 180,
    notas: 'Prueba de hermeticidad, reguladores, mangueras certificadas y llave de cierre rápido.',
  },
];

function fechaIsoToReferenceDate(fechaHoyIso?: string): Date {
  if (fechaHoyIso && esFechaIsoValida(fechaHoyIso)) {
    return new Date(`${fechaHoyIso.trim()}T12:00:00-05:00`);
  }
  return new Date();
}

/**
 * Sanitiza un costo monetario en COP devolviendo siempre un entero >= 0.
 */
export function sanitizarCostoMantenimiento(valor: number): number {
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.round(valor);
}

/**
 * Sanitiza la frecuencia preventiva en días (entre 1 y 3650 días).
 */
export function sanitizarFrecuenciaDias(valor: number, fallback = 90): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    return Math.min(3650, Math.max(1, Math.round(fallback)));
  }
  return Math.min(3650, Math.max(1, Math.round(valor)));
}

/**
 * Genera un código legible de activo según su categoría y consecutivo actual.
 */
export function generarCodigoActivo(
  categoria: CategoriaEquipoMantenimiento,
  existentesCount: number
): string {
  const prefijo = CATEGORIA_EQUIPO_META[categoria]?.prefijoCodigo || 'ACT';
  const consecutivo = Math.max(1, Math.trunc(existentesCount) + 1);
  return `${prefijo}-${String(consecutivo).padStart(3, '0')}`;
}

/**
 * Determina la fecha de vencimiento más próxima/crítica de un equipo considerando
 * mantenimiento preventivo, recarga/prueba hidrostática de extintor y certificado de gas.
 */
export function obtenerFechaVencimientoCriticaEquipo(
  equipo: Pick<
    EquipoActivoMantenimiento,
    | 'categoria'
    | 'proximoMantenimientoIso'
    | 'fechaRecargaVenceIso'
    | 'fechaPruebaHidrostaticaIso'
    | 'certificadoGasVenceIso'
  >
): { fechaIso: string | null; motivo: string } {
  const candidatos: Array<{ fechaIso: string; motivo: string }> = [];

  if (esFechaIsoValida(equipo.proximoMantenimientoIso)) {
    candidatos.push({
      fechaIso: equipo.proximoMantenimientoIso as string,
      motivo: 'Mantenimiento preventivo',
    });
  }

  if (equipo.categoria === 'extintor') {
    if (esFechaIsoValida(equipo.fechaRecargaVenceIso)) {
      candidatos.push({
        fechaIso: equipo.fechaRecargaVenceIso as string,
        motivo: 'Recarga anual de extintor',
      });
    }
    if (esFechaIsoValida(equipo.fechaPruebaHidrostaticaIso)) {
      candidatos.push({
        fechaIso: equipo.fechaPruebaHidrostaticaIso as string,
        motivo: 'Prueba hidrostática',
      });
    }
  }

  if (equipo.categoria === 'red_gas' && esFechaIsoValida(equipo.certificadoGasVenceIso)) {
    candidatos.push({
      fechaIso: equipo.certificadoGasVenceIso as string,
      motivo: 'Certificado / revisión red de gas',
    });
  }

  if (candidatos.length === 0) {
    return { fechaIso: null, motivo: 'Sin fecha programada' };
  }

  candidatos.sort((a, b) => a.fechaIso.localeCompare(b.fechaIso));
  return candidatos[0];
}

/**
 * Evalúa el semáforo de vencimiento según los días restantes.
 */
export function evaluarSemaforoMantenimiento(
  diasParaVencer: number | null
): EstadoSemaforoMantenimiento {
  if (diasParaVencer === null || !Number.isFinite(diasParaVencer)) {
    return 'sin_programar';
  }
  if (diasParaVencer < 0) return 'vencido';
  if (diasParaVencer <= 7) return 'proximo_7d';
  if (diasParaVencer <= 30) return 'proximo_30d';
  return 'al_dia';
}

/**
 * Evalúa un equipo individual cruzando sus fechas de vencimiento y fallas abiertas.
 */
export function evaluarEquipoMantenimiento(
  equipo: EquipoActivoMantenimiento,
  fallasAbiertas: ReporteFallaEquipo[],
  fechaHoyIso?: string
): EquipoMantenimientoEvaluado {
  const refDate = fechaIsoToReferenceDate(fechaHoyIso);
  const { fechaIso, motivo } = obtenerFechaVencimientoCriticaEquipo(equipo);
  const diasParaVencer = fechaIso ? calcularDiasParaVencer(fechaIso, refDate) : null;
  const semaforo = evaluarSemaforoMantenimiento(diasParaVencer);

  const fallasDelEquipo = fallasAbiertas.filter(
    (f) =>
      (f.estado === 'abierta' || f.estado === 'en_atencion') &&
      (f.equipoId === equipo.id ||
        f.equipoNombre.trim().toLowerCase() === equipo.nombre.trim().toLowerCase())
  );

  return {
    equipo,
    semaforo,
    fechaVencimientoCriticaIso: fechaIso,
    motivoVencimiento: motivo,
    diasParaVencer,
    fallasAbiertasCount: fallasDelEquipo.length,
    esEquipoSeguridad: equipo.categoria === 'extintor' || equipo.categoria === 'red_gas',
  };
}

/**
 * Evalúa y ordena la lista de activos priorizando los más urgentes.
 */
export function evaluarEquiposMantenimiento(
  equipos: EquipoActivoMantenimiento[],
  fallas: ReporteFallaEquipo[],
  fechaHoyIso?: string
): EquipoMantenimientoEvaluado[] {
  const fallasActivas = fallas.filter(
    (f) => f.estado === 'abierta' || f.estado === 'en_atencion'
  );

  return equipos
    .filter((eq) => eq.activo !== false)
    .map((eq) => evaluarEquipoMantenimiento(eq, fallasActivas, fechaHoyIso))
    .sort((a, b) => {
      const fallaScoreA =
        a.equipo.estadoOperativo === 'fuera_servicio'
          ? 3
          : a.equipo.estadoOperativo === 'con_falla' || a.fallasAbiertasCount > 0
          ? 2
          : 0;
      const fallaScoreB =
        b.equipo.estadoOperativo === 'fuera_servicio'
          ? 3
          : b.equipo.estadoOperativo === 'con_falla' || b.fallasAbiertasCount > 0
          ? 2
          : 0;
      if (fallaScoreA !== fallaScoreB) return fallaScoreB - fallaScoreA;

      const prioA = SEMAFORO_MANTENIMIENTO_META[a.semaforo].prioridad;
      const prioB = SEMAFORO_MANTENIMIENTO_META[b.semaforo].prioridad;
      if (prioA !== prioB) return prioB - prioA;

      if (a.diasParaVencer !== null && b.diasParaVencer !== null) {
        return a.diasParaVencer - b.diasParaVencer;
      }
      return a.equipo.nombre.localeCompare(b.equipo.nombre, 'es');
    });
}

/**
 * Calcula los KPIs globales del módulo de mantenimiento preventivo y hoja de vida.
 */
export function calcularResumenMantenimiento(
  equiposEvaluados: EquipoMantenimientoEvaluado[],
  ordenes: OrdenMantenimiento[],
  fallas: ReporteFallaEquipo[],
  fechaHoyIso?: string
): ResumenMantenimiento {
  const hoyIso =
    fechaHoyIso && esFechaIsoValida(fechaHoyIso)
      ? fechaHoyIso
      : obtenerFechaIsoColombia();
  const mesActualPrefix = hoyIso.slice(0, 7); // YYYY-MM

  let activosOperativos = 0;
  let activosConFallaOFueraServicio = 0;
  let vencidosCount = 0;
  let proximos7dCount = 0;
  let proximos30dCount = 0;
  let alDiaCount = 0;
  let sinProgramarCount = 0;
  let extintoresYGasAlertaCount = 0;

  for (const item of equiposEvaluados) {
    if (item.equipo.estadoOperativo === 'operativo') {
      activosOperativos += 1;
    } else if (
      item.equipo.estadoOperativo === 'con_falla' ||
      item.equipo.estadoOperativo === 'fuera_servicio'
    ) {
      activosConFallaOFueraServicio += 1;
    }

    switch (item.semaforo) {
      case 'vencido':
        vencidosCount += 1;
        break;
      case 'proximo_7d':
        proximos7dCount += 1;
        break;
      case 'proximo_30d':
        proximos30dCount += 1;
        break;
      case 'al_dia':
        alDiaCount += 1;
        break;
      case 'sin_programar':
        sinProgramarCount += 1;
        break;
    }

    if (
      item.esEquipoSeguridad &&
      (item.semaforo === 'vencido' ||
        item.semaforo === 'proximo_7d' ||
        item.semaforo === 'proximo_30d')
    ) {
      extintoresYGasAlertaCount += 1;
    }
  }

  const fallasAbiertas = fallas.filter(
    (f) => f.estado === 'abierta' || f.estado === 'en_atencion'
  );
  const fallasCriticasCount = fallasAbiertas.filter(
    (f) => f.severidad === 'critica' || f.detieneOperacion
  ).length;

  let gastoMantenimientoMesCOP = 0;
  let gastoMantenimientoTotalCOP = 0;
  let ordenesConciliadasCount = 0;

  for (const ord of ordenes) {
    const costo = sanitizarCostoMantenimiento(ord.costoCOP);
    gastoMantenimientoTotalCOP += costo;
    if (ord.fechaIso?.startsWith(mesActualPrefix)) {
      gastoMantenimientoMesCOP += costo;
    }
    if (ord.conciliadoConGasto) {
      ordenesConciliadasCount += 1;
    }
  }

  const totalActivos = equiposEvaluados.length;
  let scoreSaludPct = 100;
  if (totalActivos > 0) {
    const penalizacion =
      vencidosCount * 20 +
      fallasCriticasCount * 25 +
      activosConFallaOFueraServicio * 15 +
      proximos7dCount * 8 +
      proximos30dCount * 3;
    const base = Math.max(0, 100 - Math.round((penalizacion / Math.max(1, totalActivos)) * 2));
    scoreSaludPct = Math.min(100, base);
  }

  const estadoGlobal =
    fallasCriticasCount > 0 ||
    vencidosCount > 0 ||
    equiposEvaluados.some((e) => e.equipo.estadoOperativo === 'fuera_servicio')
      ? 'critico'
      : fallasAbiertas.length > 0 ||
        proximos7dCount > 0 ||
        activosConFallaOFueraServicio > 0 ||
        extintoresYGasAlertaCount > 0
      ? 'atencion'
      : 'al_dia';

  return {
    totalActivos,
    activosOperativos,
    activosConFallaOFueraServicio,
    vencidosCount,
    proximos7dCount,
    proximos30dCount,
    alDiaCount,
    sinProgramarCount,
    extintoresYGasAlertaCount,
    fallasAbiertasCount: fallasAbiertas.length,
    fallasCriticasCount,
    gastoMantenimientoMesCOP,
    gastoMantenimientoTotalCOP,
    ordenesConciliadasCount,
    scoreSaludPct,
    estadoGlobal,
  };
}

/**
 * Filtra la lista evaluada de equipos por texto, categoría, semáforo, estado y seguridad.
 */
export function filtrarEquiposMantenimiento(
  equiposEvaluados: EquipoMantenimientoEvaluado[],
  filtros: FiltrosMantenimiento
): EquipoMantenimientoEvaluado[] {
  const q = filtros.busqueda.trim().toLowerCase();

  return equiposEvaluados.filter((item) => {
    const eq = item.equipo;
    if (filtros.soloSeguridad && !item.esEquipoSeguridad) return false;
    if (filtros.categoria !== 'todas' && eq.categoria !== filtros.categoria) return false;
    if (filtros.semaforo !== 'todos' && item.semaforo !== filtros.semaforo) return false;
    if (
      filtros.estadoOperativo !== 'todos' &&
      eq.estadoOperativo !== filtros.estadoOperativo
    ) {
      return false;
    }

    if (q) {
      const texto = [
        eq.codigoActivo,
        eq.nombre,
        eq.ubicacion,
        eq.marca || '',
        eq.modelo || '',
        eq.proveedorTecnico || '',
        eq.notas || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!texto.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Genera notificaciones operativas sugeridas para equipos vencidos o fallas abiertas.
 */
export function construirAlertasMantenimiento(
  equiposEvaluados: EquipoMantenimientoEvaluado[],
  fallas: ReporteFallaEquipo[]
): CrearNotificacionInput[] {
  const alertas: CrearNotificacionInput[] = [];

  for (const falla of fallas) {
    if (falla.estado !== 'abierta') continue;
    alertas.push({
      modulo: 'cocina',
      tipo: 'falla_equipo_kds',
      titulo: `Falla en equipo: ${falla.equipoNombre}`,
      mensaje: `${falla.detieneOperacion ? 'DETIENE OPERACIÓN · ' : ''}${falla.descripcion}`,
      urgencia: falla.detieneOperacion || falla.severidad === 'critica' ? 'critica' : 'alta',
      enlace: '/mantenimiento',
      origen: 'automatico',
      creadaPor: falla.reportadoPor,
      metadata: {
        fallaId: falla.id,
        equipoId: falla.equipoId || '',
        severidad: falla.severidad,
      },
    });
  }

  for (const item of equiposEvaluados) {
    if (item.semaforo !== 'vencido' && item.semaforo !== 'proximo_7d') continue;
    alertas.push({
      modulo: item.esEquipoSeguridad ? 'sistema' : 'cocina',
      tipo:
        item.semaforo === 'vencido'
          ? 'mantenimiento_vencido'
          : 'mantenimiento_proximo',
      titulo:
        item.semaforo === 'vencido'
          ? `${item.motivoVencimiento} vencido: ${item.equipo.nombre}`
          : `${item.motivoVencimiento} próximo (${item.diasParaVencer}d): ${item.equipo.nombre}`,
      mensaje: `Código ${item.equipo.codigoActivo} · Ubicación: ${item.equipo.ubicacion}. Fecha objetivo: ${item.fechaVencimientoCriticaIso || 'N/A'}.`,
      urgencia: item.semaforo === 'vencido' || item.esEquipoSeguridad ? 'critica' : 'alta',
      enlace: '/mantenimiento',
      origen: 'automatico',
      metadata: {
        equipoId: item.equipo.id,
        semaforo: item.semaforo,
        fechaObjetivo: item.fechaVencimientoCriticaIso || '',
      },
    });
  }

  return alertas;
}

/**
 * Calcula la próxima fecha sugerida de mantenimiento en formato ISO sumando los días de frecuencia.
 */
export function calcularProximaFechaMantenimiento(
  fechaBaseIso: string,
  frecuenciaDias: number
): string {
  const base = esFechaIsoValida(fechaBaseIso)
    ? fechaBaseIso
    : obtenerFechaIsoColombia();
  return sumarDiasAFechaIso(base, sanitizarFrecuenciaDias(frecuenciaDias));
}

function escapeCsvSeguro(valor: unknown): string {
  const raw = valor === null || valor === undefined ? '' : String(valor);
  const sinSaltos = raw.replace(/\r?\n/g, ' ').trim();
  const neutralizado = /^[=+\-@\t\r]/.test(sinSaltos)
    ? `'${sinSaltos}`
    : sinSaltos;
  if (/[",]/.test(neutralizado)) {
    return `"${neutralizado.replace(/"/g, '""')}"`;
  }
  return neutralizado;
}

/**
 * Genera el CSV contable y sanitario UTF-8 BOM de activos, órdenes y fallas.
 */
export function generarCsvMantenimiento(
  equiposEvaluados: EquipoMantenimientoEvaluado[],
  ordenes: OrdenMantenimiento[],
  fallas: ReporteFallaEquipo[],
  nombreNegocio = 'La Parada'
): string {
  const headers = [
    'Negocio',
    'Tipo Registro',
    'Codigo / Ref',
    'Equipo',
    'Categoria',
    'Ubicacion',
    'Estado / Semaforo',
    'Fecha / Vencimiento',
    'Detalle / Trabajo',
    'Tecnico / Reporta',
    'Costo COP',
    'Conciliado Gastos',
    'Comprobante / Notas',
  ];

  const filas: string[] = [];

  for (const item of equiposEvaluados) {
    const eq = item.equipo;
    filas.push(
      [
        escapeCsvSeguro(nombreNegocio),
        escapeCsvSeguro('Hoja de Vida Activo'),
        escapeCsvSeguro(eq.codigoActivo),
        escapeCsvSeguro(eq.nombre),
        escapeCsvSeguro(CATEGORIA_EQUIPO_META[eq.categoria]?.label || eq.categoria),
        escapeCsvSeguro(eq.ubicacion),
        escapeCsvSeguro(
          `${ESTADO_OPERATIVO_EQUIPO_META[eq.estadoOperativo]?.label || eq.estadoOperativo} · ${
            SEMAFORO_MANTENIMIENTO_META[item.semaforo].shortLabel
          }`
        ),
        escapeCsvSeguro(item.fechaVencimientoCriticaIso || 'Sin programar'),
        escapeCsvSeguro(
          [
            eq.marca ? `Marca: ${eq.marca}` : '',
            eq.modelo ? `Modelo: ${eq.modelo}` : '',
            eq.numeroSerie ? `Serie: ${eq.numeroSerie}` : '',
            `Cada ${eq.frecuenciaPreventivoDias}d`,
          ]
            .filter(Boolean)
            .join(' | ')
        ),
        escapeCsvSeguro(eq.proveedorTecnico || 'Sin asignar'),
        escapeCsvSeguro(eq.costoAcumuladoCOP),
        escapeCsvSeguro(`${eq.totalIntervenciones} interv.`),
        escapeCsvSeguro(eq.notas || ''),
      ].join(',')
    );
  }

  for (const ord of ordenes) {
    filas.push(
      [
        escapeCsvSeguro(nombreNegocio),
        escapeCsvSeguro('Orden Mantenimiento'),
        escapeCsvSeguro(ord.equipoCodigo || ord.equipoId),
        escapeCsvSeguro(ord.equipoNombre),
        escapeCsvSeguro(
          TIPO_ORDEN_MANTENIMIENTO_META[ord.tipo]?.label || ord.tipo
        ),
        escapeCsvSeguro(CATEGORIA_EQUIPO_META[ord.categoriaEquipo]?.shortLabel || ''),
        escapeCsvSeguro(
          ESTADO_OPERATIVO_EQUIPO_META[ord.estadoEquipoResultante]?.label ||
            ord.estadoEquipoResultante
        ),
        escapeCsvSeguro(ord.fechaIso),
        escapeCsvSeguro(ord.descripcionTrabajo),
        escapeCsvSeguro(ord.tecnicoNombre),
        escapeCsvSeguro(ord.costoCOP),
        escapeCsvSeguro(ord.conciliadoConGasto ? 'Si' : 'No'),
        escapeCsvSeguro(
          [ord.numeroFactura ? `Fact: ${ord.numeroFactura}` : '', ord.notas || '']
            .filter(Boolean)
            .join(' | ')
        ),
      ].join(',')
    );
  }

  for (const falla of fallas) {
    filas.push(
      [
        escapeCsvSeguro(nombreNegocio),
        escapeCsvSeguro('Reporte Falla KDS'),
        escapeCsvSeguro(falla.origenReporte),
        escapeCsvSeguro(falla.equipoNombre),
        escapeCsvSeguro(
          CATEGORIA_EQUIPO_META[falla.categoriaEquipo]?.shortLabel || falla.categoriaEquipo
        ),
        escapeCsvSeguro(falla.estacionCocina || 'Cocina'),
        escapeCsvSeguro(
          `${SEVERIDAD_FALLA_META[falla.severidad]?.label || falla.severidad} (${
            ESTADO_FALLA_META[falla.estado]?.label || falla.estado
          })`
        ),
        escapeCsvSeguro(falla.fechaIso),
        escapeCsvSeguro(falla.descripcion),
        escapeCsvSeguro(falla.reportadoPor),
        escapeCsvSeguro(0),
        escapeCsvSeguro(falla.detieneOperacion ? 'Detiene operacion' : 'Operacion parcial'),
        escapeCsvSeguro(falla.resolucionNotas || ''),
      ].join(',')
    );
  }

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

/**
 * Descarga en el navegador el archivo CSV UTF-8 BOM de mantenimiento preventivo.
 */
export function descargarCsvMantenimiento(params: {
  equiposEvaluados: EquipoMantenimientoEvaluado[];
  ordenes: OrdenMantenimiento[];
  fallas: ReporteFallaEquipo[];
  nombreNegocio: string;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const contenido = generarCsvMantenimiento(
    params.equiposEvaluados,
    params.ordenes,
    params.fallas,
    params.nombreNegocio
  );
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = obtenerFechaIsoColombia();
  const safeNegocio = (params.nombreNegocio || 'negocio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `mantenimiento_equipos_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera un resumen ejecutivo URL-encoded para compartir por WhatsApp.
 */
export function generarResumenMantenimientoWhatsApp(
  nombreNegocio: string,
  resumen: ResumenMantenimiento,
  equiposEvaluados: EquipoMantenimientoEvaluado[],
  fallas: ReporteFallaEquipo[]
): string {
  const icono =
    resumen.estadoGlobal === 'al_dia'
      ? '🟢'
      : resumen.estadoGlobal === 'atencion'
      ? '🟡'
      : '🔴';

  let texto = `*🔧 MANTENIMIENTO PREVENTIVO & SEGURIDAD — ${(nombreNegocio || 'La Parada').toUpperCase()}*\n`;
  texto += `📅 Fecha: ${obtenerFechaIsoColombia()}\n`;
  texto += `${icono} Salud Operativa: *${resumen.scoreSaludPct}%*\n\n`;
  texto += `• Activos totales: *${resumen.totalActivos}* (${resumen.activosOperativos} operativos)\n`;
  texto += `• 🔴 Vencidos: *${resumen.vencidosCount}* · 🟠 Próx. 7d: *${resumen.proximos7dCount}*\n`;
  texto += `• 🧯 Alertas Extintores / Gas: *${resumen.extintoresYGasAlertaCount}*\n`;
  texto += `• ⚠️ Fallas abiertas KDS: *${resumen.fallasAbiertasCount}* (${resumen.fallasCriticasCount} críticas)\n`;
  texto += `• 💰 Gasto mantenimiento mes: *${formatCOP(resumen.gastoMantenimientoMesCOP)}*\n`;

  const prioritarios = equiposEvaluados
    .filter((e) => e.semaforo === 'vencido' || e.semaforo === 'proximo_7d')
    .slice(0, 5);
  if (prioritarios.length > 0) {
    texto += `\n*Equipos Prioritarios:*\n`;
    prioritarios.forEach((p, idx) => {
      const dTxt =
        p.diasParaVencer !== null && p.diasParaVencer < 0
          ? `Vencido hace ${Math.abs(p.diasParaVencer)}d`
          : p.diasParaVencer === 0
          ? 'Vence HOY'
          : `Vence en ${p.diasParaVencer}d`;
      texto += `${idx + 1}. *${p.equipo.nombre}* (${p.equipo.codigoActivo}) · ${p.motivoVencimiento}: ${dTxt}\n`;
    });
  }

  const fallasAbiertas = fallas.filter((f) => f.estado === 'abierta').slice(0, 3);
  if (fallasAbiertas.length > 0) {
    texto += `\n*Fallas Reportadas Abiertas:*\n`;
    fallasAbiertas.forEach((f) => {
      texto += `• 🚨 *${f.equipoNombre}*: ${f.descripcion}\n`;
    });
  }

  return encodeURIComponent(texto);
}
