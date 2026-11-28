const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const WEEKDAY_EN_TO_NUM: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export interface Control86ServerData {
  agotado86?: unknown;
  motivo86?: unknown;
  nota86?: unknown;
  contadorActivo?: unknown;
  porcionesDisponibles?: unknown;
  umbralAlertaPorciones?: unknown;
  auto86AlLlegarACero?: unknown;
}

export interface EspecialDelDiaServerData {
  activo?: unknown;
  etiqueta?: unknown;
  diasSemana?: unknown;
  fechaEspecifica?: unknown;
  horaInicio?: unknown;
  horaFin?: unknown;
  soloEnHorarioProgramado?: unknown;
}

export interface ResultadoControl86Servidor {
  permitido: boolean;
  motivo?: string;
  contadorActivo: boolean;
  porcionesActuales: number | null;
  porcionesRestantes: number | null;
  debeAuto86: boolean;
  esEspecialVigente: boolean;
  etiquetaEspecial?: string;
  umbralAlerta: number;
}

function getBogotaTimeContext(nowMs: number = Date.now()) {
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

  const parts = formatter.formatToParts(new Date(nowMs));
  const map = new Map<string, string>();
  for (const part of parts) {
    map.set(part.type, part.value);
  }

  const year = map.get('year') || '2026';
  const month = map.get('month') || '01';
  const day = map.get('day') || '01';
  const rawHour = Number(map.get('hour') || '0');
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = Number(map.get('minute') || '0');
  const weekday = (map.get('weekday') || 'Mon').toLowerCase().slice(0, 3);

  return {
    fechaIso: `${year}-${month}-${day}`,
    diaSemana: WEEKDAY_EN_TO_NUM[weekday] ?? 1,
    minutosDia: hour * 60 + minute,
  };
}

function parseMinutes(hhmm: unknown): number | null {
  if (typeof hhmm !== 'string' || !HORA_REGEX.test(hhmm.trim())) return null;
  const [h, m] = hhmm.trim().split(':').map(Number);
  return h * 60 + m;
}

function inHourRange(currentMin: number, inicio: unknown, fin: unknown): boolean {
  const start = parseMinutes(inicio);
  const end = parseMinutes(fin);
  if (start === null && end === null) return true;
  if (start !== null && end === null) return currentMin >= start;
  if (start === null && end !== null) return currentMin <= end;
  const s = start as number;
  const e = end as number;
  if (s <= e) return currentMin >= s && currentMin <= e;
  return currentMin >= s || currentMin <= e;
}

export function esEspecialVigenteServidor(
  rawEspecial: unknown,
  nowMs: number = Date.now()
): { activo: boolean; vigente: boolean; soloEnHorario: boolean; etiqueta?: string } {
  if (!rawEspecial || typeof rawEspecial !== 'object' || Array.isArray(rawEspecial)) {
    return { activo: false, vigente: false, soloEnHorario: false };
  }
  const esp = rawEspecial as EspecialDelDiaServerData;
  if (esp.activo !== true) {
    return { activo: false, vigente: false, soloEnHorario: false };
  }

  const ctx = getBogotaTimeContext(nowMs);
  const dias = Array.isArray(esp.diasSemana)
    ? esp.diasSemana.filter((d): d is number => typeof d === 'number' && Number.isInteger(d))
    : [];

  let cumpleDiaOFecha = true;
  if (typeof esp.fechaEspecifica === 'string' && FECHA_ISO_REGEX.test(esp.fechaEspecifica)) {
    cumpleDiaOFecha = esp.fechaEspecifica === ctx.fechaIso;
  } else if (dias.length > 0) {
    cumpleDiaOFecha = dias.includes(ctx.diaSemana);
  }

  const cumpleHora = inHourRange(ctx.minutosDia, esp.horaInicio, esp.horaFin);
  const etiqueta =
    typeof esp.etiqueta === 'string' && esp.etiqueta.trim()
      ? esp.etiqueta.trim().slice(0, 40)
      : 'Especial del Día';

  return {
    activo: true,
    vigente: cumpleDiaOFecha && cumpleHora,
    soloEnHorario: esp.soloEnHorarioProgramado === true,
    etiqueta,
  };
}

