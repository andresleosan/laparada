import type {
  Combo,
  Control86Item,
  DiaSemanaEspecial,
  EspecialDelDiaConfig,
  EvaluacionControl86,
  EvaluacionEspecialDelDia,
  FiltrosTablero86,
  ItemCatalogo86,
  Motivo86,
  Producto,
  ResumenTablero86,
} from '@/types';

export const UMBRAL_ALERTA_PORCIONES_DEFAULT = 5;
export const MAX_PORCIONES_CONTADOR = 10_000;
export const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const MOTIVOS_86_META: Record<
  Motivo86,
  { label: string; shortLabel: string; descripcion: string }
> = {
  sin_insumos: {
    label: 'Sin insumos en cocina',
    shortLabel: 'Sin insumos',
    descripcion: 'Falta un ingrediente clave del escandallo para preparar el plato.',
  },
  produccion_agotada: {
    label: 'Producción del día agotada',
    shortLabel: 'Producción agotada',
    descripcion: 'Se vendieron todas las porciones preparadas para la jornada.',
  },
  equipo_mantenimiento: {
    label: 'Equipo en mantenimiento / pausa',
    shortLabel: 'Equipo / Pausa',
    descripcion: 'Freidora, plancha o estación temporalmente detenida.',
  },
  alta_demanda: {
    label: 'Pausado por alta demanda',
    shortLabel: 'Alta demanda',
    descripcion: 'Retirado temporalmente para proteger tiempos de despacho.',
  },
  otro: {
    label: 'Otro motivo operativo',
    shortLabel: 'Otro',
    descripcion: 'Restricción temporal definida por cocina o administración.',
  },
};

export const DIAS_SEMANA_META: Array<{
  dia: DiaSemanaEspecial;
  corto: string;
  nombre: string;
}> = [
  { dia: 1, corto: 'Lun', nombre: 'Lunes' },
  { dia: 2, corto: 'Mar', nombre: 'Martes' },
  { dia: 3, corto: 'Mié', nombre: 'Miércoles' },
  { dia: 4, corto: 'Jue', nombre: 'Jueves' },
  { dia: 5, corto: 'Vie', nombre: 'Viernes' },
  { dia: 6, corto: 'Sáb', nombre: 'Sábado' },
  { dia: 0, corto: 'Dom', nombre: 'Domingo' },
];

export const ETIQUETAS_ESPECIAL_SUGERIDAS: string[] = [
  'Especial del Día',
  'Sugerencia del Chef',
  'Edición Limitada',
  'Solo Hoy',
  'Almuerzo Ejecutivo',
  'Noche de Parrilla',
];

const DIAS_NOMBRES_BY_NUM: Record<DiaSemanaEspecial, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

const WEEKDAY_EN_TO_NUM: Record<string, DiaSemanaEspecial> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export interface ContextoTiempoColombia {
  fechaIso: string;
  diaSemana: DiaSemanaEspecial;
  minutosDia: number;
  horaHHMM: string;
}

/**
 * Obtiene fecha YYYY-MM-DD, día de semana (0..6) y minuto del día en America/Bogota.
 */
export function obtenerContextoTiempoColombia(ahora: Date = new Date()): ContextoTiempoColombia {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });

  const parts = formatter.formatToParts(ahora);
  const byType = new Map<string, string>();
  for (const part of parts) {
    byType.set(part.type, part.value);
  }

  const year = byType.get('year') || '2026';
  const month = byType.get('month') || '01';
  const day = byType.get('day') || '01';
  const rawHour = byType.get('hour') || '00';
  const hourNum = Number(rawHour) === 24 ? 0 : Number(rawHour);
  const minuteNum = Number(byType.get('minute') || '00');
  const weekdayStr = (byType.get('weekday') || 'Mon').toLowerCase().slice(0, 3);
  const diaSemana: DiaSemanaEspecial = WEEKDAY_EN_TO_NUM[weekdayStr] ?? 1;

  const horaHHMM = `${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`;
  return {
    fechaIso: `${year}-${month}-${day}`,
    diaSemana,
    minutosDia: hourNum * 60 + minuteNum,
    horaHHMM,
  };
}