export function evaluarControl86Servidor(
  catalogItem: {
    nombre?: unknown;
    disponible?: unknown;
    control86?: unknown;
    especialDelDia?: unknown;
  },
  cantidadSolicitada: number,
  nowMs: number = Date.now()
): ResultadoControl86Servidor {
  const nombre = typeof catalogItem.nombre === 'string' ? catalogItem.nombre : 'el producto';
  const c86 =
    catalogItem.control86 && typeof catalogItem.control86 === 'object' && !Array.isArray(catalogItem.control86)
      ? (catalogItem.control86 as Control86ServerData)
      : null;

  const especial = esEspecialVigenteServidor(catalogItem.especialDelDia, nowMs);
  const umbralAlerta =
    c86 && typeof c86.umbralAlertaPorciones === 'number' && Number.isFinite(c86.umbralAlertaPorciones)
      ? Math.max(0, Math.round(c86.umbralAlertaPorciones))
      : 5;

  if (c86?.agotado86 === true) {
    return {
      permitido: false,
      motivo: `"${nombre}" se encuentra agotado hoy (Control 86)`,
      contadorActivo: Boolean(c86.contadorActivo),
      porcionesActuales:
        typeof c86.porcionesDisponibles === 'number' ? Math.max(0, Math.round(c86.porcionesDisponibles)) : null,
      porcionesRestantes: null,
      debeAuto86: false,
      esEspecialVigente: especial.vigente,
      etiquetaEspecial: especial.etiqueta,
      umbralAlerta,
    };
  }

  if (catalogItem.disponible !== true) {
    return {
      permitido: false,
      motivo: `Uno o más productos no están disponibles ("${nombre}")`,
      contadorActivo: Boolean(c86?.contadorActivo),
      porcionesActuales: null,
      porcionesRestantes: null,
      debeAuto86: false,
      esEspecialVigente: especial.vigente,
      etiquetaEspecial: especial.etiqueta,
      umbralAlerta,
    };
  }

  if (especial.activo && especial.soloEnHorario && !especial.vigente) {
    return {
      permitido: false,
      motivo: `"${nombre}" es un especial disponible únicamente en su horario programado`,
      contadorActivo: Boolean(c86?.contadorActivo),
      porcionesActuales: null,
      porcionesRestantes: null,
      debeAuto86: false,
      esEspecialVigente: false,
      etiquetaEspecial: especial.etiqueta,
      umbralAlerta,
    };
  }

  const contadorActivo = c86?.contadorActivo === true;
  if (
    contadorActivo &&
    typeof c86?.porcionesDisponibles === 'number' &&
    Number.isFinite(c86.porcionesDisponibles)
  ) {
    const porcionesActuales = Math.max(0, Math.round(c86.porcionesDisponibles));
    if (porcionesActuales <= 0) {
      return {
        permitido: false,
        motivo: `"${nombre}" agotó sus porciones del día`,
        contadorActivo: true,
        porcionesActuales: 0,
        porcionesRestantes: 0,
        debeAuto86: false,
        esEspecialVigente: especial.vigente,
        etiquetaEspecial: especial.etiqueta,
        umbralAlerta,
      };
    }

    if (cantidadSolicitada > porcionesActuales) {
      return {
        permitido: false,
        motivo:
          porcionesActuales === 1
            ? `Solo queda 1 porción disponible de "${nombre}"`
            : `Solo quedan ${porcionesActuales} porciones disponibles de "${nombre}"`,
        contadorActivo: true,
        porcionesActuales,
        porcionesRestantes: porcionesActuales,
        debeAuto86: false,
        esEspecialVigente: especial.vigente,
        etiquetaEspecial: especial.etiqueta,
        umbralAlerta,
      };
    }

    const porcionesRestantes = Math.max(0, porcionesActuales - cantidadSolicitada);
    const auto86 = c86.auto86AlLlegarACero !== false;
    return {
      permitido: true,
      contadorActivo: true,
      porcionesActuales,
      porcionesRestantes,
      debeAuto86: porcionesRestantes === 0 && auto86,
      esEspecialVigente: especial.vigente,
      etiquetaEspecial: especial.etiqueta,
      umbralAlerta,
    };
  }

  return {
    permitido: true,
    contadorActivo: false,
    porcionesActuales: null,
    porcionesRestantes: null,
    debeAuto86: false,
    esEspecialVigente: especial.vigente,
    etiquetaEspecial: especial.etiqueta,
    umbralAlerta,
  };
}