function normalizarTextoBusqueda(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function minutosDesdeHHMM(hhmm?: string): number | null {
  if (!hhmm || !HORA_REGEX.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function estaEnRangoHorario(minutosActuales: number, inicio?: string, fin?: string): boolean {
  const minInicio = minutosDesdeHHMM(inicio);
  const minFin = minutosDesdeHHMM(fin);
  if (minInicio === null && minFin === null) return true;
  if (minInicio !== null && minFin === null) return minutosActuales >= minInicio;
  if (minInicio === null && minFin !== null) return minutosActuales <= minFin;

  const start = minInicio as number;
  const end = minFin as number;
  if (start <= end) {
    return minutosActuales >= start && minutosActuales <= end;
  }
  // Rango nocturno que cruza medianoche (ej: 18:00 a 02:00)
  return minutosActuales >= start || minutosActuales <= end;
}

function esMotivo86Valido(val: unknown): val is Motivo86 {
  return (
    val === 'sin_insumos' ||
    val === 'produccion_agotada' ||
    val === 'equipo_mantenimiento' ||
    val === 'alta_demanda' ||
    val === 'otro'
  );
}

/**
 * Sanitiza y normaliza la estructura Control86Item sin campos undefined.
 */
export function sanitizarControl86(raw?: Partial<Control86Item> | null): Control86Item {
  const contadorActivo = Boolean(raw?.contadorActivo);
  const rawPorciones = raw?.porcionesDisponibles;
  const porcionesDisponibles =
    contadorActivo && rawPorciones !== null && rawPorciones !== undefined && Number.isFinite(Number(rawPorciones))
      ? Math.min(MAX_PORCIONES_CONTADOR, Math.max(0, Math.round(Number(rawPorciones))))
      : null;

  const rawUmbral = raw?.umbralAlertaPorciones;
  const umbralAlertaPorciones =
    typeof rawUmbral === 'number' && Number.isFinite(rawUmbral)
      ? Math.min(1000, Math.max(0, Math.round(rawUmbral)))
      : UMBRAL_ALERTA_PORCIONES_DEFAULT;

  const auto86AlLlegarACero = raw?.auto86AlLlegarACero !== false;
  const agotadoPorContador =
    contadorActivo &&
    porcionesDisponibles !== null &&
    porcionesDisponibles <= 0 &&
    auto86AlLlegarACero;

  const agotado86 = Boolean(raw?.agotado86) || agotadoPorContador;
  const notaLimpia = typeof raw?.nota86 === 'string' ? raw.nota86.trim().slice(0, 160) : '';
  const motivoFinal = esMotivo86Valido(raw?.motivo86)
    ? raw.motivo86
    : agotadoPorContador
      ? 'produccion_agotada'
      : undefined;
  const actualizadoPor =
    typeof raw?.actualizadoPor === 'string' ? raw.actualizadoPor.trim().slice(0, 120) : '';
  const actualizadoEnIso =
    typeof raw?.actualizadoEnIso === 'string' ? raw.actualizadoEnIso.trim().slice(0, 40) : '';

  return {
    agotado86,
    ...(motivoFinal ? { motivo86: motivoFinal } : {}),
    ...(notaLimpia ? { nota86: notaLimpia } : {}),
    contadorActivo,
    porcionesDisponibles,
    umbralAlertaPorciones,
    auto86AlLlegarACero,
    ...(actualizadoPor ? { actualizadoPor } : {}),
    ...(actualizadoEnIso ? { actualizadoEnIso } : {}),
  };
}

/**
 * Sanitiza y normaliza la configuración de Especial del Día sin campos undefined.
 */
export function sanitizarEspecialDelDia(
  raw?: Partial<EspecialDelDiaConfig> | null
): EspecialDelDiaConfig {
  const diasUnicos = Array.isArray(raw?.diasSemana)
    ? Array.from(
        new Set(
          raw.diasSemana.filter(
            (d): d is DiaSemanaEspecial =>
              typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6
          )
        )
      ).sort((a, b) => a - b)
    : [];

  const fechaEspecifica =
    typeof raw?.fechaEspecifica === 'string' && FECHA_ISO_REGEX.test(raw.fechaEspecifica.trim())
      ? raw.fechaEspecifica.trim()
      : undefined;

  const horaInicio =
    typeof raw?.horaInicio === 'string' && HORA_REGEX.test(raw.horaInicio.trim())
      ? raw.horaInicio.trim()
      : undefined;

  const horaFin =
    typeof raw?.horaFin === 'string' && HORA_REGEX.test(raw.horaFin.trim())
      ? raw.horaFin.trim()
      : undefined;

  const etiqueta =
    typeof raw?.etiqueta === 'string' && raw.etiqueta.trim()
      ? raw.etiqueta.trim().slice(0, 40)
      : 'Especial del Día';

  const mensajeSugerido =
    typeof raw?.mensajeSugerido === 'string' && raw.mensajeSugerido.trim()
      ? raw.mensajeSugerido.trim().slice(0, 160)
      : undefined;

  const prioridad =
    typeof raw?.prioridad === 'number' && Number.isFinite(raw.prioridad)
      ? Math.max(1, Math.min(99, Math.round(raw.prioridad)))
      : undefined;

  return {
    activo: Boolean(raw?.activo),
    etiqueta,
    diasSemana: diasUnicos,
    ...(fechaEspecifica ? { fechaEspecifica } : {}),
    ...(horaInicio ? { horaInicio } : {}),
    ...(horaFin ? { horaFin } : {}),
    ...(mensajeSugerido ? { mensajeSugerido } : {}),
    soloEnHorarioProgramado: Boolean(raw?.soloEnHorarioProgramado),
    ...(prioridad !== undefined ? { prioridad } : {}),
  };
}

/**
 * Evalúa si un Especial del Día está vigente en la fecha/hora actual de Colombia.
 */
export function evaluarEspecialDelDia(
  config?: EspecialDelDiaConfig | null,
  ahora: Date = new Date()
): EvaluacionEspecialDelDia {
  if (!config || !config.activo) {
    return {
      configurado: false,
      esEspecialVigente: false,
      programadoFueraDeHorario: false,
      etiqueta: '',
      resumenHorario: '',
    };
  }

  const ctx = obtenerContextoTiempoColombia(ahora);
  const etiqueta = config.etiqueta?.trim() || 'Especial del Día';
  const diasValidos = Array.isArray(config.diasSemana) ? config.diasSemana : [];

  let cumpleFechaODia = true;
  if (config.fechaEspecifica && FECHA_ISO_REGEX.test(config.fechaEspecifica)) {
    cumpleFechaODia = config.fechaEspecifica === ctx.fechaIso;
  } else if (diasValidos.length > 0) {
    cumpleFechaODia = diasValidos.includes(ctx.diaSemana);
  }

  const cumpleHora = estaEnRangoHorario(ctx.minutosDia, config.horaInicio, config.horaFin);
  const esEspecialVigente = cumpleFechaODia && cumpleHora;

  const partesResumen: string[] = [];
  if (config.fechaEspecifica) {
    partesResumen.push(config.fechaEspecifica);
  } else if (diasValidos.length > 0 && diasValidos.length < 7) {
    partesResumen.push(diasValidos.map((d) => DIAS_NOMBRES_BY_NUM[d]).join(', '));
  } else {
    partesResumen.push('Todos los días');
  }

  if (config.horaInicio && config.horaFin) {
    partesResumen.push(`${config.horaInicio}–${config.horaFin}`);
  } else if (config.horaInicio) {
    partesResumen.push(`Desde ${config.horaInicio}`);
  } else if (config.horaFin) {
    partesResumen.push(`Hasta ${config.horaFin}`);
  }

  return {
    configurado: true,
    esEspecialVigente,
    programadoFueraDeHorario: !esEspecialVigente,
    etiqueta,
    ...(config.mensajeSugerido ? { mensajeSugerido: config.mensajeSugerido } : {}),
    resumenHorario: partesResumen.join(' · '),
  };
}

/**
 * Evalúa el estado completo de disponibilidad Control 86 + Especial del Día de un producto o combo.
 */
export function evaluarDisponibilidadItem86(
  item: Pick<Producto | Combo, 'disponible' | 'control86' | 'especialDelDia'>,
  ahora: Date = new Date()
): EvaluacionControl86 {
  const disponibleBase = item.disponible !== false;
  const c86 = item.control86;
  const contadorActivo = Boolean(c86?.contadorActivo);
  const porcionesDisponibles =
    contadorActivo && typeof c86?.porcionesDisponibles === 'number'
      ? Math.max(0, Math.round(c86.porcionesDisponibles))
      : null;
  const umbralAlertaPorciones =
    typeof c86?.umbralAlertaPorciones === 'number'
      ? Math.max(0, Math.round(c86.umbralAlertaPorciones))
      : UMBRAL_ALERTA_PORCIONES_DEFAULT;
  const auto86AlLlegarACero = c86?.auto86AlLlegarACero !== false;

  const especial = evaluarEspecialDelDia(item.especialDelDia, ahora);
  const agotadoExplicito = Boolean(c86?.agotado86);
  const agotadoPorPorciones = contadorActivo && porcionesDisponibles !== null && porcionesDisponibles <= 0;
  const agotado86 = agotadoExplicito || agotadoPorPorciones;

  const motivo86Label = c86?.motivo86
    ? MOTIVOS_86_META[c86.motivo86]?.shortLabel
    : agotadoPorPorciones
      ? MOTIVOS_86_META.produccion_agotada.shortLabel
      : undefined;

  const fueraHorarioEspecial =
    especial.programadoFueraDeHorario && Boolean(item.especialDelDia?.soloEnHorarioProgramado);

  if (agotado86) {
    return {
      estado: 'agotado_86',
      disponibleBase,
      agotado86: true,
      contadorActivo,
      porcionesDisponibles,
      umbralAlertaPorciones,
      auto86AlLlegarACero,
      puedePedirsePublico: false,
      puedePedirsePos: false,
      maxPedible: 0,
      badgeTexto: '86 · Agotado',
      motivo86Label: motivo86Label || 'Agotado hoy',
      nota86: c86?.nota86,
      especial,
    };
  }

  if (!disponibleBase) {
    return {
      estado: 'no_disponible',
      disponibleBase,
      agotado86: false,
      contadorActivo,
      porcionesDisponibles,
      umbralAlertaPorciones,
      auto86AlLlegarACero,
      puedePedirsePublico: false,
      puedePedirsePos: false,
      maxPedible: 0,
      badgeTexto: 'No disponible',
      especial,
    };
  }

  if (fueraHorarioEspecial) {
    return {
      estado: 'fuera_horario_especial',
      disponibleBase,
      agotado86: false,
      contadorActivo,
      porcionesDisponibles,
      umbralAlertaPorciones,
      auto86AlLlegarACero,
      puedePedirsePublico: false,
      puedePedirsePos: false,
      maxPedible: 0,
      badgeTexto: `Horario especial (${especial.resumenHorario})`,
      especial,
    };
  }

  if (contadorActivo && porcionesDisponibles !== null) {
    if (porcionesDisponibles <= umbralAlertaPorciones) {
      return {
        estado: 'ultimas_porciones',
        disponibleBase,
        agotado86: false,
        contadorActivo,
        porcionesDisponibles,
        umbralAlertaPorciones,
        auto86AlLlegarACero,
        puedePedirsePublico: true,
        puedePedirsePos: true,
        maxPedible: porcionesDisponibles,
        badgeTexto:
          porcionesDisponibles === 1
            ? '¡Última porción!'
            : `¡Últimas ${porcionesDisponibles}!`,
        especial,
      };
    }

    return {
      estado: 'disponible_limitado',
      disponibleBase,
      agotado86: false,
      contadorActivo,
      porcionesDisponibles,
      umbralAlertaPorciones,
      auto86AlLlegarACero,
      puedePedirsePublico: true,
      puedePedirsePos: true,
      maxPedible: porcionesDisponibles,
      badgeTexto: `${porcionesDisponibles} disp.`,
      especial,
    };
  }

  return {
    estado: 'disponible',
    disponibleBase,
    agotado86: false,
    contadorActivo: false,
    porcionesDisponibles: null,
    umbralAlertaPorciones,
    auto86AlLlegarACero,
    puedePedirsePublico: true,
    puedePedirsePos: true,
    maxPedible: null,
    especial,
  };
}

/**
 * Valida si se puede agregar o incrementar unidades en un carrito respetando Control 86 y porciones restantes.
 */
export function validarLimitePorcionesCarrito(
  item: Pick<Producto | Combo, 'nombre' | 'disponible' | 'control86' | 'especialDelDia'>,
  cantidadActualEnCarrito: number,
  delta: number = 1,
  ahora: Date = new Date()
): { permitido: boolean; motivo?: string; maximoPermitido?: number } {
  const eval86 = evaluarDisponibilidadItem86(item, ahora);

  if (eval86.agotado86) {
    return {
      permitido: false,
      motivo: `"${item.nombre}" está marcado en 86 (${eval86.motivo86Label || 'Agotado hoy'})`,
      maximoPermitido: 0,
    };
  }

  if (!eval86.disponibleBase) {
    return {
      permitido: false,
      motivo: `"${item.nombre}" no está disponible en este momento`,
      maximoPermitido: 0,
    };
  }

  if (eval86.estado === 'fuera_horario_especial') {
    return {
      permitido: false,
      motivo: `"${item.nombre}" solo se ofrece en horario especial (${eval86.especial.resumenHorario})`,
      maximoPermitido: 0,
    };
  }

  if (eval86.maxPedible !== null) {
    const nuevaCantidad = cantidadActualEnCarrito + delta;
    if (nuevaCantidad > eval86.maxPedible) {
      return {
        permitido: false,
        motivo:
          eval86.maxPedible === 1
            ? `Solo queda 1 porción disponible de "${item.nombre}"`
            : `Solo quedan ${eval86.maxPedible} porciones disponibles de "${item.nombre}"`,
        maximoPermitido: eval86.maxPedible,
      };
    }
  }

  return {
    permitido: true,
    maximoPermitido: eval86.maxPedible ?? undefined,
  };
}

/**
 * Normaliza productos y combos en una lista unificada para el tablero Control 86.
 */
export function construirItemsTablero86(
  productos: Producto[],
  combos: Combo[],
  ahora: Date = new Date()
): ItemCatalogo86[] {
  const prods: ItemCatalogo86[] = productos.map((p) => ({
    id: p.id,
    tipo: 'producto',
    nombre: p.nombre,
    categoria: p.categoria?.trim() || 'Sin categoría',
    precio: p.precio,
    imagenUrl: p.imagenUrl,
    disponible: p.disponible !== false,
    estacionCocina: p.estacionCocina,
    control86: p.control86,
    especialDelDia: p.especialDelDia,
    evaluacion: evaluarDisponibilidadItem86(p, ahora),
  }));

  const cmbs: ItemCatalogo86[] = combos.map((c) => ({
    id: c.id,
    tipo: 'combo',
    nombre: c.nombre,
    categoria: c.categoria?.trim() || 'Combos',
    precio: c.precioEspecial,
    imagenUrl: c.imagenUrl,
    disponible: c.disponible !== false,
    estacionCocina: c.estacionCocina,
    control86: c.control86,
    especialDelDia: c.especialDelDia,
    evaluacion: evaluarDisponibilidadItem86(c, ahora),
  }));

  return [...prods, ...cmbs].sort((a, b) => {
    // Priorizar en 86 y últimas porciones primero para visibilidad operativa en cocina
    const peso = (ev: EvaluacionControl86): number => {
      if (ev.agotado86) return 0;
      if (ev.estado === 'ultimas_porciones') return 1;
      if (ev.especial.esEspecialVigente) return 2;
      if (ev.contadorActivo) return 3;
      return 4;
    };
    const diff = peso(a.evaluacion) - peso(b.evaluacion);
    if (diff !== 0) return diff;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * Calcula métricas consolidadas para los KPIs del tablero Control 86.
 */
export function calcularResumenTablero86(
  productos: Producto[],
  combos: Combo[],
  ahora: Date = new Date()
): ResumenTablero86 {
  const items = construirItemsTablero86(productos, combos, ahora);
  let totalEn86 = 0;
  let totalUltimasPorciones = 0;
  let totalConContador = 0;
  let totalEspecialesVigentes = 0;
  let totalEspecialesProgramados = 0;
  let totalFueraHorarioEspecial = 0;
  let porcionesTotalesEnContador = 0;

  for (const item of items) {
    const ev = item.evaluacion;
    if (ev.agotado86) totalEn86 += 1;
    if (ev.estado === 'ultimas_porciones') totalUltimasPorciones += 1;
    if (ev.contadorActivo) {
      totalConContador += 1;
      porcionesTotalesEnContador += ev.porcionesDisponibles ?? 0;
    }
    if (ev.especial.configurado) totalEspecialesProgramados += 1;
    if (ev.especial.esEspecialVigente && !ev.agotado86 && ev.disponibleBase) {
      totalEspecialesVigentes += 1;
    }
    if (ev.estado === 'fuera_horario_especial') {
      totalFueraHorarioEspecial += 1;
    }
  }

  return {
    totalCatalogo: items.length,
    totalEn86,
    totalUltimasPorciones,
    totalConContador,
    totalEspecialesVigentes,
    totalEspecialesProgramados,
    totalFueraHorarioEspecial,
    porcionesTotalesEnContador,
  };
}

/**
 * Filtra los ítems del tablero Control 86 por búsqueda (sin acentos), estado, tipo y estación.
 */
export function filtrarItemsTablero86(
  items: ItemCatalogo86[],
  filtros: FiltrosTablero86
): ItemCatalogo86[] {
  const q = normalizarTextoBusqueda(filtros.busqueda || '');

  return items.filter((item) => {
    if (filtros.tipo !== 'todos' && item.tipo !== filtros.tipo) {
      return false;
    }

    if (filtros.estacion !== 'todas' && item.estacionCocina !== filtros.estacion) {
      return false;
    }

    if (filtros.estado === 'agotados_86' && !item.evaluacion.agotado86) {
      return false;
    }
    if (
      filtros.estado === 'ultimas_porciones' &&
      item.evaluacion.estado !== 'ultimas_porciones'
    ) {
      return false;
    }
    if (filtros.estado === 'con_contador' && !item.evaluacion.contadorActivo) {
      return false;
    }
    if (
      filtros.estado === 'especiales_hoy' &&
      !item.evaluacion.especial.esEspecialVigente
    ) {
      return false;
    }
    if (
      filtros.estado === 'disponibles' &&
      (!item.evaluacion.puedePedirsePos || item.evaluacion.agotado86)
    ) {
      return false;
    }

    if (q) {
      const hay = normalizarTextoBusqueda(
        `${item.nombre} ${item.categoria} ${item.control86?.nota86 || ''} ${item.especialDelDia?.etiqueta || ''}`
      );
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Ordena productos o combos destacando los Especiales del Día vigentes primero
 * y dejando los ítems en 86 al final para mantener claridad visual en POS y menús.
 */
export function ordenarConEspecialesPrimero<
  T extends Pick<Producto | Combo, 'nombre' | 'disponible' | 'control86' | 'especialDelDia'>,
>(items: T[], ahora: Date = new Date()): T[] {
  return [...items].sort((a, b) => {
    const evA = evaluarDisponibilidadItem86(a, ahora);
    const evB = evaluarDisponibilidadItem86(b, ahora);

    const score = (item: T, ev: EvaluacionControl86): number => {
      if (ev.agotado86 || !ev.disponibleBase) return 3;
      if (ev.especial.esEspecialVigente) {
        return 0 + ((item.especialDelDia?.prioridad ?? 50) / 1000);
      }
      return 1;
    };

    const diff = score(a, evA) - score(b, evB);
    if (diff !== 0) return diff;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/**
 * Genera texto legible para compartir la Pizarra 86 y Especiales del Día por WhatsApp al equipo.
 */
export function generarResumenTablero86WhatsApp(
  nombreNegocio: string,
  productos: Producto[],
  combos: Combo[],
  ahora: Date = new Date()
): string {
  const items = construirItemsTablero86(productos, combos, ahora);
  const ctx = obtenerContextoTiempoColombia(ahora);
  const en86 = items.filter((i) => i.evaluacion.agotado86);
  const ultimas = items.filter((i) => i.evaluacion.estado === 'ultimas_porciones');
  const especiales = items.filter(
    (i) => i.evaluacion.especial.esEspecialVigente && !i.evaluacion.agotado86 && i.evaluacion.disponibleBase
  );

  const lineas: string[] = [
    `📋 *PIZARRA 86 Y ESPECIALES — ${nombreNegocio.toUpperCase()}*`,
    `🕒 Corte: ${ctx.fechaIso} ${ctx.horaHHMM} (COL)`,
    '',
  ];

  if (en86.length > 0) {
    lineas.push(`🚫 *EN 86 / AGOTADOS (${en86.length}):*`);
    for (const item of en86) {
      const motivo = item.evaluacion.motivo86Label ? ` (${item.evaluacion.motivo86Label})` : '';
      const nota = item.control86?.nota86 ? ` — ${item.control86.nota86}` : '';
      lineas.push(`• ${item.nombre}${motivo}${nota}`);
    }
    lineas.push('');
  } else {
    lineas.push('✅ *Sin platos en 86* (carta operativa al 100%).', '');
  }

  if (ultimas.length > 0) {
    lineas.push(`🔥 *ÚLTIMAS PORCIONES (${ultimas.length}):*`);
    for (const item of ultimas) {
      lineas.push(`• ${item.nombre}: quedan ${item.evaluacion.porcionesDisponibles}`);
    }
    lineas.push('');
  }

  if (especiales.length > 0) {
    lineas.push(`⭐ *ESPECIALES DE HOY (${especiales.length}):*`);
    for (const item of especiales) {
      const cupo =
        item.evaluacion.porcionesDisponibles !== null
          ? ` · ${item.evaluacion.porcionesDisponibles} disp.`
          : '';
      lineas.push(`• ${item.nombre} [${item.evaluacion.especial.etiqueta}]${cupo}`);
    }
  }

  return lineas.join('\n').trim();
}
